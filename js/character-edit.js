// character-edit.js - исправленная версия с правильной работой с БД
const CharacterEditor = {
    state: {
        characterId: null,
        characterData: null,
        isDirty: false,
        currentTab: 'basic',
        spells: [], // Кэш заклинаний
        skills: [], // Кэш навыков ИЗ БД
        armorTypes: [] // Кэш типов брони ИЗ БД
    },

    async init() {
        console.log('✏️ Инициализация редактора персонажа...');
        
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.state.characterId = urlParams.get('id');
            
            this.updateTitle();
            this.initTabs();
            await this.loadData();
            this.initUI();
            this.initEventListeners();
            this.initBeforeUnload();
            
            console.log('✅ Редактор персонажа успешно инициализирован с данными ИЗ БД');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации редактора:', error);
            this.showError('Не удалось инициализировать редактор персонажа: ' + error.message);
        }
    },

    updateTitle() {
        const titleElement = document.getElementById('editTitle');
        const subtitleElement = document.getElementById('editSubtitle');
        
        if (this.state.characterId) {
            if (titleElement) titleElement.textContent = 'Редактирование персонажа';
            if (subtitleElement) subtitleElement.textContent = 'Загрузка данных...';
        } else {
            if (titleElement) titleElement.textContent = 'Создание нового персонажа';
            if (subtitleElement) subtitleElement.textContent = 'Заполните все необходимые поля';
        }
    },

    initTabs() {
        const tabs = document.querySelectorAll('.edit-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        this.switchTab('basic');
    },

    switchTab(tabId) {
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.edit-tab-content').forEach(content => {
            const contentId = content.id.replace('tab', '').toLowerCase();
            content.classList.toggle('active', contentId === tabId.toLowerCase());
        });
        
        this.state.currentTab = tabId;
        
        // Загружаем данные для активной вкладки
        if (tabId === 'spells') {
            this.loadSpellsTab();
        }
    },

    async loadData() {
        try {
            this.showLoading();
            
            console.log('📥 Загрузка данных ИЗ БД...');
            
            // Загружаем все опции ИЗ БД
            await this.loadOptionsFromDB();
            
            // Загружаем персонажа или создаем нового
            if (this.state.characterId) {
                await this.loadCharacter();
            } else {
                this.initNewCharacter();
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных ИЗ БД:', error);
            this.showError('Не удалось загрузить необходимые данные ИЗ БД: ' + error.message);
        }
    },

    async loadOptionsFromDB() {
        try {
            console.log('📋 Загрузка опций ИЗ БД...');
            
            // Загружаем расы ИЗ БД
            const races = await DataService.loadRaces();
            console.log(`✅ Загружено рас ИЗ БД: ${races.length}`);
            this.populateSelect('editCharacterRace', races, 'Выберите расу...');
            
            // Загружаем классы ИЗ БД
            const classes = await DataService.loadClasses();
            console.log(`✅ Загружено классов ИЗ БД: ${classes.length}`);
            this.populateSelect('editCharacterClass', classes, 'Выберите класс...');
            
            // Загружаем предыстории ИЗ БД
            const backgrounds = await DataService.loadBackgrounds();
            console.log(`✅ Загружено предысторий ИЗ БД: ${backgrounds.length}`);
            this.populateSelect('editCharacterBackground', backgrounds, 'Выберите предысторию...');
            
            // Загружаем типы брони ИЗ БД
            await this.loadArmorTypes();
            
            // Загружаем навыки ИЗ БД
            await this.loadSkills();
            
            // Загружаем мировоззрения
            this.populateAlignments();
            
            console.log('✅ Все опции загружены ИЗ БД');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки опций ИЗ БД:', error);
            throw error;
        }
    },

    async loadSkills() {
        try {
            console.log('📚 Загрузка навыков ИЗ БД...');
            
            // Загружаем навыки ИЗ БД
            this.state.skills = await DataService.loadSkills();
            
            console.log(`✅ Навыки загружены ИЗ БД: ${this.state.skills.length} навыков`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки навыков ИЗ БД:', error);
            this.state.skills = [];
        }
    },

    async loadArmorTypes() {
        try {
            console.log('🛡️ Загрузка типов брони ИЗ БД...');
            
            // Загружаем ИЗ БД
            this.state.armorTypes = await DataService.loadArmorTypes();
            
            const select = document.getElementById('editArmorType');
            
            if (!select) {
                console.error('❌ Элемент editArmorType не найден');
                return;
            }
            
            console.log(`📥 Загружено типов брони ИЗ БД: ${this.state.armorTypes.length}`);
            
            // Очищаем и добавляем опции ИЗ БД
            select.innerHTML = '<option value="">Выберите броню...</option>';
            
            this.state.armorTypes.forEach(armor => {
                const option = document.createElement('option');
                option.value = armor.id;
                option.textContent = `${armor.name} (AC ${armor.baseAC}${armor.maxDex !== undefined ? `, макс. Ловкость ${armor.maxDex}` : ''})`;
                select.appendChild(option);
                console.log(`🛡️ Добавлена броня ИЗ БД: ${armor.id} - ${armor.name}`);
            });
            
            console.log(`✅ Типы брони загружены ИЗ БД: ${this.state.armorTypes.length} типов`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки типов брони ИЗ БД:', error);
        }
    },

    populateSelect(selectId, items, placeholder = 'Выберите...') {
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Элемент ${selectId} не найден`);
            return;
        }
        
        // Очищаем и добавляем опции
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        items.forEach(item => {
            const option = document.createElement('option');
            const itemId = item.id || item.name?.toLowerCase() || String(item);
            const itemName = item.name || item.title || String(item);
            
            option.value = itemId;
            option.textContent = itemName;
            select.appendChild(option);
        });
        
        console.log(`✅ Заполнен select ${selectId}: ${items.length} опций`);
    },

    populateAlignments() {
        const alignments = [
            { id: 'lawful-good', name: 'Законно-добрый' },
            { id: 'neutral-good', name: 'Нейтрально-добрый' },
            { id: 'chaotic-good', name: 'Хаотично-добрый' },
            { id: 'lawful-neutral', name: 'Законно-нейтральный' },
            { id: 'true-neutral', name: 'Истинно нейтральный' },
            { id: 'chaotic-neutral', name: 'Хаотично-нейтральный' },
            { id: 'lawful-evil', name: 'Законно-злой' },
            { id: 'neutral-evil', name: 'Нейтрально-злой' },
            { id: 'chaotic-evil', name: 'Хаотично-злой' }
        ];
        
        this.populateSelect('editCharacterAlignment', alignments, 'Выберите мировоззрение...');
    },

    async loadCharacter() {
        try {
            console.log(`📥 Загрузка персонажа: ${this.state.characterId}`);
            
            this.state.characterData = await CharacterManager.loadCharacterById(this.state.characterId);
            
            if (!this.state.characterData) {
                throw new Error('Персонаж не найден');
            }
            
            // Проверяем и корректируем данные
            this.validateCharacterData();
            
            this.state.originalData = JSON.parse(JSON.stringify(this.state.characterData));
            
            // Обновляем заголовок
            const titleElement = document.getElementById('editTitle');
            const subtitleElement = document.getElementById('editSubtitle');
            
            if (titleElement) titleElement.textContent = `Редактирование: ${this.state.characterData.name}`;
            if (subtitleElement) subtitleElement.textContent = 
                `${CharacterManager.getClassDisplayName(this.state.characterData.class)}, уровень ${this.state.characterData.level}`;
            
            console.log('✅ Персонаж загружен из БД');
            
            // Заполняем форму
            this.populateForm();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажа:', error);
            throw error;
        }
    },

    validateCharacterData() {
        if (!this.state.characterData) return;
        
        console.log('🔍 Проверка данных персонажа:', this.state.characterData);
        
        // Убедимся, что abilityScores существуют и корректны
        if (!this.state.characterData.abilityScores) {
            console.log('⚠️ abilityScores не найдены, инициализируем');
            this.state.characterData.abilityScores = {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            };
        }
        
        // Проверяем каждую характеристику
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        abilities.forEach(ability => {
            const value = this.state.characterData.abilityScores[ability];
            if (value === undefined || value === null || isNaN(value) || value < 1 || value > 30) {
                console.log(`⚠️ Неправильное значение ${ability}: ${value}, устанавливаем 10`);
                this.state.characterData.abilityScores[ability] = 10;
            }
        });
        
        // Убедимся, что есть skills
        if (!this.state.characterData.skills) {
            console.log('⚠️ skills не найдены, инициализируем');
            this.state.characterData.skills = {};
        }
        
        // Убедимся, что есть основные поля
        if (!this.state.characterData.level || isNaN(this.state.characterData.level)) {
            console.log('⚠️ level не найден, устанавливаем 1');
            this.state.characterData.level = 1;
        }
        
        if (!this.state.characterData.hp) {
            console.log('⚠️ hp не найдены, инициализируем');
            this.state.characterData.hp = {
                max: 10,
                current: 10,
                temp: 0
            };
        }
        
        if (!this.state.characterData.armor) {
            console.log('⚠️ armor не найдена, инициализируем');
            this.state.characterData.armor = {
                type: 'none',
                shield: false
            };
        }
        
        // Убедимся, что есть объект notes
        if (!this.state.characterData.notes) {
            console.log('⚠️ notes не найдены, инициализируем');
            this.state.characterData.notes = {
                history: '',
                appearance: '',
                personality: '',
                additional: ''
            };
        }
        
        // Убедимся, что есть объект appearance
        if (!this.state.characterData.appearance) {
            console.log('⚠️ appearance не найден, инициализируем');
            this.state.characterData.appearance = {
                age: '',
                height: '',
                weight: '',
                eyes: '',
                skin: '',
                hair: ''
            };
        }
        
        // Убедимся, что есть объект bonuses
        if (!this.state.characterData.bonuses) {
            console.log('⚠️ bonuses не найдены, инициализируем');
            this.state.characterData.bonuses = {
                proficiencyBonus: Utils.calculateProficiencyBonus(this.state.characterData.level || 1),
                inspiration: false
            };
        }
        
        console.log('✅ Данные персонажа проверены и скорректированы');
    },

    initNewCharacter() {
        this.state.characterData = {
            id: Date.now().toString(),
            name: '',
            race: '',
            class: '',
            background: '',
            alignment: '',
            level: 1,
            xp: 0,
            speed: 30,
            
            abilityScores: {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            },
            
            // Инициализируем навыки
            skills: {},
            
            armor: {
                type: 'none',
                shield: false
            },
            
            hp: {
                max: 10,
                current: 10,
                temp: 0,
                hitDice: 'd8'
            },
            
            weapons: [],
            items: [],
            spells: [],
            
            notes: {
                history: '',
                appearance: '',
                personality: '',
                additional: ''
            },
            
            appearance: {
                age: '',
                height: '',
                weight: '',
                eyes: '',
                skin: '',
                hair: ''
            },
            
            bonuses: {
                proficiencyBonus: 2,
                inspiration: false
            },
            
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isDraft: true
        };
        
        this.state.originalData = JSON.parse(JSON.stringify(this.state.characterData));
        
        console.log('🆕 Инициализирован новый персонаж со всеми полями, включая навыки');
    },

    populateForm() {
        const character = this.state.characterData;
        if (!character) return;
        
        console.log('📝 Заполнение формы данными ИЗ БД...');
        
        // Основные поля
        this.setValue('editCharacterName', character.name || '');
        this.setValue('editCharacterLevel', character.level || 1);
        this.setValue('editCharacterXP', character.xp || 0);
        this.setValue('editCharacterSpeed', character.speed || 30);
        
        // Выпадающие списки
        this.setValue('editCharacterRace', character.race || '');
        this.setValue('editCharacterClass', character.class || '');
        this.setValue('editCharacterBackground', character.background || '');
        this.setValue('editCharacterAlignment', character.alignment || '');
        this.setValue('editArmorType', character.armor?.type || 'none');
        
        // Характеристики
        this.setValue('editStrength', character.abilityScores?.strength || 10);
        this.setValue('editDexterity', character.abilityScores?.dexterity || 10);
        this.setValue('editConstitution', character.abilityScores?.constitution || 10);
        this.setValue('editIntelligence', character.abilityScores?.intelligence || 10);
        this.setValue('editWisdom', character.abilityScores?.wisdom || 10);
        this.setValue('editCharisma', character.abilityScores?.charisma || 10);
        
        // Обновляем модификаторы
        this.updateAbilityModifiers();
        
        // Броня
        this.setCheckboxValue('editArmorShield', character.armor?.shield || false);
        this.updateAC();
        
        // Здоровье
        this.setValue('editHPMax', character.hp?.max || 10);
        this.setValue('editHPCurrent', character.hp?.current || 10);
        this.setValue('editHPTemp', character.hp?.temp || 0);
        this.setValue('editHitDice', character.hp?.hitDice || 'd8');
        
        // Снаряжение
        if (character.items && character.items.length > 0) {
            const equipmentText = character.items.map(item => 
                typeof item === 'string' ? item : item.name || ''
            ).filter(item => item).join(',\n');
            this.setValue('editEquipment', equipmentText);
        }
        
        // Заметки
        this.setValue('editCharacterHistory', character.notes?.history || '');
        this.setValue('editCharacterAppearance', character.notes?.appearance || '');
        this.setValue('editCharacterPersonality', character.notes?.personality || '');
        this.setValue('editCharacterAdditional', character.notes?.additional || '');
        
        // Внешность
        const appearance = character.appearance || {};
        this.setValue('editCharacterAge', appearance.age || '');
        this.setValue('editCharacterHeight', appearance.height || '');
        this.setValue('editCharacterWeight', appearance.weight || '');
        this.setValue('editCharacterEyes', appearance.eyes || '');
        this.setValue('editCharacterSkin', appearance.skin || '');
        this.setValue('editCharacterHair', appearance.hair || '');
        
        console.log('✅ Форма заполнена данными ИЗ БД');
    },

    setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Преобразуем значение в строку
            const stringValue = value !== undefined && value !== null ? String(value) : '';
            element.value = stringValue;
        }
    },

    setCheckboxValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = !!value;
        }
    },

    updateAbilityModifiers() {
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach(ability => {
            const scoreInput = document.getElementById(`edit${ability.charAt(0).toUpperCase() + ability.slice(1)}`);
            const modifierElement = document.getElementById(`${ability}Modifier`);
            
            if (scoreInput && modifierElement) {
                const score = parseInt(scoreInput.value) || 10;
                const modifier = Math.floor((score - 10) / 2);
                const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString();
                
                modifierElement.textContent = modifierStr;
                modifierElement.className = `ability-modifier-edit ${modifier >= 0 ? 'positive' : 'negative'}`;
            }
        });
    },

    async updateAC() {
        try {
            console.log('🛡️ Обновление AC с данными ИЗ БД...');
            
            const dexInput = document.getElementById('editDexterity');
            const armorSelect = document.getElementById('editArmorType');
            const shieldCheckbox = document.getElementById('editArmorShield');
            
            if (!dexInput || !armorSelect) {
                console.error('❌ Не найдены элементы для расчета AC');
                return;
            }
            
            const dexScore = parseInt(dexInput.value) || 10;
            const dexMod = Math.floor((dexScore - 10) / 2);
            const hasShield = shieldCheckbox?.checked || false;
            const armorType = armorSelect.value || 'none';
            
            console.log(`📊 Параметры AC: DEX=${dexScore} (мод ${dexMod}), броня=${armorType}, щит=${hasShield}`);
            
            // Загружаем данные о броне ИЗ БД
            if (this.state.armorTypes.length === 0) {
                console.log('🔄 Загружаем броню ИЗ БД...');
                await this.loadArmorTypes();
            }
            
            const armorInfo = this.state.armorTypes.find(a => a.id === armorType);
            
            let ac = 10; // Базовый AC
            
            if (armorInfo) {
                console.log(`✅ Броня найдена ИЗ БД:`, armorInfo);
                
                // Расчет на основе данных ИЗ БД
                const baseAC = armorInfo.baseAC || 0;
                const maxDex = armorInfo.maxDex !== undefined ? armorInfo.maxDex : 
                              (armorInfo.type === 'heavy' ? 0 : 
                               armorInfo.type === 'medium' ? 2 : 5);
                
                console.log(`📐 Параметры брони ИЗ БД: baseAC=${baseAC}, maxDex=${maxDex}, type=${armorInfo.type}`);
                
                if (armorType === 'none') {
                    ac = 10 + dexMod;
                } else {
                    const effectiveDex = Math.min(dexMod, maxDex);
                    ac = baseAC + effectiveDex;
                }
            } else {
                console.log(`⚠️ Броня "${armorType}" не найдена в данных ИЗ БД, используем базовый расчет`);
                ac = 10 + dexMod;
            }
            
            // Добавляем бонус щита
            if (hasShield) {
                console.log('🛡️ Добавляем бонус щита +2');
                ac += 2;
            }
            
            console.log(`🎯 Итоговый AC: ${ac}`);
            
            // Обновляем отображение
            const acElement = document.getElementById('editArmorClass');
            if (acElement) {
                acElement.textContent = Math.max(10, ac);
                
                // Показываем расчет
                const breakdownElement = document.getElementById('acBreakdown');
                if (breakdownElement) {
                    const armorName = armorInfo?.name || 'Без брони';
                    breakdownElement.innerHTML = `
                        <div class="ac-calculation">
                            <strong>Расчет AC ИЗ ДАННЫХ БД:</strong><br>
                            ${armorInfo ? `${armorInfo.baseAC || 0} (${armorName})` : '10 (базовый)'} + 
                            ${dexMod >= 0 ? '+' + dexMod : dexMod} (Ловкость${armorInfo?.maxDex !== undefined ? `, макс. ${armorInfo.maxDex}` : ''}) + 
                            ${hasShield ? '+2 (Щит)' : '+0 (без щита)'} = 
                            ${Math.max(10, ac)}
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка расчета AC с данными ИЗ БД:', error);
        }
    },

    renderSkills() {
        if (!this.state.skills || this.state.skills.length === 0) {
            console.log('⚠️ Навыки не загружены');
            return;
        }
        
        const skillsContainer = document.getElementById('skillsContainer');
        if (!skillsContainer) {
            console.log('📌 Создаем контейнер для навыков...');
            // Добавляем секцию навыков в вкладку характеристик
            const abilitiesSection = document.getElementById('tabAbilities');
            if (abilitiesSection) {
                const skillsSection = document.createElement('div');
                skillsSection.className = 'edit-section';
                skillsSection.id = 'skillsSection';
                skillsSection.innerHTML = `
                    <h3><i class="fas fa-tasks"></i> Навыки</h3>
                    <div class="skills-grid" id="skillsContainer"></div>
                `;
                abilitiesSection.appendChild(skillsSection);
            }
        }
        
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        
        const character = this.state.characterData;
        const proficiencyBonus = Utils.calculateProficiencyBonus(character.level || 1);
        
        const skillsHTML = this.state.skills.map(skill => {
            const skillId = skill.id || skill.name?.toLowerCase();
            const skillName = skill.name || 'Неизвестный навык';
            const abilityName = CharacterManager.getSkillAbility(skillId);
            
            // Получаем данные навыка из персонажа
            const skillData = character.skills?.[skillId] || { proficient: false, bonus: 0 };
            const isProficient = skillData.proficient || false;
            
            // Рассчитываем модификатор
            const abilityScore = character.abilityScores?.[abilityName] || 10;
            const abilityMod = Utils.calculateModifier(abilityScore);
            let skillMod = abilityMod;
            
            if (isProficient) {
                skillMod += proficiencyBonus;
            }
            
            // Добавляем бонус навыка
            skillMod += skillData.bonus || 0;
            
            return `
                <div class="skill-item" data-skill="${skillId}">
                    <div class="skill-checkbox">
                        <input type="checkbox" 
                               id="skill-${skillId}" 
                               ${isProficient ? 'checked' : ''}
                               data-skill="${skillId}">
                    </div>
                    <div class="skill-info">
                        <label for="skill-${skillId}" class="skill-name">
                            ${skillName}
                        </label>
                        <div class="skill-ability">
                            (${Utils.getAbilityAbbr(abilityName)})
                        </div>
                    </div>
                    <div class="skill-modifier">
                        <span class="modifier-value ${skillMod >= 0 ? 'positive' : 'negative'}">
                            ${skillMod >= 0 ? '+' + skillMod : skillMod}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = skillsHTML;
        
        // Добавляем обработчики для чекбоксов навыков
        this.initSkillsEventListeners();
        
        console.log(`✅ Отображено навыков: ${this.state.skills.length}`);
    },

    initSkillsEventListeners() {
        const skillsContainer = document.getElementById('skillsContainer');
        if (!skillsContainer) return;
        
        skillsContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.skill) {
                const skillId = e.target.dataset.skill;
                const isProficient = e.target.checked;
                
                console.log(`🎯 Навык ${skillId}: ${isProficient ? 'добавлен' : 'удален'}`);
                
                // Обновляем данные персонажа
                if (!this.state.characterData.skills) {
                    this.state.characterData.skills = {};
                }
                
                if (!this.state.characterData.skills[skillId]) {
                    this.state.characterData.skills[skillId] = { proficient: false, bonus: 0 };
                }
                
                this.state.characterData.skills[skillId].proficient = isProficient;
                
                // Обновляем отображение модификатора
                this.updateSkillModifierDisplay(skillId);
                
                this.markAsDirty();
            }
        });
    },

    updateSkillModifierDisplay(skillId) {
        const skillItem = document.querySelector(`.skill-item[data-skill="${skillId}"]`);
        if (!skillItem || !this.state.characterData) return;
        
        const character = this.state.characterData;
        const skillData = character.skills?.[skillId] || { proficient: false, bonus: 0 };
        const abilityName = CharacterManager.getSkillAbility(skillId);
        const abilityScore = character.abilityScores?.[abilityName] || 10;
        const abilityMod = Utils.calculateModifier(abilityScore);
        const proficiencyBonus = Utils.calculateProficiencyBonus(character.level || 1);
        
        let skillMod = abilityMod;
        
        if (skillData.proficient) {
            skillMod += proficiencyBonus;
        }
        
        skillMod += skillData.bonus || 0;
        
        const modifierElement = skillItem.querySelector('.modifier-value');
        if (modifierElement) {
            modifierElement.textContent = skillMod >= 0 ? '+' + skillMod : skillMod.toString();
            modifierElement.className = `modifier-value ${skillMod >= 0 ? 'positive' : 'negative'}`;
        }
    },

    initUI() {
        this.initAbilities();
        this.initWeapons();
        this.updatePreview();
        
        // Добавляем навыки
        setTimeout(() => {
            this.renderSkills();
        }, 100);
    },

    initAbilities() {
        const abilitiesGrid = document.getElementById('abilitiesGridEdit');
        if (!abilitiesGrid) return;
        
        const abilities = [
            { id: 'strength', name: 'Сила', abbr: 'STR', icon: 'fist-raised' },
            { id: 'dexterity', name: 'Ловкость', abbr: 'DEX', icon: 'running' },
            { id: 'constitution', name: 'Телосложение', abbr: 'CON', icon: 'heartbeat' },
            { id: 'intelligence', name: 'Интеллект', abbr: 'INT', icon: 'brain' },
            { id: 'wisdom', name: 'Мудрость', abbr: 'WIS', icon: 'eye' },
            { id: 'charisma', name: 'Харизма', abbr: 'CHA', icon: 'comments' }
        ];
        
        abilitiesGrid.innerHTML = abilities.map(ability => {
            const score = this.state.characterData.abilityScores[ability.id] || 10;
            const modifier = Math.floor((score - 10) / 2);
            const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString();
            
            return `
                <div class="ability-edit-card">
                    <div class="ability-edit-header">
                        <div class="ability-edit-name">
                            <i class="fas fa-${ability.icon}"></i> ${ability.name}
                        </div>
                        <div class="ability-edit-abbr">${ability.abbr}</div>
                    </div>
                    <div class="ability-edit-score">
                        <input type="number" 
                               id="edit${ability.id.charAt(0).toUpperCase() + ability.id.slice(1)}" 
                               class="ability-score-input" 
                               min="1" 
                               max="30" 
                               value="${score}"
                               data-ability="${ability.id}">
                    </div>
                    <div class="ability-edit-modifier">
                        <div class="modifier-label">Модификатор</div>
                        <div id="${ability.id}Modifier" class="ability-modifier-edit">
                            ${modifierStr}
                        </div>
                    </div>
                    <div class="ability-edit-controls">
                        <button type="button" class="btn-score-minus" data-ability="${ability.id}">-</button>
                        <button type="button" class="btn-score-plus" data-ability="${ability.id}">+</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    initWeapons() {
        const weaponsContainer = document.getElementById('editWeaponsContainer');
        if (!weaponsContainer) return;
        
        const weapons = this.state.characterData.weapons || [];
        
        if (weapons.length === 0) {
            weaponsContainer.innerHTML = `
                <div class="empty-weapons">
                    <i class="fas fa-swords"></i>
                    <p>Оружие не добавлено</p>
                </div>
            `;
        } else {
            weaponsContainer.innerHTML = weapons.map((weapon, index) => {
                const weaponName = typeof weapon === 'object' ? weapon.name || '' : String(weapon);
                const weaponDamage = typeof weapon === 'object' ? weapon.damage || '1d6' : '1d6';
                const weaponType = typeof weapon === 'object' ? weapon.type || 'melee' : 'melee';
                
                return `
                    <div class="weapon-row-edit" data-index="${index}">
                        <input type="text" 
                               class="weapon-name-input-edit" 
                               value="${this.escapeHtml(weaponName)}" 
                               placeholder="Название оружия">
                        
                        <input type="text" 
                               class="weapon-damage-input-edit" 
                               value="${this.escapeHtml(weaponDamage)}" 
                               placeholder="Урон (1d8)">
                        
                        <select class="weapon-type-select-edit">
                            <option value="melee" ${weaponType === 'melee' ? 'selected' : ''}>Ближний бой</option>
                            <option value="ranged" ${weaponType === 'ranged' ? 'selected' : ''}>Дальний бой</option>
                        </select>
                        
                        <button type="button" class="btn btn-danger btn-weapon-remove" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');
        }
    },

    async loadSpellsTab() {
        try {
            const spellsContainer = document.getElementById('editSpellsContainer');
            if (!spellsContainer) return;
            
            console.log('🔮 Загрузка данных для вкладки заклинаний...');
            
            // Показываем индикатор загрузки
            spellsContainer.innerHTML = `
                <div class="loading-spells">
                    <div class="loader-small"></div>
                    <p>Загрузка заклинаний...</p>
                </div>
            `;
            
            // Получаем выбранный класс
            const classSelect = document.getElementById('editCharacterClass');
            const selectedClass = classSelect?.value;
            
            if (!selectedClass) {
                spellsContainer.innerHTML = `
                    <div class="no-spells">
                        <i class="fas fa-magic"></i>
                        <h4>Выберите класс</h4>
                        <p>Для отображения заклинаний выберите класс персонажа.</p>
                    </div>
                `;
                return;
            }
            
            // Загружаем заклинания для выбранного класса
            const classSpells = await DataService.loadSpellsForClass(selectedClass);
            
            if (classSpells.length === 0) {
                spellsContainer.innerHTML = `
                    <div class="no-spells">
                        <i class="fas fa-magic"></i>
                        <h4>Нет доступных заклинаний</h4>
                        <p>Для выбранного класса "${CharacterManager.getClassDisplayName(selectedClass)}" не найдено заклинаний в базе данных.</p>
                    </div>
                `;
                return;
            }
            
            // Сохраняем в кэш
            this.state.spells = classSpells;
            
            // Группируем заклинания по уровням
            const spellsByLevel = {};
            classSpells.forEach(spell => {
                const level = spell.level || 0;
                if (!spellsByLevel[level]) {
                    spellsByLevel[level] = [];
                }
                spellsByLevel[level].push(spell);
            });
            
            // Отображаем заклинания
            let spellsHTML = '';
            const levels = Object.keys(spellsByLevel).sort((a, b) => a - b);
            
            levels.forEach(level => {
                const levelSpells = spellsByLevel[level];
                const levelName = level == 0 ? 'Заговоры' : `Уровень ${level}`;
                
                spellsHTML += `
                    <div class="spell-level-section-edit">
                        <h4>${levelName} (${levelSpells.length})</h4>
                        <div class="spells-grid-edit">
                            ${levelSpells.map(spell => {
                                const isSelected = this.state.characterData.spells?.some(s => 
                                    (typeof s === 'object' && s.id === spell.id) || 
                                    (typeof s === 'string' && s === spell.id) ||
                                    (typeof s === 'object' && s.name === spell.name)
                                );
                                
                                return `
                                    <div class="spell-card-edit ${isSelected ? 'selected' : ''}" data-spell-id="${spell.id}">
                                        <div class="spell-card-content-edit">
                                            <input type="checkbox" 
                                                   id="spell-${spell.id}" 
                                                   ${isSelected ? 'checked' : ''}
                                                   data-spell-id="${spell.id}">
                                            <div>
                                                <span class="spell-name">${spell.name || 'Без названия'}</span>
                                                <div class="spell-details">
                                                    <span class="spell-school">${spell.school || 'Неизвестно'}</span>
                                                    ${spell.ritual ? '<span class="spell-ritual">Ритуал</span>' : ''}
                                                    ${spell.concentration ? '<span class="spell-concentration">Концентрация</span>' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            });
            
            spellsContainer.innerHTML = spellsHTML;
            
            // Добавляем обработчики для чекбоксов
            this.initSpellsEventListeners();
            
            console.log(`✅ Загружено ${classSpells.length} заклинаний для класса ${selectedClass}`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки вкладки заклинаний:', error);
            
            const spellsContainer = document.getElementById('editSpellsContainer');
            if (spellsContainer) {
                spellsContainer.innerHTML = `
                    <div class="error-spells">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Ошибка загрузки</h4>
                        <p>Не удалось загрузить заклинания: ${error.message}</p>
                        <button class="btn btn-secondary" onclick="location.reload()">
                            <i class="fas fa-sync-alt"></i> Попробовать снова
                        </button>
                    </div>
                `;
            }
        }
    },

    initSpellsEventListeners() {
        const spellsContainer = document.getElementById('editSpellsContainer');
        if (!spellsContainer) return;
        
        // Обработчик для чекбоксов заклинаний
        spellsContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.spellId) {
                const spellId = e.target.dataset.spellId;
                const isChecked = e.target.checked;
                const spellCard = e.target.closest('.spell-card-edit');
                
                if (spellCard) {
                    spellCard.classList.toggle('selected', isChecked);
                }
                
                this.updateSelectedSpells(spellId, isChecked);
                this.markAsDirty();
            }
        });
        
        // Обработчик для клика по карточке заклинания
        spellsContainer.addEventListener('click', (e) => {
            const spellCard = e.target.closest('.spell-card-edit');
            if (spellCard && !e.target.closest('input[type="checkbox"]')) {
                const checkbox = spellCard.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        });
    },

    updateSelectedSpells(spellId, isSelected) {
        if (!this.state.characterData.spells) {
            this.state.characterData.spells = [];
        }
        
        // Находим полную информацию о заклинании
        const spellInfo = this.state.spells.find(s => s.id === spellId);
        
        if (isSelected) {
            // Добавляем заклинание, если его еще нет
            if (!this.state.characterData.spells.some(s => 
                (typeof s === 'object' && s.id === spellId) || 
                (typeof s === 'string' && s === spellId)
            )) {
                this.state.characterData.spells.push(spellInfo || { id: spellId });
            }
        } else {
            // Удаляем заклинание
            this.state.characterData.spells = this.state.characterData.spells.filter(s => 
                !((typeof s === 'object' && s.id === spellId) || 
                  (typeof s === 'string' && s === spellId))
            );
        }
        
        console.log(`📝 Обновлен список заклинаний: ${this.state.characterData.spells.length} заклинаний`);
    },

    updatePreview() {
        const previewElement = document.getElementById('editPreview');
        if (!previewElement) return;
        
        const name = document.getElementById('editCharacterName')?.value || 'Без имени';
        const level = document.getElementById('editCharacterLevel')?.value || 1;
        const charClass = document.getElementById('editCharacterClass')?.value;
        const race = document.getElementById('editCharacterRace')?.value;
        
        let previewHTML = `
            <h3><i class="fas fa-eye"></i> Быстрый просмотр</h3>
            <div class="preview-content">
                <div class="preview-name">${this.escapeHtml(name)}</div>
                <div class="preview-details">
        `;
        
        if (level) {
            previewHTML += `<div class="preview-level">Уровень ${this.escapeHtml(String(level))}</div>`;
        }
        
        if (charClass) {
            previewHTML += `<div class="preview-class">${CharacterManager.getClassDisplayName(charClass)}</div>`;
        }
        
        if (race) {
            previewHTML += `<div class="preview-race">${CharacterManager.getRaceDisplayName(race)}</div>`;
        }
        
        previewHTML += `
                </div>
            </div>
        `;
        
        previewElement.innerHTML = previewHTML;
    },

    initEventListeners() {
        this.initAbilityEventListeners();
        this.initArmorEventListeners();
        this.initWeaponEventListeners();
        this.initBasicEventListeners();
        this.initActionButtons();
    },

    initAbilityEventListeners() {
        document.querySelectorAll('.ability-score-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updateAbilityModifiers();
                this.updateAC();
                this.markAsDirty();
            });
        });
        
        document.querySelectorAll('.btn-score-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ability = e.target.dataset.ability || 
                               e.target.closest('[data-ability]')?.dataset.ability;
                if (ability) {
                    this.adjustAbilityScore(ability, 1);
                }
            });
        });
        
        document.querySelectorAll('.btn-score-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ability = e.target.dataset.ability || 
                               e.target.closest('[data-ability]')?.dataset.ability;
                if (ability) {
                    this.adjustAbilityScore(ability, -1);
                }
            });
        });
        
        document.getElementById('generateScoresEdit')?.addEventListener('click', () => {
            this.generateAbilityScores();
        });
    },

    adjustAbilityScore(ability, delta) {
        const inputId = `edit${ability.charAt(0).toUpperCase() + ability.slice(1)}`;
        const input = document.getElementById(inputId);
        if (!input) return;
        
        let value = parseInt(input.value) || 10;
        value = Math.max(1, Math.min(30, value + delta));
        input.value = value;
        
        input.dispatchEvent(new Event('input'));
    },

    generateAbilityScores() {
        console.log('🎲 Генерация характеристик...');
        
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const scores = [];
        
        for (let i = 0; i < 6; i++) {
            const rolls = [];
            for (let j = 0; j < 4; j++) {
                rolls.push(Math.floor(Math.random() * 6) + 1);
            }
            
            rolls.sort((a, b) => a - b);
            rolls.shift();
            
            const score = rolls.reduce((sum, roll) => sum + roll, 0);
            scores.push(score);
        }
        
        scores.sort((a, b) => b - a);
        
        abilities.forEach((ability, index) => {
            const input = document.getElementById(`edit${ability.charAt(0).toUpperCase() + ability.slice(1)}`);
            if (input) {
                input.value = scores[index];
            }
        });
        
        this.updateAbilityModifiers();
        this.updateAC();
        this.markAsDirty();
        
        Utils.showNotification('Характеристики сгенерированы', 'success');
    },

    initArmorEventListeners() {
        const armorTypeSelect = document.getElementById('editArmorType');
        const shieldCheckbox = document.getElementById('editArmorShield');
        
        if (armorTypeSelect) {
            armorTypeSelect.addEventListener('change', () => {
                this.updateAC();
                this.markAsDirty();
            });
        }
        
        if (shieldCheckbox) {
            shieldCheckbox.addEventListener('change', () => {
                this.updateAC();
                this.markAsDirty();
            });
        }
        
        // Обновляем заклинания при изменении класса
        const classSelect = document.getElementById('editCharacterClass');
        if (classSelect) {
            classSelect.addEventListener('change', () => {
                if (this.state.currentTab === 'spells') {
                    this.loadSpellsTab();
                }
                this.updatePreview();
                this.markAsDirty();
            });
        }
    },

    initWeaponEventListeners() {
        document.getElementById('addWeaponEdit')?.addEventListener('click', () => {
            this.addWeapon();
        });
        
        document.getElementById('editWeaponsContainer')?.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.btn-weapon-remove');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                this.removeWeapon(index);
            }
        });
    },

    addWeapon() {
        const weaponsContainer = document.getElementById('editWeaponsContainer');
        if (!weaponsContainer) return;
        
        const emptyMessage = weaponsContainer.querySelector('.empty-weapons');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const weaponIndex = document.querySelectorAll('.weapon-row-edit').length;
        const weaponHTML = `
            <div class="weapon-row-edit" data-index="${weaponIndex}">
                <input type="text" 
                       class="weapon-name-input-edit" 
                       value="" 
                       placeholder="Название оружия">
                
                <input type="text" 
                       class="weapon-damage-input-edit" 
                       value="" 
                       placeholder="Урон (1d8)">
                
                <select class="weapon-type-select-edit">
                    <option value="melee">Ближний бой</option>
                    <option value="ranged">Дальний бой</option>
                </select>
                
                <button type="button" class="btn btn-danger btn-weapon-remove" data-index="${weaponIndex}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        weaponsContainer.insertAdjacentHTML('beforeend', weaponHTML);
        this.markAsDirty();
    },

    removeWeapon(index) {
        const weaponRow = document.querySelector(`.weapon-row-edit[data-index="${index}"]`);
        if (weaponRow) {
            weaponRow.remove();
            
            document.querySelectorAll('.weapon-row-edit').forEach((row, newIndex) => {
                row.dataset.index = newIndex;
                const removeBtn = row.querySelector('.btn-weapon-remove');
                if (removeBtn) {
                    removeBtn.dataset.index = newIndex;
                }
            });
            
            if (document.querySelectorAll('.weapon-row-edit').length === 0) {
                const weaponsContainer = document.getElementById('editWeaponsContainer');
                if (weaponsContainer) {
                    weaponsContainer.innerHTML = `
                        <div class="empty-weapons">
                            <i class="fas fa-swords"></i>
                            <p>Оружие не добавлено</p>
                        </div>
                    `;
                }
            }
            
            this.markAsDirty();
        }
    },

    initBasicEventListeners() {
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.addEventListener('input', () => this.markAsDirty());
            element.addEventListener('change', () => this.markAsDirty());
        });
        
        document.getElementById('editCharacterName')?.addEventListener('input', () => {
            this.updatePreview();
        });
    },

    initActionButtons() {
        document.getElementById('saveCharacterEdit')?.addEventListener('click', async () => {
            await this.saveCharacter();
        });
        
        document.getElementById('deleteCharacterEdit')?.addEventListener('click', () => {
            this.deleteCharacter();
        });
    },

    initBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isDirty) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?';
                return e.returnValue;
            }
        });
    },

    markAsDirty() {
        this.state.isDirty = true;
        const saveBtn = document.getElementById('saveCharacterEdit');
        if (saveBtn) {
            saveBtn.classList.add('btn-warning');
        }
    },

    markAsSaved() {
        this.state.isDirty = false;
        const saveBtn = document.getElementById('saveCharacterEdit');
        if (saveBtn) {
            saveBtn.classList.remove('btn-warning');
        }
    },

    collectCharacterData() {
        const character = {
            id: this.state.characterId || Date.now().toString(),
            name: document.getElementById('editCharacterName')?.value?.trim() || 'Без имени',
            race: document.getElementById('editCharacterRace')?.value || '',
            class: document.getElementById('editCharacterClass')?.value || '',
            background: document.getElementById('editCharacterBackground')?.value || '',
            alignment: document.getElementById('editCharacterAlignment')?.value || '',
            level: parseInt(document.getElementById('editCharacterLevel')?.value) || 1,
            xp: parseInt(document.getElementById('editCharacterXP')?.value) || 0,
            speed: parseInt(document.getElementById('editCharacterSpeed')?.value) || 30,
            
            abilityScores: {
                strength: parseInt(document.getElementById('editStrength')?.value) || 10,
                dexterity: parseInt(document.getElementById('editDexterity')?.value) || 10,
                constitution: parseInt(document.getElementById('editConstitution')?.value) || 10,
                intelligence: parseInt(document.getElementById('editIntelligence')?.value) || 10,
                wisdom: parseInt(document.getElementById('editWisdom')?.value) || 10,
                charisma: parseInt(document.getElementById('editCharisma')?.value) || 10
            },
            
            // Сохраняем навыки
            skills: this.state.characterData?.skills || {},
            
            armor: {
                type: document.getElementById('editArmorType')?.value || 'none',
                shield: document.getElementById('editArmorShield')?.checked || false
            },
            
            weapons: this.collectWeapons(),
            
            spells: this.state.characterData?.spells || [],
            
            hp: {
                max: parseInt(document.getElementById('editHPMax')?.value) || 10,
                current: parseInt(document.getElementById('editHPCurrent')?.value) || 10,
                temp: parseInt(document.getElementById('editHPTemp')?.value) || 0,
                hitDice: document.getElementById('editHitDice')?.value || 'd8'
            },
            
            notes: {
                history: document.getElementById('editCharacterHistory')?.value || '',
                appearance: document.getElementById('editCharacterAppearance')?.value || '',
                personality: document.getElementById('editCharacterPersonality')?.value || '',
                additional: document.getElementById('editCharacterAdditional')?.value || ''
            },
            
            appearance: {
                age: document.getElementById('editCharacterAge')?.value || '',
                height: document.getElementById('editCharacterHeight')?.value || '',
                weight: document.getElementById('editCharacterWeight')?.value || '',
                eyes: document.getElementById('editCharacterEyes')?.value || '',
                skin: document.getElementById('editCharacterSkin')?.value || '',
                hair: document.getElementById('editCharacterHair')?.value || ''
            },
            
            bonuses: {
                proficiencyBonus: Utils.calculateProficiencyBonus(parseInt(document.getElementById('editCharacterLevel')?.value) || 1),
                inspiration: false
            },
            
            updatedAt: Date.now(),
            isDraft: false
        };
        
        // Добавляем дату создания
        if (!this.state.characterId) {
            character.createdAt = Date.now();
        } else {
            character.createdAt = this.state.characterData?.createdAt || Date.now();
        }
        
        // Добавляем другие поля, которые могли быть в оригинальных данных
        if (this.state.characterData) {
            // Добавляем особенности, если они есть
            if (this.state.characterData.features) {
                character.features = this.state.characterData.features;
            }
            
            // Добавляем кошелек, если он есть
            if (this.state.characterData.wallet) {
                character.wallet = this.state.characterData.wallet;
            }
            
            // Добавляем предметы, если они есть (но не перезаписываем то, что собрали из формы)
            if (this.state.characterData.items && !character.items) {
                character.items = this.state.characterData.items;
            }
        }
        
        console.log('📦 Собранные данные персонажа:', {
            name: character.name,
            level: character.level,
            abilityScores: character.abilityScores,
            skills: Object.keys(character.skills || {}).length,
            armor: character.armor
        });
        
        return character;
    },

    collectWeapons() {
        const weapons = [];
        
        document.querySelectorAll('.weapon-row-edit').forEach(row => {
            const name = row.querySelector('.weapon-name-input-edit')?.value?.trim();
            const damage = row.querySelector('.weapon-damage-input-edit')?.value?.trim();
            const type = row.querySelector('.weapon-type-select-edit')?.value || 'melee';
            
            if (name) {
                weapons.push({
                    name,
                    damage: damage || '1d6',
                    type
                });
            }
        });
        
        return weapons;
    },

    async saveCharacter() {
        try {
            console.log('💾 Сохранение персонажа...');
            
            if (!this.validateForm()) {
                return;
            }
            
            this.showSaving();
            
            const characterData = this.collectCharacterData();
            const saved = await CharacterManager.saveCharacter(characterData);
            
            if (saved) {
                this.state.characterId = characterData.id;
                this.state.characterData = characterData;
                this.markAsSaved();
                
                Utils.showNotification(`Персонаж "${characterData.name}" сохранен`, 'success');
                
                const titleElement = document.getElementById('editTitle');
                const subtitleElement = document.getElementById('editSubtitle');
                
                if (titleElement) titleElement.textContent = `Редактирование: ${characterData.name}`;
                if (subtitleElement) subtitleElement.textContent = 
                    `${CharacterManager.getClassDisplayName(characterData.class)}, уровень ${characterData.level}`;
                
                if (!window.location.search.includes('id=')) {
                    const url = new URL(window.location);
                    url.searchParams.set('id', characterData.id);
                    window.history.replaceState({}, '', url);
                }
                
                console.log('✅ Персонаж сохранен в БД:', characterData);
            } else {
                throw new Error('Не удалось сохранить персонажа');
            }
            
            this.hideSaving();
            
        } catch (error) {
            console.error('❌ Ошибка сохранения персонажа:', error);
            Utils.showNotification('Не удалось сохранить персонажа: ' + error.message, 'error');
            this.hideSaving();
        }
    },

    validateForm() {
        const name = document.getElementById('editCharacterName')?.value?.trim();
        const charClass = document.getElementById('editCharacterClass')?.value;
        const race = document.getElementById('editCharacterRace')?.value;
        
        if (!name) {
            Utils.showNotification('Введите имя персонажа', 'error');
            document.getElementById('editCharacterName')?.focus();
            return false;
        }
        
        if (!charClass) {
            Utils.showNotification('Выберите класс персонажа', 'error');
            document.getElementById('editCharacterClass')?.focus();
            return false;
        }
        
        if (!race) {
            Utils.showNotification('Выберите расу персонажа', 'error');
            document.getElementById('editCharacterRace')?.focus();
            return false;
        }
        
        return true;
    },

    async deleteCharacter() {
        if (!this.state.characterId) {
            window.location.href = 'characters.html';
            return;
        }
        
        const characterName = this.state.characterData?.name || 'этого персонажа';
        
        if (!confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"?`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Удаление персонажа: ${this.state.characterId}`);
            
            const deleted = await CharacterManager.deleteCharacter(this.state.characterId, characterName);
            
            if (deleted) {
                Utils.showNotification(`Персонаж "${characterName}" удален`, 'success');
                setTimeout(() => {
                    window.location.href = 'characters.html';
                }, 1500);
            }
            
        } catch (error) {
            console.error('❌ Ошибка удаления персонажа:', error);
            Utils.showNotification('Не удалось удалить персонажа', 'error');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showLoading() {
        const container = document.querySelector('.container');
        if (container) {
            const loadingHTML = `
                <div class="loading-overlay">
                    <div class="loader-large"></div>
                    <p>Загрузка данных из БД...</p>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', loadingHTML);
        }
    },

    hideLoading() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    },

    showSaving() {
        const saveBtn = document.getElementById('saveCharacterEdit');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение в БД...';
        }
    },

    hideSaving() {
        const saveBtn = document.getElementById('saveCharacterEdit');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
        }
    },

    showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Ошибка</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <a href="characters.html" class="btn btn-primary">
                            <i class="fas fa-arrow-left"></i> Вернуться к списку
                        </a>
                        <button class="btn btn-secondary" onclick="location.reload()">
                            <i class="fas fa-sync-alt"></i> Попробовать снова
                        </button>
                    </div>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CharacterEditor.init();
});

window.CharacterEditor = CharacterEditor;