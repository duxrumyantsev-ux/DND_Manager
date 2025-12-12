// character-creator.js - ОБНОВЛЯЕМ ДЛЯ РАБОТЫ С ДАННЫМИ ИЗ БД

const CharacterCreator = {
    currentStep: 1,
    totalSteps: 6,
    characterData: {
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
        }
    },

    async init() {
        console.log('🎮 Инициализация конструктора персонажей...');
        
        try {
            // Загружаем данные ИЗ БД
            await this.loadDataFromDB();
            
            this.initUI();
            this.initEventListeners();
            this.showStep(1);
            
            console.log('✅ Конструктор персонажей готов с данными ИЗ БД');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации конструктора:', error);
            Utils.showNotification('Ошибка загрузки данных конструктора: ' + error.message, 'error');
        }
    },

    async loadDataFromDB() {
        console.log('📥 Загрузка данных конструктора ИЗ БД...');
        
        try {
            // Загружаем все необходимые данные ИЗ БД
            const [
                races,
                classes, 
                backgrounds,
                armorTypes,
                skills
            ] = await Promise.all([
                DataService.loadRaces(),
                DataService.loadClasses(),
                DataService.loadBackgrounds(),
                DataService.loadArmorTypes(),
                DataService.loadSkills()
            ]);
            
            console.log('✅ Данные конструктора загружены ИЗ БД:', {
                races: races.length,
                classes: classes.length,
                backgrounds: backgrounds.length,
                armorTypes: armorTypes.length,
                skills: skills.length
            });
            
            // Сохраняем в свойствах
            this.races = races;
            this.classes = classes;
            this.backgrounds = backgrounds;
            this.armorTypes = armorTypes;
            this.skillsList = skills;
            
            // Заполняем селекты
            this.populateRaceSelect();
            this.populateClassSelect();
            this.populateBackgroundSelect();
            this.populateArmorSelect();
            this.populateAlignments();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных конструктора ИЗ БД:', error);
            
            // Используем fallback данные
            this.loadFallbackData();
        }
    },

    loadFallbackData() {
        console.log('📁 Используем fallback данные для конструктора');
        
        this.races = [
            { id: 'human', name: 'Человек' },
            { id: 'elf', name: 'Эльф' },
            { id: 'dwarf', name: 'Дварф' },
            { id: 'halfling', name: 'Халфлинг' }
        ];
        
        this.classes = [
            { id: 'fighter', name: 'Воин' },
            { id: 'wizard', name: 'Волшебник' },
            { id: 'rogue', name: 'Плут' },
            { id: 'cleric', name: 'Жрец' }
        ];
        
        this.backgrounds = [
            { id: 'acolyte', name: 'Послушник' },
            { id: 'criminal', name: 'Преступник' },
            { id: 'folk-hero', name: 'Народный герой' },
            { id: 'noble', name: 'Благородный' }
        ];
        
        this.armorTypes = [
            { id: 'none', name: 'Без доспехов', baseAC: 0, maxDex: 5 },
            { id: 'leather', name: 'Кожаный', baseAC: 11, maxDex: 5 },
            { id: 'chain-mail', name: 'Панцирь', baseAC: 16, maxDex: 0 }
        ];
        
        this.skillsList = [
            { id: 'acrobatics', name: 'Акробатика', ability: 'dexterity' },
            { id: 'athletics', name: 'Атлетика', ability: 'strength' },
            { id: 'perception', name: 'Восприятие', ability: 'wisdom' }
        ];
        
        // Заполняем селекты
        this.populateRaceSelect();
        this.populateClassSelect();
        this.populateBackgroundSelect();
        this.populateArmorSelect();
        this.populateAlignments();
    },

    populateRaceSelect() {
        const select = document.getElementById('creatorRace');
        if (!select) return;
        
        select.innerHTML = '<option value="">Выберите расу...</option>';
        
        this.races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = race.name || race.id;
            select.appendChild(option);
        });
        
        console.log(`✅ Заполнено рас: ${this.races.length}`);
    },

    populateClassSelect() {
        const select = document.getElementById('creatorClass');
        if (!select) return;
        
        select.innerHTML = '<option value="">Выберите класс...</option>';
        
        this.classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name || cls.id;
            select.appendChild(option);
        });
        
        console.log(`✅ Заполнено классов: ${this.classes.length}`);
    },

    populateBackgroundSelect() {
        const select = document.getElementById('creatorBackground');
        if (!select) return;
        
        select.innerHTML = '<option value="">Выберите предысторию...</option>';
        
        this.backgrounds.forEach(bg => {
            const option = document.createElement('option');
            option.value = bg.id;
            option.textContent = bg.name || bg.id;
            select.appendChild(option);
        });
        
        console.log(`✅ Заполнено предысторий: ${this.backgrounds.length}`);
    },

    populateArmorSelect() {
        const select = document.getElementById('creatorArmor');
        if (!select) return;
        
        select.innerHTML = '<option value="">Выберите броню...</option>';
        
        this.armorTypes.forEach(armor => {
            const option = document.createElement('option');
            option.value = armor.id;
            option.textContent = armor.name;
            select.appendChild(option);
        });
        
        console.log(`✅ Заполнено типов брони: ${this.armorTypes.length}`);
    },

    populateAlignments() {
        const select = document.getElementById('creatorAlignment');
        if (!select) return;
        
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
        
        select.innerHTML = '<option value="">Выберите мировоззрение...</option>';
        
        alignments.forEach(alignment => {
            const option = document.createElement('option');
            option.value = alignment.id;
            option.textContent = alignment.name;
            select.appendChild(option);
        });
    },

    // ... существующие методы ...

    async showStep(stepNumber) {
        console.log(`📝 Показать шаг ${stepNumber}`);
        
        // Скрываем все шаги
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });
        
        // Убираем активный класс у всех шагов
        document.querySelectorAll('.step-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Показываем выбранный шаг
        const stepContent = document.getElementById(`step${stepNumber}`);
        const stepItem = document.querySelector(`.step-item[data-step="${stepNumber}"]`);
        
        if (stepContent) {
            stepContent.classList.add('active');
        }
        
        if (stepItem) {
            stepItem.classList.add('active');
        }
        
        this.currentStep = stepNumber;
        
        // Обновляем навигацию
        this.updateNavigation();
        
        // Загружаем дополнительные данные для шага
        if (stepNumber === 3) { // Характеристики
            this.initAbilitiesStep();
        } else if (stepNumber === 4) { // Броня и навыки
            this.initArmorAndSkillsStep();
        } else if (stepNumber === 5) { // Заклинания
            await this.initSpellsStep();
        }
    },

    initArmorAndSkillsStep() {
        console.log('🛡️ Инициализация шага брони и навыков');
        
        // Инициализируем броню
        this.initArmorSelect();
        
        // Инициализируем навыки
        this.initSkillsStep();
    },

    initSkillsStep() {
        console.log('📚 Инициализация навыков');
        
        const skillsContainer = document.getElementById('creatorSkills');
        if (!skillsContainer) return;
        
        if (!this.skillsList || this.skillsList.length === 0) {
            skillsContainer.innerHTML = '<p class="text-muted">Навыки не загружены</p>';
            return;
        }
        
        // Группируем навыки по характеристикам
        const skillsByAbility = {};
        this.skillsList.forEach(skill => {
            const ability = skill.ability || 'intelligence';
            if (!skillsByAbility[ability]) {
                skillsByAbility[ability] = [];
            }
            skillsByAbility[ability].push(skill);
        });
        
        let skillsHTML = '';
        
        Object.keys(skillsByAbility).forEach(ability => {
            const abilitySkills = skillsByAbility[ability];
            const abilityName = Utils.getAbilityName(ability);
            
            skillsHTML += `
                <div class="ability-skills-group">
                    <h4>${abilityName}</h4>
                    <div class="skills-group">
                        ${abilitySkills.map(skill => {
                            const skillId = skill.id;
                            const isProficient = this.characterData.skills?.[skillId]?.proficient || false;
                            
                            return `
                                <div class="skill-checkbox-item">
                                    <input type="checkbox" 
                                           id="skill-${skillId}" 
                                           name="skills" 
                                           value="${skillId}"
                                           ${isProficient ? 'checked' : ''}>
                                    <label for="skill-${skillId}">
                                        ${skill.name || skillId}
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        skillsContainer.innerHTML = skillsHTML;
        
        // Добавляем обработчики для чекбоксов навыков
        document.querySelectorAll('#creatorSkills input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const skillId = e.target.value;
                const isProficient = e.target.checked;
                
                if (!this.characterData.skills) {
                    this.characterData.skills = {};
                }
                
                if (!this.characterData.skills[skillId]) {
                    this.characterData.skills[skillId] = {
                        proficient: false,
                        bonus: 0
                    };
                }
                
                this.characterData.skills[skillId].proficient = isProficient;
                
                console.log(`🎯 Навык ${skillId}: ${isProficient ? 'добавлен' : 'удален'}`);
            });
        });
        
        console.log(`✅ Навыки инициализированы: ${this.skillsList.length} навыков`);
    },

    initArmorSelect() {
        const armorSelect = document.getElementById('creatorArmor');
        const shieldCheckbox = document.getElementById('creatorShield');
        
        if (armorSelect) {
            armorSelect.value = this.characterData.armor?.type || 'none';
            armorSelect.addEventListener('change', (e) => {
                this.characterData.armor.type = e.target.value;
                console.log(`🛡️ Выбрана броня: ${e.target.value}`);
            });
        }
        
        if (shieldCheckbox) {
            shieldCheckbox.checked = this.characterData.armor?.shield || false;
            shieldCheckbox.addEventListener('change', (e) => {
                this.characterData.armor.shield = e.target.checked;
                console.log(`🛡️ Щит: ${e.target.checked ? 'да' : 'нет'}`);
            });
        }
    },

    async initSpellsStep() {
        console.log('🔮 Инициализация шага заклинаний');
        
        const spellsContainer = document.getElementById('creatorSpells');
        if (!spellsContainer) return;
        
        const classId = this.characterData.class;
        if (!classId) {
            spellsContainer.innerHTML = '<p class="text-muted">Сначала выберите класс</p>';
            return;
        }
        
        // Загружаем заклинания ИЗ БД
        try {
            const classSpells = await DataService.loadSpellsForClass(classId);
            
            if (classSpells.length === 0) {
                spellsContainer.innerHTML = '<p class="text-muted">У этого класса нет заклинаний</p>';
                return;
            }
            
            // Группируем заклинания по уровням
            const spellsByLevel = {};
            classSpells.forEach(spell => {
                const level = spell.level || 0;
                if (!spellsByLevel[level]) {
                    spellsByLevel[level] = [];
                }
                spellsByLevel[level].push(spell);
            });
            
            let spellsHTML = '';
            const levels = Object.keys(spellsByLevel).sort((a, b) => a - b);
            
            levels.forEach(level => {
                const levelSpells = spellsByLevel[level];
                const levelName = level == 0 ? 'Заговоры' : `Уровень ${level}`;
                
                spellsHTML += `
                    <div class="spells-level-group">
                        <h4>${levelName}</h4>
                        <div class="spells-grid">
                            ${levelSpells.map(spell => {
                                const spellId = spell.id;
                                const isSelected = this.characterData.spells?.some(s => 
                                    (typeof s === 'object' && s.id === spellId) || 
                                    (typeof s === 'string' && s === spellId)
                                );
                                
                                return `
                                    <div class="spell-checkbox-item">
                                        <input type="checkbox" 
                                               id="spell-${spellId}" 
                                               name="spells" 
                                               value="${spellId}"
                                               data-level="${level}"
                                               ${isSelected ? 'checked' : ''}>
                                        <label for="spell-${spellId}">
                                            <span class="spell-name">${spell.name || 'Без названия'}</span>
                                            <span class="spell-school">${spell.school || 'Неизвестно'}</span>
                                        </label>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            });
            
            spellsContainer.innerHTML = spellsHTML;
            
            // Добавляем обработчики
            document.querySelectorAll('#creatorSpells input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const spellId = e.target.value;
                    const isSelected = e.target.checked;
                    
                    if (!this.characterData.spells) {
                        this.characterData.spells = [];
                    }
                    
                    if (isSelected) {
                        // Находим полную информацию о заклинании
                        const spellInfo = classSpells.find(s => s.id === spellId);
                        if (spellInfo && !this.characterData.spells.some(s => 
                            (typeof s === 'object' && s.id === spellId) || 
                            (typeof s === 'string' && s === spellId)
                        )) {
                            this.characterData.spells.push(spellInfo);
                            console.log(`🔮 Добавлено заклинание: ${spellInfo.name}`);
                        }
                    } else {
                        this.characterData.spells = this.characterData.spells.filter(s => 
                            !((typeof s === 'object' && s.id === spellId) || 
                              (typeof s === 'string' && s === spellId))
                        );
                        console.log(`🔮 Удалено заклинание: ${spellId}`);
                    }
                });
            });
            
            console.log(`✅ Заклинания загружены ИЗ БД: ${classSpells.length} заклинаний`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки заклинаний ИЗ БД:', error);
            spellsContainer.innerHTML = '<p class="text-danger">Ошибка загрузки заклинаний</p>';
        }
    },

    // ... остальные существующие методы ...

    async createCharacter() {
        console.log('🎭 Создание персонажа...');
        
        // Собираем данные формы
        this.collectFormData();
        
        // Проверяем обязательные поля
        if (!this.validateCharacter()) {
            return;
        }
        
        try {
            // Генерируем ID
            this.characterData.id = Date.now().toString();
            this.characterData.createdAt = Date.now();
            this.characterData.updatedAt = Date.now();
            
            console.log('📊 Данные персонажа для создания:', {
                name: this.characterData.name,
                race: this.characterData.race,
                class: this.characterData.class,
                level: this.characterData.level,
                skills: Object.keys(this.characterData.skills || {}).length,
                spells: this.characterData.spells?.length || 0,
                armor: this.characterData.armor
            });
            
            // Сохраняем персонажа
            const saved = await CharacterManager.saveCharacter(this.characterData);
            
            if (saved) {
                console.log('✅ Персонаж создан и сохранен:', this.characterData.name);
                Utils.showNotification(`Персонаж "${this.characterData.name}" создан!`, 'success');
                
                // Перенаправляем на страницу персонажа
                setTimeout(() => {
                    window.location.href = `character-view.html?id=${this.characterData.id}`;
                }, 1500);
            } else {
                throw new Error('Не удалось сохранить персонажа');
            }
            
        } catch (error) {
            console.error('❌ Ошибка создания персонажа:', error);
            Utils.showNotification('Ошибка создания персонажа: ' + error.message, 'error');
        }
    },

    collectFormData() {
        console.log('📝 Сбор данных формы...');
        
        // Собираем данные с каждого шага
        this.collectBasicInfo();
        this.collectAbilities();
        this.collectArmorAndSkills();
        this.collectSpells();
        this.collectAppearance();
    },

    collectBasicInfo() {
        const nameInput = document.getElementById('creatorName');
        const raceSelect = document.getElementById('creatorRace');
        const classSelect = document.getElementById('creatorClass');
        const backgroundSelect = document.getElementById('creatorBackground');
        const alignmentSelect = document.getElementById('creatorAlignment');
        const levelInput = document.getElementById('creatorLevel');
        
        this.characterData.name = nameInput?.value || '';
        this.characterData.race = raceSelect?.value || '';
        this.characterData.class = classSelect?.value || '';
        this.characterData.background = backgroundSelect?.value || '';
        this.characterData.alignment = alignmentSelect?.value || '';
        this.characterData.level = parseInt(levelInput?.value) || 1;
    },

    collectArmorAndSkills() {
        const armorSelect = document.getElementById('creatorArmor');
        const shieldCheckbox = document.getElementById('creatorShield');
        
        if (armorSelect) {
            this.characterData.armor.type = armorSelect.value || 'none';
        }
        
        if (shieldCheckbox) {
            this.characterData.armor.shield = shieldCheckbox.checked;
        }
        
        // Навыки уже собираются при изменении чекбоксов
        console.log(`🛡️ Собраны данные брони: ${this.characterData.armor.type}, щит: ${this.characterData.armor.shield}`);
        console.log(`📚 Собраны навыки: ${Object.keys(this.characterData.skills || {}).length}`);
    },

    collectSpells() {
        // Заклинания уже собираются при изменении чекбоксов
        console.log(`🔮 Собраны заклинания: ${this.characterData.spells?.length || 0}`);
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    CharacterCreator.init();
});

window.CharacterCreator = CharacterCreator;