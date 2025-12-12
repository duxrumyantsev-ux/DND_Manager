// encyclopedia.js - Скрипты для энциклопедии с унифицированной структурой Firebase

const Encyclopedia = {
    data: {
        races: [],
        classes: [],
        spells: [], // Все заклинания
        rules: [],  // Все правила
        feats: [],
        subclasses: [],
        backgrounds: []
    },

    filters: {
        // Убираем фильтры заклинаний
    },

    currentTab: 'races',
    
    init() {
        this.initTabs();
        this.initSearch();
        this.initFilters();
        this.initDetailModal();
        
        window.addEventListener('load', () => {
            console.log("🚀 Страница загружена, начинаем загрузку данных энциклопедии...");
            
            setTimeout(() => {
                this.loadAllData();
            }, 100);
        });
        
        Utils.logAction('Энциклопедия инициализирована');
    },

    // Инициализация вкладок
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    },

    // Переключение вкладок
    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === tabId) {
                pane.classList.add('active');
            }
        });
        
        this.currentTab = tabId;
        this.loadTabData(tabId);
        
        Utils.logAction(`Переключена вкладка: ${tabId}`);
    },

    // Инициализация поиска
    initSearch() {
        // Поиск рас
        const raceSearch = document.getElementById('raceSearch');
        if (raceSearch) {
            raceSearch.addEventListener('input', () => {
                this.filterRaces();
            });
        }

        // Поиск классов
        const classSearch = document.getElementById('classSearch');
        if (classSearch) {
            classSearch.addEventListener('input', () => {
                this.filterClasses();
            });
        }

        // УБИРАЕМ поиск заклинаний
        
        // Поиск черт
        const featSearch = document.getElementById('featSearch');
        if (featSearch) {
            featSearch.addEventListener('input', () => {
                this.filterFeats();
            });
        }
    },

    // Инициализация фильтров
    initFilters() {
        // Фильтры рас
        const raceFilter = document.getElementById('raceFilter');
        if (raceFilter) {
            raceFilter.addEventListener('change', () => {
                this.filterRaces();
            });
        }

        // Фильтры классов
        const classFilter = document.getElementById('classFilter');
        if (classFilter) {
            classFilter.addEventListener('change', () => {
                this.filterClasses();
            });
        }

        // Фильтры черт
        const featFilter = document.getElementById('featFilter');
        if (featFilter) {
            featFilter.addEventListener('change', () => {
                this.filterFeats();
            });
        }

        // УБИРАЕМ фильтры заклинаний
    },

    // Инициализация модального окна
    initDetailModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = document.getElementById('closeDetailModal');
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        window.addEventListener('click', (e) => {
            if (modal && e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    },

    // Загрузка всех данных
    async loadAllData() {
        try {
            console.log("📚 Начало загрузки данных энциклопедии...");
            
            if (window.waitForFirebase) {
                console.log("⏳ Ожидание готовности Firebase...");
                await new Promise((resolve) => {
                    window.waitForFirebase(resolve);
                });
            }
            
            this.showLoader();
            
            // Загружаем только нужные данные, правила и заклинания загружаем отдельно
            const loadPromises = [
                this.loadRaces(),
                this.loadClasses(),
                this.loadFeats(),
                this.loadSubclasses()
            ];
            
            const results = await Promise.allSettled(loadPromises);
            
            this.data.races = results[0].status === 'fulfilled' ? results[0].value : [];
            this.data.classes = results[1].status === 'fulfilled' ? results[1].value : [];
            this.data.feats = results[2].status === 'fulfilled' ? results[2].value : [];
            this.data.subclasses = results[3].status === 'fulfilled' ? results[3].value : [];
            
            // Загружаем заклинания и правила отдельно
            console.log("🔄 Загрузка заклинаний и правил...");
            await this.loadSpells();
            await this.loadRules();
            
            this.updateStats();
            this.loadTabData(this.currentTab);
            this.hideLoader();
            
            console.log("✅ Данные энциклопедии успешно загружены");
            console.log(`📊 Статистика: ${this.data.races.length} рас, ${this.data.classes.length} классов, ${this.data.spells.length} заклинаний, ${this.data.subclasses.length} подклассов, ${this.data.rules.length} правил`);
            
            Utils.showNotification('Данные энциклопедии загружены', 'success');
            
        } catch (error) {
            console.error('Ошибка загрузки данных энциклопедии:', error);
            Utils.showNotification('Не удалось загрузить данные энциклопедии', 'error');
            this.showFallbackData();
        }
    },

    // Загрузка данных для конкретной вкладки
    loadTabData(tabId) {
        switch (tabId) {
            case 'races':
                this.displayRaces(this.data.races);
                break;
            case 'classes':
                this.displayClasses(this.data.classes);
                break;
            case 'spells':
                this.displaySpells(this.data.spells);
                break;
            case 'rules':
                this.displayRules(this.data.rules);
                break;
            case 'feats':
                this.displayFeats(this.data.feats);
                break;
        }
    },

    // Загрузка рас из Firebase
    async loadRaces() {
        try {
            console.log("🔄 Загрузка рас...");
            
            let races = [];
            
            if (window.getUniversalData) {
                races = await window.getUniversalData('races');
                if (races.length > 0) {
                    console.log(`✅ Расы загружены: ${races.length}`);
                    races = races.map(race => this.normalizeRace(race));
                }
            }
            
            if (races.length === 0) {
                console.log("📭 Расы не найдены, используем fallback");
                return this.getFallbackRaces();
            }
            
            Utils.logAction(`Загружено рас: ${races.length}`);
            return races;
        } catch (error) {
            console.error('Ошибка загрузки рас:', error);
            return this.getFallbackRaces();
        }
    },

    // Загрузка классов из Firebase
    async loadClasses() {
        try {
            console.log("🔄 Загрузка классов...");
            
            let classes = [];
            
            if (window.getUniversalData) {
                classes = await window.getUniversalData('classes');
                if (classes.length > 0) {
                    console.log(`✅ Классы загружены: ${classes.length}`);
                    classes = classes.map(cls => this.normalizeClass(cls));
                }
            }
            
            if (classes.length === 0) {
                console.log("📭 Классы не найдены, используем fallback");
                return this.getFallbackClasses();
            }
            
            Utils.logAction(`Загружено классов: ${classes.length}`);
            return classes;
        } catch (error) {
            console.error('Ошибка загрузки классов:', error);
            return this.getFallbackClasses();
        }
    },

    // Загрузка подклассов из Firebase
    async loadSubclasses() {
        try {
            console.log("🔄 Загрузка подклассов...");
            
            let subclasses = [];
            
            if (window.getUniversalData) {
                subclasses = await window.getUniversalData('subclasses');
                if (subclasses.length > 0) {
                    console.log(`✅ Подклассы загружены: ${subclasses.length}`);
                    subclasses = subclasses.map(sc => this.normalizeSubclass(sc));
                }
            }
            
            if (subclasses.length === 0) {
                console.log("📭 Подклассы не найдены");
            }
            
            Utils.logAction(`Загружено подклассов: ${subclasses.length}`);
            return subclasses;
        } catch (error) {
            console.error('Ошибка загрузки подклассов:', error);
            return [];
        }
    },

    // Получение подклассов для конкретного класса
    getSubclassesForClass(classId) {
        if (!this.data.subclasses || !Array.isArray(this.data.subclasses)) {
            return [];
        }
        
        return this.data.subclasses.filter(sc => sc.classId === classId);
    },

    // Получение имени подкласса по ID
    getSubclassName(subclassId, classId = null) {
        if (!this.data.subclasses || !Array.isArray(this.data.subclasses)) {
            return subclassId;
        }
        
        let subclass;
        
        if (classId) {
            subclass = this.data.subclasses.find(sc => sc.id === subclassId && sc.classId === classId);
        } else {
            subclass = this.data.subclasses.find(sc => sc.id === subclassId);
        }
        
        return subclass ? subclass.name : subclassId;
    },

    // === ПРОСТАЯ ЗАГРУЗКА ЗАКЛИНАНИЙ ===
    async loadSpells() {
        try {
            console.log("🔄 Простая загрузка заклинаний...");
            
            let spells = [];
            
            // Пробуем получить данные напрямую по структуре spells/spells
            if (window.DB && window.DB.getData) {
                console.log("📡 Пробуем загрузить из Firebase по пути 'spells/spells'...");
                
                // Пробуем получить данные напрямую
                const spellsData = await window.DB.getData('spells/spells');
                console.log("📊 Результат загрузки 'spells/spells':", spellsData);
                
                if (spellsData && typeof spellsData === 'object') {
                    // Преобразуем объект в массив
                    spells = Object.keys(spellsData).map(key => {
                        const spell = spellsData[key];
                        return {
                            id: key,
                            ...spell
                        };
                    });
                    
                    console.log(`✅ Заклинания загружены напрямую: ${spells.length} записей`);
                    
                    // Логируем примеры
                    if (spells.length > 0) {
                        console.log("🔍 Примеры загруженных заклинаний:");
                        spells.slice(0, 3).forEach((spell, i) => {
                            console.log(`  ${i+1}. ${spell.name || spell.id} (уровень: ${spell.level || '?'})`);
                        });
                    }
                }
            }
            
            // Если не удалось загрузить, пробуем другие методы
            if (spells.length === 0 && window.getUniversalData) {
                console.log("🔄 Пробуем универсальный метод...");
                spells = await window.getUniversalData('spells');
            }
            
            // Проверяем и нормализуем данные
            if (spells && spells.length > 0) {
                console.log(`✅ Всего заклинаний: ${spells.length}`);
                
                // Нормализуем данные
                spells = spells.map(spell => {
                    if (!spell) return null;
                    
                    const normalized = { ...spell };
                    
                    // Убеждаемся, что есть имя
                    if (!normalized.name && normalized.id) {
                        normalized.name = normalized.id;
                    }
                    
                    // Убеждаемся, что level есть
                    if (normalized.level === undefined || normalized.level === null) {
                        normalized.level = 0;
                    }
                    
                    // Убеждаемся, что есть описание
                    if (!normalized.description) {
                        normalized.description = 'Описание отсутствует.';
                    }
                    
                    return normalized;
                }).filter(spell => spell !== null);
                
                this.data.spells = spells;
                Utils.logAction(`Загружено заклинаний: ${spells.length}`);
                return spells;
            } else {
                console.log("📭 Заклинания не найдены, используем fallback");
                const fallbackSpells = this.getFallbackSpells();
                this.data.spells = fallbackSpells;
                return fallbackSpells;
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки заклинаний:', error);
            const fallbackSpells = this.getFallbackSpells();
            this.data.spells = fallbackSpells;
            return fallbackSpells;
        }
    },

    // === РЕКУРСИВНАЯ ЗАГРУЗКА ПРАВИЛ ===
    async loadRules() {
        try {
            console.log("🔄 Рекурсивная загрузка правил...");
            
            let rules = [];
            
            // Пробуем получить данные напрямую по структуре rules/rules
            if (window.DB && window.DB.getData) {
                console.log("📡 Пробуем загрузить из Firebase по пути 'rules/rules'...");
                
                const rulesData = await window.DB.getData('rules/rules');
                console.log("📊 Результат загрузки 'rules/rules':", rulesData);
                
                if (rulesData && typeof rulesData === 'object') {
                    // Рекурсивно обрабатываем все правила
                    rules = this.processRulesRecursively(rulesData, 'rules');
                    
                    console.log(`✅ Правила загружены рекурсивно: ${rules.length} записей`);
                    
                    // Логируем структуру
                    if (rules.length > 0) {
                        console.log("🔍 Структура загруженных правил:");
                        rules.slice(0, 3).forEach((rule, i) => {
                            const nestedCount = rule.nestedRules ? rule.nestedRules.length : 0;
                            console.log(`  ${i+1}. ${rule.name || rule.id} (вложенных: ${nestedCount})`);
                        });
                    }
                }
            }
            
            // Если не удалось загрузить, пробуем другие методы
            if (rules.length === 0 && window.getUniversalData) {
                console.log("🔄 Пробуем универсальный метод...");
                const simpleRules = await window.getUniversalData('rules');
                if (simpleRules && simpleRules.length > 0) {
                    rules = simpleRules.map(rule => ({
                        ...rule,
                        name: rule.name || rule.title || rule.id,
                        nestedRules: []
                    }));
                }
            }
            
            if (rules && rules.length > 0) {
                console.log(`✅ Всего правил: ${rules.length}`);
                this.data.rules = rules;
                Utils.logAction(`Загружено правил: ${rules.length}`);
                return rules;
            } else {
                console.log("📭 Правила не найдены, используем fallback");
                const fallbackRules = this.getFallbackRules();
                this.data.rules = fallbackRules;
                return fallbackRules;
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки правил:', error);
            const fallbackRules = this.getFallbackRules();
            this.data.rules = fallbackRules;
            return fallbackRules;
        }
    },

    // Рекурсивная обработка правил
    processRulesRecursively(rulesData, parentId = '') {
        if (!rulesData || typeof rulesData !== 'object') {
            return [];
        }
        
        const rules = [];
        
        // Обрабатываем каждое правило
        Object.keys(rulesData).forEach(key => {
            const ruleData = rulesData[key];
            
            // Создаем объект правила
            const rule = {
                id: key,
                name: ruleData.name || ruleData.title || key,
                parentId: parentId,
                nestedRules: []
            };
            
            // Копируем все остальные свойства
            Object.keys(ruleData).forEach(prop => {
                if (prop !== 'name' && prop !== 'title') {
                    rule[prop] = ruleData[prop];
                }
            });
            
            // Проверяем, есть ли вложенные объекты (кроме стандартных полей)
            const nestedFields = Object.keys(ruleData).filter(prop => {
                // Пропускаем стандартные поля
                if (['name', 'title', 'description', 'id', 'type'].includes(prop)) {
                    return false;
                }
                
                const value = ruleData[prop];
                // Если это объект и не null, считаем его вложенным правилом
                return value && typeof value === 'object' && !Array.isArray(value);
            });
            
            // Рекурсивно обрабатываем вложенные правила
            if (nestedFields.length > 0) {
                console.log(`🔍 Правило "${rule.name}" имеет вложенные поля:`, nestedFields);
                
                nestedFields.forEach(field => {
                    const nestedData = ruleData[field];
                    if (nestedData && typeof nestedData === 'object') {
                        // Рекурсивно обрабатываем вложенные данные
                        const nestedRules = this.processRulesRecursively(nestedData, `${parentId}_${key}_${field}`);
                        
                        // Добавляем вложенные правила
                        if (nestedRules.length > 0) {
                            rule.nestedRules = rule.nestedRules.concat(nestedRules);
                        }
                    }
                });
            }
            
            // Проверяем вложенные массивы объектов
            const nestedArrays = Object.keys(ruleData).filter(prop => {
                if (['name', 'title', 'description', 'id', 'type'].includes(prop)) {
                    return false;
                }
                
                const value = ruleData[prop];
                return Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object';
            });
            
            // Обрабатываем массивы объектов как вложенные правила
            if (nestedArrays.length > 0) {
                nestedArrays.forEach(field => {
                    const arrayData = ruleData[field];
                    arrayData.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const nestedRule = {
                                id: `${key}_${field}_${index}`,
                                name: item.name || item.title || `${rule.name} - ${field} ${index + 1}`,
                                parentId: `${parentId}_${key}`,
                                nestedRules: [],
                                ...item
                            };
                            rule.nestedRules.push(nestedRule);
                        }
                    });
                });
            }
            
            rules.push(rule);
        });
        
        return rules;
    },

    // Загрузка черт из Firebase
    async loadFeats() {
        try {
            console.log("🔄 Загрузка черт...");
            
            let feats = [];
            
            if (window.getUniversalData) {
                feats = await window.getUniversalData('feats');
                if (feats.length > 0) {
                    console.log(`✅ Черты загружены: ${feats.length}`);
                }
            }
            
            if (feats.length === 0) {
                console.log("📭 Черты не найдены, используем fallback");
                return this.getFallbackFeats();
            }
            
            console.log(`✅ Загружено черт: ${feats.length}`);
            Utils.logAction(`Загружено черт: ${feats.length}`);
            return feats;
        } catch (error) {
            console.error('Ошибка загрузки черт:', error);
            return this.getFallbackFeats();
        }
    },

    // Нормализация расы (без изменений)
    normalizeRace(race) {
        if (!race) return race;
        
        const normalized = { ...race };
        
        if (race.abilityScoreIncrease && typeof race.abilityScoreIncrease === 'object') {
            normalized.abilityBonuses = race.abilityScoreIncrease;
        }
        
        if (race.ability_bonuses && typeof race.ability_bonuses === 'object') {
            normalized.abilityBonuses = race.ability_bonuses;
        }
        
        normalized.features = this.normalizeFeatures(race.features);
        
        if (race.subraces && typeof race.subraces === 'object') {
            if (Array.isArray(race.subraces)) {
                normalized.subraces = race.subraces;
            } else {
                normalized.subraces = Object.values(race.subraces);
            }
        }
        
        return normalized;
    },

    // Нормализация класса (без изменений)
    normalizeClass(cls) {
        if (!cls) return cls;
        
        const normalized = { ...cls };
        
        if (cls.subclasses && typeof cls.subclasses === 'object') {
            if (Array.isArray(cls.subclasses)) {
                normalized.subclasses = cls.subclasses;
            } else {
                normalized.subclasses = Object.values(cls.subclasses);
            }
        }
        
        normalized.features = this.normalizeFeatures(cls.features);
        
        if (cls.featuresByLevel && typeof cls.featuresByLevel === 'object') {
            normalized.featuresByLevel = {};
            Object.keys(cls.featuresByLevel).forEach(level => {
                if (Array.isArray(cls.featuresByLevel[level])) {
                    normalized.featuresByLevel[level] = cls.featuresByLevel[level];
                } else if (typeof cls.featuresByLevel[level] === 'object') {
                    normalized.featuresByLevel[level] = Object.keys(cls.featuresByLevel[level]).map(key => {
                        const feature = cls.featuresByLevel[level][key];
                        if (typeof feature === 'string') {
                            return { id: key, name: key, description: feature };
                        } else if (typeof feature === 'object') {
                            return { id: key, ...feature };
                        }
                        return { id: key, name: key, description: 'Умение' };
                    });
                }
            });
        }
        
        if (cls.proficiency_choices) {
            if (cls.proficiency_choices[0] && cls.proficiency_choices[0].from) {
                normalized.skillProficiencies = {
                    choose: cls.proficiency_choices[0].choose || 2,
                    from: cls.proficiency_choices[0].from.map(item => {
                        if (typeof item === 'object' && item.name) {
                            return item.name;
                        }
                        return item;
                    })
                };
            }
        }
        
        return normalized;
    },

    // Нормализация подкласса (без изменений)
    normalizeSubclass(subclass) {
        if (!subclass) return subclass;
        
        const normalized = { ...subclass };
        
        if (subclass.featuresByLevel && typeof subclass.featuresByLevel === 'object') {
            normalized.featuresByLevel = {};
            Object.keys(subclass.featuresByLevel).forEach(level => {
                if (Array.isArray(subclass.featuresByLevel[level])) {
                    normalized.featuresByLevel[level] = subclass.featuresByLevel[level];
                } else if (typeof subclass.featuresByLevel[level] === 'object') {
                    normalized.featuresByLevel[level] = Object.keys(subclass.featuresByLevel[level]).map(key => {
                        const feature = subclass.featuresByLevel[level][key];
                        if (typeof feature === 'string') {
                            return { id: key, name: key, description: feature };
                        } else if (typeof feature === 'object') {
                            return { id: key, ...feature };
                        }
                        return { id: key, name: key, description: 'Умение' };
                    });
                }
            });
        }
        
        return normalized;
    },

    // Нормализация features (без изменений)
    normalizeFeatures(features) {
        if (!features) return [];
        
        if (Array.isArray(features)) {
            return features;
        } else if (typeof features === 'object') {
            return Object.keys(features).map(key => {
                const feature = features[key];
                if (typeof feature === 'string') {
                    return { id: key, name: key, description: feature };
                } else if (typeof feature === 'object') {
                    return { id: key, ...feature };
                }
                return { id: key, name: key, description: 'Особенность' };
            });
        }
        
        return [];
    },

    // Нормализация заклинания (простая версия)
    normalizeSpell(spell) {
        if (!spell) return spell;
        
        const normalized = { ...spell };
        
        // Убеждаемся, что есть имя
        if (!normalized.name && normalized.id) {
            normalized.name = normalized.id;
        }
        
        // Убеждаемся, что есть уровень
        if (normalized.level === undefined || normalized.level === null) {
            normalized.level = 0;
        }
        
        // Убеждаемся, что есть описание
        if (!normalized.description) {
            normalized.description = 'Описание отсутствует.';
        }
        
        return normalized;
    },

    // Отображение рас (без изменений)
    displayRaces(races) {
        const grid = document.getElementById('racesGrid');
        const noResults = document.getElementById('noRacesFound');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (races.length === 0) {
            Utils.toggleElement(noResults, true);
            return;
        }
        
        Utils.toggleElement(noResults, false);
        
        races.forEach(race => {
            const card = this.createRaceCard(race);
            grid.appendChild(card);
        });
    },

    // Создание карточки расы (без изменений)
    createRaceCard(race) {
        const card = document.createElement('div');
        card.className = 'encyclopedia-card card';
        card.dataset.id = race.id;
        
        const bonuses = race.abilityBonuses ? Object.entries(race.abilityBonuses)
            .filter(([_, value]) => value > 0)
            .map(([ability, value]) => `${Utils.getAbilityAbbr(ability)} +${value}`)
            .join(', ') : '';
        
        let featuresHtml = '<li>Особенности не указаны</li>';
        if (race.features && Array.isArray(race.features)) {
            featuresHtml = race.features
                .slice(0, 2)
                .map(f => `<li>${f.name || f.description || 'Особенность'}</li>`)
                .join('');
            if (race.features.length > 2) {
                featuresHtml += '<li>...</li>';
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${race.name || 'Неизвестная раса'}</h3>
                <span class="badge badge-primary">Раса</span>
            </div>
            <div class="card-body">
                <div class="encyclopedia-meta">
                    <span class="meta-item"><i class="fas fa-tachometer-alt"></i> Скорость: ${race.speed || 30} фт.</span>
                    ${bonuses ? `<span class="meta-item"><i class="fas fa-plus"></i> ${bonuses}</span>` : ''}
                    ${race.darkvision ? `<span class="meta-item"><i class="fas fa-eye"></i> Темное зрение: ${race.darkvision} фт.</span>` : ''}
                </div>
                <p class="encyclopedia-description">${race.description || 'Описание отсутствует.'}</p>
                <div class="features-preview">
                    <strong>Особенности:</strong>
                    <ul>
                        ${featuresHtml}
                    </ul>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary view-details" data-type="race" data-id="${race.id}">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        `;
        
        const viewBtn = card.querySelector('.view-details');
        viewBtn.addEventListener('click', () => {
            this.showRaceDetails(race);
        });
        
        return card;
    },

    // Отображение классов (без изменений)
    displayClasses(classes) {
        const grid = document.getElementById('classesGrid');
        const noResults = document.getElementById('noClassesFound');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (classes.length === 0) {
            Utils.toggleElement(noResults, true);
            return;
        }
        
        Utils.toggleElement(noResults, false);
        
        classes.forEach(cls => {
            const card = this.createClassCard(cls);
            grid.appendChild(card);
        });
    },

    // Создание карточки класса (без изменений)
    createClassCard(cls) {
        const card = document.createElement('div');
        card.className = 'encyclopedia-card card';
        card.dataset.id = cls.id;
        
        const hitDie = cls.hitDie || 'd8';
        const spellcasting = cls.spellcasting ? 'Да' : 'Нет';
        const primaryAbility = cls.primaryAbility ? cls.primaryAbility.map(a => Utils.getAbilityName(a)).join(', ') : 'Не указано';
        
        let featuresHtml = '<li>Умения не указаны</li>';
        if (cls.features && Array.isArray(cls.features)) {
            featuresHtml = cls.features
                .slice(0, 2)
                .map(f => `<li>${f.name || f.description || 'Умение'}</li>`)
                .join('');
            if (cls.features.length > 2) {
                featuresHtml += '<li>...</li>';
            }
        }
        
        let subclassesHtml = '';
        if (cls.subclasses && Array.isArray(cls.subclasses)) {
            const classSubclasses = this.getSubclassesForClass(cls.id);
            
            if (classSubclasses && classSubclasses.length > 0) {
                const subclassTags = cls.subclasses.slice(0, 3).map(subclassId => {
                    const subclass = classSubclasses.find(sc => sc.id === subclassId);
                    return `<span class="tag">${subclass ? subclass.name : subclassId}</span>`;
                }).join('');
                
                const moreTag = cls.subclasses.length > 3 ? '<span class="tag">...</span>' : '';
                
                subclassesHtml = `
                    <div class="subclasses-preview">
                        <strong>Подклассы:</strong>
                        <div class="subclass-tags">
                            ${subclassTags}${moreTag}
                        </div>
                    </div>`;
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${cls.name || 'Неизвестный класс'}</h3>
                <span class="badge badge-secondary">Класс</span>
            </div>
            <div class="card-body">
                <div class="encyclopedia-meta">
                    <span class="meta-item"><i class="fas fa-heart"></i> Кость хитов: ${hitDie}</span>
                    <span class="meta-item"><i class="fas fa-magic"></i> Магия: ${spellcasting}</span>
                    <span class="meta-item"><i class="fas fa-star"></i> Основная характеристика: ${primaryAbility}</span>
                </div>
                <p class="encyclopedia-description">${cls.description || 'Описание отсутствует.'}</p>
                <div class="features-preview">
                    <strong>Основные умения:</strong>
                    <ul>
                        ${featuresHtml}
                    </ul>
                </div>
                ${subclassesHtml}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary view-details" data-type="class" data-id="${cls.id}">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        `;
        
        const viewBtn = card.querySelector('.view-details');
        viewBtn.addEventListener('click', () => {
            this.showClassDetails(cls);
        });
        
        return card;
    },

    // === ПРОСТОЕ ОТОБРАЖЕНИЕ ЗАКЛИНАНИЙ ===
    displaySpells(spells) {
        const container = document.getElementById('spellsContainer');
        const noResults = document.getElementById('noSpellsFound');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!spells || spells.length === 0) {
            Utils.toggleElement(noResults, true);
            console.log("⚠️ Нет заклинаний для отображения");
            return;
        }
        
        Utils.toggleElement(noResults, false);
        console.log(`📝 Отображаем ${spells.length} заклинаний`);
        
        // Просто отображаем все заклинания
        spells.forEach(spell => {
            const card = this.createSpellCard(spell);
            container.appendChild(card);
        });
    },

    // Создание карточки заклинания (упрощенная версия)
    createSpellCard(spell) {
        const card = document.createElement('div');
        card.className = 'spell-card card';
        card.dataset.id = spell.id;
        
        const levelText = spell.level === 0 ? 'Заговор' : `${spell.level} уровень`;
        const classes = spell.classes ? (Array.isArray(spell.classes) ? spell.classes.join(', ') : spell.classes) : '';
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${spell.name || 'Неизвестное заклинание'}</h3>
                <span class="badge ${this.getSpellLevelBadgeClass(spell.level)}">${levelText}</span>
            </div>
            <div class="card-body">
                <div class="spell-meta">
                    <span class="meta-item"><i class="fas fa-graduation-cap"></i> ${spell.school || 'Неизвестная школа'}</span>
                    <span class="meta-item"><i class="far fa-clock"></i> ${spell.castingTime || '1 действие'}</span>
                    <span class="meta-item"><i class="fas fa-ruler"></i> ${spell.range || 'На себя'}</span>
                    <span class="meta-item"><i class="fas fa-hourglass"></i> ${spell.duration || 'Мгновенная'}</span>
                </div>
                <p class="spell-description">
                    ${spell.description || 'Описание отсутствует.'}
                </p>
                ${classes ? `<div class="spell-classes"><strong>Классы:</strong> ${classes}</div>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary view-details" data-type="spell" data-id="${spell.id}">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        `;
        
        const viewBtn = card.querySelector('.view-details');
        viewBtn.addEventListener('click', () => {
            this.showSpellDetails(spell);
        });
        
        return card;
    },

    // === РЕКУРСИВНОЕ ОТОБРАЖЕНИЕ ПРАВИЛ ===
    displayRules(rules) {
        const grid = document.getElementById('rulesGrid');
        const loader = document.getElementById('rulesLoader');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (!rules || rules.length === 0) {
            Utils.toggleElement(loader, false);
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>Правила не найдены</h3>
                    <p>Данные о правилах отсутствуют в базе данных.</p>
                </div>
            `;
            return;
        }
        
        Utils.toggleElement(loader, false);
        console.log(`📝 Отображаем ${rules.length} правил`);
        
        // Рекурсивно отображаем все правила
        this.displayRulesRecursively(rules, grid);
    },

    // Рекурсивное отображение правил
    displayRulesRecursively(rules, container, level = 0) {
        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            return;
        }
        
        rules.forEach(rule => {
            const card = this.createRuleCard(rule, level);
            container.appendChild(card);
            
            // Если есть вложенные правила, отображаем их рекурсивно
            if (rule.nestedRules && rule.nestedRules.length > 0) {
                const nestedContainer = document.createElement('div');
                nestedContainer.className = 'nested-rules';
                nestedContainer.style.marginLeft = `${level * 20}px`;
                nestedContainer.style.marginTop = '10px';
                container.appendChild(nestedContainer);
                
                this.displayRulesRecursively(rule.nestedRules, nestedContainer, level + 1);
            }
        });
    },

    // Создание карточки правила (рекурсивная версия)
    createRuleCard(rule, level = 0) {
        const card = document.createElement('div');
        card.className = 'rule-card card';
        card.style.marginLeft = `${level * 20}px`;
        card.style.marginBottom = '10px';
        
        // Создаем отступ для вложенных правил
        const indent = level > 0 ? '<span style="color: #666; margin-right: 5px;">↳</span>' : '';
        
        // Используем универсальную функцию для создания контента
        const content = this.createRuleContent(rule);
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${indent}${rule.name || 'Неизвестное правило'}</h3>
                <span class="badge badge-info">Правило</span>
            </div>
            <div class="card-body">
                ${content}
            </div>
        `;
        
        return card;
    },

    // Создание таблицы модификаторов
    /* createModifiersTable(modifiers) {
        if (!modifiers || !Array.isArray(modifiers)) return '';
        
        const rows = modifiers.map(mod => 
            `<tr><td>${mod.score}</td><td>${mod.modifier >= 0 ? '+' : ''}${mod.modifier}</td></tr>`
        ).join('');
        
        return `
            <div class="rule-examples">
                <strong>Модификаторы характеристик:</strong>
                <div class="example-content">
                    <table class="table">
                        <tr><th>Значение</th><th>Модификатор</th></tr>
                        ${rows}
                    </table>
                </div>
            </div>
        `;
    }, */

    // Создание списка навыков
    /* createSkillsList(skills) {
        if (!skills || !Array.isArray(skills)) return '';
        
        const items = skills.slice(0, 5).map(skill => 
            `<li><strong>${skill.name || skill.id}:</strong> ${skill.description || ''}</li>`
        ).join('');
        
        const more = skills.length > 5 ? `<li>... и еще ${skills.length - 5} навыков</li>` : '';
        
        return `
            <div class="rule-examples">
                <strong>Навыки:</strong>
                <div class="example-content">
                    <ul>
                        ${items}
                        ${more}
                    </ul>
                </div>
            </div>
        `;
    }, */

    // Создание списка состояний
    /* createConditionsList(conditions) {
        if (!conditions || !Array.isArray(conditions)) return '';
        
        const items = conditions.slice(0, 3).map(condition => 
            `<li><strong>${condition.name || condition.id}:</strong> ${condition.description || ''}</li>`
        ).join('');
        
        const more = conditions.length > 3 ? `<li>... и еще ${conditions.length - 3} состояний</li>` : '';
        
        return `
            <div class="rule-examples">
                <strong>Состояния:</strong>
                <div class="example-content">
                    <ul>
                        ${items}
                        ${more}
                    </ul>
                </div>
            </div>
        `;
    }, */

    // Отображение черт (без изменений)
    displayFeats(feats) {
        const grid = document.getElementById('featsGrid');
        const noResults = document.getElementById('noFeatsFound');
        
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (feats.length === 0) {
            Utils.toggleElement(noResults, true);
            return;
        }
        
        Utils.toggleElement(noResults, false);
        
        feats.forEach(feat => {
            const card = this.createFeatCard(feat);
            grid.appendChild(card);
        });
    },

    // Создание карточки черты (без изменений)
    createFeatCard(feat) {
        const card = document.createElement('div');
        card.className = 'encyclopedia-card card';
        card.dataset.id = feat.id;
        
        const prerequisites = feat.prerequisites ? 
            `Требования: ${feat.prerequisites}` : '';
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${feat.name || 'Неизвестная черта'}</h3>
                <span class="badge badge-warning">Черта</span>
            </div>
            <div class="card-body">
                ${prerequisites ? `<div class="feat-prerequisites"><strong>${prerequisites}</strong></div>` : ''}
                <p class="encyclopedia-description">${feat.description || 'Описание отсутствует.'}</p>
                ${feat.benefits && Array.isArray(feat.benefits) ? `
                <div class="features-preview">
                    <strong>Преимущества:</strong>
                    <ul>
                        ${feat.benefits.slice(0, 3).map(b => `<li>${b}</li>`).join('')}
                        ${feat.benefits.length > 3 ? '<li>...</li>' : ''}
                    </ul>
                </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary view-details" data-type="feat" data-id="${feat.id}">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        `;
        
        const viewBtn = card.querySelector('.view-details');
        viewBtn.addEventListener('click', () => {
            this.showFeatDetails(feat);
        });
        
        return card;
    },

    // Фильтрация рас (без изменений)
    filterRaces() {
        const search = document.getElementById('raceSearch')?.value.toLowerCase() || '';
        const filter = document.getElementById('raceFilter')?.value || '';
        
        let filtered = this.data.races;
        
        if (search) {
            filtered = filtered.filter(race => 
                (race.name && race.name.toLowerCase().includes(search)) ||
                (race.description && race.description.toLowerCase().includes(search))
            );
        }
        
        if (filter) {
            filtered = filtered.filter(race => {
                const raceType = race.type || race.size || race.tags;
                if (Array.isArray(raceType)) {
                    return raceType.includes(filter);
                } else if (typeof raceType === 'string') {
                    return raceType.toLowerCase().includes(filter.toLowerCase());
                }
                return false;
            });
        }
        
        this.displayRaces(filtered);
    },

    // Фильтрация классов (без изменений)
    filterClasses() {
        const search = document.getElementById('classSearch')?.value.toLowerCase() || '';
        const filter = document.getElementById('classFilter')?.value || '';
        
        let filtered = this.data.classes;
        
        if (search) {
            filtered = filtered.filter(cls => 
                (cls.name && cls.name.toLowerCase().includes(search)) ||
                (cls.description && cls.description.toLowerCase().includes(search))
            );
        }
        
        if (filter) {
            filtered = filtered.filter(cls => {
                const classType = cls.type || cls.tags;
                if (Array.isArray(classType)) {
                    return classType.includes(filter);
                } else if (typeof classType === 'string') {
                    return classType.toLowerCase().includes(filter.toLowerCase());
                }
                return false;
            });
        }
        
        this.displayClasses(filtered);
    },

    // УБИРАЕМ фильтрацию заклинаний
    filterSpells() {
        // Убрано
    },

    // УБИРАЕМ применение фильтров заклинаний
    applySpellFilters() {
        // Убрано
    },

    // УБИРАЕМ применение фильтров к массиву заклинаний
    applySpellFiltersToArray(spells) {
        // Убрано - возвращаем все заклинания
        return spells || [];
    },

    // УБИРАЕМ сброс фильтров заклинаний
    resetSpellFilters() {
        // Убрано
    },

    // Фильтрация черт (без изменений)
    filterFeats() {
        const search = document.getElementById('featSearch')?.value.toLowerCase() || '';
        const filter = document.getElementById('featFilter')?.value || '';
        
        let filtered = this.data.feats;
        
        if (search) {
            filtered = filtered.filter(feat => 
                (feat.name && feat.name.toLowerCase().includes(search)) ||
                (feat.description && feat.description.toLowerCase().includes(search)) ||
                (feat.benefits && Array.isArray(feat.benefits) && feat.benefits.some(b => b.toLowerCase().includes(search)))
            );
        }
        
        if (filter) {
            filtered = filtered.filter(feat => 
                feat.type === filter
            );
        }
        
        this.displayFeats(filtered);
    },

    // Показать детали расы (без изменений)
    showRaceDetails(race) {
        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = race.name;
        
        const bonuses = race.abilityBonuses ? Object.entries(race.abilityBonuses)
            .filter(([_, value]) => value > 0)
            .map(([ability, value]) => `<li><strong>${Utils.getAbilityName(ability)}:</strong> +${value}</li>`)
            .join('') : '';
        
        let featuresHtml = '<p>Особенности не указаны.</p>';
        if (race.features && Array.isArray(race.features)) {
            featuresHtml = race.features.map(f => 
                `<div class="feature-detail">
                    <h4>${f.name || 'Особенность'}</h4>
                    <p>${f.description || 'Описание отсутствует.'}</p>
                </div>`
            ).join('');
        }
        
        content.innerHTML = `
            <div class="race-details">
                <div class="detail-section">
                    <h4>Описание</h4>
                    <p>${race.description || 'Описание отсутствует.'}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Основные характеристики</h4>
                    <div class="race-stats">
                        <div class="stat-item">
                            <span class="stat-label">Скорость:</span>
                            <span class="stat-value">${race.speed || 30} фт.</span>
                        </div>
                        ${race.darkvision ? `
                        <div class="stat-item">
                            <span class="stat-label">Темное зрение:</span>
                            <span class="stat-value">${race.darkvision} фт.</span>
                        </div>` : ''}
                        ${race.size ? `
                        <div class="stat-item">
                            <span class="stat-label">Размер:</span>
                            <span class="stat-value">${race.size}</span>
                        </div>` : ''}
                        ${race.languages ? `
                        <div class="stat-item">
                            <span class="stat-label">Языки:</span>
                            <span class="stat-value">${Array.isArray(race.languages) ? race.languages.join(', ') : race.languages}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                ${bonuses ? `
                <div class="detail-section">
                    <h4>Бонусы характеристик</h4>
                    <ul>
                        ${bonuses}
                    </ul>
                </div>` : ''}
                
                <div class="detail-section">
                    <h4>Особенности расы</h4>
                    ${featuresHtml}
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },

    // Показать детали класса (без изменений)
    showClassDetails(cls) {
        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = cls.name;
        
        const primaryAbility = cls.primaryAbility ? cls.primaryAbility.map(a => Utils.getAbilityName(a)).join(', ') : 'Не указано';
        const savingThrows = cls.savingThrows ? cls.savingThrows.map(s => Utils.getAbilityName(s)).join(', ') : 'Не указано';
        
        const armorProficiencies = cls.armorProficiencies ? 
            (Array.isArray(cls.armorProficiencies) ? cls.armorProficiencies.join(', ') : cls.armorProficiencies) : 
            'Не указаны';
        
        const weaponProficiencies = cls.weaponProficiencies ? 
            (Array.isArray(cls.weaponProficiencies) ? cls.weaponProficiencies.join(', ') : cls.weaponProficiencies) : 
            'Не указаны';
        
        const toolProficiencies = cls.toolProficiencies ? 
            (Array.isArray(cls.toolProficiencies) ? cls.toolProficiencies.join(', ') : cls.toolProficiencies) : 
            'Не указаны';
        
        let featuresHtml = '<p>Умения не указаны.</p>';
        if (cls.features && Array.isArray(cls.features)) {
            featuresHtml = cls.features.map(f => 
                `<div class="feature-detail">
                    <h4>${f.name || 'Умение'}</h4>
                    <p>${f.description || 'Описание отсутствует.'}</p>
                </div>`
            ).join('');
        }
        
        let subclassesHtml = '';
        if (cls.subclasses && Array.isArray(cls.subclasses)) {
            const classSubclasses = this.getSubclassesForClass(cls.id);
            
            if (classSubclasses && classSubclasses.length > 0) {
                subclassesHtml = classSubclasses.map(s => 
                    `<div class="subclass-item">
                        <h4>${s.name || s.id || s}</h4>
                        <p>${s.description || 'Описание отсутствует.'}</p>
                    </div>`
                ).join('');
            } else {
                subclassesHtml = cls.subclasses.map(s => 
                    `<div class="subclass-item">
                        <h4>${s}</h4>
                        <p>Подробности отсутствуют</p>
                    </div>`
                ).join('');
            }
        }
        
        content.innerHTML = `
            <div class="class-details">
                <div class="detail-section">
                    <h4>Описание</h4>
                    <p>${cls.description || 'Описание отсутствует.'}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Основные характеристики</h4>
                    <div class="class-stats grid grid-2">
                        <div class="stat-item">
                            <span class="stat-label">Кость хитов:</span>
                            <span class="stat-value">${cls.hitDie || 'd8'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Основная характеристика:</span>
                            <span class="stat-value">${primaryAbility}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Спасброски:</span>
                            <span class="stat-value">${savingThrows}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Магия:</span>
                            <span class="stat-value">${cls.spellcasting ? 'Да' : 'Нет'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Доспехи:</span>
                            <span class="stat-value">${armorProficiencies}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Оружие:</span>
                            <span class="stat-value">${weaponProficiencies}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Инструменты:</span>
                            <span class="stat-value">${toolProficiencies}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Классовые умения</h4>
                    ${featuresHtml}
                </div>
                
                ${subclassesHtml ? `
                <div class="detail-section">
                    <h4>Подклассы</h4>
                    ${subclassesHtml}
                </div>` : ''}
            </div>
        `;
        
        modal.classList.remove('hidden');
    },

    // Показать детали заклинания (упрощенная версия)
    showSpellDetails(spell) {
        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = spell.name;
        
        const levelText = spell.level === 0 ? 'Заговор' : `${spell.level} уровень`;
        const classes = spell.classes ? (Array.isArray(spell.classes) ? spell.classes.map(c => this.getClassName(c)).join(', ') : this.getClassName(spell.classes)) : 'Не указаны';
        
        const components = spell.components ? 
            spell.components.split('').map(c => {
                switch(c) {
                    case 'V': return 'Вербальный';
                    case 'S': return 'Соматический';
                    case 'M': return 'Материальный';
                    default: return c;
                }
            }).join(', ') : 'Не указаны';
        
        content.innerHTML = `
            <div class="spell-details">
                <div class="spell-header">
                    <span class="badge ${this.getSpellLevelBadgeClass(spell.level)}">${levelText}</span>
                    <span class="badge badge-info">${spell.school || 'Неизвестная школа'}</span>
                </div>
                
                <div class="detail-section">
                    <h4>Описание</h4>
                    <p>${spell.description || 'Описание отсутствует.'}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Характеристики заклинания</h4>
                    <div class="spell-stats grid grid-2">
                        <div class="stat-item">
                            <span class="stat-label">Время накладывания:</span>
                            <span class="stat-value">${spell.castingTime || '1 действие'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Дистанция:</span>
                            <span class="stat-value">${spell.range || 'На себя'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Компоненты:</span>
                            <span class="stat-value">${components}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Длительность:</span>
                            <span class="stat-value">${spell.duration || 'Мгновенная'}</span>
                        </div>
                    </div>
                </div>
                
                ${spell.higherLevels ? `
                <div class="detail-section">
                    <h4>На более высоких уровнях</h4>
                    <p>${spell.higherLevels}</p>
                </div>` : ''}
                
                <div class="detail-section">
                    <h4>Доступно классам</h4>
                    <div class="class-tags">
                        ${classes.split(', ').map(c => `<span class="tag">${c}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },

    // Показать детали черты (без изменений)
    showFeatDetails(feat) {
        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = feat.name;
        
        const prerequisites = feat.prerequisites ? 
            `<div class="detail-section">
                <h4>Требования</h4>
                <p>${feat.prerequisites}</p>
            </div>` : '';
        
        const benefits = feat.benefits && Array.isArray(feat.benefits) ? 
            `<div class="detail-section">
                <h4>Преимущества</h4>
                <ul>
                    ${feat.benefits.map(b => `<li>${b}</li>`).join('')}
                </ul>
            </div>` : '';
        
        content.innerHTML = `
            <div class="feat-details">
                <div class="detail-section">
                    <h4>Описание</h4>
                    <p>${feat.description || 'Описание отсутствует.'}</p>
                </div>
                
                ${prerequisites}
                ${benefits}
            </div>
        `;
        
        modal.classList.remove('hidden');
    },

    // Обновление статистики (обновляем для учета правил)
    updateStats() {
        const statsInfo = document.getElementById('statsInfo');
        if (!statsInfo) return;
        
        const stats = {
            races: this.data.races.length,
            classes: this.data.classes.length,
            spells: this.data.spells.length,
            feats: this.data.feats.length,
            rules: this.data.rules.length,
            subclasses: this.data.subclasses.length
        };
        
        statsInfo.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.races}</div>
                    <div class="stat-label">Рас</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.classes}</div>
                    <div class="stat-label">Классов</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.spells}</div>
                    <div class="stat-label">Заклинаний</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.feats}</div>
                    <div class="stat-label">Черт</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.rules}</div>
                    <div class="stat-label">Правил</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.subclasses}</div>
                    <div class="stat-label">Подклассов</div>
                </div>
            </div>
        `;
        
        Utils.toggleElement(statsInfo, true);
    },

    // Вспомогательные методы
    getClassName(classId) {
        const classNames = {
            'wizard': 'Волшебник',
            'cleric': 'Жрец',
            'paladin': 'Паладин',
            'rogue': 'Плут',
            'sorcerer': 'Чародей',
            'warlock': 'Колдун',
            'bard': 'Бард',
            'druid': 'Друид',
            'fighter': 'Воин',
            'ranger': 'Следопыт',
            'barbarian': 'Варвар',
            'monk': 'Монах',
            'artificer': 'Изобретатель'
        };
        
        return classNames[classId] || classId;
    },

    getSpellLevelBadgeClass(level) {
        const classes = {
            0: 'badge-secondary',
            1: 'badge-primary',
            2: 'badge-info',
            3: 'badge-success',
            4: 'badge-warning',
            5: 'badge-danger',
            6: 'badge-primary',
            7: 'badge-info',
            8: 'badge-success',
            9: 'badge-warning'
        };
        
        return classes[level] || 'badge-secondary';
    },

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    showLoader() {
        const loader = document.getElementById('statsLoader');
        const statsInfo = document.getElementById('statsInfo');
        
        if (loader) Utils.toggleElement(loader, true);
        if (statsInfo) Utils.toggleElement(statsInfo, false);
    },

    hideLoader() {
        const loader = document.getElementById('statsLoader');
        if (loader) Utils.toggleElement(loader, false);
    },

    // Методы для заглушек
    getFallbackRaces() {
        return [
            {
                id: 'human',
                name: 'Человек',
                description: 'Адаптивные и амбициозные, люди быстро осваиваются в любых условиях.',
                abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
                speed: 30,
                features: [
                    { name: 'Увеличение характеристик', description: 'Значение всех ваших характеристик увеличивается на 1.' },
                    { name: 'Свободное владение навыком', description: 'Вы владеете одним навыком на ваш выбор.' }
                ]
            },
            {
                id: 'high-elf',
                name: 'Высший эльф',
                description: 'Утонченные и магически одаренные эльфы с острыми чувствами и грацией.',
                abilityBonuses: { dexterity: 2, intelligence: 1 },
                speed: 30,
                darkvision: 60,
                features: [
                    { name: 'Темное зрение', description: 'Вы можете видеть в темноте на расстоянии 60 футов.' },
                    { name: 'Магия эльфов', description: 'Вы знаете один заговор из списка заклинаний волшебника.' }
                ]
            }
        ];
    },

    getFallbackClasses() {
        return [
            {
                id: 'fighter',
                name: 'Воин',
                description: 'Мастер боевых искусств, владеющий любым оружием и доспехами.',
                hitDie: 'd10',
                primaryAbility: ['strength', 'dexterity'],
                savingThrows: ['strength', 'constitution'],
                spellcasting: false,
                features: [
                    { name: 'Боевой стиль', description: 'Вы выбираете боевой стиль, соответствующий вашей специализации.' },
                    { name: 'Второе дыхание', description: 'Вы можете восстановить 1d10 + уровень хитов в качестве бонусного действия.' }
                ],
                subclasses: [
                    'battle-master',
                    'champion'
                ]
            }
        ];
    },

    getFallbackSpells() {
        return [
            {
                id: 'fire-bolt',
                name: 'Огненный снаряд',
                level: 0,
                school: 'evocation',
                castingTime: '1 действие',
                range: '120 футов',
                components: 'В, С',
                duration: 'Мгновенная',
                description: 'Вы мечете в противника сгусток пламени. Совершите по цели дальнобойную атаку заклинанием. При попадании цель получает урон огнем 1d10. Урон от этого заклинания увеличивается на 1d10 при достижении 5-го уровня (2d10), 11-го уровня (3d10) и 17-го уровня (4d10).',
                classes: ['wizard']
            },
            {
                id: 'magic-missile',
                name: 'Волшебная стрела',
                level: 1,
                school: 'evocation',
                castingTime: '1 действие',
                range: '120 футов',
                components: 'В, С',
                duration: 'Мгновенная',
                description: 'Вы создаете три сверкающие стрелы из магической силы. Каждая стрела попадает в существо по вашему выбору, которое вы можете видеть в пределах дистанции. Стрела наносит 1d4 + 1 урона силовым полем. Если вы накладываете это заклинание, используя ячейку заклинаний 2-го уровня или выше, за каждую ячейку выше первого создается одна дополнительная стрела.',
                classes: ['wizard']
            }
        ];
    },

    getFallbackRules() {
        return [
            {
                id: 'basic-mechanics',
                name: 'Основная механика',
                description: 'Когда персонаж пытается сделать что-то неопределенное, игрок бросает 20-гранный кубик (d20) и добавляет соответствующий модификатор.',
                examples: 'Атака мечом = d20 + модификатор Силы + бонус мастерства'
            },
            {
                id: 'ability-scores',
                name: 'Характеристики и модификаторы',
                description: 'У персонажа есть 6 основных характеристик: Сила, Ловкость, Телосложение, Интеллект, Мудрость, Харизма.',
                examples: 'Значение 16 дает модификатор +3, значение 8 дает модификатор -1'
            }
        ];
    },

    getFallbackFeats() {
        return [
            {
                id: 'alert',
                name: 'Бдительный',
                prerequisites: 'Нет',
                description: 'Вы всегда начеку и готовы к опасности.',
                benefits: [
                    'Вы не можете быть захвачены врасплох',
                    '+5 к бонусу инициативы',
                    'Другие существа не получают преимущества при атаке против вас из состояния скрытности'
                ]
            },
            {
                id: 'tough',
                name: 'Крепкий',
                prerequisites: 'Нет',
                description: 'Вы обладаете невероятной выносливостью.',
                benefits: [
                    'Ваш максимальный запас хитов увеличивается на количество, равное удвоенному вашему уровню',
                    'На каждом последующем уровне вы получаете +2 к максимальному запасу хитов'
                ]
            }
        ];
    },

    // Универсальная функция для отображения любых данных правил
    createRuleContent(ruleData, level = 0) {
        let content = '';
        
        // Рекурсивно обрабатываем все свойства
        const processProperty = (key, value, depth = 0) => {
            const indent = '  '.repeat(depth);
            
            // Пропускаем системные поля
            if (key === 'id' || key === 'name' || key === 'title' || key === 'nestedRules') {
                return '';
            }
            
            let propertyContent = '';
            
            // Обрабатываем разные типы данных
            if (value === null || value === undefined) {
                return '';
            } else if (Array.isArray(value)) {
                // Массив
                if (value.length === 0) {
                    return '';
                }
                
                // Проверяем тип элементов массива
                const firstItem = value[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    // Массив объектов
                    propertyContent += `<div class="nested-array" style="margin-left: ${depth * 20}px;">`;
                    propertyContent += `<h5 style="margin-top: 15px; color: var(--primary-color);">${this.formatKey(key)}:</h5>`;
                    
                    value.forEach((item, index) => {
                        propertyContent += `<div class="array-item" style="margin-left: 20px; margin-bottom: 10px;">`;
                        
                        // Если у объекта есть name или id, используем их как заголовок
                        if (item.name || item.id) {
                            propertyContent += `<strong>${item.name || item.id}:</strong> `;
                        }
                        
                        // Рекурсивно обрабатываем содержимое объекта
                        Object.keys(item).forEach(subKey => {
                            if (subKey !== 'name' && subKey !== 'id') {
                                propertyContent += processProperty(subKey, item[subKey], depth + 1);
                            }
                        });
                        
                        propertyContent += `</div>`;
                    });
                    
                    propertyContent += `</div>`;
                } else {
                    // Простой массив
                    propertyContent += `<div style="margin-left: ${depth * 20}px; margin-top: 5px;">`;
                    propertyContent += `<strong>${this.formatKey(key)}:</strong> `;
                    propertyContent += `<span>${value.join(', ')}</span>`;
                    propertyContent += `</div>`;
                }
            } else if (typeof value === 'object') {
                // Объект
                propertyContent += `<div class="nested-object" style="margin-left: ${depth * 20}px;">`;
                propertyContent += `<h5 style="margin-top: 15px; color: var(--primary-color);">${this.formatKey(key)}:</h5>`;
                
                // Рекурсивно обрабатываем свойства объекта
                Object.keys(value).forEach(subKey => {
                    propertyContent += processProperty(subKey, value[subKey], depth + 1);
                });
                
                propertyContent += `</div>`;
            } else {
                // Простое значение (строка, число, булево)
                propertyContent += `<div style="margin-left: ${depth * 20}px; margin-top: 5px;">`;
                propertyContent += `<strong>${this.formatKey(key)}:</strong> `;
                propertyContent += `<span>${this.formatValue(value)}</span>`;
                propertyContent += `</div>`;
            }
            
            return propertyContent;
        };
        
        // Обрабатываем все свойства правила
        Object.keys(ruleData).forEach(key => {
            if (key !== 'id' && key !== 'name' && key !== 'title' && key !== 'nestedRules') {
                content += processProperty(key, ruleData[key], 0);
            }
        });
        
        return content;
    },

    formatKey(key) {
        const keyMap = {
            'description': 'Описание',
            'examples': 'Примеры',
            'modifiers': 'Модификаторы',
            'skills': 'Навыки',
            'conditions': 'Состояния',
            'combat': 'Бой',
            'savingThrows': 'Спасброски',
            'abilityScores': 'Характеристики',
            'equipment': 'Снаряжение',
            'armor': 'Доспехи',
            'weapons': 'Оружие',
            'round': 'Длительность раунда',
            'turnOrder': 'Очередность хода',
            'castingTime': 'Время накладывания',
            'range': 'Дистанция',
            'components': 'Компоненты',
            'duration': 'Длительность',
            'school': 'Школа магии',
            'level': 'Уровень',
            'type': 'Тип',
            'damage': 'Урон',
            'tags': 'Теги',
            'classes': 'Классы',
            'prerequisites': 'Требования',
            'benefits': 'Преимущества',
            'speed': 'Скорость',
            'darkvision': 'Темное зрение',
            'size': 'Размер',
            'languages': 'Языки',
            'hitDie': 'Кость хитов',
            'spellcasting': 'Магия',
            'primaryAbility': 'Основная характеристика',
            'savingThrows': 'Спасброски',
            'armorProficiencies': 'Владение доспехами',
            'weaponProficiencies': 'Владение оружием',
            'toolProficiencies': 'Владение инструментами',
            'features': 'Особенности'
        };
        
        // Преобразуем camelCase в читаемый текст
        if (keyMap[key]) {
            return keyMap[key];
        }
        
        // Преобразуем snake_case и camelCase в читаемый текст
        const formatted = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
        
        return formatted;
    },

    // Форматирование значения
    formatValue(value) {
        if (value === null || value === undefined) {
            return 'Не указано';
        }
        
        if (typeof value === 'boolean') {
            return value ? 'Да' : 'Нет';
        }
        
        if (typeof value === 'number') {
            return value.toString();
        }
        
        // Если это строка, проверяем, не JSON ли это
        if (typeof value === 'string') {
            // Пытаемся разобрать как JSON
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' && parsed !== null) {
                    // Если это объект, рекурсивно форматируем
                    return this.createRuleContent(parsed, 1);
                }
            } catch (e) {
                // Не JSON, оставляем как есть
            }
            
            return value;
        }
        
        return String(value);
    },

    showFallbackData() {
        this.data.races = this.getFallbackRaces();
        this.data.classes = this.getFallbackClasses();
        this.data.spells = this.getFallbackSpells();
        this.data.rules = this.getFallbackRules();
        this.data.feats = this.getFallbackFeats();
        
        this.updateStats();
        this.loadTabData(this.currentTab);
        this.hideLoader();
        
        Utils.showNotification('Используются локальные данные', 'warning');
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    Encyclopedia.init();
});