// shared-functions.js - Общие функции, используемые на нескольких страницах

// Утилиты
const Utils = {
    logAction(action) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${action}`);
    },

    calculateModifier(score) {
        return Math.floor((score - 10) / 2);
    },

    calculateProficiencyBonus(level) {
        return 2 + Math.floor((level - 1) / 4);
    },

    getAbilityName(ability) {
        const abilityNames = {
            strength: 'Сила',
            dexterity: 'Ловкость',
            constitution: 'Телосложение',
            intelligence: 'Интеллект',
            wisdom: 'Мудрость',
            charisma: 'Харизма'
        };
        return abilityNames[ability] || ability;
    },

    getAbilityAbbr(ability) {
        const abilityAbbrs = {
            strength: 'STR',
            dexterity: 'DEX',
            constitution: 'CON',
            intelligence: 'INT',
            wisdom: 'WIS',
            charisma: 'CHA'
        };
        return abilityAbbrs[ability] || ability;
    },

    formatModifier(value) {
        return value >= 0 ? `+${value}` : value.toString();
    },

    isMobile() {
        return window.innerWidth <= 767;
    },

    toggleElement(element, show) {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    },

    showNotification(message, type = 'info', duration = 3000) {
        console.log(`💬 Уведомление [${type}]: ${message}`);
        
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            });
        }
        
        const timeout = setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
        
        notification.dataset.timeout = timeout;
        
        return notification;
    },

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    },

    async loadData(path, fallbackData = []) {
        try {
            console.log(`🔄 Загрузка данных: ${path}`);
            
            if (window.waitForFirebase) {
                await new Promise((resolve) => {
                    window.waitForFirebase(resolve);
                });
            }
            
            if (typeof window.DB === 'undefined' || !window.DB.getArrayData) {
                console.warn('DB не доступен, используем fallback данные');
                return fallbackData;
            }
            
            const firebaseData = await window.DB.getArrayData(path);
            
            if (firebaseData && firebaseData.length > 0) {
                console.log(`✅ Данные загружены из Firebase (${path}): ${firebaseData.length} записей`);
                return firebaseData;
            }
            
            const localData = await window.DB.getArrayLocalFallback(path);
            if (localData && localData.length > 0) {
                console.log(`📁 Используем локальные данные: ${localData.length} записей`);
                return localData;
            }
            
            console.log(`📭 Данные не найдены, используем fallback`);
            return fallbackData;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки данных ${path}:`, error);
            return fallbackData;
        }
    },

    calculateAC(character) {
        if (!character || !character.armor) return 10;
        
        const dexMod = character.abilityScores?.dexterity ? 
            this.calculateModifier(character.abilityScores.dexterity) : 0;
        
        let baseAC = 10;
        
        const armorAC = {
            'none': 0,
            'padded': 11,
            'leather': 11,
            'studded-leather': 12,
            'chain-shirt': 13,
            'scale-mail': 14,
            'breastplate': 14,
            'half-plate': 15,
            'ring-mail': 14,
            'chain-mail': 16,
            'splint': 17,
            'plate': 18
        };
        
        const armorType = character.armor.type || 'none';
        const armorBonus = armorAC[armorType] || 0;
        const shieldBonus = character.armor.shield ? 2 : 0;
        
        const armorMaxDex = {
            'none': Infinity,
            'padded': Infinity,
            'leather': Infinity,
            'studded-leather': Infinity,
            'chain-shirt': 2,
            'scale-mail': 2,
            'breastplate': Infinity,
            'half-plate': 2,
            'ring-mail': 0,
            'chain-mail': 0,
            'splint': 0,
            'plate': 0
        };
        
        const maxDex = armorMaxDex[armorType] !== undefined ? armorMaxDex[armorType] : Infinity;
        const effectiveDex = Math.min(dexMod, maxDex);
        
        return baseAC + effectiveDex + armorBonus + shieldBonus;
    }
};

// Управление персонажами
const CharacterManager = {
    async loadCharacterById(characterId) {
        console.log(`📥 Загрузка персонажа по ID: ${characterId}`);
        
        try {
            let character = null;
            
            if (window.DB && window.DB.getData) {
                console.log('🔍 Поиск в Firebase...');
                character = await window.DB.getData(`characters/${characterId}`);
                
                if (character) {
                    console.log('✅ Персонаж найден в Firebase:', character.name || 'Без имени');
                    return character;
                }
            }
            
            console.log('🔍 Поиск в локальном хранилище...');
            const localChars = CharacterStorage.loadCharacters();
            character = localChars.find(c => c.id === characterId);
            
            if (character) {
                console.log('✅ Персонаж найден локально:', character.name || 'Без имени');
                return character;
            }
            
            console.warn(`⚠️ Персонаж с ID ${characterId} не найден`);
            return null;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажа:', error);
            return null;
        }
    },

    async loadAllCharacters() {
        console.log('📥 Загрузка всех персонажей...');
        
        try {
            const characters = [];
            
            if (window.DB && window.DB.getArrayData) {
                try {
                    const firebaseChars = await window.DB.getArrayData('characters');
                    if (firebaseChars && firebaseChars.length > 0) {
                        console.log(`🔥 Firebase персонажи: ${firebaseChars.length}`);
                        characters.push(...firebaseChars);
                    }
                } catch (firebaseError) {
                    console.warn('⚠️ Ошибка загрузки из Firebase:', firebaseError);
                }
            }
            
            const localChars = CharacterStorage.loadCharacters();
            console.log(`📁 Локальные персонажи: ${localChars.length}`);
            
            localChars.forEach(localChar => {
                if (!characters.some(fbChar => fbChar.id === localChar.id)) {
                    characters.push(localChar);
                }
            });
            
            console.log(`✅ Всего персонажей: ${characters.length}`);
            return characters;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            return [];
        }
    },

    async saveCharacter(character) {
        console.log(`💾 Сохранение персонажа: ${character.name || 'Без имени'}`);
        
        try {
            CharacterStorage.saveCharacter(character);
            console.log('✅ Сохранено локально');
            
            if (window.DB && window.DB.saveData) {
                try {
                    await window.DB.saveData(`characters/${character.id}`, character);
                    console.log('✅ Сохранено в Firebase');
                } catch (firebaseError) {
                    console.warn('⚠️ Ошибка сохранения в Firebase:', firebaseError);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения персонажа:', error);
            return false;
        }
    },

    async deleteCharacter(characterId, characterName = '') {
        console.log(`🗑️ Удаление персонажа: ${characterId} (${characterName})`);
        
        if (!confirm(`Вы уверены, что хотите удалить персонажа "${characterName || characterId}"?`)) {
            console.log('❌ Удаление отменено пользователем');
            return false;
        }
        
        try {
            CharacterStorage.deleteCharacter(characterId);
            console.log('✅ Удалено локально');
            
            if (window.DB && window.DB.deleteData) {
                try {
                    await window.DB.deleteData(`characters/${characterId}`);
                    console.log('✅ Удалено из Firebase');
                } catch (firebaseError) {
                    console.warn('⚠️ Ошибка удаления из Firebase:', firebaseError);
                }
            }
            
            Utils.showNotification(`Персонаж "${characterName || characterId}" удален`, 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка удаления персонажа:', error);
            Utils.showNotification('Не удалось удалить персонажа', 'error');
            return false;
        }
    },

    getCharacterStatus(character) {
        if (character.status === 'dead') return 'dead';
        if (character.status === 'retired') return 'retired';
        if (character.status === 'inactive') return 'inactive';
        
        if (character.hp?.current === 0) return 'dead';
        if (character.hp?.current < character.hp?.max * 0.25) return 'critical';
        if (character.hp?.current < character.hp?.max * 0.5) return 'wounded';
        
        return 'active';
    },

    getStatusClass(status) {
        switch (status) {
            case 'active': return 'status-active';
            case 'wounded': return 'status-wounded';
            case 'critical': return 'status-critical';
            case 'dead': return 'status-dead';
            case 'retired': return 'status-retired';
            case 'inactive': return 'status-inactive';
            default: return 'status-unknown';
        }
    },

    getStatusText(status) {
        switch (status) {
            case 'active': return 'Активен';
            case 'wounded': return 'Ранен';
            case 'critical': return 'Тяжело ранен';
            case 'dead': return 'Мертв';
            case 'retired': return 'На покое';
            case 'inactive': return 'Неактивен';
            default: return 'Неизвестно';
        }
    },

    getClassDisplayName(classId) {
        const classNames = {
            'fighter': 'Воин',
            'wizard': 'Волшебник',
            'rogue': 'Плут',
            'cleric': 'Жрец',
            'paladin': 'Паладин',
            'ranger': 'Следопыт',
            'sorcerer': 'Чародей',
            'warlock': 'Колдун',
            'bard': 'Бард',
            'druid': 'Друид',
            'monk': 'Монах',
            'barbarian': 'Варвар'
        };
        return classNames[classId] || classId;
    },

    getRaceDisplayName(raceId) {
        const raceNames = {
            'human': 'Человек',
            'high-elf': 'Высший эльф',
            'hill-dwarf': 'Холмовой дварф',
            'lightfoot-halfling': 'Легоногий халфлинг',
            'dragonborn': 'Драконорожденный'
        };
        return raceNames[raceId] || raceId;
    },

    getAlignmentDisplayName(alignmentId) {
        const alignments = {
            'lawful-good': 'Законно-добрый',
            'neutral-good': 'Нейтрально-добрый',
            'chaotic-good': 'Хаотично-добрый',
            'lawful-neutral': 'Законно-нейтральный',
            'true-neutral': 'Истинно нейтральный',
            'chaotic-neutral': 'Хаотично-нейтральный',
            'lawful-evil': 'Законно-злой',
            'neutral-evil': 'Нейтрально-злой',
            'chaotic-evil': 'Хаотично-злой'
        };
        return alignments[alignmentId] || alignmentId;
    },

    calculateAC(character) {
        return Utils.calculateAC(character);
    }
};

// Управление локальным хранилищем персонажей
const CharacterStorage = {
    loadCharacters() {
        try {
            const saved = localStorage.getItem('dd-characters');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Ошибка загрузки персонажей из localStorage:', error);
            return [];
        }
    },

    saveCharacters(characters) {
        try {
            localStorage.setItem('dd-characters', JSON.stringify(characters));
            Utils.logAction('Персонажи сохранены в localStorage');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения персонажей в localStorage:', error);
            return false;
        }
    },

    saveCharacter(character) {
        const characters = this.loadCharacters();
        
        if (character.id) {
            const index = characters.findIndex(c => c.id === character.id);
            if (index !== -1) {
                characters[index] = character;
            } else {
                character.id = Date.now().toString();
                characters.push(character);
            }
        } else {
            character.id = Date.now().toString();
            characters.push(character);
        }
        
        return this.saveCharacters(characters);
    },

    deleteCharacter(id) {
        const characters = this.loadCharacters();
        const filtered = characters.filter(c => c.id !== id);
        this.saveCharacters(filtered);
        Utils.logAction(`Персонаж с ID ${id} удален`);
    }
};

// Навигация
const Navigation = {
    initBurgerMenu() {
        const burgerMenu = document.getElementById('burgerMenu');
        const navList = document.querySelector('.nav-list');
        
        if (burgerMenu && navList) {
            burgerMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                navList.classList.toggle('active');
                Utils.logAction('Бургер-меню открыто/закрыто');
            });
            
            document.addEventListener('click', (e) => {
                if (!navList.contains(e.target) && !burgerMenu.contains(e.target)) {
                    navList.classList.remove('active');
                }
            });
            
            navList.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navList.classList.remove('active');
                });
            });
        }
    },

    updateActiveNav() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href === currentPage || 
                (currentPage === '' && href === 'index.html') ||
                (href.includes(currentPage) && currentPage !== '')) {
                link.classList.add('active');
            }
        });
    }
};

// Загрузчик данных
const DataLoader = {
    async loadConstructorData() {
        try {
            console.log('🔄 Загрузка данных для конструктора...');
            
            const [races, classes, spells, features, subclasses] = await Promise.all([
                window.getFirebaseNestedData('races'),
                window.getFirebaseNestedData('classes'),
                window.getFirebaseNestedData('spells'),
                window.getFirebaseNestedData('features'),
                window.getFirebaseNestedData('subclasses')
            ]);
            
            console.log('✅ Данные для конструктора загружены:');
            console.log(`   - Рас: ${races?.length || 0}`);
            console.log(`   - Классов: ${classes?.length || 0}`);
            console.log(`   - Заклинаний: ${spells?.length || 0}`);
            console.log(`   - Особенностей: ${features?.length || 0}`);
            console.log(`   - Подклассов: ${subclasses?.length || 0}`);
            
            return {
                races: races || [],
                classes: classes || [],
                spells: spells || [],
                features: features || [],
                subclasses: subclasses || []
            };
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных конструктора:', error);
            return {
                races: [],
                classes: [],
                spells: [],
                features: [],
                subclasses: []
            };
        }
    },
    async getSpellsForClass(classId) {
        try {
            console.log(`🔮 Загрузка заклинаний для класса: ${classId}`);
            
            // Загружаем все заклинания
            const allSpells = await this.loadSpells();
            
            if (!allSpells || allSpells.length === 0) {
                console.log('📭 Нет заклинаний в базе данных');
                return [];
            }
            
            // Фильтруем заклинания по классу
            const classSpells = allSpells.filter(spell => {
                if (!spell.classes) return false;
                
                // Проверяем разные форматы классов в заклинаниях
                if (Array.isArray(spell.classes)) {
                    return spell.classes.some(cls => 
                        cls.id === classId || 
                        cls.name?.toLowerCase() === classId.toLowerCase()
                    );
                } else if (typeof spell.classes === 'string') {
                    return spell.classes.includes(classId);
                }
                return false;
            });
            
            console.log(`✅ Найдено заклинаний для класса ${classId}: ${classSpells.length}`);
            return classSpells;
            
        } catch (error) {
            console.error(`❌ Ошибка получения заклинаний для класса ${classId}:`, error);
            return [];
        }
    },
    
    async loadSpells() {
        try {
            // Используем существующую функцию для загрузки заклинаний
            return await window.getFirebaseNestedData('spells');
        } catch (error) {
            console.error('❌ Ошибка загрузки заклинаний:', error);
            return [];
        }
    }
};

// Инициализация
const Common = {
    init() {
        Navigation.initBurgerMenu();
        Navigation.updateActiveNav();
        Utils.logAction('Общие компоненты инициализированы');
    }
};

const ArmorData = {
    async loadArmorTypes() {
        try {
            console.log('🛡️ Загрузка типов брони...');
            
            // Используем функцию для двойной вложенности
            const armorData = await window.getFirebaseNestedData('armor');
            
            if (armorData && armorData.length > 0) {
                console.log(`✅ Загружено типов брони: ${armorData.length}`);
                return armorData;
            }
            
            // Fallback данные
            const fallbackArmor = [
                { id: 'none', name: 'Нет брони', baseAC: 0, maxDex: 5, type: 'none' },
                { id: 'padded', name: 'Стёганая', baseAC: 11, maxDex: 5, type: 'light' },
                { id: 'leather', name: 'Кожаная', baseAC: 11, maxDex: 5, type: 'light' },
                { id: 'studded-leather', name: 'Кольчужная кожа', baseAC: 12, maxDex: 5, type: 'light' },
                { id: 'hide', name: 'Звериная шкура', baseAC: 12, maxDex: 2, type: 'medium' },
                { id: 'chain-shirt', name: 'Кольчужная рубаха', baseAC: 13, maxDex: 2, type: 'medium' },
                { id: 'scale-mail', name: 'Чешуйчатый доспех', baseAC: 14, maxDex: 2, type: 'medium' },
                { id: 'breastplate', name: 'Нагрудник', baseAC: 14, maxDex: 5, type: 'medium' },
                { id: 'half-plate', name: 'Полулаты', baseAC: 15, maxDex: 2, type: 'medium' },
                { id: 'ring-mail', name: 'Кольчужный', baseAC: 14, maxDex: 0, type: 'heavy' },
                { id: 'chain-mail', name: 'Кольчуга', baseAC: 16, maxDex: 0, type: 'heavy' },
                { id: 'splint', name: 'Пластинчатый', baseAC: 17, maxDex: 0, type: 'heavy' },
                { id: 'plate', name: 'Латы', baseAC: 18, maxDex: 0, type: 'heavy' }
            ];
            
            console.log(`📁 Используем fallback броню: ${fallbackArmor.length} типов`);
            return fallbackArmor;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки брони:', error);
            return [];
        }
    },

    async getArmorById(armorId) {
        const armorTypes = await this.loadArmorTypes();
        return armorTypes.find(armor => armor.id === armorId) || null;
    },

    calculateAC(character, armorType = null) {
        if (!character) return 10;
        
        const armor = armorType || character.armor?.type || 'none';
        const dexScore = character.abilityScores?.dexterity || 10;
        const dexMod = Utils.calculateModifier(dexScore);
        const hasShield = character.armor?.shield || false;
        const shieldBonus = hasShield ? 2 : 0;
        
        // Получаем данные о броне
        let baseAC = 10;
        let maxDex = 5;
        
        if (armor !== 'none') {
            const armorData = {
                'none': { baseAC: 0, maxDex: 5 },
                'padded': { baseAC: 11, maxDex: 5 },
                'leather': { baseAC: 11, maxDex: 5 },
                'studded-leather': { baseAC: 12, maxDex: 5 },
                'hide': { baseAC: 12, maxDex: 2 },
                'chain-shirt': { baseAC: 13, maxDex: 2 },
                'scale-mail': { baseAC: 14, maxDex: 2 },
                'breastplate': { baseAC: 14, maxDex: 5 },
                'half-plate': { baseAC: 15, maxDex: 2 },
                'ring-mail': { baseAC: 14, maxDex: 0 },
                'chain-mail': { baseAC: 16, maxDex: 0 },
                'splint': { baseAC: 17, maxDex: 0 },
                'plate': { baseAC: 18, maxDex: 0 }
            };
            
            const armorInfo = armorData[armor] || { baseAC: 0, maxDex: 5 };
            baseAC = armorInfo.baseAC;
            maxDex = armorInfo.maxDex;
        }
        
        // Ограничиваем бонус Ловкости в зависимости от типа брони
        const effectiveDexBonus = Math.min(dexMod, maxDex);
        
        // Расчет AC
        let ac = baseAC + effectiveDexBonus + shieldBonus;
        
        // Дополнительные бонусы (если есть)
        if (character.bonuses?.acBonus) {
            ac += parseInt(character.bonuses.acBonus) || 0;
        }
        
        return ac;
    },

    getArmorDescription(armorId) {
        const descriptions = {
            'none': 'Без брони - используется базовый AC 10 + бонус Ловкости',
            'padded': 'Легкая броня, не накладывает штраф на Скрытность',
            'leather': 'Легкая броня из твердой кожи',
            'studded-leather': 'Легкая броня с металлическими заклепками',
            'hide': 'Средняя броня из грубых шкур',
            'chain-shirt': 'Средняя броня из кольчужной ткани',
            'scale-mail': 'Средняя броня из металлических чешуек',
            'breastplate': 'Средняя броня, защищающая торс',
            'half-plate': 'Средняя броня, покрывающая большую часть тела',
            'ring-mail': 'Тяжелая броня из сцепленных колец',
            'chain-mail': 'Тяжелая броня из кольчужных колец',
            'splint': 'Тяжелая броня из металлических полос',
            'plate': 'Тяжелая броня из цельных металлических пластин'
        };
        
        return descriptions[armorId] || 'Броня не описана';
    }
};

const DataService = {
    // Загрузка данных с правильной структурой
    async loadDataFromDB(path) {
        try {
            console.log(`🔄 Загрузка данных из Firebase: ${path}`);
            
            if (!window.getFirebaseNestedData) {
                console.error('❌ getFirebaseNestedData не доступна');
                return [];
            }
            
            const data = await window.getFirebaseNestedData(path);
            
            if (!data || !Array.isArray(data)) {
                console.log(`📭 Нет данных или неправильный формат для: ${path}`);
                return [];
            }
            
            console.log(`✅ Загружено ${data.length} записей из ${path}`);
            
            // Логируем структуру первых данных для отладки
            if (data.length > 0) {
                console.log(`🔍 Пример данных из ${path}:`, {
                    id: data[0].id,
                    name: data[0].name || data[0].title || 'Без названия',
                    keys: Object.keys(data[0])
                });
            }
            
            return data;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки данных ${path}:`, error);
            return [];
        }
    },

    // Загрузка типов брони
    async loadArmorTypes() {
        try {
            console.log('🛡️ Загрузка брони из БД...');
            const armorData = await this.loadDataFromDB('armor');
            
            if (armorData.length === 0) {
                console.log('📭 Нет данных о броне в БД, используем fallback');
                // Fallback с правильными ID
                return [
                    { id: 'none', name: 'Без доспехов', baseAC: 0, maxDex: 5, type: 'none' },
                    { id: 'padded', name: 'Стёганый', baseAC: 11, maxDex: 5, type: 'light' },
                    { id: 'leather', name: 'Кожаный', baseAC: 11, maxDex: 5, type: 'light' },
                    { id: 'studded-leather', name: 'Кольчужная кожа', baseAC: 12, maxDex: 5, type: 'light' },
                    { id: 'chain-shirt', name: 'Кольчужная рубаха', baseAC: 13, maxDex: 2, type: 'medium' },
                    { id: 'scale-mail', name: 'Чешуйчатый доспех', baseAC: 14, maxDex: 2, type: 'medium' },
                    { id: 'breastplate', name: 'Кираса', baseAC: 14, maxDex: 2, type: 'medium' },
                    { id: 'half-plate', name: 'Полулаты', baseAC: 15, maxDex: 2, type: 'medium' },
                    { id: 'ring-mail', name: 'Кольчуга', baseAC: 14, maxDex: 0, type: 'heavy' },
                    { id: 'chain-mail', name: 'Панцирь', baseAC: 16, maxDex: 0, type: 'heavy' },
                    { id: 'splint', name: 'Наборный доспех', baseAC: 17, maxDex: 0, type: 'heavy' },
                    { id: 'plate', name: 'Латный доспех', baseAC: 18, maxDex: 0, type: 'heavy' }
                ];
            }
            
            console.log(`✅ Загружено брони из БД: ${armorData.length} типов`);
            return armorData;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки брони:', error);
            return [];
        }
    },

    async loadSkills() {
        try {
            console.log('📚 Загрузка навыков из БД...');
            const skillsData = await this.loadDataFromDB('skills');
            
            if (skillsData.length === 0) {
                console.log('📭 Нет навыков в БД, используем fallback');
                // Fallback навыки D&D
                return [
                    { id: 'acrobatics', name: 'Акробатика', ability: 'dexterity' },
                    { id: 'animal-handling', name: 'Уход за животными', ability: 'wisdom' },
                    { id: 'arcana', name: 'Магия', ability: 'intelligence' },
                    { id: 'athletics', name: 'Атлетика', ability: 'strength' },
                    { id: 'deception', name: 'Обман', ability: 'charisma' },
                    { id: 'history', name: 'История', ability: 'intelligence' },
                    { id: 'insight', name: 'Проницательность', ability: 'wisdom' },
                    { id: 'intimidation', name: 'Запугивание', ability: 'charisma' },
                    { id: 'investigation', name: 'Расследование', ability: 'intelligence' },
                    { id: 'medicine', name: 'Медицина', ability: 'wisdom' },
                    { id: 'nature', name: 'Природа', ability: 'intelligence' },
                    { id: 'perception', name: 'Восприятие', ability: 'wisdom' },
                    { id: 'performance', name: 'Выступление', ability: 'charisma' },
                    { id: 'persuasion', name: 'Убеждение', ability: 'charisma' },
                    { id: 'religion', name: 'Религия', ability: 'intelligence' },
                    { id: 'sleight-of-hand', name: 'Ловкость рук', ability: 'dexterity' },
                    { id: 'stealth', name: 'Скрытность', ability: 'dexterity' },
                    { id: 'survival', name: 'Выживание', ability: 'wisdom' }
                ];
            }
            
            console.log(`✅ Загружено навыков из БД: ${skillsData.length}`);
            return skillsData;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки навыков:', error);
            return [];
        }
    },

    // Загрузка рас
    async loadRaces() {
        return await this.loadDataFromDB('races');
    },

    // Загрузка классов
    async loadClasses() {
        return await this.loadDataFromDB('classes');
    },

    // Загрузка предысторий
    async loadBackgrounds() {
        return await this.loadDataFromDB('backgrounds');
    },

    // Загрузка заклинаний
    async loadSpells() {
        return await this.loadDataFromDB('spells');
    },

    // Загрузка заклинаний для конкретного класса
    async loadSpellsForClass(classId) {
        try {
            console.log(`🔮 Загрузка заклинаний для класса ИЗ БД: ${classId}`);
            
            const allSpells = await this.loadSpells();
            
            if (allSpells.length === 0) {
                console.log('📭 Нет заклинаний в базе данных');
                return [];
            }
            
            // Фильтруем заклинания по классу
            const classSpells = allSpells.filter(spell => {
                if (!spell.classes && !spell.class) return false;
                
                if (Array.isArray(spell.classes)) {
                    return spell.classes.some(cls => {
                        return cls.id === classId || 
                               cls.name?.toLowerCase() === classId.toLowerCase() ||
                               String(cls).toLowerCase() === classId.toLowerCase();
                    });
                } else if (typeof spell.classes === 'string') {
                    return spell.classes.includes(classId);
                } else if (spell.class === classId) {
                    return true;
                }
                
                return false;
            });
            
            console.log(`✅ Найдено ${classSpells.length} заклинаний для класса ${classId} ИЗ БД`);
            
            return classSpells;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки заклинаний для класса ${classId}:`, error);
            return [];
        }
    }
};

// Добавляем в экспорт
window.DataService = DataService;

CharacterManager.getSkillDisplayName = function(skillId) {
    const skillNames = {
        'acrobatics': 'Акробатика',
        'animal-handling': 'Уход за животными',
        'arcana': 'Магия',
        'athletics': 'Атлетика',
        'deception': 'Обман',
        'history': 'История',
        'insight': 'Проницательность',
        'intimidation': 'Запугивание',
        'investigation': 'Расследование',
        'medicine': 'Медицина',
        'nature': 'Природа',
        'perception': 'Восприятие',
        'performance': 'Выступление',
        'persuasion': 'Убеждение',
        'religion': 'Религия',
        'sleight-of-hand': 'Ловкость рук',
        'stealth': 'Скрытность',
        'survival': 'Выживание'
    };
    
    return skillNames[skillId] || skillId;
};

CharacterManager.getSkillAbility = function(skillId) {
    const skillAbilities = {
        'acrobatics': 'dexterity',
        'animal-handling': 'wisdom',
        'arcana': 'intelligence',
        'athletics': 'strength',
        'deception': 'charisma',
        'history': 'intelligence',
        'insight': 'wisdom',
        'intimidation': 'charisma',
        'investigation': 'intelligence',
        'medicine': 'wisdom',
        'nature': 'intelligence',
        'perception': 'wisdom',
        'performance': 'charisma',
        'persuasion': 'charisma',
        'religion': 'intelligence',
        'sleight-of-hand': 'dexterity',
        'stealth': 'dexterity',
        'survival': 'wisdom'
    };
    
    return skillAbilities[skillId] || 'intelligence';
};

CharacterManager.calculateSkillModifier = function(character, skillId) {
    const skillAbility = this.getSkillAbility(skillId);
    const abilityScore = character.abilityScores?.[skillAbility] || 10;
    const abilityMod = Utils.calculateModifier(abilityScore);
    
    // Проверяем, владеет ли персонаж навыком
    const isProficient = character.skills?.[skillId]?.proficient || false;
    const proficiencyBonus = Utils.calculateProficiencyBonus(character.level || 1);
    
    let skillMod = abilityMod;
    
    if (isProficient) {
        skillMod += proficiencyBonus;
        console.log(`🎯 Навык ${skillId}: базовый ${abilityMod} + бонус мастерства ${proficiencyBonus} = ${skillMod}`);
    }
    
    // Дополнительные бонусы, если есть
    const skillBonus = character.skills?.[skillId]?.bonus || 0;
    skillMod += skillBonus;
    
    return skillMod;
};

// Обновляем CharacterManager для использования данных из БД
CharacterManager.getClassDisplayName = function(classId) {
    // Сначала проверяем кэш
    if (this._classCache && this._classCache[classId]) {
        return this._classCache[classId];
    }
    
    // Стандартные имена классов как fallback
    const classNames = {
        'fighter': 'Воин',
        'wizard': 'Волшебник',
        'rogue': 'Плут',
        'cleric': 'Жрец',
        'paladin': 'Паладин',
        'ranger': 'Следопыт',
        'sorcerer': 'Чародей',
        'warlock': 'Колдун',
        'bard': 'Бард',
        'druid': 'Друид',
        'monk': 'Монах',
        'barbarian': 'Варвар'
    };
    
    return classNames[classId] || classId;
};

CharacterManager.getRaceDisplayName = function(raceId) {
    const raceNames = {
        'human': 'Человек',
        'elf': 'Эльф',
        'dwarf': 'Дварф',
        'halfling': 'Халфлинг',
        'dragonborn': 'Драконорожденный',
        'gnome': 'Гном',
        'half-elf': 'Полуэльф',
        'half-orc': 'Полуорк',
        'tiefling': 'Тифлинг'
    };
    
    return raceNames[raceId] || raceId;
};

// Функция для расчета AC с данными из БД
CharacterManager.calculateACWithDB = async function(character) {
    try {
        if (!character || !character.armor) {
            console.log('⚠️ Персонаж или броня не определены');
            return 10;
        }
        
        console.log('🛡️ Расчет AC ИЗ ДАННЫХ БД для персонажа:', character.name);
        console.log('📊 Данные брони:', character.armor);
        
        // Загружаем данные о броне ИЗ БД
        const armorTypes = await DataService.loadArmorTypes();
        console.log(`📥 Загружено типов брони ИЗ БД: ${armorTypes.length}`);
        
        const armorType = character.armor.type || 'none';
        console.log(`🔍 Ищем броню с ID: ${armorType}`);
        
        const dexScore = character.abilityScores?.dexterity || 10;
        const dexMod = Utils.calculateModifier(dexScore);
        const hasShield = character.armor.shield || false;
        const shieldBonus = hasShield ? 2 : 0;
        
        // Находим данные о броне ИЗ БД
        const armorInfo = armorTypes.find(a => a.id === armorType);
        
        if (!armorInfo) {
            console.log(`⚠️ Броня "${armorType}" не найдена в БД, используем fallback расчет`);
            const fallbackAC = 10 + dexMod + shieldBonus;
            console.log(`📐 Fallback AC: 10 + ${dexMod} (DEX) + ${shieldBonus} (щит) = ${fallbackAC}`);
            return fallbackAC;
        }
        
        console.log(`✅ Найдена броня ИЗ БД:`, armorInfo);
        
        // Расчет AC на основе данных ИЗ БД
        let baseAC = armorInfo.baseAC || 0;
        const maxDex = armorInfo.maxDex !== undefined ? armorInfo.maxDex : 
                      (armorInfo.type === 'heavy' ? 0 : 
                       armorInfo.type === 'medium' ? 2 : 5);
        
        // Если без брони, используем базовый расчет
        if (armorType === 'none') {
            baseAC = 10;
            console.log('🛡️ Без брони: используем базовый AC 10');
        }
        
        const effectiveDex = Math.min(dexMod, maxDex);
        let ac = baseAC + effectiveDex + shieldBonus;
        
        console.log(`📐 Расчет AC: ${baseAC} (базовый) + ${effectiveDex} (DEX, макс. ${maxDex}) + ${shieldBonus} (щит) = ${ac}`);
        
        return ac;
        
    } catch (error) {
        console.error('❌ Ошибка расчета AC с данными БД:', error);
        return 10;
    }
};

// Обновляем функцию calculateAC в Utils
Utils.calculateAC = function(character) {
    return CharacterManager.calculateACWithDB(character);
};

// Добавляем в экспорт
window.ArmorData = ArmorData;

// Экспортируем
window.Utils = Utils;
window.CharacterManager = CharacterManager;
window.CharacterStorage = CharacterStorage;
window.DataLoader = DataLoader;
window.Common = Common;

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', Common.init);