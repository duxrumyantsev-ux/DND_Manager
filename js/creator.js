// creator.js - Скрипты для конструктора персонажа

const CharacterCreator = {
    // Состояние приложения
    state: {
        isEditMode: false,
        characterId: null,
        characterData: null,
        currentStep: 1,
        totalSteps: 7,
        abilityMethod: 'manual',
        pointsRemaining: 27,
        availableSpells: [],
        knownSpells: [],
        isSpellcaster: false,
        hasChanges: false
    },

    // Данные из Firebase
    data: {
        races: [],
        classes: [],
        spells: [],
        features: []
    },

    // Инициализация
    init() {
        this.checkEditMode();
        this.initEventListeners();
        this.initModals();
        this.loadData().then(() => {
            this.setupSteps();
            this.updateUI();
            
            // Инициализируем динамические значения
            this.initAbilities();
            this.initSkills();
            this.initConditions();
            
            // Добавляем обработчики для динамических изменений
            this.addDynamicListeners();
            
            // Проверяем и корректируем все системы
            setTimeout(() => {
                this.validateAllSystems();
                this.updateAllCalculations();
            }, 500);
            
            Utils.logAction('Конструктор персонажа инициализирован');
        });
    },

    // Добавление динамических обработчиков
    addDynamicListeners() {
        console.log('🎯 Добавление динамических обработчиков...');
        
        // Обработчик изменения расы
        const raceSelect = document.getElementById('characterRace');
        if (raceSelect) {
            raceSelect.addEventListener('change', (e) => {
                const raceId = e.target.value;
                console.log(`👥 Изменена раса: ${raceId}`);
                this.onRaceChange(raceId);
                this.updateAllCalculations(); // Добавьте эту строку
            });
        }
        
        // Обработчик изменения класса
        const classSelect = document.getElementById('characterClass');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                const classId = e.target.value;
                console.log(`⚔️  Изменен класс: ${classId}`);
                this.onClassChange(classId);
                this.checkSpellcasting();
                this.updateAllCalculations(); // Замените updateHP() на этот вызов
            });
        }
        
        // Обработчик изменения уровня
        const levelInput = document.getElementById('characterLevel');
        if (levelInput) {
            levelInput.addEventListener('change', () => {
                const level = parseInt(levelInput.value);
                console.log(`📈 Изменен уровень: ${level}`);
                this.updateAllCalculations(); // Замените отдельные вызовы на этот
            });
            
            // Также обрабатываем ввод в реальном времени
            levelInput.addEventListener('input', () => {
                const level = parseInt(levelInput.value) || 1;
                if (level >= 1 && level <= 20) {
                    this.updateAllCalculations();
                }
            });
        }
        
        // Обработчики для брони и AC
        const armorType = document.getElementById('armorType');
        if (armorType) {
            armorType.addEventListener('change', () => {
                console.log(`🛡️  Изменен тип брони: ${armorType.value}`);
                this.updateAC();
                this.updateCharacterSummary();
            });
        }
        
        const hasShield = document.getElementById('hasShield');
        if (hasShield) {
            hasShield.addEventListener('change', () => {
                console.log(`🛡️  Изменено состояние щита: ${hasShield.checked}`);
                this.updateAC();
                this.updateCharacterSummary();
            });
        }
        
        // Обработчики для характеристик - УНИФИЦИРОВАННЫЙ ВАРИАНТ
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                input.addEventListener('input', () => {
                    console.log(`💪 Изменена характеристика ${ability}: ${input.value}`);
                    this.updateAbility(ability);
                    this.updateAllSkillModifiers(); // <-- Обновляем ВСЕ навыки
                    this.updateAbilitiesSummary();
                });
            }
            
            const decreaseBtn = document.querySelector(`[data-ability="${ability}"].ability-down`);
            const increaseBtn = document.querySelector(`[data-ability="${ability}"].ability-up`);
            
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', () => {
                    this.changeAbilityScore(ability, -1);
                    this.updateAllSkillModifiers(); // <-- Обновляем ВСЕ навыки
                    this.updateAbilitiesSummary();
                });
            }
            
            if (increaseBtn) {
                increaseBtn.addEventListener('click', () => {
                    this.changeAbilityScore(ability, 1);
                    this.updateAllSkillModifiers(); // <-- Обновляем ВСЕ навыки
                    this.updateAbilitiesSummary();
                });
            }
        });
        
        // Обработчик изменения текущего HP
        const currentHPInput = document.getElementById('currentHP');
        if (currentHPInput) {
            currentHPInput.addEventListener('input', () => {
                const currentHP = parseInt(currentHPInput.value) || 0;
                const maxHP = parseInt(document.getElementById('maxHP')?.value) || 10;
                
                // Проверяем границы
                if (currentHP > maxHP) {
                    currentHPInput.value = maxHP;
                } else if (currentHP < 0) {
                    currentHPInput.value = 0;
                }
                
                this.updateHPProgressBar(parseInt(currentHPInput.value) || 0, maxHP);
                this.updateCharacterSummary();
            });
        }
        
        // Обработчик изменения временного HP
        const tempHPInput = document.getElementById('tempHP');
        if (tempHPInput) {
            tempHPInput.addEventListener('input', () => {
                console.log('🔄 Изменены временные HP');
                this.updateCharacterSummary();
            });
        }
        
        console.log('✅ Динамические обработчики добавлены');
    },

    updateAllRelatedSystems(ability) {
        switch(ability) {
            case 'dexterity':
                this.updateAC();
                this.updateAllSkillModifiers();
                break;
            case 'constitution':
                this.updateHP();
                break;
            case 'wisdom':
                this.updatePassivePerception();
                this.updateAllSkillModifiers();
                break;
            case 'intelligence':
            case 'strength':
            case 'charisma':
                this.updateAllSkillModifiers();
                break;
        }
        this.updateAbilitiesSummary();
        this.updateCharacterSummary();
    },

    // Инициализация обработчиков, связанных с данными
    initEventListenersForData() {
        // Изменение уровня
        document.getElementById('characterLevel')?.addEventListener('change', () => {
            this.updateHP();
            this.updateAbilitiesSummary();
            this.updateSpellSlots();
        });

        // Изменение расы
        document.getElementById('characterRace')?.addEventListener('change', () => {
            this.updateCharacterSummary();
        });

        // Изменение класса
        document.getElementById('characterClass')?.addEventListener('change', () => {
            this.updateHP();
            this.updateCharacterSummary();
            this.checkSpellcasting();
        });

        // Изменение характеристик для AC и HP
        const abilityInputs = document.querySelectorAll('.ability-input');
        abilityInputs.forEach(input => {
            input.addEventListener('input', () => {
                // Не вызываем updateAC() здесь - он вызывается через addDynamicListeners
                this.updateHP();
                this.updateCharacterSummary();
            });
        });

        // Изменение брони для AC
        // УДАЛИТЬ эти строки - они дублируются в addDynamicListeners()
        // document.getElementById('armorType')?.addEventListener('change', () => {
        //     this.updateAC();
        // });
        //
        // document.getElementById('hasShield')?.addEventListener('change', () => {
        //     this.updateAC();
        // });

        // Изменение валюты
        document.querySelectorAll('.wallet-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updateWalletTotal();
            });
        });

        // Изменение HP
        document.getElementById('currentHP')?.addEventListener('input', () => {
            this.updateCharacterSummary();
        });
    },

    // Проверка режима редактирования
    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const characterId = urlParams.get('id');
        
        console.log('🔍 Проверка режима редактирования...');
        console.log('   ID персонажа из URL:', characterId);
        
        if (characterId) {
            this.state.isEditMode = true;
            this.state.characterId = characterId;
            console.log('📝 Включен режим редактирования для ID:', characterId);
            this.loadCharacterForEdit(characterId);
        } else {
            console.log('🆕 Режим создания нового персонажа');
        }
    },

    // Загрузка персонажа для редактирования
    async loadCharacterForEdit(characterId) {
        console.log(`📥 Загрузка персонажа для редактирования: ${characterId}`);
        
        try {
            this.showLoadingMode();
            
            // Используем CharactersManager для загрузки из Firebase
            const character = await CharactersManager.loadCharacterById(characterId);
            
            if (character) {
                this.state.characterData = character;
                this.state.characterId = characterId;
                
                console.log('🔄 Заполнение формы данными персонажа...');
                
                // Ждем загрузки основных данных
                await this.waitForDataLoad();
                
                // Заполняем форму
                this.populateForm(character);
                
                // Загружаем дополнительные данные
                await this.loadAdditionalData(character);
                
                this.showEditMode();
                
                console.log('✅ Персонаж загружен для редактирования');
                Utils.showNotification(`Персонаж "${character.name}" загружен для редактирования`, 'success');
            } else {
                throw new Error(`Персонаж с ID ${characterId} не найден`);
            }
            
            this.hideLoadingMode();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажа:', error);
            this.hideLoadingMode();
            this.showNewMode();
            Utils.showNotification('Не удалось загрузить персонажа. Создан новый.', 'error');
        }
    },

    waitForDataLoad() {
        return new Promise((resolve) => {
            const checkData = () => {
                if (this.data.races.length > 0 && this.data.classes.length > 0) {
                    console.log('✅ Основные данные загружены');
                    resolve();
                } else {
                    console.log('⏳ Ожидание загрузки данных...');
                    setTimeout(checkData, 100);
                }
            };
            checkData();
        });
    },

    async loadAdditionalData(character) {
        console.log('📥 Загрузка дополнительных данных...');
        
        // Если есть класс, загружаем подклассы
        if (character.class) {
            await this.loadSubclassesForClass(character.class);
        }
        
        // Если есть подкласс, выбираем его
        if (character.subclass) {
            const subclassSelect = document.getElementById('characterSubclass');
            if (subclassSelect) {
                subclassSelect.value = character.subclass;
                await this.onSubclassChange(character.subclass);
            }
        }
        
        // Загружаем заклинания для магического класса
        if (character.class && this.data.classes.find(c => c.id === character.class)?.spellcasting) {
            await this.loadSpellsForClass();
            
            // Если есть известные заклинания, добавляем их
            if (character.spells && character.spells.length > 0) {
                this.state.knownSpells = character.spells;
                this.updateKnownSpellsList();
            }
        }
        
        console.log('✅ Дополнительные данные загружены');
    },

    // Инициализация обработчиков событий
    initEventListeners() {
        console.log('🎮 Инициализация обработчиков событий...');
        
        // Навигация по шагам
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('➡️  Кнопка "Далее" нажата');
                const nextStep = parseInt(e.target.dataset.next);
                this.goToStep(nextStep);
            });
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('⬅️  Кнопка "Назад" нажата');
                const prevStep = parseInt(e.target.dataset.prev);
                this.goToStep(prevStep);
            });
        });

        // Основные элементы управления
        const cancelBtn = document.getElementById('cancelCreation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Отмена создания');
                this.cancelCreation();
            });
        }

        const saveDraftBtn = document.getElementById('saveDraft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                console.log('💾 Сохранение черновика');
                this.saveDraft();
            });
        }

        const finishBtn = document.getElementById('finishCharacter');
        if (finishBtn) {
            finishBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎉 Завершение создания персонажа');
                this.finishCharacter();
            });
        }

        // Уровень персонажа
        const levelUpBtn = document.getElementById('levelUp');
        if (levelUpBtn) {
            levelUpBtn.addEventListener('click', () => {
                console.log('⬆️  Увеличение уровня');
                this.changeLevel(1);
            });
        }

        const levelDownBtn = document.getElementById('levelDown');
        if (levelDownBtn) {
            levelDownBtn.addEventListener('click', () => {
                console.log('⬇️  Уменьшение уровня');
                this.changeLevel(-1);
            });
        }

        // Методы определения характеристик
        document.querySelectorAll('input[name="abilityMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.abilityMethod = e.target.value;
                console.log(`📊 Изменен метод характеристик: ${e.target.value}`);
                this.updateAbilityMethodUI();
            });
        });

        const applyMethodBtn = document.getElementById('applyMethod');
        if (applyMethodBtn) {
            applyMethodBtn.addEventListener('click', () => {
                console.log(`🎯 Применение метода характеристик: ${this.state.abilityMethod}`);
                this.applyAbilityMethod();
            });
        }

        const resetAbilitiesBtn = document.getElementById('resetAbilities');
        if (resetAbilitiesBtn) {
            resetAbilitiesBtn.addEventListener('click', () => {
                console.log('🔄 Сброс характеристик');
                this.resetAbilities();
            });
        }

        // Инвентарь
        const addWeaponBtn = document.getElementById('addWeapon');
        if (addWeaponBtn) {
            addWeaponBtn.addEventListener('click', () => {
                console.log('🗡️  Добавление оружия');
                this.addWeapon();
            });
        }

        const addEquipmentBtn = document.getElementById('addEquipment');
        if (addEquipmentBtn) {
            addEquipmentBtn.addEventListener('click', () => {
                console.log('🎒 Добавление снаряжения');
                this.addEquipment();
            });
        }

        // Кошелек
        document.querySelectorAll('.wallet-input').forEach(input => {
            input.addEventListener('input', () => {
                console.log('💰 Изменение кошелька');
                this.updateWalletTotal();
            });
        });

        // Здоровье
        const shortRestBtn = document.getElementById('shortRest');
        if (shortRestBtn) {
            shortRestBtn.addEventListener('click', () => {
                console.log('🛌 Короткий отдых');
                this.applyShortRest();
            });
        }

        const longRestBtn = document.getElementById('longRest');
        if (longRestBtn) {
            longRestBtn.addEventListener('click', () => {
                console.log('🌙 Длинный отдых');
                this.applyLongRest();
            });
        }

        const takeDamageBtn = document.getElementById('takeDamage');
        if (takeDamageBtn) {
            takeDamageBtn.addEventListener('click', () => {
                console.log('💥 Получение урона');
                this.showHealthChangeModal('damage');
            });
        }

        const healDamageBtn = document.getElementById('healDamage');
        if (healDamageBtn) {
            healDamageBtn.addEventListener('click', () => {
                console.log('💚 Лечение');
                this.showHealthChangeModal('healing');
            });
        }

        // Заклинания
        const addSpellBtn = document.getElementById('addSpellBtn');
        if (addSpellBtn) {
            addSpellBtn.addEventListener('click', () => {
                console.log('✨ Добавление заклинания');
                this.showAddSpellModal();
            });
        }

        const manageSpellsBtn = document.getElementById('manageSpellsBtn');
        if (manageSpellsBtn) {
            manageSpellsBtn.addEventListener('click', () => {
                console.log('📋 Управление заклинаниями');
                this.showManageSpellsModal();
            });
        }

        const skipSpellsBtn = document.getElementById('skipSpells');
        if (skipSpellsBtn) {
            skipSpellsBtn.addEventListener('click', () => {
                console.log('⏭️  Пропуск заклинаний');
                this.skipSpellsStep();
            });
        }

        // Заметки
        const clearHistoryBtn = document.getElementById('clearHistory');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                console.log('🧹 Очистка истории');
                this.clearNote('historyNotes');
            });
        }

        const generateHistoryBtn = document.getElementById('generateHistory');
        if (generateHistoryBtn) {
            generateHistoryBtn.addEventListener('click', () => {
                console.log('🎲 Генерация истории');
                this.generateHistoryIdea();
            });
        }

        // Динамические обработчики для изменений данных
        this.addDynamicListeners();
        
        console.log('✅ Обработчики событий инициализированы');
    },

    // Загрузка данных из Firebase
    async loadData() {
        console.log('📥 Начало загрузки данных...');
        
        try {
            // Ждем готовности Firebase
            console.log('⏳ Ожидание готовности Firebase...');
            if (window.waitForFirebase) {
                await new Promise((resolve) => {
                    window.waitForFirebase(resolve);
                });
            }
            
            console.log('✅ Firebase готов');
            
            // Загружаем данные параллельно с таймаутами
            const loadPromises = [
                this.loadRaces(),
                this.loadClasses(),
                this.loadSpells()
            ];
            
            const [races, classes, spells] = await Promise.allSettled(loadPromises);
            
            // Обрабатываем результаты
            this.data.races = races.status === 'fulfilled' ? races.value : [];
            this.data.classes = classes.status === 'fulfilled' ? classes.value : [];
            this.data.spells = spells.status === 'fulfilled' ? spells.value : [];
            
            console.log('📊 Загружено данных:');
            console.log('   Расы:', this.data.races.length);
            console.log('   Классы:', this.data.classes.length);
            console.log('   Заклинания:', this.data.spells.length);
            
            // Заполняем выпадающие списки
            console.log('🔄 Заполнение выпадающих списков...');
            this.populateRaceSelect(this.data.races);
            this.populateClassSelect(this.data.classes);
            
            // Инициализируем остальные компоненты
            this.initAbilities();
            this.initSkills();
            this.initConditions();
            
            console.log('✅ Все данные загружены и интерфейс инициализирован');
            
        } catch (error) {
            console.error('❌ Критическая ошибка загрузки данных:', error);
            Utils.showNotification('Не удалось загрузить данные. Проверьте подключение.', 'error');
        }
    },

    async loadRaces() {
        console.log('👥 Загрузка рас из Firebase...');
        
        try {
            const races = await window.getFirebaseNestedData('races');
            console.log('   Получено записей из Firebase:', races?.length || 0);
            
            if (!races || races.length === 0) {
                console.log('⚠️  Нет данных в Firebase, используем локальные данные');
                // Используем данные из races.json
                if (window.racesData) {
                    console.log('   Используем данные из races.json:', window.racesData.length);
                    return window.racesData;
                }
                return [];
            }
            
            console.log('✅ Расы загружены');
            return races;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки рас:', error);
            return [];
        }
    },

    async loadClasses() {
        console.log('⚔️  Загрузка классов из Firebase...');
        
        try {
            const classes = await window.getFirebaseNestedData('classes');
            console.log('   Получено записей из Firebase:', classes?.length || 0);
            
            if (!classes || classes.length === 0) {
                console.log('⚠️  Нет данных в Firebase, используем локальные данные');
                // Используем данные из classes.json
                if (window.classesData) {
                    console.log('   Используем данные из classes.json:', window.classesData.length);
                    return window.classesData;
                }
                return [];
            }
            
            console.log('✅ Классы загружены');
            return classes;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки классов:', error);
            return [];
        }
    },

    async loadSpells() {
        console.log('✨ Загрузка заклинаний из Firebase...');
        
        try {
            const spells = await window.getFirebaseNestedData('spells');
            console.log('   Получено записей из Firebase:', spells?.length || 0);
            
            if (!spells || spells.length === 0) {
                console.log('⚠️  Нет данных в Firebase, используем локальные данные');
                // Используем данные из spells.json
                if (window.spellsData) {
                    console.log('   Используем данные из spells.json:', window.spellsData.length);
                    return window.spellsData;
                }
                return [];
            }
            
            console.log('✅ Заклинания загружены');
            return spells;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки заклинаний:', error);
            return [];
        }
    },

    // Использование fallback данных
    useFallbackData() {
        const fallbackRaces = [
            { id: 'human', name: 'Человек', speed: 30, ability_bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 } },
            { id: 'elf', name: 'Эльф', speed: 30, ability_bonuses: { dexterity: 2 } },
            { id: 'dwarf', name: 'Дварф', speed: 25, ability_bonuses: { constitution: 2 } },
            { id: 'halfling', name: 'Халфлинг', speed: 25, ability_bonuses: { dexterity: 2 } }
        ];
        
        const fallbackClasses = [
            { id: 'fighter', name: 'Воин', hit_die: 'd10', proficiencies: ['Все доспехи', 'Простое оружие', 'Воинское оружие'] },
            { id: 'wizard', name: 'Волшебник', hit_die: 'd6', spellcasting: true, proficiencies: ['Кинжалы', 'Дротики', 'Пращи', 'Посохи', 'Арбалеты'] },
            { id: 'cleric', name: 'Жрец', hit_die: 'd8', spellcasting: true, proficiencies: ['Легкие доспехи', 'Средние доспехи', 'Щиты', 'Простое оружие'] },
            { id: 'rogue', name: 'Плут', hit_die: 'd8', proficiencies: ['Легкие доспехи', 'Простое оружие', 'Ручные арбалеты', 'Длинные мечи', 'Рапиры', 'Короткие мечи'] }
        ];
        
        this.data.races = fallbackRaces;
        this.data.classes = fallbackClasses;
        
        this.populateRaceSelect(fallbackRaces);
        this.populateClassSelect(fallbackClasses);
        
        this.initAbilities();
        this.initSkills();
        this.initConditions();
    },
    
    // Показать индикатор загрузки
    showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.id = 'creatorLoader';
        loader.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loader);
    },
    
    // Скрыть индикатор загрузки
    hideLoading() {
        const loader = document.getElementById('creatorLoader');
        if (loader) loader.remove();
    },

    // Инициализация характеристик
    initAbilities() {
        const abilitiesGrid = document.getElementById('abilitiesGrid');
        if (!abilitiesGrid) return;

        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        const abilitiesHtml = abilities.map(ability => `
            <div class="ability-card" data-ability="${ability}">
                <div class="ability-name">${Utils.getAbilityName(ability)}</div>
                <div class="ability-value">
                    <input type="number" id="${ability}-value" class="ability-input" 
                           value="10" min="1" max="20" data-ability="${ability}">
                </div>
                <div class="ability-modifier ${ability}-modifier">
                    ${Utils.formatModifier(Utils.calculateModifier(10))}
                </div>
                <div class="ability-controls">
                    <button class="ability-btn ability-down" data-ability="${ability}">-</button>
                    <button class="ability-btn ability-up" data-ability="${ability}">+</button>
                </div>
            </div>
        `).join('');

        abilitiesGrid.innerHTML = abilitiesHtml;

        // Обработчики изменения значений характеристик
        abilitiesGrid.querySelectorAll('.ability-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const ability = e.target.dataset.ability;
                const value = parseInt(e.target.value) || 10;
                this.updateAbility(ability, value);
            });
        });

        // Обработчики кнопок +/-
        abilitiesGrid.querySelectorAll('.ability-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ability = e.target.dataset.ability;
                const isUp = e.target.classList.contains('ability-up');
                this.changeAbilityScore(ability, isUp ? 1 : -1);
            });
        });
    },

    // Обновление характеристики
    updateAbility(ability, value) {
        const modifier = Utils.calculateModifier(value);
        const modifierElement = document.querySelector(`.${ability}-modifier`);
        
        if (modifierElement) {
            modifierElement.textContent = Utils.formatModifier(modifier);
            modifierElement.classList.toggle('positive', modifier >= 0);
            modifierElement.classList.toggle('negative', modifier < 0);
        }

        this.updateAbilitiesSummary();
    },

    // Обновление сводки характеристик
    updateAbilitiesSummary() {
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        let totalModifiers = 0;
        let totalScore = 0;
        let count = 0;

        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                const score = parseInt(input.value) || 10;
                totalScore += score;
                totalModifiers += Utils.calculateModifier(score);
                count++;
            }
        });

        const averageScore = count > 0 ? (totalScore / count).toFixed(1) : '0.0';
        const level = parseInt(document.getElementById('characterLevel').value) || 1;
        const proficiencyBonus = Utils.calculateProficiencyBonus(level);

        // Обновляем отображение
        document.getElementById('totalModifiers').textContent = Utils.formatModifier(totalModifiers);
        document.getElementById('averageScore').textContent = averageScore;
        document.getElementById('proficiencyBonus').textContent = Utils.formatModifier(proficiencyBonus);
        
        // Обновляем навыки при изменении характеристик
        this.updateAllSkillModifiers(); // <-- Добавьте эту строку
        
        // Обновляем пассивную внимательность
        this.updatePassivePerception();
    },

    // Инициализация навыков
    initSkills() {
        console.log('🎯 Инициализация навыков...');
        
        const skillsGrid = document.getElementById('skillsGrid');
        if (!skillsGrid) {
            console.error('❌ Не найден контейнер для навыков');
            return;
        }
        
        // Полный список навыков D&D 5e с характеристиками
        const skills = [
            { id: 'athletics', name: 'Атлетика', ability: 'strength' },
            { id: 'acrobatics', name: 'Акробатика', ability: 'dexterity' },
            { id: 'sleight-of-hand', name: 'Ловкость рук', ability: 'dexterity' },
            { id: 'stealth', name: 'Скрытность', ability: 'dexterity' },
            { id: 'arcana', name: 'Магия', ability: 'intelligence' },
            { id: 'history', name: 'История', ability: 'intelligence' },
            { id: 'investigation', name: 'Анализ', ability: 'intelligence' },
            { id: 'nature', name: 'Природа', ability: 'intelligence' },
            { id: 'religion', name: 'Религия', ability: 'intelligence' },
            { id: 'animal-handling', name: 'Уход за животными', ability: 'wisdom' },
            { id: 'insight', name: 'Проницательность', ability: 'wisdom' },
            { id: 'medicine', name: 'Медицина', ability: 'wisdom' },
            { id: 'perception', name: 'Восприятие', ability: 'wisdom' },
            { id: 'survival', name: 'Выживание', ability: 'wisdom' },
            { id: 'deception', name: 'Обман', ability: 'charisma' },
            { id: 'intimidation', name: 'Запугивание', ability: 'charisma' },
            { id: 'performance', name: 'Выступление', ability: 'charisma' },
            { id: 'persuasion', name: 'Убеждение', ability: 'charisma' }
        ];
        
        this.data.skills = skills;
        this.populateSkillsGrid(skills);
        
        // Инициализируем расчеты навыков
        this.updateAllSkillModifiers();
        
        console.log(`✅ Навыки инициализированы: ${skills.length} навыков`);
    },

    updateAllSkillModifiers() {
        console.log('🔄 Обновление всех модификаторов навыков...');
        
        if (!this.data.skills || this.data.skills.length === 0) {
            console.warn('⚠️  Список навыков пуст');
            return;
        }
        
        // Обновляем ВСЕ навыки, включая Восприятие
        this.data.skills.forEach(skill => {
            this.updateSkillModifier(skill.id);
        });
        
        // Обновляем пассивную внимательность отдельно
        this.updatePassivePerception();
    },

    populateSkillsGrid(skills) {
        const skillsGrid = document.getElementById('skillsGrid');
        if (!skillsGrid) return;
        
        skillsGrid.innerHTML = '';
        
        skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-item';
            skillElement.dataset.skill = skill.id;
            
            skillElement.innerHTML = `
                <label class="checkbox-label skill-checkbox">
                    <input type="checkbox" id="skill-${skill.id}-proficiency" 
                           class="skill-proficiency" data-skill="${skill.id}">
                    <span class="checkbox-custom"></span>
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-ability">(${Utils.getAbilityAbbr(skill.ability)})</span>
                </label>
                <div class="skill-modifier" id="skill-${skill.id}-modifier">+0</div>
            `;
            
            skillsGrid.appendChild(skillElement);
        });
        
        // Добавляем обработчики для чекбоксов мастерства
        skillsGrid.addEventListener('change', (e) => {
            if (e.target.classList.contains('skill-proficiency')) {
                const skillId = e.target.dataset.skill;
                console.log(`🎓 Изменено мастерство навыка: ${skillId}`);
                this.updateSkillModifier(skillId);
            }
        });
        
        // Добавляем обработчики двойного клика для экспертизы
        skillsGrid.addEventListener('dblclick', (e) => {
            const skillCheckbox = e.target.closest('.skill-checkbox');
            if (skillCheckbox) {
                const checkbox = skillCheckbox.querySelector('.skill-proficiency');
                const skillId = checkbox.dataset.skill;
                
                if (checkbox.checked) {
                    // Переключаем между мастерством и экспертизой
                    if (checkbox.classList.contains('expertise')) {
                        checkbox.classList.remove('expertise');
                        checkbox.title = 'Мастерство';
                    } else {
                        checkbox.classList.add('expertise');
                        checkbox.title = 'Экспертиза (двойной бонус мастерства)';
                    }
                    this.updateSkillModifier(skillId);
                }
            }
        });
    },

    // Инициализация состояний
    initConditions() {
        const conditionsGrid = document.getElementById('conditionsGrid');
        if (!conditionsGrid) return;

        const conditions = [
            { id: 'blinded', name: 'Ослепление', icon: 'fa-eye-slash' },
            { id: 'charmed', name: 'Очарование', icon: 'fa-heart' },
            { id: 'deafened', name: 'Глухота', icon: 'fa-deaf' },
            { id: 'frightened', name: 'Испуг', icon: 'fa-ghost' },
            { id: 'grappled', name: 'Схвачен', icon: 'fa-handshake' },
            { id: 'incapacitated', name: 'Недееспособен', icon: 'fa-bed' },
            { id: 'invisible', name: 'Невидимость', icon: 'fa-user-secret' },
            { id: 'paralyzed', name: 'Паралич', icon: 'fa-skull' },
            { id: 'petrified', name: 'Окаменение', icon: 'fa-gem' },
            { id: 'poisoned', name: 'Отравление', icon: 'fa-skull-crossbones' },
            { id: 'prone', name: 'Распластан', icon: 'fa-user-slash' },
            { id: 'restrained', name: 'Скован', icon: 'fa-lock' },
            { id: 'stunned', name: 'Ошеломление', icon: 'fa-bolt' },
            { id: 'unconscious', name: 'Бессознание', icon: 'fa-moon' },
            { id: 'exhaustion', name: 'Истощение', icon: 'fa-tired' }
        ];

        const conditionsHtml = conditions.map(condition => `
            <div class="condition-item" data-condition="${condition.id}">
                <i class="fas ${condition.icon}"></i>
                <div class="condition-name">${condition.name}</div>
            </div>
        `).join('');

        conditionsGrid.innerHTML = conditionsHtml;

        // Обработчики состояний
        conditionsGrid.querySelectorAll('.condition-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('active');
            });
        });
    },

    // Пропуск шага заклинаний
    skipSpellsStep() {
        this.goToStep(6);
        Utils.showNotification('Шаг заклинаний пропущен', 'info');
    },

    // Генерация идеи для истории
    generateHistoryIdea() {
        const ideas = [
            "Вы были учеником великого мага, но сбежали из башни после несчастного случая с заклинанием.",
            "Ваша семья была уничтожена бандитами, и вы поклялись отомстить за их смерть.",
            "Вы нашли древний артефакт, который дал вам магические способности, но и привлек внимание темных сил.",
            "Будучи сиротой, вы выросли на улицах большого города, научившись выживать с помощью хитрости и ловкости.",
            "Вы были солдатом в великой армии, но дезертировали после того, как увидели ужасы войны.",
            "Ваш род веками служил древнему дракону, но вы решили сбросить это проклятие.",
            "Вы странствующий бард, который ищет древние легенды и забытые истории для своей следующей великой песни.",
            "Будучи жрецом забытого бога, вы ищете способ вернуть своему божеству былую славу.",
            "Вы были изгнаны из своего племени варваров за то, что отказались следовать жестоким традициям.",
            "Как искусный ремесленник, вы создавали великолепные доспехи и оружие, пока однажды не решили использовать их сами."
        ];

        const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
        document.getElementById('historyNotes').value = randomIdea;
        Utils.showNotification('Идея для истории сгенерирована', 'info');
    },

    // Обновление HP
    updateHP() {
        console.log('❤️  Обновление HP...');
        
        const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
        const conInput = document.getElementById('constitution-value');
        const conValue = conInput ? parseInt(conInput.value) || 10 : 10;
        const conModifier = Utils.calculateModifier(conValue);
        
        console.log(`   Уровень: ${level}, Телосложение: ${conValue} (мод: ${conModifier})`);
        
        // Определяем кость хитов по классу
        const classId = document.getElementById('characterClass')?.value;
        let hitDie = 'd8'; // Значение по умолчанию
        
        if (classId) {
            const classData = this.data.classes.find(c => c.id === classId);
            if (classData && classData.hit_die) {
                hitDie = classData.hit_die;
            }
        }
        
        const dieSize = parseInt(hitDie.substring(1)) || 8;
        const averageHitDieRoll = Math.floor(dieSize / 2) + 1; // Округление вверх для D&D
        
        console.log(`   Кость хитов: ${hitDie}, Размер кости: ${dieSize}, Среднее: ${averageHitDieRoll}`);
        
        // РАСЧЕТ МАКСИМАЛЬНОГО HP ПО ПРАВИЛАМ D&D 5e:
        // 1-й уровень: максимум на кости + мод. телосложения
        // 2-20 уровни: либо бросок кости, либо среднее значение + мод. телосложения
        
        // Для простоты используем среднее значение для всех уровней после 1-го
        let maxHP;
        
        if (level === 1) {
            // 1-й уровень: максимум на кости + мод. телосложения
            maxHP = dieSize + conModifier;
        } else {
            // 2+ уровни: 1-й уровень (максимум) + (уровень-1) * (среднее + мод. телосложения)
            const firstLevelHP = dieSize + conModifier;
            const subsequentLevelsHP = (level - 1) * (averageHitDieRoll + conModifier);
            maxHP = firstLevelHP + subsequentLevelsHP;
        }
        
        // Минимальное HP = 1 на каждом уровне
        maxHP = Math.max(level, maxHP);
        
        console.log(`   Максимальное HP: ${maxHP}`);
        
        // Обновляем поле максимального HP
        const maxHPElement = document.getElementById('maxHP');
        if (maxHPElement) {
            maxHPElement.value = maxHP;
        }
        
        // Получаем текущее HP
        const currentHPElement = document.getElementById('currentHP');
        let currentHP = currentHPElement ? parseInt(currentHPElement.value) || maxHP : maxHP;
        
        // Проверяем и корректируем текущее HP
        if (currentHPElement) {
            // Не позволяем текущему HP быть больше максимального
            if (currentHP > maxHP) {
                currentHP = maxHP;
                currentHPElement.value = currentHP;
                console.log(`   Текущее HP скорректировано: ${maxHP}`);
            }
            
            // Не позволяем текущему HP быть меньше 0
            if (currentHP < 0) {
                currentHP = 0;
                currentHPElement.value = currentHP;
                console.log(`   Текущее HP установлено: 0 (персонаж повержен)`);
            }
        }
        
        // Обновляем прогресс-бар HP (если есть)
        this.updateHPProgressBar(currentHP, maxHP);
        
        // Обновляем отображение кости хитов
        const hitDiceDisplay = document.getElementById('hitDiceDisplay');
        const hitDiceCount = document.getElementById('hitDiceCount');
        
        if (hitDiceDisplay) {
            hitDiceDisplay.textContent = hitDie;
        }
        
        if (hitDiceCount) {
            hitDiceCount.textContent = level;
        }
        
        // Обновляем информацию о HP в сводке
        this.updateCharacterSummary();
        
        console.log(`✅ HP обновлены: ${currentHP}/${maxHP} (${hitDie}, уровень ${level})`);
        return { current: currentHP, max: maxHP };
    },

    updateHPProgressBar(currentHP, maxHP) {
        const hpBar = document.getElementById('hpProgressBar');
        const hpPercent = document.getElementById('hpPercent');
        
        if (!hpBar || !hpPercent) return;
        
        if (maxHP <= 0) {
            hpBar.style.width = '0%';
            hpPercent.textContent = '0%';
            return;
        }
        
        const percent = Math.round((currentHP / maxHP) * 100);
        hpBar.style.width = `${percent}%`;
        hpPercent.textContent = `${percent}%`;
        
        // Цвет прогресс-бара в зависимости от HP
        hpBar.className = 'progress-fill hp-progress';
        if (percent < 20) {
            hpBar.classList.add('hp-critical');
        } else if (percent < 50) {
            hpBar.classList.add('hp-low');
        } else {
            hpBar.classList.add('hp-healthy');
        }
    },

    // Расчет максимального HP
    calculateMaxHP(level, hitDie, conMod) {
        const dieSize = parseInt(hitDie.substring(1)) || 8;
        
        // Первый уровень - максимум кости + conMod
        const firstLevel = dieSize + conMod;
        
        // Последующие уровни - среднее округленное вверх + conMod
        const subsequentLevels = Math.ceil(dieSize / 2) * (level - 1) + (conMod * (level - 1));
        
        return Math.max(1, firstLevel + subsequentLevels);
    },

    // Получение костей хитов
    getHitDice() {
        const classSelect = document.getElementById('characterClass');
        const classId = classSelect?.value;
        
        if (!classId) return 'd8';

        const classes = this.data.classes;
        const currentClass = classes.find(c => c.id === classId);
        
        return currentClass?.hit_die || 'd8';
    },

    // Обновление AC
    updateAC() {
        console.log('🛡️  Обновление AC по правилам D&D 5e...');
        
        const armorType = document.getElementById('armorType')?.value || 'none';
        const hasShield = document.getElementById('hasShield')?.checked || false;
        const dexInput = document.getElementById('dexterity-value');
        const dexValue = dexInput ? parseInt(dexInput.value) || 10 : 10;
        const dexModifier = Utils.calculateModifier(dexValue);
        
        console.log(`   Тип брони: ${armorType}, Щит: ${hasShield}, Мод. ловкости: ${dexModifier}`);
        
        // Данные о броне по правилам D&D 5e
        const armorData = {
            'none': { 
                baseAC: 10, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Без доспеха'
            },
            'padded': { 
                baseAC: 11, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: true,
                description: 'Стёганый доспех'
            },
            'leather': { 
                baseAC: 11, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кожаный доспех'
            },
            'studded-leather': { 
                baseAC: 12, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кожанный доспех с заклёпками'
            },
            'chain-shirt': { 
                baseAC: 13, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: false,
                description: 'Кольчужная рубаха'
            },
            'scale-mail': { 
                baseAC: 14, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: true,
                description: 'Чешуйчатый доспех'
            },
            'breastplate': { 
                baseAC: 14, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кираса'
            },
            'half-plate': { 
                baseAC: 15, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: true,
                description: 'Полулаты'
            },
            'ring-mail': { 
                baseAC: 14, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                description: 'Кольчужный доспех'
            },
            'chain-mail': { 
                baseAC: 16, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 13,
                description: 'Кольчуга'
            },
            'splint': { 
                baseAC: 17, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 15,
                description: 'Пластинчатый доспех'
            },
            'plate': { 
                baseAC: 18, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 15,
                description: 'Латы'
            }
        };
        
        const armor = armorData[armorType] || armorData['none'];
        
        // Проверяем требование силы для тяжёлых доспехов
        let strengthRequirementMet = true;
        let strengthWarning = '';
        
        if (armor.strengthRequirement) {
            const strValue = parseInt(document.getElementById('strength-value')?.value) || 10;
            strengthRequirementMet = strValue >= armor.strengthRequirement;
            
            if (!strengthRequirementMet) {
                const speedPenalty = 10;
                strengthWarning = `⚠️ Требуется сила ${armor.strengthRequirement}. Скорость снижена на ${speedPenalty} фт.`;
            }
        }
        
        // Рассчитываем эффективный бонус ловкости
        const effectiveDexBonus = Math.min(dexModifier, armor.maxDexBonus);
        
        // Рассчитываем итоговый AC по правилам D&D 5e
        let calculatedAC;
        let breakdown;
        
        if (armorType === 'none') {
            // Без доспеха: 10 + Dex
            calculatedAC = 10 + dexModifier;
            breakdown = `10 (база) + ${dexModifier} (ловкость)`;
        } else if (armor.maxDexBonus === 0) {
            // Тяжёлые доспехи: фиксированный AC, Dex не добавляется
            calculatedAC = armor.baseAC;
            breakdown = `${armor.baseAC} (броня)`;
        } else if (armor.maxDexBonus === Infinity) {
            // Лёгкие доспехи: базовый AC + полный Dex
            calculatedAC = armor.baseAC + dexModifier;
            breakdown = `${armor.baseAC} (броня) + ${dexModifier} (ловкость)`;
        } else {
            // Средние доспехи: базовый AC + Dex (макс 2)
            calculatedAC = armor.baseAC + effectiveDexBonus;
            breakdown = `${armor.baseAC} (броня) + ${effectiveDexBonus} (ловкость, макс. ${armor.maxDexBonus})`;
        }
        
        // Добавляем щит
        let shieldBonus = 0;
        if (hasShield) {
            shieldBonus = 2;
            calculatedAC += shieldBonus;
            breakdown += ` + ${shieldBonus} (щит)`;
        }
        
        // Добавляем другие модификаторы (в будущем можно добавить)
        let otherModifiers = 0;
        
        // Проверяем владение доспехом
        let armorProficiencyWarning = '';
        const classId = document.getElementById('characterClass')?.value;
        if (classId && armorType !== 'none') {
            const classData = this.data.classes.find(c => c.id === classId);
            const armorTypeCategory = this.getArmorCategory(armorType);
            
            if (classData) {
                const hasProficiency = this.checkArmorProficiency(classData, armorTypeCategory);
                if (!hasProficiency) {
                    armorProficiencyWarning = '⚠️ У вашего класса нет владения этим типом доспеха';
                }
            }
        }
        
        // Обновляем UI
        const calculatedACElement = document.getElementById('calculatedAC');
        const acBreakdownElement = document.getElementById('acBreakdown');
        const acWarningsElement = document.getElementById('acWarnings');
        
        if (calculatedACElement) {
            calculatedACElement.textContent = calculatedAC;
        }
        
        if (acBreakdownElement) {
            acBreakdownElement.innerHTML = breakdown;
        }
        
        if (acWarningsElement) {
            let warnings = [];
            if (strengthWarning) warnings.push(strengthWarning);
            if (armorProficiencyWarning) warnings.push(armorProficiencyWarning);
            if (armor.hasStealthDisadvantage) warnings.push('⚠️ Помеха на скрытность');
            
            acWarningsElement.innerHTML = warnings.join('<br>');
            acWarningsElement.style.display = warnings.length > 0 ? 'block' : 'none';
        }
        
        console.log(`✅ AC обновлен: ${calculatedAC} (${breakdown})`);
        if (strengthWarning) console.log(`   ${strengthWarning}`);
        if (armorProficiencyWarning) console.log(`   ${armorProficiencyWarning}`);
        
        return calculatedAC;
    },

    getArmorCategory(armorType) {
        const lightArmor = ['padded', 'leather', 'studded-leather'];
        const mediumArmor = ['chain-shirt', 'scale-mail', 'breastplate', 'half-plate'];
        const heavyArmor = ['ring-mail', 'chain-mail', 'splint', 'plate'];
        
        if (lightArmor.includes(armorType)) return 'light';
        if (mediumArmor.includes(armorType)) return 'medium';
        if (heavyArmor.includes(armorType)) return 'heavy';
        return 'none';
    },

    // Проверка владения доспехом
    checkArmorProficiency(classData, armorCategory) {
        if (!classData || !classData.proficiencies) return false;
        
        const proficiencies = classData.proficiencies.map(p => p.toLowerCase());
        
        switch (armorCategory) {
            case 'light':
                return proficiencies.some(p => 
                    p.includes('легкие доспехи') || 
                    p.includes('light armor') ||
                    p.includes('все доспехи') ||
                    p.includes('all armor')
                );
            case 'medium':
                return proficiencies.some(p => 
                    p.includes('средние доспехи') || 
                    p.includes('medium armor') ||
                    p.includes('все доспехи') ||
                    p.includes('all armor')
                );
            case 'heavy':
                return proficiencies.some(p => 
                    p.includes('тяжелые доспехи') || 
                    p.includes('heavy armor') ||
                    p.includes('все доспехи') ||
                    p.includes('all armor')
                );
            default:
                return false;
        }
    },

    // Обновление кошелька
    updateWalletTotal() {
        const platinum = parseInt(document.getElementById('platinum').value) || 0;
        const gold = parseInt(document.getElementById('gold').value) || 0;
        const silver = parseInt(document.getElementById('silver').value) || 0;
        const copper = parseInt(document.getElementById('copper').value) || 0;

        // Конвертация в золотые (упрощенная)
        const totalGold = platinum * 10 + gold + silver * 0.1 + copper * 0.01;
        document.getElementById('totalGold').textContent = totalGold.toFixed(2);
    },

    // Обновление сводки персонажа
    updateCharacterSummary() {
        const name = document.getElementById('characterName').value || 'Безымянный';
        const race = document.getElementById('characterRace').value;
        const charClass = document.getElementById('characterClass').value;
        const level = document.getElementById('characterLevel').value || '1';
        const ac = document.getElementById('calculatedAC')?.textContent || '10';
        const hp = document.getElementById('currentHP').value || '10';
        const maxHP = document.getElementById('maxHP').value || '10';
        const xp = document.getElementById('characterXP').value || '0';

        const raceName = this.getRaceName(race);
        const className = this.getClassName(charClass);
        const hpPercent = Math.round((parseInt(hp) / parseInt(maxHP)) * 100);

        const summaryGrid = document.getElementById('characterSummary');
        if (!summaryGrid) return;

        summaryGrid.innerHTML = `
            <div class="summary-item">
                <div class="summary-value">${level}</div>
                <div class="summary-label">Уровень</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${hp}/${maxHP}</div>
                <div class="summary-label">HP (${hpPercent}%)</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${ac}</div>
                <div class="summary-label">КД</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${xp}</div>
                <div class="summary-label">XP</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${raceName}</div>
                <div class="summary-label">Раса</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${className}</div>
                <div class="summary-label">Класс</div>
            </div>
        `;
    },

    // Вспомогательные методы
    getSpellSchool(schoolId) {
        const schools = {
            'abjuration': 'Ограждение',
            'conjuration': 'Вызов',
            'divination': 'Прорицание',
            'enchantment': 'Очарование',
            'evocation': 'Воплощение',
            'illusion': 'Иллюзия',
            'necromancy': 'Некромантия',
            'transmutation': 'Превращение'
        };
        return schools[schoolId] || schoolId;
    },

    getRaceName(raceId) {
        const race = this.data.races.find(r => r.id === raceId);
        return race?.name || raceId || 'Неизвестно';
    },

    getClassName(classId) {
        const cls = this.data.classes.find(c => c.id === classId);
        return cls?.name || classId || 'Неизвестно';
    },

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    // Сбор данных характеристик
    collectAbilityScores() {
        const abilities = {};
        const abilityIds = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilityIds.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                abilities[ability] = parseInt(input.value) || 10;
            }
        });
        
        return abilities;
    },

    // Сбор данных оружия
    collectWeapons() {
        const weapons = [];
        const weaponEntries = document.querySelectorAll('.weapon-entry');
        
        weaponEntries.forEach(entry => {
            const name = entry.querySelector('.weapon-name')?.value;
            const damage = entry.querySelector('.weapon-damage')?.value;
            const type = entry.querySelector('.weapon-type')?.value;
            
            if (name || damage) {
                weapons.push({
                    name: name || 'Оружие',
                    damage: damage || '1d6',
                    type: type || 'melee'
                });
            }
        });
        
        return weapons;
    },

    // Сбор данных предметов
    collectItems() {
        const items = [];
        const equipmentItems = document.querySelectorAll('.equipment-item');
        
        equipmentItems.forEach(item => {
            const text = item.querySelector('.equipment-text')?.value;
            if (text) {
                items.push(text);
            }
        });
        
        return items;
    },

    // Изменение значения характеристики
    changeAbilityScore(ability, change) {
        const input = document.getElementById(`${ability}-value`);
        if (!input) return;

        let value = parseInt(input.value) || 10;
        value = Math.max(1, Math.min(20, value + change));
        input.value = value;
        
        this.updateAbility(ability, value);
    },

    // Заполнение списка классов
    populateClassSelect(classes) {
        const classSelect = document.getElementById('characterClass');
        if (!classSelect) return;

        while (classSelect.options.length > 1) {
            classSelect.remove(1);
        }

        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name || cls.id;
            classSelect.appendChild(option);
        });

        // Обработчик изменения класса
        classSelect.addEventListener('change', (e) => {
            const classId = e.target.value;
            const cls = classes.find(c => c.id === classId);
            if (cls) {
                this.updateClassInfo(cls);
                this.loadClassFeatures(classId);
                this.checkSpellcasting();
                this.updateHP();
            }
        });
    },

    // Загрузка классовых особенностей
    async loadClassFeatures() {
        console.log('⚔️  Загрузка классовых особенностей...');
        
        const classId = document.getElementById('characterClass')?.value;
        if (!classId) {
            console.log('❌ Класс не выбран');
            return;
        }
        
        try {
            const classData = await this.loadClassData(classId);
            if (!classData || !classData.featuresByLevel) {
                console.log(`ℹ️  У класса "${classId}" нет особенностей по уровням`);
                return;
            }
            
            const classFeatures = document.getElementById('classFeatures');
            if (classFeatures) {
                classFeatures.innerHTML = '';
                
                // Получаем уровень персонажа
                const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
                
                // Собираем особенности до текущего уровня
                const availableFeatures = [];
                Object.entries(classData.featuresByLevel).forEach(([featureLevel, features]) => {
                    if (parseInt(featureLevel) <= level) {
                        features.forEach(feature => {
                            availableFeatures.push({
                                ...feature,
                                level: featureLevel
                            });
                        });
                    }
                });
                
                // Сортируем по уровню
                availableFeatures.sort((a, b) => parseInt(a.level) - parseInt(b.level));
                
                // Отображаем особенности
                availableFeatures.forEach(feature => {
                    const featureElement = document.createElement('div');
                    featureElement.className = 'feature-item';
                    featureElement.innerHTML = `
                        <h5>${feature.name} (Уровень ${feature.level})</h5>
                        <p>${feature.description || 'Нет описания'}</p>
                    `;
                    classFeatures.appendChild(featureElement);
                });
                
                console.log(`✅ Загружено ${availableFeatures.length} классовых особенностей`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки классовых особенностей:', error);
        }
    },

    // Обновление информации о классе
    updateClassInfo(cls) {
        const classInfo = document.getElementById('classInfo');
        if (!classInfo || !cls) return;

        let info = cls.name || cls.id;
        
        if (cls.hit_die) {
            info += ` | Кость хитов: ${cls.hit_die}`;
        }
        
        if (cls.proficiencies) {
            const profs = cls.proficiencies.join(', ');
            if (profs) info += ` | Владение: ${profs}`;
        }

        classInfo.textContent = info;
        classInfo.className = 'field-info class-info-active';
    },

    // Заполнение списка рас
    populateRaceSelect(races) {
        const raceSelect = document.getElementById('characterRace');
        if (!raceSelect) {
            console.error('❌ Не найден элемент для выбора расы');
            return;
        }
        
        console.log(`🔄 Заполнение списка рас: ${races.length} вариантов`);
        
        // Сохраняем текущее значение
        const currentValue = raceSelect.value;
        
        // Очищаем список (кроме первого option)
        while (raceSelect.options.length > 1) {
            raceSelect.remove(1);
        }
        
        // Добавляем варианты
        races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = race.name;
            option.dataset.raceId = race.id;
            raceSelect.appendChild(option);
        });
        
        // Восстанавливаем значение, если нужно
        if (currentValue && races.some(r => r.id === currentValue)) {
            raceSelect.value = currentValue;
        }
        
        console.log(`✅ Список рас заполнен: ${raceSelect.options.length - 1} вариантов`);
    },

    // Загрузка расовых особенностей
    async loadRacialFeatures(raceId) {
        try {
            const featuresList = document.getElementById('racialFeatures');
            if (!featuresList) return;

            // Загружаем расовые особенности из Firebase
            const features = await window.getFirebaseNestedData('features');
            if (!features || features.length === 0) return;

            // Фильтруем особенности по расе
            const racialFeatures = features.filter(feature => 
                feature.race_id === raceId || feature.origin === 'racial'
            );

            this.displayFeatures(racialFeatures, featuresList);
        } catch (error) {
            console.error('Ошибка загрузки расовых особенностей:', error);
        }
    },

    // Отображение особенностей
    displayFeatures(features, container) {
        if (!container) return;

        if (!features || features.length === 0) {
            container.innerHTML = '<div class="empty-features"><p>Особенности не найдены.</p></div>';
            return;
        }

        const featuresHtml = features.map(feature => `
            <div class="feature-item">
                <h4>${feature.name || 'Особенность'}</h4>
                <p>${feature.description || ''}</p>
                ${feature.level ? `<div class="feature-level">Уровень: ${feature.level}</div>` : ''}
            </div>
        `).join('');

        container.innerHTML = featuresHtml;
    },

    // Обновление информации о расе
    updateRaceInfo(race) {
        const raceInfo = document.getElementById('raceInfo');
        if (!raceInfo || !race) return;

        let info = race.name || race.id;
        if (race.ability_bonuses) {
            const bonuses = Object.entries(race.ability_bonuses)
                .map(([ability, bonus]) => `${Utils.getAbilityAbbr(ability)} +${bonus}`)
                .join(', ');
            if (bonuses) info += ` | Бонусы: ${bonuses}`;
        }
        
        if (race.speed) {
            info += ` | Скорость: ${race.speed} фт.`;
        }

        raceInfo.textContent = info;
        raceInfo.className = 'field-info race-info-active';
    },

    // Настройка шагов
    setupSteps() {
        // Инициализация прогресс-бара
        this.updateProgressBar();
        
        // Инициализация вкладок
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNum = parseInt(e.target.dataset.step);
                if (stepNum <= this.state.currentStep) {
                    this.goToStep(stepNum);
                }
            });
        });
    },

    // Переход к шагу
    goToStep(stepNumber) {
        console.log(`🚶 Переход к шагу ${stepNumber}...`);
        
        // Проверяем, что шаг в допустимых пределах
        if (stepNumber < 1 || stepNumber > this.state.totalSteps) {
            console.error(`❌ Неверный номер шага: ${stepNumber}`);
            return;
        }
        
        // Валидация текущего шага (если переходим вперед)
        if (stepNumber > this.state.currentStep) {
            console.log(`🔍 Валидация текущего шага ${this.state.currentStep}...`);
            if (!this.validateCurrentStep()) {
                console.log(`❌ Валидация шага ${this.state.currentStep} не пройдена`);
                return;
            }
            console.log(`✅ Валидация шага ${this.state.currentStep} пройдена`);
        }
        
        // Скрываем текущий шаг
        console.log(`👁️‍🗨️ Скрытие текущего шага ${this.state.currentStep}...`);
        document.querySelectorAll('.creator-step').forEach(step => {
            step.classList.remove('active');
        });

        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });

        // Показываем новый шаг
        console.log(`👁️‍🗨️ Показ шага ${stepNumber}...`);
        const stepElement = document.getElementById(`step${stepNumber}`);
        const stepIndicator = document.querySelector(`.step[data-step="${stepNumber}"]`);

        if (stepElement) {
            stepElement.classList.add('active');
            console.log(`✅ Шаг ${stepNumber} отображен`);
        } else {
            console.error(`❌ Элемент шага ${stepNumber} не найден`);
        }

        if (stepIndicator) {
            stepIndicator.classList.add('active');
        }

        // Обновляем прогресс-бар
        console.log(`📊 Обновление прогресс-бара: ${this.state.currentStep} → ${stepNumber}`);
        this.state.currentStep = stepNumber;
        this.updateProgressBar();

        // Обновляем заголовок
        this.updateStepTitle(stepNumber);

        // Прокручиваем к верху
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Загружаем данные для шага, если нужно
        this.loadStepData(stepNumber);

        console.log(`✅ Переход к шагу ${stepNumber} завершен`);
    },

    // Валидация текущего шага
    validateCurrentStep() {
        const currentStep = this.state.currentStep;
        console.log(`🔍 Выполнение валидации шага ${currentStep}...`);
        
        let isValid = true;
        
        switch (currentStep) {
            case 1:
                isValid = this.validateStep1();
                break;
            case 2:
                isValid = this.validateStep2();
                break;
            case 3:
                isValid = this.validateStep3();
                break;
            case 4:
                isValid = this.validateStep4();
                break;
            case 5:
                isValid = this.validateStep5();
                break;
            case 6:
                isValid = this.validateStep6();
                break;
            case 7:
                isValid = this.validateStep7();
                break;
            default:
                console.log(`⚠️  Валидация для шага ${currentStep} не определена`);
                isValid = true;
                break;
        }
        
        console.log(`📋 Результат валидации шага ${currentStep}: ${isValid ? '✅' : '❌'}`);
        return isValid;
    },

    // Валидация шага 1 (Основное)
    validateStep1() {
        console.log('🔍 Валидация шага 1: Основная информация...');
        
        const name = document.getElementById('characterName').value.trim();
        const race = document.getElementById('characterRace').value;
        const charClass = document.getElementById('characterClass').value;
        
        let errors = [];
        
        if (!name) {
            errors.push('Введите имя персонажа');
            console.log('❌ Не указано имя персонажа');
        }
        
        if (!race) {
            errors.push('Выберите расу персонажа');
            console.log('❌ Не выбрана раса');
        }
        
        if (!charClass) {
            errors.push('Выберите класс персонажа');
            console.log('❌ Не выбран класс');
        }
        
        if (errors.length > 0) {
            Utils.showNotification(errors.join(', '), 'error');
            return false;
        }
        
        console.log('✅ Шаг 1 валидация пройдена');
        return true;
    },

    // Валидация шага 2 (Характеристики)
    validateStep2() {
        console.log('🔍 Валидация шага 2: Характеристики...');
        
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        let errors = [];
        
        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                const value = parseInt(input.value) || 0;
                if (value < 1 || value > 30) {
                    errors.push(`${Utils.getAbilityName(ability)} должна быть от 1 до 30`);
                    console.log(`❌ Некорректное значение ${ability}: ${value}`);
                }
            }
        });
        
        // Проверяем, что все характеристики установлены
        const totalScore = abilities.reduce((sum, ability) => {
            const input = document.getElementById(`${ability}-value`);
            return sum + (parseInt(input?.value) || 0);
        }, 0);
        
        if (totalScore < 6) {
            errors.push('Сумма характеристик слишком мала');
            console.log(`❌ Сумма характеристик слишком мала: ${totalScore}`);
        }
        
        if (totalScore > 180) {
            errors.push('Сумма характеристик слишком велика');
            console.log(`❌ Сумма характеристик слишком велика: ${totalScore}`);
        }
        
        if (errors.length > 0) {
            Utils.showNotification(errors.join(', '), 'error');
            return false;
        }
        
        console.log('✅ Шаг 2 валидация пройдена');
        return true;
    },

    // Валидация шага 3 (Инвентарь)
    validateStep3() {
        console.log('🔍 Валидация шага 3: Инвентарь...');
        
        // Проверяем текущее HP
        const currentHP = parseInt(document.getElementById('currentHP')?.value) || 0;
        const maxHP = parseInt(document.getElementById('maxHP')?.value) || 10;
        
        if (currentHP < 0) {
            Utils.showNotification('Текущее HP не может быть отрицательным', 'error');
            console.log('❌ Текущее HP отрицательное');
            return false;
        }
        
        if (currentHP > maxHP) {
            Utils.showNotification('Текущее HP не может превышать максимальное', 'error');
            console.log(`❌ Текущее HP (${currentHP}) превышает максимальное (${maxHP})`);
            return false;
        }
        
        console.log('✅ Шаг 3 валидация пройдена');
        return true;
    },

    // Валидация шага 4 (Состояния)
    validateStep4() {
        console.log('🔍 Валидация шага 4: Состояния...');
        
        // Этот шаг всегда валиден
        console.log('✅ Шаг 4 валидация пройдена');
        return true;
    },

    // Валидация шага 5 (Заклинания)
    validateStep5() {
        console.log('🔍 Валидация шага 5: Заклинания...');
        
        // Проверяем только для магических классов
        if (this.state.isSpellcaster) {
            // Проверяем, что для заклинателя добавлены заклинания
            if (this.state.knownSpells.length === 0) {
                const confirmSkip = confirm('У вашего класса есть доступ к магии, но вы не добавили ни одного заклинания. Продолжить без заклинаний?');
                if (!confirmSkip) {
                    console.log('❌ Пользователь отменил переход без заклинаний');
                    return false;
                }
                console.log('⚠️  Пользователь продолжил без заклинаний');
            }
        }
        
        console.log('✅ Шаг 5 валидация пройдена');
        return true;
    },

    // Валидация шага 6 (Особенности)
    validateStep6() {
        console.log('🔍 Валидация шага 6: Особенности...');
        
        // Этот шаг всегда валиден
        console.log('✅ Шаг 6 валидация пройдена');
        return true;
    },

    // Валидация шага 7 (Заметки)
    validateStep7() {
        console.log('🔍 Валидация шага 7: Заметки...');
        
        // Проверяем обязательные поля для завершения
        const name = document.getElementById('characterName').value.trim();
        
        if (!name) {
            Utils.showNotification('Заполните имя персонажа', 'error');
            console.log('❌ Не указано имя персонажа на шаге 7');
            return false;
        }
        
        // Проверяем, что персонаж жив (необязательно, но хорошая практика)
        const currentHP = parseInt(document.getElementById('currentHP')?.value) || 0;
        if (currentHP <= 0) {
            const confirmDead = confirm('Ваш персонаж мертв (HP = 0). Завершить создание мертвого персонажа?');
            if (!confirmDead) {
                console.log('❌ Пользователь отменил создание мертвого персонажа');
                return false;
            }
            console.log('⚠️  Пользователь создает мертвого персонажа');
        }
        
        console.log('✅ Шаг 7 валидация пройдена');
        return true;
    },

    validateStep(stepNumber) {
        console.log(`🔍 Валидация шага ${stepNumber} (универсальная)...`);
        
        switch (stepNumber) {
            case 1: return this.validateStep1();
            case 2: return this.validateStep2();
            case 3: return this.validateStep3();
            case 4: return this.validateStep4();
            case 5: return this.validateStep5();
            case 6: return this.validateStep6();
            case 7: return this.validateStep7();
            default:
                console.log(`⚠️  Валидация для шага ${stepNumber} не определена`);
                return true;
        }
    },

    // Обновление прогресс-бара
    updateProgressBar() {
        const progress = (this.state.currentStep / this.state.totalSteps) * 100;
        const progressFill = document.querySelector('.progress-fill');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    },

    // Обновление заголовка шага
    updateStepTitle(stepNumber) {
        const stepTitles = {
            1: 'Основная информация',
            2: 'Характеристики',
            3: 'Инвентарь',
            4: 'Здоровье и состояния',
            5: 'Заклинания',
            6: 'Особенности',
            7: 'Заметки и завершение'
        };
        
        const subtitle = document.getElementById('creatorSubtitle');
        if (subtitle) {
            subtitle.textContent = stepTitles[stepNumber] || `Шаг ${stepNumber}`;
        }
    },

    // Загрузка данных для шага
    loadStepData(stepNumber) {
        console.log(`📥 Загрузка данных для шага ${stepNumber}...`);
        
        switch (stepNumber) {
            case 2:
                this.updateAbilitiesSummary();
                console.log('✅ Данные шага 2 загружены');
                break;
            case 3:
                this.updateAC();
                this.updateWalletTotal();
                console.log('✅ Данные шага 3 загружены');
                break;
            case 4:
                this.updateHP();
                console.log('✅ Данные шага 4 загружены');
                break;
            case 5:
                this.checkSpellcasting();
                if (this.state.isSpellcaster) {
                    this.loadSpellsForClass();
                }
                console.log('✅ Данные шага 5 загружены');
                break;
            case 6:
                this.loadFeatures();
                console.log('✅ Данные шага 6 загружены');
                break;
            case 7:
                this.updateCharacterSummary();
                console.log('✅ Данные шага 7 загружены');
                break;
            default:
                console.log(`ℹ️  Для шага ${stepNumber} не требуется загрузка данных`);
                break;
        }
    },

    // Загрузка заклинаний для класса
    async loadSpellsForClass() {
        try {
            const classSelect = document.getElementById('characterClass');
            const classId = classSelect?.value;
            
            if (!classId || !this.state.isSpellcaster) return;

            // Загружаем все заклинания
            const allSpells = await window.getFirebaseNestedData('spells');
            if (!allSpells || allSpells.length === 0) {
                this.displayEmptySpells();
                return;
            }

            // Фильтруем заклинания по классу
            const classSpells = allSpells.filter(spell => {
                return spell.classes && spell.classes.includes(classId);
            });

            this.state.availableSpells = classSpells;
            this.displaySpells(classSpells);
            this.updateSpellSlots();
            
        } catch (error) {
            console.error('Ошибка загрузки заклинаний:', error);
            this.displayEmptySpells();
        }
    },

    // Обновление ячеек заклинаний
    updateSpellSlots() {
        const level = parseInt(document.getElementById('characterLevel').value) || 1;
        const spellSlotsGrid = document.getElementById('spellSlotsGrid');
        
        if (!spellSlotsGrid) return;

        // Простая логика ячеек заклинаний по уровню
        const slotsByLevel = {
            1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
            2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
            3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
            4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
            5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
            6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
            7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
            8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
            9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
            10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
            11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
            12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
            13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
            14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
            15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
            16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
            17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
            18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
            19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
            20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
        };

        const slots = slotsByLevel[level] || slotsByLevel[1];
        
        const slotsHtml = slots.map((slotCount, index) => {
            if (slotCount === 0) return '';
            
            const level = index + 1;
            return `
                <div class="spell-slot" data-level="${level}">
                    <div class="spell-level">${level}</div>
                    <div class="spell-count">${slotCount}</div>
                </div>
            `;
        }).join('');

        spellSlotsGrid.innerHTML = slotsHtml;
    },

    // Отображение заклинаний
    displaySpells(spells) {
        const spellsList = document.getElementById('spellsList');
        if (!spellsList) return;

        if (!spells || spells.length === 0) {
            this.displayEmptySpells();
            return;
        }

        const spellsHtml = spells.map(spell => `
            <div class="spell-item" data-id="${spell.id}">
                <div class="spell-item-header">
                    <div class="spell-item-name">${spell.name || 'Заклинание'}</div>
                    <div class="spell-item-level">${spell.level || 'Кантрип'}</div>
                </div>
                <div class="spell-item-school">${this.getSpellSchool(spell.school)}</div>
                <div class="spell-item-description">${this.truncateText(spell.description || '', 150)}</div>
            </div>
        `).join('');

        spellsList.innerHTML = spellsHtml;

        // Добавляем обработчики кликов
        spellsList.querySelectorAll('.spell-item').forEach(item => {
            item.addEventListener('click', () => {
                this.addSpellToKnown(item.dataset.id);
            });
        });
    },

    // Добавление заклинания в список известных
    addSpellToKnown(spellId) {
        const spell = this.state.availableSpells.find(s => s.id === spellId);
        if (!spell) return;

        // Проверяем, не добавлено ли уже это заклинание
        const alreadyAdded = this.state.knownSpells.some(s => s.id === spellId);
        if (alreadyAdded) {
            Utils.showNotification('Это заклинание уже добавлено', 'warning');
            return;
        }

        this.state.knownSpells.push(spell);
        Utils.showNotification(`Заклинание "${spell.name}" добавлено`, 'success');
    },

    // Отображение пустого списка заклинаний
    displayEmptySpells() {
        const spellsList = document.getElementById('spellsList');
        if (!spellsList) return;

        spellsList.innerHTML = `
            <div class="empty-spells">
                <i class="fas fa-scroll"></i>
                <p>Заклинания не найдены.</p>
                <p class="text-small">Попробуйте выбрать другой класс или обновите страницу.</p>
            </div>
        `;
    },



    // Проверка использования магии
    async checkSpellcasting() {
        const classSelect = document.getElementById('characterClass');
        const classId = classSelect?.value;
        
        if (!classId) {
            this.state.isSpellcaster = false;
            this.updateSpellcastingUI();
            return;
        }

        // Проверяем, есть ли у класса доступ к магии
        const classes = this.data.classes;
        const currentClass = classes.find(c => c.id === classId);
        
        if (currentClass && currentClass.spellcasting) {
            this.state.isSpellcaster = true;
        } else {
            this.state.isSpellcaster = false;
        }

        this.updateSpellcastingUI();
    },

    // Обновление UI заклинаний
    updateSpellcastingUI() {
        const noMagicNotice = document.getElementById('noMagicNotice');
        const spellcastingContainer = document.getElementById('spellcastingContainer');
        const skipSpellsSection = document.getElementById('skipSpellsSection');

        if (!noMagicNotice || !spellcastingContainer || !skipSpellsSection) return;

        if (this.state.isSpellcaster) {
            noMagicNotice.classList.add('hidden');
            spellcastingContainer.classList.remove('hidden');
            skipSpellsSection.classList.add('hidden');
        } else {
            noMagicNotice.classList.remove('hidden');
            spellcastingContainer.classList.add('hidden');
            skipSpellsSection.classList.remove('hidden');
        }
    },

    // Показ режима загрузки
    showLoadingMode() {
        document.getElementById('modeNew').classList.add('hidden');
        document.getElementById('modeEdit').classList.add('hidden');
        document.getElementById('modeLoading').classList.remove('hidden');
    },

    // Скрытие режима загрузки
    hideLoadingMode() {
        document.getElementById('modeLoading').classList.add('hidden');
    },

    // Показ режима редактирования
    showEditMode() {
        document.getElementById('modeNew').classList.add('hidden');
        document.getElementById('modeEdit').classList.remove('hidden');
        document.getElementById('creatorTitle').textContent = 'Редактирование персонажа';
        
        // Блокируем некоторые поля
        this.lockEditFields();
    },

    // Показ режима создания
    showNewMode() {
        document.getElementById('modeNew').classList.remove('hidden');
        document.getElementById('modeEdit').classList.add('hidden');
        document.getElementById('creatorTitle').textContent = 'Конструктор персонажа';
    },

    // Блокировка полей в режиме редактирования
    lockEditFields() {
        // В режиме редактирования некоторые поля нельзя менять
        const lockedFields = [
            'characterRace',
            'characterClass',
            'characterBackground'
        ];
        
        lockedFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = true;
                field.classList.add('disabled-field');
            }
        });
        
        // Показываем уведомление
        const notice = document.createElement('div');
        notice.className = 'edit-notice card';
        notice.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Режим редактирования</strong>
                <p>Некоторые поля заблокированы и не могут быть изменены.</p>
            </div>
        `;
        
        const header = document.querySelector('.creator-header');
        if (header) {
            header.appendChild(notice);
        }
    },

    // Заполнение формы данными персонажа
    populateForm(character) {
        console.log('📝 Заполнение формы данными персонажа...');
        
        if (!character) {
            console.error('❌ Нет данных персонажа для заполнения');
            return;
        }
        
        // Отладочная информация
        console.log('Данные персонажа:', character);
        
        // ОСНОВНОЕ
        const nameInput = document.getElementById('characterName');
        const raceSelect = document.getElementById('characterRace');
        const classSelect = document.getElementById('characterClass');
        
        if (nameInput && character.name) {
            nameInput.value = character.name;
            console.log(`✅ Имя: ${character.name}`);
        }
        
        if (raceSelect && character.race) {
            // Ищем опцию с таким значением
            const raceOption = Array.from(raceSelect.options).find(opt => opt.value === character.race);
            if (raceOption) {
                raceSelect.value = character.race;
                console.log(`✅ Раса: ${character.race}`);
                
                // Обновляем информацию о расе
                setTimeout(() => this.onRaceChange(character.race), 100);
            } else {
                console.warn(`⚠️ Раса "${character.race}" не найдена в списке`);
            }
        }
        
        if (classSelect && character.class) {
            // Ищем опцию с таким значением
            const classOption = Array.from(classSelect.options).find(opt => opt.value === character.class);
            if (classOption) {
                classSelect.value = character.class;
                console.log(`✅ Класс: ${character.class}`);
                
                // Обновляем информацию о классе
                setTimeout(() => this.onClassChange(character.class), 100);
            } else {
                console.warn(`⚠️ Класс "${character.class}" не найдена в списке`);
            }
        }
        
        // Дополнительные поля
        this.setFieldValue('characterBackground', character.background);
        this.setFieldValue('characterAlignment', character.alignment);
        this.setFieldValue('characterLevel', character.level || 1);
        this.setFieldValue('characterXP', character.xp || 0);
        this.setFieldValue('characterSpeed', character.speed || 30);
        
        this.setFieldValue('characterAge', character.appearance?.age);
        this.setFieldValue('characterHeight', character.appearance?.height);
        this.setFieldValue('characterWeight', character.appearance?.weight);
        this.setFieldValue('characterEyes', character.appearance?.eyes);
        this.setFieldValue('characterSkin', character.appearance?.skin);
        this.setFieldValue('characterHair', character.appearance?.hair);

        // Вдохновение
        const inspirationCheckbox = document.getElementById('hasInspiration');
        if (inspirationCheckbox && character.bonuses?.inspiration !== undefined) {
            inspirationCheckbox.checked = character.bonuses.inspiration;
        }

        // Навыки
        if (character.skills) {
            Object.entries(character.skills).forEach(([skillId, skillData]) => {
                const checkbox = document.getElementById(`skill-${skillId}-proficiency`);
                if (checkbox) {
                    checkbox.checked = skillData.proficiency;
                    if (skillData.expertise) {
                        checkbox.classList.add('expertise');
                    }
                    // Обновляем модификатор
                    this.updateSkillModifier(skillId);
                }
            });
        }

        // Состояния
        if (character.conditions) {
            Object.entries(character.conditions).forEach(([conditionId, conditionData]) => {
                const conditionItem = document.querySelector(`.condition-item[data-condition="${conditionId}"]`);
                if (conditionItem && conditionData.active) {
                    conditionItem.classList.add('active');
                }
            });
        }
        
        // ХАРАКТЕРИСТИКИ
        if (character.abilityScores) {
            console.log('📊 Заполнение характеристик:', character.abilityScores);
            
            Object.keys(character.abilityScores).forEach(ability => {
                const input = document.getElementById(`${ability}-value`);
                if (input) {
                    const value = character.abilityScores[ability];
                    input.value = value;
                    this.updateAbility(ability);
                    console.log(`   ${ability}: ${value}`);
                }
            });
        }
        
        // ИНВЕНТАРЬ
        if (character.armor) {
            console.log('🛡️ Заполнение брони:', character.armor);
            
            this.setFieldValue('armorType', character.armor.type || 'none');
            
            const hasShield = document.getElementById('hasShield');
            if (hasShield && character.armor.shield !== undefined) {
                hasShield.checked = character.armor.shield;
            }
        }
        
        // ОРУЖИЕ
        if (character.weapons && character.weapons.length > 0) {
            console.log(`🗡️ Оружие: ${character.weapons.length} предметов`);
            this.populateWeapons(character.weapons);
        }
        
        // ПРЕДМЕТЫ
        if (character.items && character.items.length > 0) {
            console.log(`🎒 Предметы: ${character.items.length} предметов`);
            this.populateItems(character.items);
        }
        
        // КОШЕЛЕК
        if (character.wallet) {
            console.log('💰 Кошелек:', character.wallet);
            
            this.setFieldValue('platinum', character.wallet.platinum || 0);
            this.setFieldValue('gold', character.wallet.gold || 0);
            this.setFieldValue('silver', character.wallet.silver || 0);
            this.setFieldValue('copper', character.wallet.copper || 0);
        }
        
        // ЗДОРОВЬЕ
        if (character.hp) {
            console.log('❤️ Здоровье:', character.hp);
            
            this.setFieldValue('maxHP', character.hp.max || 10);
            this.setFieldValue('currentHP', character.hp.current || character.hp.max || 10);
            this.setFieldValue('tempHP', character.hp.temp || 0);
        }
        
        // ЗАКЛИНАНИЯ
        if (character.spells) {
            console.log(`✨ Заклинания: ${character.spells.length} заклинаний`);
            this.state.knownSpells = character.spells;
        }
        
        // ЗАМЕТКИ
        if (character.notes) {
            console.log('📝 Заметки:', character.notes);
            
            this.setFieldValue('historyNotes', character.notes.history || '');
            this.setFieldValue('appearanceNotes', character.notes.appearance || '');
            this.setFieldValue('personalityNotes', character.notes.personality || '');
            this.setFieldValue('additionalNotes', character.notes.additional || '');
        }
        
        // ДОПОЛНИТЕЛЬНЫЕ ОСОБЕННОСТИ
        if (character.additionalFeatures) {
            this.setFieldValue('additionalFeatures', character.additionalFeatures);
        }
        
        // Обновляем расчеты
        setTimeout(() => {
            this.updateAllCalculations();
            console.log('✅ Форма заполнена данными персонажа');
        }, 500);
    },

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value !== undefined && value !== null) {
            field.value = value;
        }
    },

    // Обновление всех расчетов
    updateAllCalculations() {
        console.log('🔄 Обновление всех расчетов...');
        
        // Обновляем характеристики и связанные системы
        this.updateAbilitiesSummary();
        this.updateAllSkillModifiers(); // <-- Эта функция теперь обновляет все навыки
        
        // Обновляем боевые характеристики
        this.updateHP();
        this.updateAC();
        this.updateWalletTotal();
        
        // Обновляем магические способности
        this.checkSpellcasting();
        if (this.state.isSpellcaster) {
            this.updateSpellSlots();
        }
        
        // Обновляем сводку
        this.updateCharacterSummary();
        
        // Обновляем информацию об XP
        const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
        this.updateXPInfo(level);
        
        console.log('✅ Все расчеты обновлены');
    },

    // Отмена создания
    cancelCreation() {
        if (this.state.hasChanges && !confirm('У вас есть несохраненные изменения. Вы уверены, что хотите выйти?')) {
            return;
        }
        
        window.location.href = 'characters.html';
    },

    // Сохранение черновика
    async saveDraft() {
        try {
            const character = this.collectCharacterData();
            character.isDraft = true;
            character.updatedAt = Date.now();
            
            // Сохраняем в локальное хранилище
            CharacterStorage.saveCharacter(character);
            
            // Синхронизируем с Firebase
            await this.syncCharacter(character);
            
            this.state.hasChanges = false;
            Utils.showNotification('Черновик сохранен', 'success');
            
            // Предлагаем перейти к списку персонажей
            if (confirm('Черновик сохранен. Хотите перейти к списку персонажей?')) {
                window.location.href = 'characters.html';
            }
            
        } catch (error) {
            console.error('Ошибка сохранения черновика:', error);
            Utils.showNotification('Не удалось сохранить черновик', 'error');
        }
    },

    // Завершение создания персонажа
    async finishCharacter() {
        try {
            // Валидация всех шагов
            if (!this.validateAllSteps()) {
                return;
            }

            const character = this.collectCharacterData();
            character.isDraft = false;
            character.createdAt = character.createdAt || Date.now();
            character.updatedAt = Date.now();

            // Сохраняем в локальное хранилище
            CharacterStorage.saveCharacter(character);
            
            // Синхронизируем с Firebase
            await this.syncCharacter(character);
            
            this.state.hasChanges = false;
            this.showCompletionModal(character);
            
        } catch (error) {
            console.error('Ошибка завершения создания:', error);
            Utils.showNotification('Не удалось сохранить персонажа', 'error');
        }
    },

    // Валидация всех шагов
    validateAllSteps() {
        console.log('🔍 Валидация всех шагов...');
        
        // Сохраняем текущий шаг
        const originalStep = this.state.currentStep;
        
        for (let i = 1; i <= this.state.totalSteps; i++) {
            // Переходим к шагу (без валидации перехода)
            document.querySelectorAll('.creator-step').forEach(step => {
                step.classList.remove('active');
            });
            
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.add('active');
            }
            
            // Валидируем шаг
            if (!this.validateStep(i)) {
                console.log(`❌ Валидация всех шагов провалена на шаге ${i}`);
                // Восстанавливаем оригинальный шаг
                this.goToStep(originalStep);
                return false;
            }
        }
        
        // Восстанавливаем оригинальный шаг
        this.goToStep(originalStep);
        
        console.log('✅ Все шаги прошли валидацию');
        return true;
    },

    // Сбор данных персонажа
    collectCharacterData() {
        const character = {
            id: this.state.characterId || Date.now().toString(),
            name: document.getElementById('characterName').value.trim(),
            race: document.getElementById('characterRace').value,
            class: document.getElementById('characterClass').value,
            subclass: document.getElementById('characterSubclass')?.value || '',
            background: document.getElementById('characterBackground').value || '',
            alignment: document.getElementById('characterAlignment').value || '',
            level: parseInt(document.getElementById('characterLevel').value) || 1,
            xp: parseInt(document.getElementById('characterXP').value) || 0,
            speed: parseInt(document.getElementById('characterSpeed').value) || 30,
            
            // Характеристики
            abilityScores: this.collectAbilityScores(),
            
            // Навыки и мастерство
            skills: this.collectSkills(),
            
            // Пассивные значения
            passivePerception: parseInt(document.getElementById('passivePerception')?.textContent) || 10,
            
            // Броня и AC
            armor: {
                type: document.getElementById('armorType').value,
                shield: document.getElementById('hasShield').checked,
                calculatedAC: parseInt(document.getElementById('calculatedAC')?.textContent) || 10
            },
            
            // Оружие
            weapons: this.collectWeapons(),
            
            // Снаряжение
            items: this.collectItems(),
            
            // Кошелек
            wallet: {
                platinum: parseInt(document.getElementById('platinum').value) || 0,
                gold: parseInt(document.getElementById('gold').value) || 0,
                silver: parseInt(document.getElementById('silver').value) || 0,
                copper: parseInt(document.getElementById('copper').value) || 0,
                totalGold: parseFloat(document.getElementById('totalGold')?.textContent) || 0
            },
            
            // Здоровье
            hp: {
                max: parseInt(document.getElementById('maxHP').value) || 10,
                current: parseInt(document.getElementById('currentHP').value) || 10,
                temp: parseInt(document.getElementById('tempHP').value) || 0,
                hitDice: this.getHitDice(),
                hitDiceCount: parseInt(document.getElementById('characterLevel').value) || 1
            },
            
            // Состояния
            conditions: this.collectConditions(),
            
            // Заклинания
            spells: this.state.knownSpells,
            
            // Слоты заклинаний
            spellSlots: this.collectSpellSlots(),
            
            // Особенности и черты
            features: {
                racial: this.getRacialFeatures(),
                class: this.getClassFeatures(),
                subclass: this.getSubclassFeatures(),
                additional: document.getElementById('additionalFeatures').value || ''
            },
            
            // Заметки
            notes: {
                history: document.getElementById('historyNotes').value || '',
                appearance: document.getElementById('appearanceNotes').value || '',
                personality: document.getElementById('personalityNotes').value || '',
                additional: document.getElementById('additionalNotes').value || ''
            },
            
            // Внешний вид
            appearance: {
                age: document.getElementById('characterAge')?.value || '',
                height: document.getElementById('characterHeight')?.value || '',
                weight: document.getElementById('characterWeight')?.value || '',
                eyes: document.getElementById('characterEyes')?.value || '',
                skin: document.getElementById('characterSkin')?.value || '',
                hair: document.getElementById('characterHair')?.value || ''
            },
            
            // Методы и бонусы
            bonuses: {
                proficiencyBonus: Utils.calculateProficiencyBonus(parseInt(document.getElementById('characterLevel').value) || 1),
                inspiration: document.getElementById('hasInspiration')?.checked || false
            },
            
            // Системные поля
            isDraft: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Добавляем статус, если персонаж мертв
        if (character.hp.current === 0) {
            character.status = 'dead';
        }

        return character;
    },

    // Синхронизация с Firebase
    async syncCharacter(character) {
        try {
            const isConnected = await DB.checkConnection();
            if (!isConnected) {
                console.log('Нет подключения к Firebase, сохраняем локально');
                return;
            }

            const path = `characters/${character.id}`;
            await DB.saveData(path, character);
            
            Utils.logAction(`Персонаж "${character.name}" синхронизирован с Firebase`);
            
        } catch (error) {
            console.error('Ошибка синхронизации с Firebase:', error);
            // Не показываем ошибку пользователю, т.к. данные сохранены локально
        }
    },

    collectSkills() {
        const skills = {};
        
        if (this.data.skills && this.data.skills.length > 0) {
            this.data.skills.forEach(skill => {
                const proficiencyCheckbox = document.getElementById(`skill-${skill.id}-proficiency`);
                const hasProficiency = proficiencyCheckbox?.checked || false;
                const isExpertise = proficiencyCheckbox?.classList.contains('expertise') || false;
                
                const modifierElement = document.getElementById(`skill-${skill.id}-modifier`);
                const modifier = modifierElement ? parseInt(modifierElement.textContent.replace('+', '')) || 0 : 0;
                
                skills[skill.id] = {
                    name: skill.name,
                    ability: skill.ability,
                    proficiency: hasProficiency,
                    expertise: isExpertise,
                    modifier: modifier
                };
            });
        }
        
        return skills;
    },

    // Сбор данных состояний
    collectConditions() {
        const conditions = {};
        const conditionItems = document.querySelectorAll('.condition-item');
        
        conditionItems.forEach(item => {
            const conditionId = item.dataset.condition;
            const isActive = item.classList.contains('active');
            const conditionName = item.querySelector('.condition-name')?.textContent || conditionId;
            
            if (conditionId) {
                conditions[conditionId] = {
                    name: conditionName,
                    active: isActive
                };
            }
        });
        
        return conditions;
    },

    // Сбор данных слотов заклинаний
    collectSpellSlots() {
        const spellSlots = {};
        const slotElements = document.querySelectorAll('.spell-slot');
        
        slotElements.forEach(slot => {
            const level = parseInt(slot.dataset.level);
            const count = parseInt(slot.querySelector('.spell-count')?.textContent) || 0;
            
            if (level && count > 0) {
                spellSlots[`level${level}`] = count;
            }
        });
        
        return spellSlots;
    },

    // Получение расовых особенностей
    getRacialFeatures() {
        const racialFeatures = [];
        const racialFeaturesElement = document.getElementById('racialFeatures');
        
        if (racialFeaturesElement) {
            const featureItems = racialFeaturesElement.querySelectorAll('.feature-item');
            featureItems.forEach(item => {
                const name = item.querySelector('h4, h5')?.textContent || '';
                const description = item.querySelector('p')?.textContent || '';
                
                if (name) {
                    racialFeatures.push({ name, description });
                }
            });
        }
        
        return racialFeatures;
    },

    // Получение классовых особенностей
    getClassFeatures() {
        const classFeatures = [];
        const classFeaturesElement = document.getElementById('classFeatures');
        
        if (classFeaturesElement) {
            const featureItems = classFeaturesElement.querySelectorAll('.feature-item');
            featureItems.forEach(item => {
                const name = item.querySelector('h4, h5')?.textContent || '';
                const description = item.querySelector('p')?.textContent || '';
                const levelText = item.querySelector('.feature-level')?.textContent || '';
                
                if (name) {
                    classFeatures.push({ 
                        name, 
                        description, 
                        level: levelText.replace('Уровень: ', '') 
                    });
                }
            });
        }
        
        return classFeatures;
    },

    // Получение особенностей подкласса
    getSubclassFeatures() {
        const subclassFeatures = [];
        const subclassFeaturesElement = document.getElementById('subclassFeatures');
        
        if (subclassFeaturesElement) {
            const featureItems = subclassFeaturesElement.querySelectorAll('.feature-item');
            featureItems.forEach(item => {
                const name = item.querySelector('h4, h5')?.textContent || '';
                const description = item.querySelector('p')?.textContent || '';
                const levelText = item.querySelector('.feature-level')?.textContent || '';
                
                if (name) {
                    subclassFeatures.push({ 
                        name, 
                        description, 
                        level: levelText.replace('Уровень: ', '') 
                    });
                }
            });
        }
        
        return subclassFeatures;
    },

    // Показ модального окна завершения
    showCompletionModal(character) {
        const modal = document.getElementById('completionModal');
        const title = document.getElementById('completionTitle');
        const message = document.getElementById('completionMessage');
        const closeBtn = document.getElementById('closeCompletionModal');
        const createAnotherBtn = document.getElementById('createAnother');

        if (!modal || !title || !message) return;

        if (this.state.isEditMode) {
            title.textContent = 'Изменения сохранены!';
            message.textContent = `Персонаж "${character.name}" успешно обновлен.`;
        } else {
            title.textContent = 'Персонаж создан!';
            message.textContent = `Поздравляем! Ваш персонаж "${character.name}" готов к приключениям.`;
        }

        // Обработчики
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                window.location.href = 'characters.html';
            };
        }

        if (createAnotherBtn) {
            createAnotherBtn.onclick = () => {
                modal.classList.add('hidden');
                window.location.href = 'creator.html';
            };
        }

        modal.classList.remove('hidden');
    },

    // Отслеживание изменений
    trackChanges() {
        const form = document.getElementById('creatorForm');
        if (!form) return;

        // Отслеживаем изменения во всех полях ввода
        form.addEventListener('input', () => {
            this.state.hasChanges = true;
        });

        form.addEventListener('change', () => {
            this.state.hasChanges = true;
        });

        // Предупреждение при закрытии страницы
        window.addEventListener('beforeunload', (e) => {
            if (this.state.hasChanges) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            }
        });
    },

    // Заполнение выпадающих списков рас
    populateRaceSelect(races) {
        const raceSelect = document.getElementById('characterRace');
        if (!raceSelect) return;

        races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = race.name;
            raceSelect.appendChild(option);
        });

        // Добавляем обработчик изменения
        raceSelect.addEventListener('change', (e) => {
            this.onRaceChange(e.target.value);
        });
    },

    // Заполнение выпадающих списков классов
    populateClassSelect(classes) {
        const classSelect = document.getElementById('characterClass');
        if (!classSelect) {
            console.error('❌ Не найден элемент для выбора класса');
            return;
        }
        
        console.log(`🔄 Заполнение списка классов: ${classes.length} вариантов`);
        
        // Сохраняем текущее значение
        const currentValue = classSelect.value;
        
        // Очищаем список (кроме первого option)
        while (classSelect.options.length > 1) {
            classSelect.remove(1);
        }
        
        // Добавляем варианты
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            option.dataset.classId = cls.id;
            classSelect.appendChild(option);
        });
        
        // Восстанавливаем значение, если нужно
        if (currentValue && classes.some(c => c.id === currentValue)) {
            classSelect.value = currentValue;
        }
        
        console.log(`✅ Список классов заполнен: ${classSelect.options.length - 1} вариантов`);
    },

    // Обработка изменения расы
    async onRaceChange(raceId) {
        if (!raceId) {
            console.log('👥 Раса не выбрана');
            return;
        }

        console.log(`🔍 Загрузка данных расы: ${raceId}`);
        
        try {
            let race = this.data.races.find(r => r.id === raceId);
            
            // Если не нашли в загруженных данных, пробуем загрузить отдельно
            if (!race) {
                console.log('🔄 Раса не найдена в кэше, загружаем...');
                race = await this.loadRaceData(raceId);
            }
            
            if (race) {
                console.log(`✅ Данные расы "${race.name}" загружены`);
                this.updateRaceInfo(race);
                
                // Обновляем скорость, если указана в расе
                if (race.speed) {
                    const speedInput = document.getElementById('characterSpeed');
                    if (speedInput) {
                        speedInput.value = race.speed;
                        console.log(`🏃 Скорость установлена: ${race.speed} фт.`);
                    }
                }
            } else {
                console.warn(`⚠️  Раса с ID ${raceId} не найдена`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки расы ${raceId}:`, error);
        }
    },

    // Загрузка данных расы из Firebase
    async loadRaceData(raceId) {
        console.log(`📥 Загрузка конкретной расы: ${raceId}`);
        
        try {
            // Пробуем получить все расы и найти нужную
            const races = await window.getFirebaseNestedData('races');
            if (races && races.length > 0) {
                const race = races.find(r => r.id === raceId);
                if (race) {
                    console.log(`✅ Раса найдена в Firebase: ${race.name}`);
                    return race;
                }
            }
            
            // Если не нашли в Firebase, ищем в локальных данных
            if (window.racesData) {
                const race = window.racesData.find(r => r.id === raceId);
                if (race) {
                    console.log(`✅ Раса найдена в локальных данных: ${race.name}`);
                    return race;
                }
            }
            
            console.warn(`⚠️  Раса ${raceId} не найдена ни в одном источнике`);
            return null;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных расы:', error);
            return null;
        }
    },

    // Обновление информации о расе
    updateRaceInfo(race) {
        const raceInfo = document.getElementById('raceInfo');
        if (!raceInfo) {
            console.error('❌ Не найден элемент для отображения информации о расе');
            return;
        }
        
        console.log(`📝 Обновление информации о расе: ${race.name}`);
        
        let info = `<strong>${race.name}</strong><br>`;
        
        if (race.description) {
            const shortDesc = race.description.substring(0, 100);
            info += `${shortDesc}${race.description.length > 100 ? '...' : ''}<br>`;
        }
        
        if (race.abilityScoreIncrease) {
            info += '<strong>Бонусы характеристик:</strong><br>';
            Object.entries(race.abilityScoreIncrease).forEach(([ability, value]) => {
                if (value > 0) {
                    const abilityName = Utils.getAbilityName(ability);
                    info += `• ${abilityName}: +${value}<br>`;
                }
            });
        }
        
        if (race.speed) {
            info += `<strong>Скорость:</strong> ${race.speed} фт.<br>`;
        }
        
        if (race.size) {
            info += `<strong>Размер:</strong> ${race.size}<br>`;
        }
        
        raceInfo.innerHTML = info;
        console.log('✅ Информация о расе обновлена');
    },

    // Обработка изменения класса
    async onClassChange(classId) {
        if (!classId) {
            console.log('⚔️  Класс не выбран');
            return;
        }

        console.log(`🔍 Загрузка данных класса: ${classId}`);
        
        try {
            let cls = this.data.classes.find(c => c.id === classId);
            
            // Если не нашли в загруженных данных, пробуем загрузить отдельно
            if (!cls) {
                console.log('🔄 Класс не найден в кэше, загружаем...');
                cls = await this.loadClassData(classId);
            }
            
            if (cls) {
                console.log(`✅ Данные класса "${cls.name}" загружены`);
                this.updateClassInfo(cls);
                await this.loadSubclassesForClass(classId);
            } else {
                console.warn(`⚠️  Класс с ID ${classId} не найдена`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки класса ${classId}:`, error);
        }
    },

    // Загрузка данных класса из Firebase
    async loadClassData(classId) {
        console.log(`📥 Загрузка конкретного класса: ${classId}`);
        
        try {
            // Пробуем получить все классы и найти нужный
            const classes = await window.getFirebaseNestedData('classes');
            if (classes && classes.length > 0) {
                const cls = classes.find(c => c.id === classId);
                if (cls) {
                    console.log(`✅ Класс найден в Firebase: ${cls.name}`);
                    return cls;
                }
            }
            
            // Если не нашли в Firebase, ищем в локальных данных
            if (window.classesData) {
                const cls = window.classesData.find(c => c.id === classId);
                if (cls) {
                    console.log(`✅ Класс найден в локальных данных: ${cls.name}`);
                    return cls;
                }
            }
            
            console.warn(`⚠️  Класс ${classId} не найден ни в одном источнике`);
            return null;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных класса:', error);
            return null;
        }
    },

    // Обновление информации о классе
    updateClassInfo(cls) {
        const classInfo = document.getElementById('classInfo');
        if (!classInfo) {
            console.error('❌ Не найден элемент для отображения информации о классе');
            return;
        }
        
        console.log(`📝 Обновление информации о классе: ${cls.name}`);
        
        let info = `<strong>${cls.name}</strong><br>`;
        
        if (cls.description) {
            const shortDesc = cls.description.substring(0, 100);
            info += `${shortDesc}${cls.description.length > 100 ? '...' : ''}<br>`;
        }
        
        if (cls.hitDie) {
            info += `<strong>Кость хитов:</strong> ${cls.hitDie}<br>`;
        }
        
        if (cls.primaryAbility) {
            info += '<strong>Основные характеристики:</strong> ';
            const abilities = cls.primaryAbility.map(a => Utils.getAbilityName(a)).join(', ');
            info += `${abilities}<br>`;
        }
        
        classInfo.innerHTML = info;
        console.log('✅ Информация о классе обновлена');
    },

    // Загрузка подклассов для выбранного класса
    async loadSubclassesForClass(classId) {
        console.log(`🔍 Поиск подклассов для класса: ${classId}`);
        
        try {
            // Загружаем все подклассы
            const subclasses = await window.getFirebaseNestedData('subclasses');
            
            if (!subclasses || subclasses.length === 0) {
                console.log('⚠️  Подклассы не найдены в Firebase');
                
                // Пробуем локальные данные
                if (window.subclassesData) {
                    console.log('🔄 Используем локальные данные подклассов');
                    this.filterAndDisplaySubclasses(window.subclassesData, classId);
                } else {
                    console.log('❌ Нет данных о подклассах');
                }
                return;
            }
            
            console.log(`📊 Найдено подклассов: ${subclasses.length}`);
            this.filterAndDisplaySubclasses(subclasses, classId);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки подклассов:', error);
        }
    },

    filterAndDisplaySubclasses(subclasses, classId) {
        // Фильтруем подклассы по classId
        const classSubclasses = subclasses.filter(sc => sc.classId === classId);
        
        console.log(`📋 Подклассы для класса ${classId}:`, classSubclasses.length);
        
        if (classSubclasses.length === 0) {
            console.log(`⚠️  Нет подклассов для класса ${classId}`);
        }
        
        // Обновляем UI с подклассами
        this.updateSubclassSelect(classSubclasses);
    },

    // Обновление списка подклассов
    updateSubclassSelect(subclasses) {
        console.log('🔄 Обновление списка подклассов...');
        
        // Находим или создаем элемент для подклассов
        let subclassSection = document.getElementById('subclassSection');
        if (!subclassSection) {
            console.log('➕ Создание секции подклассов');
            
            // Создаем секцию подклассов
            subclassSection = document.createElement('div');
            subclassSection.className = 'form-group';
            subclassSection.id = 'subclassSection';
            subclassSection.innerHTML = `
                <label for="characterSubclass">
                    <i class="fas fa-star"></i> Подкласс
                </label>
                <select id="characterSubclass" class="select">
                    <option value="">Выберите подкласс...</option>
                </select>
                <div class="field-info" id="subclassInfo">Выберите подкласс для просмотра особенностей</div>
            `;
            
            // Вставляем после класса
            const classGroup = document.getElementById('characterClass').closest('.form-group');
            if (classGroup && classGroup.parentNode) {
                classGroup.parentNode.insertBefore(subclassSection, classGroup.nextSibling);
                console.log('✅ Секция подклассов создана');
            } else {
                console.error('❌ Не удалось вставить секцию подклассов');
                return;
            }
        }
        
        const subclassSelect = document.getElementById('characterSubclass');
        if (!subclassSelect) {
            console.error('❌ Не найден элемент выбора подкласса');
            return;
        }
        
        // Сохраняем текущее значение
        const currentValue = subclassSelect.value;
        
        // Очищаем старые опции (кроме первой)
        while (subclassSelect.options.length > 1) {
            subclassSelect.remove(1);
        }
        
        // Добавляем новые опции
        subclasses.forEach(subclass => {
            const option = document.createElement('option');
            option.value = subclass.id;
            option.textContent = subclass.name;
            subclassSelect.appendChild(option);
        });
        
        // Восстанавливаем значение, если нужно
        if (currentValue && subclasses.some(sc => sc.id === currentValue)) {
            subclassSelect.value = currentValue;
        }
        
        console.log(`✅ Список подклассов обновлен: ${subclassSelect.options.length - 1} вариантов`);
        
        // Добавляем обработчик изменения
        subclassSelect.addEventListener('change', (e) => {
            const subclassId = e.target.value;
            console.log(`⭐ Изменен подкласс: ${subclassId}`);
            this.onSubclassChange(subclassId);
        });
    },

    // Обработка изменения подкласса
    async onSubclassChange(subclassId) {
        if (!subclassId) return;

        try {
            const subclass = await this.loadSubclassData(subclassId);
            if (subclass) {
                this.updateSubclassInfo(subclass);
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных подкласса:', error);
        }
    },

    // Загрузка данных подкласса
    async loadSubclassData(subclassId) {
        try {
            const subclasses = await window.getFirebaseNestedData('subclasses');
            if (subclasses && subclasses.length > 0) {
                return subclasses.find(sc => sc.id === subclassId);
            }
            return null;
        } catch (error) {
            console.error('Ошибка загрузки данных подкласса:', error);
            return null;
        }
    },

    // Обновление информации о подклассе
    updateSubclassInfo(subclass) {
        const subclassInfo = document.getElementById('subclassInfo');
        if (subclassInfo && subclass) {
            let info = `<strong>${subclass.name}</strong><br>`;
            info += subclass.description ? `${subclass.description.substring(0, 100)}...<br>` : '';
            
            subclassInfo.innerHTML = info;
        }
    },

    // Инициализация характеристик
    initAbilities() {
        console.log('💪 Инициализация характеристик...');
        
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const abilitiesGrid = document.getElementById('abilitiesGrid');
        
        if (!abilitiesGrid) {
            console.error('❌ Не найден контейнер для характеристик');
            return;
        }
        
        // Очищаем контейнер
        abilitiesGrid.innerHTML = '';
        
        abilities.forEach(ability => {
            const abilityCard = document.createElement('div');
            abilityCard.className = 'ability-card';
            abilityCard.dataset.ability = ability;
            
            abilityCard.innerHTML = `
                <div class="ability-header">
                    <h4>${Utils.getAbilityName(ability)}</h4>
                    <div class="ability-abbr">${Utils.getAbilityAbbr(ability)}</div>
                </div>
                <div class="ability-score">
                    <input type="number" 
                           id="${ability}-value" 
                           class="ability-input" 
                           min="1" 
                           max="30" 
                           value="10"
                           data-base="10">
                    <div class="ability-modifier" id="${ability}-mod">+0</div>
                </div>
                <div class="ability-controls">
                    <button type="button" class="ability-btn decrease" data-ability="${ability}">-</button>
                    <button type="button" class="ability-btn increase" data-ability="${ability}">+</button>
                </div>
            `;
            
            abilitiesGrid.appendChild(abilityCard);
        });
        
        // Добавляем обработчики для кнопок
        abilitiesGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('ability-btn')) {
                const ability = e.target.dataset.ability;
                const isIncrease = e.target.classList.contains('increase');
                console.log(`🔘 Кнопка характеристики ${ability}: ${isIncrease ? '+' : '-'}`);
                this.changeAbility(ability, isIncrease ? 1 : -1);
            }
        });
        
        // Добавляем обработчики для ввода
        abilitiesGrid.addEventListener('input', (e) => {
            if (e.target.classList.contains('ability-input')) {
                const ability = e.target.id.replace('-value', '');
                console.log(`⌨️  Ввод характеристики ${ability}: ${e.target.value}`);
                this.updateAbility(ability);
            }
        });
        
        console.log('✅ Характеристики инициализированы');
    },

    // Изменение характеристики
    changeAbility(ability, delta) {
        const input = document.getElementById(`${ability}-value`);
        if (!input) return;
        
        let value = parseInt(input.value) || 10;
        value += delta;
        
        // Ограничиваем значения
        if (value < 1) value = 1;
        if (value > 30) value = 30;
        
        input.value = value;
        this.updateAbility(ability);
    },

    // Обновление характеристики
    updateAbility(ability) {
        console.log(`🔄 Обновление характеристики ${ability}...`);
        
        const input = document.getElementById(`${ability}-value`);
        const modElement = document.getElementById(`${ability}-mod`);
        
        if (!input || !modElement) {
            console.error(`❌ Элементы для характеристики ${ability} не найдены`);
            return;
        }
        
        const value = parseInt(input.value) || 10;
        const modifier = Utils.calculateModifier(value);
        
        modElement.textContent = Utils.formatModifier(modifier);
        modElement.className = 'ability-modifier ' + (modifier >= 0 ? 'positive' : 'negative');
        
        console.log(`📊 ${Utils.getAbilityName(ability)}: ${value} (модификатор: ${Utils.formatModifier(modifier)})`);
        
        // Обновляем сводку
        this.updateAbilitiesSummary();
    },

    // Обновление сводки характеристик
    updateAbilitiesSummary() {
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        let totalModifiers = 0;
        let totalScore = 0;
        let count = 0;

        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                const score = parseInt(input.value) || 10;
                totalScore += score;
                totalModifiers += Utils.calculateModifier(score);
                count++;
            }
        });

        const averageScore = count > 0 ? (totalScore / count).toFixed(1) : '0.0';
        const level = parseInt(document.getElementById('characterLevel').value) || 1;
        const proficiencyBonus = Utils.calculateProficiencyBonus(level);

        // Обновляем отображение
        document.getElementById('totalModifiers').textContent = Utils.formatModifier(totalModifiers);
        document.getElementById('averageScore').textContent = averageScore;
        document.getElementById('proficiencyBonus').textContent = Utils.formatModifier(proficiencyBonus);
        
        // ВАЖНО: Обновляем все навыки при изменении характеристик
        this.updateAllSkillModifiers();
        
        // Обновляем пассивную внимательность
        this.updatePassivePerception();
    },

    // Загрузка навыков
    async loadSkills() {
        try {
            // Пробуем загрузить из Firebase
            const rules = await window.getFirebaseNestedData('rules');
            if (rules && rules.length > 0) {
                // Ищем навыки в правилах
                // Структура может отличаться, поэтому адаптируемся
                console.log('Правила загружены:', rules);
            }
            
            // Используем локальные данные из shared-functions.js или загружаем из файла
            const skillsGrid = document.getElementById('skillsGrid');
            if (skillsGrid) {
                // Временно используем статические данные
                const staticSkills = [
                    { id: 'acrobatics', name: 'Акробатика', ability: 'dexterity' },
                    { id: 'animal-handling', name: 'Уход за животными', ability: 'wisdom' },
                    { id: 'arcana', name: 'Магия', ability: 'intelligence' },
                    { id: 'athletics', name: 'Атлетика', ability: 'strength' }
                ];
                
                this.populateSkills(staticSkills);
            }
            
        } catch (error) {
            console.error('Ошибка загрузки навыков:', error);
        }
    },

    // Заполнение навыков
    populateSkills(skills) {
        const skillsGrid = document.getElementById('skillsGrid');
        if (!skillsGrid) return;
        
        skillsGrid.innerHTML = '';
        
        skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-item';
            skillElement.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" id="skill-${skill.id}" data-skill="${skill.id}">
                    <span class="checkbox-custom"></span>
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-ability">(${Utils.getAbilityAbbr(skill.ability)})</span>
                </label>
                <div class="skill-modifier" id="mod-${skill.id}">+0</div>
            `;
            
            skillsGrid.appendChild(skillElement);
        });
        
        // Обновляем модификаторы навыков при изменении характеристик
        this.updateSkillModifiers();
    },

    // Обновление модификаторов навыков
    updateSkillModifier(skillId) {
        // Находим навык в данных
        const skill = this.data.skills?.find(s => s.id === skillId);
        if (!skill) {
            console.warn(`⚠️  Навык с ID ${skillId} не найден в данных`);
            return 0;
        }
        
        // Получаем значение характеристики
        const abilityInput = document.getElementById(`${skill.ability}-value`);
        if (!abilityInput) {
            console.warn(`⚠️  Поле для характеристики ${skill.ability} не найдено`);
            return 0;
        }
        
        const abilityValue = parseInt(abilityInput.value) || 10;
        const abilityModifier = Utils.calculateModifier(abilityValue);
        
        // Получаем бонус мастерства
        const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
        const proficiencyBonus = Utils.calculateProficiencyBonus(level);
        
        // Проверяем мастерство
        const proficiencyCheckbox = document.getElementById(`skill-${skillId}-proficiency`);
        const hasProficiency = proficiencyCheckbox?.checked || false;
        const isExpertise = proficiencyCheckbox?.classList.contains('expertise') || false;
        
        // Рассчитываем итоговый модификатор
        let totalModifier = abilityModifier;
        
        if (hasProficiency) {
            totalModifier += isExpertise ? proficiencyBonus * 2 : proficiencyBonus;
        }
        
        // Обновляем отображение
        const modifierElement = document.getElementById(`skill-${skillId}-modifier`);
        if (modifierElement) {
            modifierElement.textContent = Utils.formatModifier(totalModifier);
            modifierElement.className = 'skill-modifier ' + 
                (totalModifier >= 0 ? 'positive' : 'negative');
        } else {
            console.warn(`⚠️  Элемент для модификатора навыка ${skillId} не найден`);
        }
        
        return totalModifier;
    },

    updatePassivePerception() {
        const passivePerceptionElement = document.getElementById('passivePerception');
        if (!passivePerceptionElement) return;
        
        // Находим навык Восприятие вручную без вызова updateSkillModifier()
        const perceptionSkill = this.data.skills?.find(s => s.id === 'perception');
        if (!perceptionSkill) {
            passivePerceptionElement.textContent = '10';
            return;
        }
        
        // Получаем значение мудрости
        const wisInput = document.getElementById('wisdom-value');
        const wisValue = wisInput ? parseInt(wisInput.value) || 10 : 10;
        const wisModifier = Utils.calculateModifier(wisValue);
        
        // Получаем бонус мастерства
        const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
        const proficiencyBonus = Utils.calculateProficiencyBonus(level);
        
        // Проверяем мастерство Восприятия
        const proficiencyCheckbox = document.getElementById('skill-perception-proficiency');
        const hasProficiency = proficiencyCheckbox?.checked || false;
        const isExpertise = proficiencyCheckbox?.classList.contains('expertise') || false;
        
        // Рассчитываем модификатор Восприятия
        let perceptionModifier = wisModifier;
        if (hasProficiency) {
            perceptionModifier += isExpertise ? proficiencyBonus * 2 : proficiencyBonus;
        }
        
        // Рассчитываем пассивную внимательность
        const passivePerception = 10 + perceptionModifier;
        
        // Обновляем отображение
        passivePerceptionElement.textContent = passivePerception;
        
        // Также обновляем отображение модификатора Восприятия
        const modifierElement = document.getElementById('skill-perception-modifier');
        if (modifierElement) {
            modifierElement.textContent = Utils.formatModifier(perceptionModifier);
            modifierElement.className = 'skill-modifier ' + 
                (perceptionModifier >= 0 ? 'positive' : 'negative');
        }
    },

    // Инициализация состояний
    initConditions() {
        const conditionsGrid = document.getElementById('conditionsGrid');
        if (!conditionsGrid) return;
        
        // Используем статические данные из rules.json
        const staticConditions = [
            { id: 'blinded', name: 'Ослепление', description: 'Ослеплённое существо не может видеть...' },
            { id: 'charmed', name: 'Очарование', description: 'Очарованное существо не может атаковать...' },
            { id: 'exhaustion', name: 'Истощение', description: 'Состояние истощения имеет 6 уровней...' }
        ];
        
        this.populateConditions(staticConditions);
    },

    // Заполнение состояний
    populateConditions(conditions) {
        const conditionsGrid = document.getElementById('conditionsGrid');
        if (!conditionsGrid) return;
        
        conditionsGrid.innerHTML = '';
        
        conditions.forEach(condition => {
            const conditionElement = document.createElement('div');
            conditionElement.className = 'condition-item';
            conditionElement.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" id="condition-${condition.id}">
                    <span class="checkbox-custom"></span>
                    <span class="condition-name">${condition.name}</span>
                </label>
                <div class="condition-info" title="${condition.description}">
                    <i class="fas fa-info-circle"></i>
                </div>
            `;
            
            conditionsGrid.appendChild(conditionElement);
        });
    },

    // Обновление AC
    updateAC() {
        console.log('🛡️  Обновление AC по правилам D&D 5e...');
        
        const armorType = document.getElementById('armorType')?.value || 'none';
        const hasShield = document.getElementById('hasShield')?.checked || false;
        const dexInput = document.getElementById('dexterity-value');
        const dexValue = dexInput ? parseInt(dexInput.value) || 10 : 10;
        const dexModifier = Utils.calculateModifier(dexValue);
        
        console.log(`   Тип брони: ${armorType}, Щит: ${hasShield}, Мод. ловкости: ${dexModifier}`);
        
        // Данные о броне по правилам D&D 5e (фиксированные значения)
        const armorData = {
            'none': { 
                baseAC: 10, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Без доспеха'
            },
            'padded': { 
                baseAC: 11, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: true,
                description: 'Стёганый доспех'
            },
            'leather': { 
                baseAC: 11, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кожаный доспех'
            },
            'studded-leather': { 
                baseAC: 12, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кожанный доспех с заклёпками'
            },
            'chain-shirt': { 
                baseAC: 13, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: false,
                description: 'Кольчужная рубаха'
            },
            'scale-mail': { 
                baseAC: 14, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: true,
                description: 'Чешуйчатый доспех'
            },
            'breastplate': { 
                baseAC: 14, 
                maxDexBonus: Infinity, 
                hasStealthDisadvantage: false,
                description: 'Кираса'
            },
            'half-plate': { 
                baseAC: 15, 
                maxDexBonus: 2, 
                hasStealthDisadvantage: true,
                description: 'Полулаты'
            },
            'ring-mail': { 
                baseAC: 14, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                description: 'Кольчужный доспех'
            },
            'chain-mail': { 
                baseAC: 16, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 13,
                description: 'Кольчуга'
            },
            'splint': { 
                baseAC: 17, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 15,
                description: 'Пластинчатый доспех'
            },
            'plate': { 
                baseAC: 18, 
                maxDexBonus: 0, 
                hasStealthDisadvantage: true,
                strengthRequirement: 15,
                description: 'Латы'
            }
        };
        
        const armor = armorData[armorType] || armorData['none'];
        
        // Рассчитываем эффективный бонус ловкости
        const effectiveDexBonus = Math.min(dexModifier, armor.maxDexBonus);
        
        // КОРРЕКТНЫЙ РАСЧЕТ AC ПО ПРАВИЛАМ D&D 5e
        let calculatedAC;
        let breakdown;
        
        if (armorType === 'none') {
            // Без доспеха: 10 + Dex модификатор
            calculatedAC = 10 + dexModifier;
            breakdown = `10 + ${dexModifier} (ловкость)`;
        } else if (armor.maxDexBonus === 0) {
            // Тяжёлые доспехи: фиксированный AC, Dex не добавляется
            calculatedAC = armor.baseAC;
            breakdown = `${armor.baseAC} (броня)`;
        } else if (armor.maxDexBonus === Infinity) {
            // Лёгкие доспехи: AC брони + полный Dex модификатор
            calculatedAC = armor.baseAC + dexModifier;
            breakdown = `${armor.baseAC} (броня) + ${dexModifier} (ловкость)`;
        } else {
            // Средние доспехи: AC брони + Dex модификатор (макс. +2)
            calculatedAC = armor.baseAC + effectiveDexBonus;
            breakdown = `${armor.baseAC} (броня) + ${effectiveDexBonus} (ловкость, макс. +${armor.maxDexBonus})`;
        }
        
        // Добавляем щит (+2 к любому AC)
        if (hasShield) {
            calculatedAC += 2;
            breakdown += ` + 2 (щит)`;
        }
        
        console.log(`   Расчет: ${breakdown} = ${calculatedAC}`);
        
        // Обновляем UI
        const calculatedACElement = document.getElementById('calculatedAC');
        const acBreakdownElement = document.getElementById('acBreakdown');
        
        if (calculatedACElement) {
            calculatedACElement.textContent = calculatedAC;
        }
        
        if (acBreakdownElement) {
            acBreakdownElement.innerHTML = breakdown;
        }
        
        // Проверяем требование силы для тяжёлых доспехов
        if (armor.strengthRequirement) {
            const strValue = parseInt(document.getElementById('strength-value')?.value) || 10;
            const strModifier = Utils.calculateModifier(strValue);
            
            if (strValue < armor.strengthRequirement) {
                const speedPenalty = 10;
                console.log(`⚠️  Скорость снижена на ${speedPenalty} фт. (требуется сила ${armor.strengthRequirement})`);
            }
        }
        
        console.log(`✅ AC обновлен: ${calculatedAC}`);
        return calculatedAC;
    },

    // Обновление кошелька
    updateWalletTotal() {
        const platinum = parseInt(document.getElementById('platinum')?.value) || 0;
        const gold = parseInt(document.getElementById('gold')?.value) || 0;
        const silver = parseInt(document.getElementById('silver')?.value) || 0;
        const copper = parseInt(document.getElementById('copper')?.value) || 0;
        
        // Конвертируем все в золотые
        const totalGold = platinum * 10 + gold + silver / 10 + copper / 100;
        
        const totalGoldElement = document.getElementById('totalGold');
        if (totalGoldElement) {
            totalGoldElement.textContent = totalGold.toFixed(2);
        }
    },

    // Обновление HP
    updateHP() {
        console.log('❤️  Обновление HP...');
        
        const level = parseInt(document.getElementById('characterLevel')?.value) || 1;
        const conValue = parseInt(document.getElementById('constitution-value')?.value) || 10;
        const conModifier = Utils.calculateModifier(conValue);
        
        console.log(`   Уровень: ${level}, Мод. телосложения: ${conModifier}`);
        
        // Определяем кость хитов по классу
        const classId = document.getElementById('characterClass')?.value;
        let hitDie = 'd8'; // По умолчанию
        
        if (classId) {
            const classData = this.data.classes.find(c => c.id === classId);
            if (classData && classData.hitDie) {
                hitDie = classData.hitDie;
            }
        }
        
        const dieSize = parseInt(hitDie.substring(1)) || 8;
        
        console.log(`   Кость хитов: ${hitDie}, Размер кости: ${dieSize}`);
        
        // Рассчитываем максимальное HP
        // Первый уровень: максимум на кости + модификатор
        const firstLevel = dieSize + conModifier;
        // Последующие уровни: среднее значение
        const subsequentLevels = Math.floor((dieSize / 2) + 0.5) * (level - 1);
        const conBonusTotal = conModifier * level;
        
        const maxHP = firstLevel + subsequentLevels + conBonusTotal;
        
        console.log(`   Расчет: ${firstLevel}(1 ур.) + ${subsequentLevels}(ост.) + ${conBonusTotal}(Тел.) = ${maxHP}`);
        
        // Обновляем поле максимального HP
        const maxHPElement = document.getElementById('maxHP');
        if (maxHPElement) {
            maxHPElement.value = maxHP;
            console.log(`   Максимальное HP: ${maxHP}`);
        }
        
        // Обновляем текущее HP, если оно больше максимума
        const currentHPElement = document.getElementById('currentHP');
        if (currentHPElement) {
            let currentHP = parseInt(currentHPElement.value) || maxHP;
            if (currentHP > maxHP) {
                currentHPElement.value = maxHP;
                console.log(`   Текущее HP скорректировано: ${currentHP} → ${maxHP}`);
            }
        }
        
        // Обновляем отображение кости хитов
        const hitDiceDisplay = document.getElementById('hitDiceDisplay');
        const hitDiceCount = document.getElementById('hitDiceCount');
        
        if (hitDiceDisplay) {
            hitDiceDisplay.textContent = hitDie;
        }
        
        if (hitDiceCount) {
            hitDiceCount.textContent = level;
        }
        
        console.log(`✅ HP обновлены: max=${maxHP}, кубик=${hitDie}, кол-во=${level}`);
    },

    // Проверка магических способностей класса
    checkSpellcasting() {
        console.log('✨ Проверка магических способностей класса...');
        
        const classId = document.getElementById('characterClass')?.value;
        if (!classId) {
            this.state.isSpellcaster = false;
            console.log('❌ Класс не выбран, магия недоступна');
            return;
        }
        
        const classData = this.data.classes.find(c => c.id === classId);
        if (classData && classData.spellcasting) {
            this.state.isSpellcaster = true;
            console.log(`✅ Класс "${classData.name}" имеет доступ к магии`);
            
            // Показываем секцию заклинаний
            const spellcastingContainer = document.getElementById('spellcastingContainer');
            const noMagicNotice = document.getElementById('noMagicNotice');
            
            if (spellcastingContainer) {
                spellcastingContainer.classList.remove('hidden');
                console.log('👁️‍🗨️ Секция заклинаний показана');
            }
            
            if (noMagicNotice) {
                noMagicNotice.classList.add('hidden');
            }
        } else {
            this.state.isSpellcaster = false;
            console.log(`❌ Класс "${classData?.name || 'неизвестный'}" не имеет доступа к магии`);
            
            // Скрываем секцию заклинаний
            const spellcastingContainer = document.getElementById('spellcastingContainer');
            const noMagicNotice = document.getElementById('noMagicNotice');
            
            if (spellcastingContainer) {
                spellcastingContainer.classList.add('hidden');
                console.log('👁️‍🗨️ Секция заклинаний скрыта');
            }
            
            if (noMagicNotice) {
                noMagicNotice.classList.remove('hidden');
                console.log('👁️‍🗨️ Уведомление "Нет магии" показано');
            }
        }
    },

    // Загрузка заклинаний для класса
    async loadSpellsForClass() {
        if (!this.state.isSpellcaster) return;
        
        try {
            const classId = document.getElementById('characterClass')?.value;
            if (!classId) return;
            
            // Загружаем заклинания из Firebase
            const spells = await window.getFirebaseNestedData('spells');
            if (!spells || spells.length === 0) {
                // Используем локальные данные
                console.log('Используем локальные данные заклинаний');
                return;
            }
            
            // Фильтруем заклинания по классу
            const classSpells = spells.filter(spell => {
                return spell.classes && spell.classes.includes(classId);
            });
            
            this.state.availableSpells = classSpells;
            this.populateSpellsList(classSpells);
            
        } catch (error) {
            console.error('Ошибка загрузки заклинаний:', error);
        }
    },

    // Заполнение списка заклинаний
    populateSpellsList(spells) {
        const spellsList = document.getElementById('spellsList');
        if (!spellsList) return;
        
        spellsList.innerHTML = '';
        
        if (spells.length === 0) {
            spellsList.innerHTML = `
                <div class="empty-spells">
                    <i class="fas fa-magic"></i>
                    <p>Нет доступных заклинаний для этого класса</p>
                </div>
            `;
            return;
        }
        
        spells.forEach(spell => {
            const spellElement = document.createElement('div');
            spellElement.className = 'spell-item';
            spellElement.dataset.spellId = spell.id;
            
            const levelText = spell.level === 0 ? 'Заговор' : `Уровень ${spell.level}`;
            
            spellElement.innerHTML = `
                <div class="spell-header">
                    <h4>${spell.name}</h4>
                    <span class="spell-level">${levelText}</span>
                </div>
                <div class="spell-info">
                    <span class="spell-school">${spell.school || 'Не указана'}</span>
                    <span class="spell-casting-time">${spell.castingTime || '1 действие'}</span>
                </div>
                <div class="spell-description">
                    ${spell.description ? spell.description.substring(0, 100) + '...' : 'Нет описания'}
                </div>
                <div class="spell-actions">
                    <button type="button" class="btn btn-small btn-primary add-spell" data-spell-id="${spell.id}">
                        <i class="fas fa-plus"></i> Добавить
                    </button>
                </div>
            `;
            
            spellsList.appendChild(spellElement);
        });
        
        // Добавляем обработчики для кнопок добавления
        spellsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-spell') || e.target.closest('.add-spell')) {
                const button = e.target.classList.contains('add-spell') ? e.target : e.target.closest('.add-spell');
                const spellId = button.dataset.spellId;
                this.addSpellToKnown(spellId);
            }
        });
    },

    // Добавление заклинания в известные
    addSpellToKnown(spellId) {
        const spell = this.state.availableSpells.find(s => s.id === spellId);
        if (!spell) return;
        
        // Проверяем, не добавлено ли уже это заклинание
        if (this.state.knownSpells.some(s => s.id === spellId)) {
            Utils.showNotification('Это заклинание уже добавлено', 'warning');
            return;
        }
        
        this.state.knownSpells.push(spell);
        Utils.showNotification(`Заклинание "${spell.name}" добавлено`, 'success');
        
        // Обновляем список известных заклинаний в модальном окне
        this.updateKnownSpellsList();
    },

    // Обновление списка известных заклинаний
    updateKnownSpellsList() {
        const knownSpellsList = document.getElementById('knownSpellsList');
        if (!knownSpellsList) return;
        
        knownSpellsList.innerHTML = '';
        
        if (this.state.knownSpells.length === 0) {
            knownSpellsList.innerHTML = '<p>Нет известных заклинаний</p>';
            return;
        }
        
        this.state.knownSpells.forEach(spell => {
            const spellElement = document.createElement('div');
            spellElement.className = 'known-spell-item';
            
            const levelText = spell.level === 0 ? 'Заговор' : `Уровень ${spell.level}`;
            
            spellElement.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" value="${spell.id}">
                    <span class="checkbox-custom"></span>
                </label>
                <div class="known-spell-info">
                    <strong>${spell.name}</strong>
                    <span class="spell-details">${levelText} • ${spell.school || 'Не указана'}</span>
                </div>
            `;
            
            knownSpellsList.appendChild(spellElement);
        });
    },

    // Загрузка особенностей
    async loadFeatures() {
        console.log('🌟 Загрузка особенностей персонажа...');
        
        await Promise.all([
            this.loadRacialFeatures(),
            this.loadClassFeatures(),
            this.loadSubclassFeatures()
        ]);
        
        console.log('✅ Все особенности загружены');
    },

    // Загрузка особенностей подкласса
    async loadSubclassFeatures() {
        console.log('⭐ Загрузка особенностей подкласса...');
        
        const subclassId = document.getElementById('characterSubclass')?.value;
        if (!subclassId) {
            console.log('❌ Подкласс не выбран');
            return;
        }
        
        try {
            const subclass = await this.loadSubclassData(subclassId);
            if (!subclass || !subclass.featuresByLevel) {
                console.log(`ℹ️  У подкласса "${subclassId}" нет особенностей`);
                return;
            }
            
            const subclassFeatures = document.getElementById('subclassFeatures');
            if (subclassFeatures) {
                subclassFeatures.innerHTML = '';
                
                // Собираем все особенности из всех уровней
                const allFeatures = [];
                Object.entries(subclass.featuresByLevel).forEach(([level, features]) => {
                    features.forEach(feature => {
                        allFeatures.push({
                            ...feature,
                            level: level
                        });
                    });
                });
                
                // Сортируем по уровню
                allFeatures.sort((a, b) => parseInt(a.level) - parseInt(b.level));
                
                // Отображаем особенности
                allFeatures.forEach(feature => {
                    const featureElement = document.createElement('div');
                    featureElement.className = 'feature-item';
                    featureElement.innerHTML = `
                        <h5>${feature.name} (Уровень ${feature.level})</h5>
                        <p>${feature.description || 'Нет описания'}</p>
                    `;
                    subclassFeatures.appendChild(featureElement);
                });
                
                console.log(`✅ Загружено ${allFeatures.length} особенностей подкласса`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки особенностей подкласса:', error);
        }
    },

    // Загрузка расовых особенностей
    async loadRacialFeatures() {
        console.log('👥 Загрузка расовых особенностей...');
        
        const raceId = document.getElementById('characterRace')?.value;
        if (!raceId) {
            console.log('❌ Раса не выбрана');
            return;
        }
        
        try {
            const race = await this.loadRaceData(raceId);
            if (!race || !race.features) {
                console.log(`ℹ️  У расы "${raceId}" нет особенностей`);
                return;
            }
            
            const racialFeatures = document.getElementById('racialFeatures');
            if (racialFeatures) {
                racialFeatures.innerHTML = '';
                
                race.features.forEach(feature => {
                    const featureElement = document.createElement('div');
                    featureElement.className = 'feature-item';
                    featureElement.innerHTML = `
                        <h5>${feature.name}</h5>
                        <p>${feature.description || 'Нет описания'}</p>
                    `;
                    racialFeatures.appendChild(featureElement);
                });
                
                console.log(`✅ Загружено ${race.features.length} расовых особенностей`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки расовых особенностей:', error);
        }
    },

    // Обновление сводки персонажа
    updateCharacterSummary() {
        console.log('📋 Обновление сводки персонажа...');
        
        const summaryGrid = document.getElementById('characterSummary');
        if (!summaryGrid) {
            console.error('❌ Не найден элемент сводки персонажа');
            return;
        }
        
        // Собираем основные данные
        const name = document.getElementById('characterName')?.value || 'Без имени';
        const race = document.getElementById('characterRace')?.value || 'Не выбрана';
        const charClass = document.getElementById('characterClass')?.value || 'Не выбран';
        const level = document.getElementById('characterLevel')?.value || 1;
        const alignment = document.getElementById('characterAlignment')?.value || 'Не выбрано';
        
        console.log(`   Основное: ${name}, ${race}, ${charClass}, ур.${level}, ${alignment}`);
        
        // Рассчитываем производные значения
        const hp = document.getElementById('currentHP')?.value || 10;
        const maxHP = document.getElementById('maxHP')?.value || 10;
        const ac = document.getElementById('calculatedAC')?.textContent || 10;
        
        const strMod = Utils.calculateModifier(parseInt(document.getElementById('strength-value')?.value) || 10);
        const dexMod = Utils.calculateModifier(parseInt(document.getElementById('dexterity-value')?.value) || 10);
        const conMod = Utils.calculateModifier(parseInt(document.getElementById('constitution-value')?.value) || 10);
        const intMod = Utils.calculateModifier(parseInt(document.getElementById('intelligence-value')?.value) || 10);
        const wisMod = Utils.calculateModifier(parseInt(document.getElementById('wisdom-value')?.value) || 10);
        const chaMod = Utils.calculateModifier(parseInt(document.getElementById('charisma-value')?.value) || 10);
        
        console.log(`   Боевые: HP ${hp}/${maxHP}, AC ${ac}`);
        console.log(`   Характеристики: STR ${strMod}, DEX ${dexMod}, CON ${conMod}, INT ${intMod}, WIS ${wisMod}, CHA ${chaMod}`);
        
        // Форматируем сводку
        summaryGrid.innerHTML = `
            <div class="summary-item">
                <h4>Основное</h4>
                <p><strong>Имя:</strong> ${name}</p>
                <p><strong>Раса:</strong> ${race}</p>
                <p><strong>Класс:</strong> ${charClass}</p>
                <p><strong>Уровень:</strong> ${level}</p>
                <p><strong>Мировоззрение:</strong> ${alignment}</p>
            </div>
            <div class="summary-item">
                <h4>Боевые характеристики</h4>
                <p><strong>HP:</strong> ${hp}/${maxHP}</p>
                <p><strong>AC:</strong> ${ac}</p>
                <p><strong>Скорость:</strong> ${document.getElementById('characterSpeed')?.value || 30} фт.</p>
                <p><strong>Бонус мастерства:</strong> ${Utils.formatModifier(Utils.calculateProficiencyBonus(parseInt(level)))}</p>
            </div>
            <div class="summary-item">
                <h4>Характеристики</h4>
                <p><strong>Сила:</strong> ${Utils.formatModifier(strMod)}</p>
                <p><strong>Ловкость:</strong> ${Utils.formatModifier(dexMod)}</p>
                <p><strong>Телосложение:</strong> ${Utils.formatModifier(conMod)}</p>
                <p><strong>Интеллект:</strong> ${Utils.formatModifier(intMod)}</p>
                <p><strong>Мудрость:</strong> ${Utils.formatModifier(wisMod)}</p>
                <p><strong>Харизма:</strong> ${Utils.formatModifier(chaMod)}</p>
            </div>
        `;
        
        console.log('✅ Сводка персонажа обновлена');
    },

    // Инициализация модальных окон
    initModals() {
        console.log('🪟 Инициализация модальных окон...');
        
        // Закрытие модальных окон по клику вне
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    console.log(`📌 Модальное окно закрыто: ${modal.id}`);
                }
            });
        });
        
        // Закрытие по крестику
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                    console.log(`📌 Модальное окно закрыто через крестик: ${modal.id}`);
                }
            });
        });
        
        // Инициализация конкретных модальных окон
        this.initHealthModal();
        this.initSpellModals();
        this.initConfirmModal();
        
        console.log('✅ Модальные окна инициализированы');
    },

    // Инициализация модального окна здоровья
    initHealthModal() {
        const healthChangeModal = document.getElementById('healthChangeModal');
        const closeHealthModal = document.getElementById('closeHealthModal');
        const cancelHealthChange = document.getElementById('cancelHealthChange');
        
        if (closeHealthModal) {
            closeHealthModal.addEventListener('click', () => {
                healthChangeModal.classList.add('hidden');
            });
        }
        
        if (cancelHealthChange) {
            cancelHealthChange.addEventListener('click', () => {
                healthChangeModal.classList.add('hidden');
            });
        }
        
        // Закрытие по клику вне модального окна
        healthChangeModal.addEventListener('click', (e) => {
            if (e.target === healthChangeModal) {
                healthChangeModal.classList.add('hidden');
            }
        });
        
        // Обработчик подтверждения изменения здоровья
        const confirmHealthChange = document.getElementById('confirmHealthChange');
        if (confirmHealthChange) {
            confirmHealthChange.addEventListener('click', () => {
                this.applyHealthChange();
            });
        }
    },

    // Применение изменения здоровья
    applyHealthChange() {
        const amount = parseInt(document.getElementById('healthChangeAmount')?.value) || 0;
        const type = document.getElementById('healthChangeType')?.value || '';
        const title = document.getElementById('healthChangeTitle')?.textContent || '';
        
        if (amount <= 0) {
            Utils.showNotification('Введите корректное количество', 'error');
            return;
        }
        
        const currentHPInput = document.getElementById('currentHP');
        const tempHPInput = document.getElementById('tempHP');
        const maxHP = parseInt(document.getElementById('maxHP')?.value) || 10;
        
        let currentHP = parseInt(currentHPInput?.value) || maxHP;
        let tempHP = parseInt(tempHPInput?.value) || 0;
        
        if (title.includes('урон')) {
            // Применяем урон по правилам D&D
            // 1. Сначала урон наносится временным HP
            // 2. Затем остаток урона наносится обычным HP
            
            let remainingDamage = amount;
            
            // Урон временным HP
            if (tempHP > 0) {
                const tempHPReduction = Math.min(tempHP, remainingDamage);
                tempHP -= tempHPReduction;
                remainingDamage -= tempHPReduction;
            }
            
            // Остаток урона наносится обычным HP
            if (remainingDamage > 0) {
                currentHP = Math.max(0, currentHP - remainingDamage);
            }
            
            // Обновляем значения
            currentHPInput.value = currentHP;
            tempHPInput.value = tempHP;
            
            // Проверяем состояние персонажа
            if (currentHP === 0) {
                Utils.showNotification('Персонаж повержен!', 'warning');
            }
            
        } else if (title.includes('Лечение')) {
            // Лечение: не может превысить максимальное HP
            currentHP = Math.min(maxHP, currentHP + amount);
            currentHPInput.value = currentHP;
            
        } else if (title.includes('Временные')) {
            // Временные HP: заменяют существующие временные HP, если новые больше
            if (amount > tempHP) {
                tempHP = amount;
                tempHPInput.value = tempHP;
            }
        }
        
        // Скрываем модальное окно
        document.getElementById('healthChangeModal').classList.add('hidden');
        
        // Обновляем прогресс-бар и сводку
        this.updateHPProgressBar(currentHP, maxHP);
        this.updateCharacterSummary();
        
        // Показываем уведомление
        const action = title.includes('урон') ? 'получен' : 
                      title.includes('Лечение') ? 'восстановлен' : 'добавлен';
        Utils.showNotification(`${amount} HP ${action}`, 'success');
        
        // Сбрасываем форму
        document.getElementById('healthChangeAmount').value = 1;
    },

    validateAllSystems() {
        console.log('🔍 Проверка всех систем...');
        
        // Проверяем характеристики
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                let value = parseInt(input.value) || 10;
                value = Math.max(1, Math.min(30, value));
                input.value = value;
                this.updateAbility(ability, value);
            }
        });
        
        // Проверяем уровень
        const levelInput = document.getElementById('characterLevel');
        if (levelInput) {
            let level = parseInt(levelInput.value) || 1;
            level = Math.max(1, Math.min(20, level));
            levelInput.value = level;
        }
        
        // Проверяем HP
        this.updateHP();
        
        // Проверяем навыки
        this.updateAllSkillModifiers();
        
        // Проверяем AC
        this.updateAC();
        
        console.log('✅ Все системы проверены');
    },

    // Показ модального окна изменения здоровья
    showHealthChangeModal(type) {
        const modal = document.getElementById('healthChangeModal');
        const title = document.getElementById('healthChangeTitle');
        const amountInput = document.getElementById('healthChangeAmount');
        
        if (!modal || !title || !amountInput) return;
        
        if (type === 'damage') {
            title.textContent = 'Получение урона';
            amountInput.value = 1;
        } else {
            title.textContent = 'Лечение';
            amountInput.value = 1;
        }
        
        modal.classList.remove('hidden');
    },

    // Инициализация модальных окон заклинаний
    initSpellModals() {
        // Инициализация модального окна добавления заклинаний
        const addSpellModal = document.getElementById('addSpellModal');
        const closeSpellModal = document.getElementById('closeSpellModal');
        const cancelAddSpell = document.getElementById('cancelAddSpell');
        
        if (closeSpellModal) {
            closeSpellModal.addEventListener('click', () => {
                addSpellModal.classList.add('hidden');
            });
        }
        
        if (cancelAddSpell) {
            cancelAddSpell.addEventListener('click', () => {
                addSpellModal.classList.add('hidden');
            });
        }
        
        // Закрытие по клику вне модального окна
        addSpellModal.addEventListener('click', (e) => {
            if (e.target === addSpellModal) {
                addSpellModal.classList.add('hidden');
            }
        });
        
        // Инициализация модального окна управления заклинаниями
        const manageSpellsModal = document.getElementById('manageSpellsModal');
        const closeManageSpells = document.getElementById('closeManageSpells');
        const cancelManageSpells = document.getElementById('cancelManageSpells');
        
        if (closeManageSpells) {
            closeManageSpells.addEventListener('click', () => {
                manageSpellsModal.classList.add('hidden');
            });
        }
        
        if (cancelManageSpells) {
            cancelManageSpells.addEventListener('click', () => {
                manageSpellsModal.classList.add('hidden');
            });
        }
        
        // Закрытие по клику вне модального окна
        manageSpellsModal.addEventListener('click', (e) => {
            if (e.target === manageSpellsModal) {
                manageSpellsModal.classList.add('hidden');
            }
        });
    },

    // Показ модального окна добавления заклинаний
    showAddSpellModal() {
        const modal = document.getElementById('addSpellModal');
        if (!modal) return;
        
        // Заполняем список заклинаний в модальном окне
        this.populateModalSpellList();
        
        modal.classList.remove('hidden');
    },

    // Заполнение списка заклинаний в модальном окне
    populateModalSpellList() {
        const modalSpellList = document.getElementById('modalSpellList');
        if (!modalSpellList) return;
        
        modalSpellList.innerHTML = '';
        
        if (this.state.availableSpells.length === 0) {
            modalSpellList.innerHTML = '<p>Нет доступных заклинаний</p>';
            return;
        }
        
        this.state.availableSpells.forEach(spell => {
            const spellElement = document.createElement('div');
            spellElement.className = 'modal-spell-item';
            spellElement.dataset.spellId = spell.id;
            
            const levelText = spell.level === 0 ? 'Заговор' : `Уровень ${spell.level}`;
            const isKnown = this.state.knownSpells.some(s => s.id === spell.id);
            
            spellElement.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" value="${spell.id}" ${isKnown ? 'disabled' : ''}>
                    <span class="checkbox-custom"></span>
                </label>
                <div class="modal-spell-info">
                    <h5>${spell.name}</h5>
                    <div class="modal-spell-details">
                        <span>${levelText}</span>
                        <span>${spell.school || 'Не указана'}</span>
                        <span>${spell.castingTime || '1 действие'}</span>
                    </div>
                    <p class="modal-spell-description">
                        ${spell.description ? spell.description.substring(0, 150) + '...' : 'Нет описания'}
                    </p>
                </div>
            `;
            
            modalSpellList.appendChild(spellElement);
        });
    },

    // Показ модального окна управления заклинаниями
    showManageSpellsModal() {
        const modal = document.getElementById('manageSpellsModal');
        if (!modal) return;
        
        // Обновляем список известных заклинаний
        this.updateKnownSpellsList();
        
        // Добавляем обработчик для кнопки удаления
        const removeSelectedSpells = document.getElementById('removeSelectedSpells');
        if (removeSelectedSpells) {
            removeSelectedSpells.onclick = () => {
                this.removeSelectedSpells();
            };
        }
        
        modal.classList.remove('hidden');
    },

    // Удаление выбранных заклинаний
    removeSelectedSpells() {
        const checkboxes = document.querySelectorAll('#knownSpellsList input[type="checkbox"]:checked');
        const spellIdsToRemove = Array.from(checkboxes).map(cb => cb.value);
        
        if (spellIdsToRemove.length === 0) {
            Utils.showNotification('Выберите заклинания для удаления', 'warning');
            return;
        }
        
        // Удаляем заклинания
        this.state.knownSpells = this.state.knownSpells.filter(spell => 
            !spellIdsToRemove.includes(spell.id)
        );
        
        // Обновляем список
        this.updateKnownSpellsList();
        
        Utils.showNotification(`Удалено ${spellIdsToRemove.length} заклинаний`, 'success');
    },

    // Инициализация модального окна подтверждения
    initConfirmModal() {
        const confirmModal = document.getElementById('confirmModal');
        const closeConfirmModal = document.getElementById('closeConfirmModal');
        const cancelConfirm = document.getElementById('cancelConfirm');
        
        if (closeConfirmModal) {
            closeConfirmModal.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
            });
        }
        
        if (cancelConfirm) {
            cancelConfirm.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
            });
        }
        
        // Закрытие по клику вне модального окна
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.add('hidden');
            }
        });
    },

    // Пропуск шага с заклинаниями
    skipSpellsStep() {
        this.goToStep(6);
        Utils.showNotification('Раздел с заклинаниями пропущен', 'info');
    },

    // Изменение уровня
    changeLevel(delta) {
        const levelInput = document.getElementById('characterLevel');
        if (!levelInput) return;
        
        let level = parseInt(levelInput.value) || 1;
        const oldLevel = level;
        level += delta;
        
        // Ограничиваем уровень
        level = Math.max(1, Math.min(20, level));
        
        if (level === oldLevel) return;
        
        levelInput.value = level;
        
        console.log(`📈 Уровень изменен: ${oldLevel} → ${level}`);
        
        // ВОПРОС ПОВЫШЕНИЯ УРОВНЯ
        if (level > oldLevel) {
            const confirmLevelUp = confirm(`Повысить уровень с ${oldLevel} до ${level}?\n\nПри повышении уровня:\n• Увеличится максимальное HP\n• Возможно улучшение характеристик\n• Появятся новые классовые особенности`);
            
            if (!confirmLevelUp) {
                levelInput.value = oldLevel;
                return;
            }
            
            // Здесь в будущем можно добавить логику выбора улучшений
            Utils.showNotification(`Поздравляем! Ваш персонаж достиг ${level} уровня`, 'success');
        }
        
        // Обновляем все расчеты
        this.updateAllCalculations();
    },

    // Обновление информации об XP
    updateXPInfo(level) {
        const xpInfo = document.getElementById('xpInfo');
        if (!xpInfo) return;
        
        // Таблица XP для уровней
        const xpTable = {
            1: 0,
            2: 300,
            3: 900,
            4: 2700,
            5: 6500,
            6: 14000,
            7: 23000,
            8: 34000,
            9: 48000,
            10: 64000,
            11: 85000,
            12: 100000,
            13: 120000,
            14: 140000,
            15: 165000,
            16: 195000,
            17: 225000,
            18: 265000,
            19: 305000,
            20: 355000
        };
        
        const currentXP = xpTable[level] || 0;
        const nextLevelXP = xpTable[level + 1] || 'Макс.';
        
        xpInfo.textContent = `${currentXP} XP (${level} уровень) → ${nextLevelXP} XP`;
    },

    // Обновление метода определения характеристик
    updateAbilityMethodUI() {
        const pointBuyControls = document.getElementById('pointBuyControls');
        if (!pointBuyControls) return;
        
        if (this.state.abilityMethod === 'pointbuy') {
            pointBuyControls.classList.remove('hidden');
        } else {
            pointBuyControls.classList.add('hidden');
        }
    },

    // Применение метода определения характеристик
    applyAbilityMethod() {
        const method = this.state.abilityMethod;
        
        switch (method) {
            case 'standard':
                this.applyStandardArray();
                break;
            case 'random':
                this.applyRandomScores();
                break;
            case 'pointbuy':
                this.applyPointBuy();
                break;
            default:
                // Ручной ввод - ничего не делаем
                break;
        }
    },

    // Применение стандартного набора
    applyStandardArray() {
        const scores = [15, 14, 13, 12, 10, 8];
        
        // Случайно распределяем значения по характеристикам
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const shuffledScores = [...scores].sort(() => Math.random() - 0.5);
        
        abilities.forEach((ability, index) => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                input.value = shuffledScores[index];
                this.updateAbility(ability);
            }
        });
        
        Utils.showNotification('Стандартный набор применен', 'success');
    },

    // Применение случайных значений
    applyRandomScores() {
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach(ability => {
            // Бросаем 4d6, отбрасываем низший результат
            const rolls = [];
            for (let i = 0; i < 4; i++) {
                rolls.push(Math.floor(Math.random() * 6) + 1);
            }
            
            // Сортируем и отбрасываем наименьший
            rolls.sort((a, b) => a - b);
            rolls.shift();
            
            // Суммируем оставшиеся
            const score = rolls.reduce((sum, roll) => sum + roll, 0);
            
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                input.value = score;
                this.updateAbility(ability);
            }
        });
        
        Utils.showNotification('Случайные характеристики сгенерированы', 'success');
    },

    // Применение покупки очков
    applyPointBuy() {
        // Начинаем с базовых значений
        const baseScores = [8, 8, 8, 8, 8, 8];
        let points = 27;
        
        // Распределяем очки (упрощенная логика)
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach((ability, index) => {
            // Для демонстрации используем стандартное распределение
            const standardScores = [15, 14, 13, 12, 10, 8];
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                input.value = standardScores[index];
                this.updateAbility(ability);
            }
        });
        
        // Обновляем оставшиеся очки
        this.state.pointsRemaining = 0;
        this.updatePointsDisplay();
        
        Utils.showNotification('Покупка очков применена', 'success');
    },

    // Обновление отображения очков
    updatePointsDisplay() {
        const pointsRemainingElement = document.getElementById('pointsRemaining');
        if (pointsRemainingElement) {
            pointsRemainingElement.textContent = this.state.pointsRemaining;
        }
    },

    // Сброс характеристик
    resetAbilities() {
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                input.value = 10;
                this.updateAbility(ability);
            }
        });
        
        // Сбрасываем очки
        this.state.pointsRemaining = 27;
        this.updatePointsDisplay();
        
        Utils.showNotification('Характеристики сброшены', 'info');
    },

    // Добавление оружия
    addWeapon() {
        const weaponsList = document.getElementById('weaponsList');
        if (!weaponsList) return;
        
        const weaponEntry = document.createElement('div');
        weaponEntry.className = 'weapon-entry';
        weaponEntry.dataset.id = Date.now().toString();
        
        weaponEntry.innerHTML = `
            <div class="weapon-fields">
                <input type="text" class="input weapon-name" placeholder="Название оружия">
                <input type="text" class="input weapon-damage" placeholder="Урон (1d8)">
                <select class="select weapon-type">
                    <option value="melee">Ближний бой</option>
                    <option value="ranged">Дальний бой</option>
                </select>
            </div>
            <button type="button" class="btn btn-small btn-danger remove-weapon">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        weaponsList.appendChild(weaponEntry);
        
        // Добавляем обработчик для кнопки удаления
        const removeBtn = weaponEntry.querySelector('.remove-weapon');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                weaponEntry.remove();
            });
        }
    },

    // Добавление предмета
    addEquipment() {
        const equipmentList = document.getElementById('equipmentList');
        if (!equipmentList) return;
        
        const equipmentItem = document.createElement('div');
        equipmentItem.className = 'equipment-item';
        
        equipmentItem.innerHTML = `
            <textarea class="input equipment-text" placeholder="Описание предмета..."></textarea>
            <button type="button" class="btn btn-small btn-danger remove-equipment">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        equipmentList.appendChild(equipmentItem);
        
        // Добавляем обработчик для кнопки удаления
        const removeBtn = equipmentItem.querySelector('.remove-equipment');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                equipmentItem.remove();
            });
        }
    },

    // Применение короткого отдыха
    applyShortRest() {
        const currentHP = parseInt(document.getElementById('currentHP')?.value) || 0;
        const maxHP = parseInt(document.getElementById('maxHP')?.value) || 10;
        
        // Восстанавливаем часть HP (упрощенно)
        const hitDiceCount = parseInt(document.getElementById('hitDiceCount')?.textContent) || 1;
        const hitDie = document.getElementById('hitDiceDisplay')?.textContent || 'd8';
        const dieSize = parseInt(hitDie.substring(1)) || 8;
        
        // Бросаем кость хитов
        const healAmount = Math.floor(Math.random() * dieSize) + 1;
        const conMod = Utils.calculateModifier(parseInt(document.getElementById('constitution-value')?.value) || 10);
        const totalHeal = Math.max(1, healAmount + conMod);
        
        const newHP = Math.min(maxHP, currentHP + totalHeal);
        document.getElementById('currentHP').value = newHP;
        
        Utils.showNotification(`Короткий отдых: восстановлено ${totalHeal} HP`, 'success');
    },

    // Применение длинного отдыха
    applyLongRest() {
        const maxHP = parseInt(document.getElementById('maxHP')?.value) || 10;
        
        // Восстанавливаем все HP
        document.getElementById('currentHP').value = maxHP;
        
        // Сбрасываем временные HP
        document.getElementById('tempHP').value = 0;
        
        // Восстанавливаем кости хитов и т.д.
        Utils.showNotification('Длинный отдых: HP полностью восстановлены', 'success');
    },

    // Очистка заметок
    clearNote(noteId) {
        const noteElement = document.getElementById(noteId);
        if (noteElement) {
            noteElement.value = '';
            Utils.showNotification('Заметка очищена', 'info');
        }
    },

    // Генерация идеи для истории
    generateHistoryIdea() {
        const ideas = [
            "Вы были учеником мага, но сбежали, когда обнаружили темные секреты своего наставника.",
            "Ваша семья была уничтожена бандитами, и вы поклялись отомстить.",
            "Вы нашли древний артефакт, который изменил вашу жизнь навсегда.",
            "Вы были солдатом в большой войне, но дезертировали, увидев ужасы сражений.",
            "Вас вырастили эльфы, хотя вы человек, и теперь вы не чувствуете себя своим ни среди людей, ни среди эльфов.",
            "Вы пережили кораблекрушение и были единственным выжившим.",
            "Вы были уличным вором, но решили изменить свою жизнь после встречи с добрым священником.",
            "Вы пришли из далекой страны с экзотическими обычаями и пытаетесь адаптироваться к новой культуре."
        ];
        
        const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
        const historyNotes = document.getElementById('historyNotes');
        
        if (historyNotes) {
            historyNotes.value = randomIdea;
            Utils.showNotification('Идея для истории сгенерирована', 'success');
        }
    },

    // Сбор значений характеристик
    collectAbilityScores() {
        const abilities = {};
        const abilityIds = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilityIds.forEach(ability => {
            const input = document.getElementById(`${ability}-value`);
            if (input) {
                abilities[ability] = {
                    score: parseInt(input.value) || 10,
                    modifier: Utils.calculateModifier(parseInt(input.value) || 10)
                };
            }
        });
        
        return abilities;
    },

    // Сбор оружия
    collectWeapons() {
        const weapons = [];
        const weaponEntries = document.querySelectorAll('.weapon-entry');
        
        weaponEntries.forEach(entry => {
            const name = entry.querySelector('.weapon-name')?.value;
            const damage = entry.querySelector('.weapon-damage')?.value;
            const type = entry.querySelector('.weapon-type')?.value;
            const properties = entry.querySelector('.weapon-properties')?.value || '';
            
            if (name || damage) {
                weapons.push({
                    name: name || 'Оружие',
                    damage: damage || '1d6',
                    type: type || 'melee',
                    properties: properties
                });
            }
        });
        
        return weapons;
    },

    // Сбор предметов
    collectItems() {
        const items = [];
        const equipmentItems = document.querySelectorAll('.equipment-item');
        
        equipmentItems.forEach(item => {
            const text = item.querySelector('.equipment-text')?.value;
            if (text) {
                items.push(text);
            }
        });
        
        return items;
    },

    // Получение кости хитов
    getHitDice() {
        const classId = document.getElementById('characterClass')?.value;
        if (!classId) return 'd8';
        
        const classData = this.data.classes.find(c => c.id === classId);
        return classData?.hitDie || 'd8';
    },

    // Заполнение оружия
    populateWeapons(weapons) {
        const weaponsList = document.getElementById('weaponsList');
        if (!weaponsList || !weapons || weapons.length === 0) return;
        
        weaponsList.innerHTML = '';
        
        weapons.forEach(weapon => {
            const weaponEntry = document.createElement('div');
            weaponEntry.className = 'weapon-entry';
            weaponEntry.dataset.id = Date.now().toString();
            
            weaponEntry.innerHTML = `
                <div class="weapon-fields">
                    <input type="text" class="input weapon-name" placeholder="Название оружия" value="${weapon.name || ''}">
                    <input type="text" class="input weapon-damage" placeholder="Урон (1d8)" value="${weapon.damage || ''}">
                    <select class="select weapon-type">
                        <option value="melee" ${weapon.type === 'melee' ? 'selected' : ''}>Ближний бой</option>
                        <option value="ranged" ${weapon.type === 'ranged' ? 'selected' : ''}>Дальний бой</option>
                    </select>
                </div>
                <button type="button" class="btn btn-small btn-danger remove-weapon">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            weaponsList.appendChild(weaponEntry);
            
            // Добавляем обработчик для кнопки удаления
            const removeBtn = weaponEntry.querySelector('.remove-weapon');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    weaponEntry.remove();
                });
            }
        });
    },

    // Заполнение предметов
    populateItems(items) {
        const equipmentList = document.getElementById('equipmentList');
        if (!equipmentList || !items || items.length === 0) return;
        
        equipmentList.innerHTML = '';
        
        items.forEach(item => {
            const equipmentItem = document.createElement('div');
            equipmentItem.className = 'equipment-item';
            
            equipmentItem.innerHTML = `
                <textarea class="input equipment-text" placeholder="Описание предмета...">${item || ''}</textarea>
                <button type="button" class="btn btn-small btn-danger remove-equipment">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            equipmentList.appendChild(equipmentItem);
            
            // Добавляем обработчик для кнопки удаления
            const removeBtn = equipmentItem.querySelector('.remove-equipment');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    equipmentItem.remove();
                });
            }
        });
    },

    debugInfo: function() {
        console.log('=== DEBUG INFO ===');
        console.log('Состояние:', this.state);
        console.log('Данные:', {
            races: this.data.races?.length || 0,
            classes: this.data.classes?.length || 0,
            spells: this.data.spells?.length || 0
        });
        console.log('Элементы формы:', {
            raceSelect: document.getElementById('characterRace')?.options?.length || 0,
            classSelect: document.getElementById('characterClass')?.options?.length || 0,
            subclassSelect: document.getElementById('characterSubclass')?.options?.length || 0
        });
        console.log('Текущий шаг:', this.state.currentStep);
        console.log('Магический класс:', this.state.isSpellcaster);
        console.log('Известные заклинания:', this.state.knownSpells.length);
        console.log('==================');
    },

    // Обновление UI
    updateUI() {
        this.updateProgressBar();
        this.updateStepTitle(this.state.currentStep);
        
        if (this.state.isEditMode) {
            this.showEditMode();
        } else {
            this.showNewMode();
        }
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запуск конструктора...');
    
    try {
        CharacterCreator.init();
        console.log('✅ Конструктор успешно инициализирован');
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации конструктора:', error);
        Utils.showNotification('Ошибка загрузки конструктора. Обновите страницу.', 'error');
    }
    
    // Добавляем глобальную функцию для отладки
    window.debugCreator = function() {
        CharacterCreator.debugInfo();
    };
    
    console.log('Для отладки используйте: debugCreator()');
});