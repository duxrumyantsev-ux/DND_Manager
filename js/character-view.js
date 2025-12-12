// character-view.js - исправленная версия с правильной работой с БД
const CharacterViewer = {
    characterId: null,
    characterData: null,

    async init() {
        console.log('👁️ Инициализация просмотра персонажа...');
        
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.characterId = urlParams.get('id');
            
            if (!this.characterId) {
                throw new Error('ID персонажа не указан');
            }
            
            console.log(`🔍 Загрузка персонажа: ${this.characterId}`);
            
            await this.loadCharacter();
            
            if (this.characterData) {
                await this.initUI();
                this.initEventListeners();
                console.log('✅ Просмотр персонажа успешно инициализирован');
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Не удалось загрузить персонажа');
        }
    },

    async loadCharacter() {
        try {
            this.showLoading();
            
            // Загружаем данные персонажа
            this.characterData = await CharacterManager.loadCharacterById(this.characterId);
            
            if (!this.characterData) {
                throw new Error('Персонаж не найден');
            }
            
            console.log('✅ Персонаж загружен:', {
                name: this.characterData.name,
                id: this.characterData.id,
                class: this.characterData.class,
                race: this.characterData.race,
                abilityScores: this.characterData.abilityScores
            });
            
            // Проверяем и корректируем данные
            this.validateCharacterData();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажа:', error);
            throw error;
        }
    },

    // Проверка и корректировка данных персонажа
    validateCharacterData() {
        if (!this.characterData) return;
        
        // Убедимся, что abilityScores существуют и корректны
        if (!this.characterData.abilityScores) {
            console.log('⚠️ abilityScores не найдены, инициализируем');
            this.characterData.abilityScores = {
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
            const value = this.characterData.abilityScores[ability];
            if (value === undefined || value === null || isNaN(value) || value < 1 || value > 30) {
                console.log(`⚠️ Неправильное значение ${ability}: ${value}, устанавливаем 10`);
                this.characterData.abilityScores[ability] = 10;
            }
        });
        
        // Убедимся, что есть основные поля
        if (!this.characterData.level || isNaN(this.characterData.level)) {
            console.log('⚠️ level не найден, устанавливаем 1');
            this.characterData.level = 1;
        }
        
        if (!this.characterData.hp) {
            console.log('⚠️ hp не найдены, инициализируем');
            this.characterData.hp = {
                max: 10,
                current: 10,
                temp: 0
            };
        }
        
        if (!this.characterData.armor) {
            console.log('⚠️ armor не найдена, инициализируем');
            this.characterData.armor = {
                type: 'none',
                shield: false
            };
        }
    },

    async initUI() {
        if (!this.characterData) return;
        
        document.title = `${this.characterData.name} - D&D Manager`;
        
        // Добавляем стили для навыков
        this.renderStyles();
        
        await this.renderCharacterInfo();
    },

    async renderCharacterInfo() {
        const container = document.getElementById('characterViewContainer');
        if (!container) return;
        
        const character = this.characterData;
        
        // Рассчитываем AC с данными ИЗ БД
        const ac = await CharacterManager.calculateACWithDB(character);
        
        // Получаем статус
        const status = CharacterManager.getCharacterStatus(character);
        const statusClass = CharacterManager.getStatusClass(status);
        const statusText = CharacterManager.getStatusText(status);
        
        container.innerHTML = `
            <!-- Шапка персонажа -->
            <div class="character-view-header">
                <div class="character-title">
                    <h1>${this.escapeHtml(character.name || 'Без имени')}</h1>
                    <div class="character-subtitle">
                        <span class="character-level">Уровень ${character.level || 1}</span>
                        <span class="character-class">${CharacterManager.getClassDisplayName(character.class)}</span>
                        <span class="character-race">${CharacterManager.getRaceDisplayName(character.race)}</span>
                        <span class="character-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="character-actions">
                    <a href="character-edit.html?id=${character.id}" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Редактировать
                    </a>
                    <a href="characters.html" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Назад
                    </a>
                </div>
            </div>
            
            <div class="character-view-grid">
                <!-- Основная информация -->
                <div class="character-section card">
                    <h3><i class="fas fa-info-circle"></i> Основная информация</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Предыстория</span>
                            <span class="info-value">${character.background || 'Не указана'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Мировоззрение</span>
                            <span class="info-value">${CharacterManager.getAlignmentDisplayName(character.alignment) || 'Не указано'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Опыт (XP)</span>
                            <span class="info-value">${character.xp?.toLocaleString() || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Скорость</span>
                            <span class="info-value">${character.speed || 30} фт.</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Бонус мастерства</span>
                            <span class="info-value">+${Utils.calculateProficiencyBonus(character.level || 1)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Боевые характеристики -->
                <div class="character-section card">
                    <h3><i class="fas fa-shield-alt"></i> Боевые характеристики</h3>
                    <div class="combat-stats">
                        <div class="stat-large">
                            <div class="stat-value">${character.hp?.current || 0}/${character.hp?.max || 10}</div>
                            <div class="stat-label">Здоровье (HP)</div>
                        </div>
                        <div class="stat-large">
                            <div class="stat-value">${ac}</div>
                            <div class="stat-label">Класс брони (AC)</div>
                        </div>
                        <div class="stat-large">
                            <div class="stat-value">${character.hp?.temp || 0}</div>
                            <div class="stat-label">Временное HP</div>
                        </div>
                    </div>
                    
                    <!-- Информация о броне -->
                    ${await this.renderArmorInfo()}
                </div>
                
                <!-- Характеристики -->
                <div class="character-section card">
                    <h3><i class="fas fa-chart-bar"></i> Характеристики</h3>
                    <div class="abilities-grid">
                        ${this.renderAbilities()}
                    </div>
                </div>
                
                <!-- НАВЫКИ -->
                ${await this.renderSkills()}
                
                <!-- Оружие -->
                ${character.weapons?.length > 0 ? this.renderWeapons() : ''}
                
                <!-- Заклинания -->
                ${character.spells?.length > 0 ? await this.renderSpells() : ''}
                
                <!-- Заметки -->
                ${this.renderNotes()}
            </div>
        `;
    },

    async renderSkills() {
        try {
            const character = this.characterData;
            
            if (!character.skills || Object.keys(character.skills).length === 0) {
                console.log('📭 У персонажа нет навыков');
                return '';
            }
            
            console.log('📚 Загрузка навыков ИЗ БД для отображения...');
            
            // Загружаем навыки ИЗ БД
            const allSkills = await DataService.loadSkills();
            
            if (allSkills.length === 0) {
                console.log('📭 Нет навыков в БД');
                return '';
            }
            
            // Фильтруем только те навыки, которые есть у персонажа
            const characterSkills = allSkills.filter(skill => {
                const skillId = skill.id || skill.name?.toLowerCase();
                return character.skills[skillId];
            });
            
            if (characterSkills.length === 0) {
                console.log('📭 Не найдено навыков персонажа в БД');
                return '';
            }
            
            console.log(`✅ Найдено навыков персонажа ИЗ БД: ${characterSkills.length}`);
            
            const skillsHTML = characterSkills.map(skill => {
                const skillId = skill.id || skill.name?.toLowerCase();
                const skillName = skill.name || 'Неизвестный навык';
                const skillData = character.skills[skillId];
                const skillMod = CharacterManager.calculateSkillModifier(character, skillId);
                const abilityName = CharacterManager.getSkillAbility(skillId);
                const isProficient = skillData?.proficient || false;
                
                return `
                    <div class="skill-item ${isProficient ? 'skill-proficient' : ''}">
                        <div class="skill-name">
                            ${skillName}
                            ${isProficient ? '<span class="proficiency-badge" title="Владеет навыком">✓</span>' : ''}
                        </div>
                        <div class="skill-details">
                            <span class="skill-ability">(${Utils.getAbilityAbbr(abilityName)})</span>
                            <span class="skill-modifier ${skillMod >= 0 ? 'positive' : 'negative'}">
                                ${skillMod >= 0 ? '+' + skillMod : skillMod}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="character-section card">
                    <h3><i class="fas fa-tasks"></i> Навыки</h3>
                    <div class="skills-grid">
                        ${skillsHTML}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Ошибка отображения навыков ИЗ БД:', error);
            return '';
        }
    },

    renderStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .skills-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 0.75rem;
            }
            
            .skill-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                background: var(--bg-secondary);
                border-radius: 6px;
                border: 1px solid var(--border);
                transition: all 0.3s ease;
            }
            
            .skill-item.skill-proficient {
                background: rgba(var(--primary-rgb), 0.1);
                border-color: var(--primary);
            }
            
            .skill-name {
                font-weight: 500;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .proficiency-badge {
                color: var(--success);
                font-weight: bold;
            }
            
            .skill-details {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .skill-ability {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            
            .skill-modifier {
                font-weight: bold;
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
                min-width: 2.5rem;
                text-align: center;
            }
            
            .skill-modifier.positive {
                background: rgba(var(--success-rgb), 0.1);
                color: var(--success);
            }
            
            .skill-modifier.negative {
                background: rgba(var(--danger-rgb), 0.1);
                color: var(--danger);
            }
            
            /* Стили для редактора навыков */
            .skill-checkbox {
                flex-shrink: 0;
            }
            
            .skill-checkbox input[type="checkbox"] {
                width: 1.2rem;
                height: 1.2rem;
            }
            
            .skill-info {
                flex-grow: 1;
                margin-left: 0.75rem;
            }
            
            .skill-modifier {
                flex-shrink: 0;
                min-width: 3rem;
                text-align: center;
            }
            
            .modifier-value {
                font-weight: bold;
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
            }
            
            .modifier-value.positive {
                background: rgba(var(--success-rgb), 0.1);
                color: var(--success);
            }
            
            .modifier-value.negative {
                background: rgba(var(--danger-rgb), 0.1);
                color: var(--danger);
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ Стили для навыков добавлены');
    },

    async renderArmorInfo() {
        const character = this.characterData;
        const armor = character.armor || {};
        
        if (armor.type === 'none' && !armor.shield) {
            return '<p class="no-armor">Персонаж не носит броню</p>';
        }
        
        try {
            // Загружаем данные о броне из БД
            const armorTypes = await DataService.loadArmorTypes();
            const armorInfo = armorTypes.find(a => a.id === armor.type) || 
                             armorTypes.find(a => a.name?.toLowerCase() === armor.type?.toLowerCase());
            
            if (!armorInfo) {
                return `
                    <div class="armor-info">
                        <p><strong>Броня:</strong> ${armor.type || 'Неизвестно'}</p>
                        <p><strong>Щит:</strong> ${armor.shield ? 'Да' : 'Нет'}</p>
                    </div>
                `;
            }
            
            const dexScore = character.abilityScores?.dexterity || 10;
            const dexMod = Utils.calculateModifier(dexScore);
            const maxDex = armorInfo.maxDex !== undefined ? armorInfo.maxDex : 
                          (armorInfo.type === 'heavy' ? 0 : 
                           armorInfo.type === 'medium' ? 2 : 5);
            
            return `
                <div class="armor-info">
                    <h4>Броня и защита</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Броня</span>
                            <span class="info-value">${armorInfo.name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Тип</span>
                            <span class="info-value">${armorInfo.type || 'Не указан'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Щит</span>
                            <span class="info-value">${armor.shield ? 'Да (+2 AC)' : 'Нет'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Базовый AC</span>
                            <span class="info-value">${armorInfo.baseAC || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Макс. бонус Ловкости</span>
                            <span class="info-value">${maxDex}</span>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки информации о броне:', error);
            return '<p class="error">Не удалось загрузить информацию о броне</p>';
        }
    },

    renderAbilities() {
        const character = this.characterData;
        const abilities = [
            { id: 'strength', name: 'Сила', abbr: 'STR', icon: 'fist-raised' },
            { id: 'dexterity', name: 'Ловкость', abbr: 'DEX', icon: 'running' },
            { id: 'constitution', name: 'Телосложение', abbr: 'CON', icon: 'heartbeat' },
            { id: 'intelligence', name: 'Интеллект', abbr: 'INT', icon: 'brain' },
            { id: 'wisdom', name: 'Мудрость', abbr: 'WIS', icon: 'eye' },
            { id: 'charisma', name: 'Харизма', abbr: 'CHA', icon: 'comments' }
        ];
        
        return abilities.map(ability => {
            const score = character.abilityScores?.[ability.id] || 10;
            const modifier = Math.floor((score - 10) / 2);
            const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString();
            const modifierClass = modifier >= 0 ? 'positive' : 'negative';
            
            return `
                <div class="ability-card">
                    <div class="ability-header">
                        <div class="ability-name">${ability.name}</div>
                        <div class="ability-abbr">${ability.abbr}</div>
                    </div>
                    <div class="ability-score">${score}</div>
                    <div class="ability-modifier ${modifierClass}">
                        ${modifierStr}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderWeapons() {
        const weapons = this.characterData.weapons || [];
        
        return `
            <div class="character-section card">
                <h3><i class="fas fa-fist-raised"></i> Оружие</h3>
                <div class="weapons-list">
                    ${weapons.map(weapon => `
                        <div class="weapon-item">
                            <div class="weapon-name">${weapon.name || 'Без названия'}</div>
                            <div class="weapon-details">
                                <span class="weapon-damage">${weapon.damage || '1d6'}</span>
                                <span class="weapon-type">${weapon.type === 'ranged' ? 'Дальний бой' : 'Ближний бой'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async renderSpells() {
        const spells = this.characterData.spells || [];
        
        if (spells.length === 0) return '';
        
        try {
            // Загружаем подробную информацию о заклинаниях из БД
            const allSpells = await DataService.loadSpells();
            const detailedSpells = [];
            
            // Находим подробную информацию для каждого заклинания
            for (const spell of spells) {
                const spellId = typeof spell === 'object' ? spell.id || spell.name : spell;
                const detailedSpell = allSpells.find(s => 
                    s.id === spellId || 
                    s.name?.toLowerCase() === spellId?.toLowerCase()
                );
                
                if (detailedSpell) {
                    detailedSpells.push(detailedSpell);
                } else {
                    detailedSpells.push({
                        name: typeof spell === 'object' ? spell.name || 'Без названия' : spell,
                        level: 0,
                        school: 'Неизвестно'
                    });
                }
            }
            
            // Группируем заклинания по уровням
            const spellsByLevel = {};
            detailedSpells.forEach(spell => {
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
                    <div class="spell-level-section">
                        <h4>${levelName} (${levelSpells.length})</h4>
                        <div class="spells-grid">
                            ${levelSpells.map(spell => `
                                <div class="spell-card">
                                    <div class="spell-name">${spell.name || 'Без названия'}</div>
                                    <div class="spell-details">
                                        <span class="spell-school">${spell.school || 'Неизвестно'}</span>
                                        ${spell.ritual ? '<span class="spell-ritual">Ритуал</span>' : ''}
                                        ${spell.concentration ? '<span class="spell-concentration">Концентрация</span>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            return `
                <div class="character-section card">
                    <h3><i class="fas fa-magic"></i> Заклинания</h3>
                    ${spellsHTML}
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки заклинаний:', error);
            
            // Fallback - показываем просто список имен
            return `
                <div class="character-section card">
                    <h3><i class="fas fa-magic"></i> Заклинания</h3>
                    <div class="spells-summary">
                        <p>Известно заклинаний: <strong>${spells.length}</strong></p>
                        <div class="spells-preview">
                            ${spells.slice(0, 5).map(spell => {
                                const spellName = typeof spell === 'object' ? spell.name || 'Без названия' : spell;
                                return `<span class="spell-tag">${spellName}</span>`;
                            }).join('')}
                            ${spells.length > 5 ? `<span class="spell-tag">+${spells.length - 5} еще</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    },

    renderNotes() {
        const notes = this.characterData.notes || {};
        if (!notes.history && !notes.appearance && !notes.personality) return '';
        
        return `
            <div class="character-section card full-width">
                <h3><i class="fas fa-sticky-note"></i> Заметки</h3>
                <div class="notes-grid">
                    ${notes.history ? `
                        <div class="note-section">
                            <h4>История</h4>
                            <p>${notes.history}</p>
                        </div>
                    ` : ''}
                    ${notes.appearance ? `
                        <div class="note-section">
                            <h4>Внешность</h4>
                            <p>${notes.appearance}</p>
                        </div>
                    ` : ''}
                    ${notes.personality ? `
                        <div class="note-section">
                            <h4>Личность</h4>
                            <p>${notes.personality}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    initEventListeners() {
        // Можно добавить дополнительные обработчики
    },

    showLoading() {
        const container = document.getElementById('characterViewContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loader"></div>
                    <h3>Загрузка персонажа...</h3>
                </div>
            `;
        }
    },

    showError(message) {
        const container = document.getElementById('characterViewContainer');
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
    CharacterViewer.init();
});

window.CharacterViewer = CharacterViewer;