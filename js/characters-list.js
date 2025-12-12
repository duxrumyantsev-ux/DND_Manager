// characters-list.js - Управление списком персонажей

const CharactersList = {
    characters: [],
    filteredCharacters: [],
    filters: {
        search: '',
        class: '',
        race: '',
        level: '',
        status: ''
    },
    sortBy: 'updated',
    
    async init() {
        console.log('📋 Инициализация страницы списка персонажей');
        this.initEventListeners();
        await this.loadCharacters();
    },

    initEventListeners() {
        // Поиск
        const searchInput = document.getElementById('characterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.filterCharacters();
            });
        }

        // Фильтры
        document.getElementById('characterClassFilter')?.addEventListener('change', (e) => {
            this.filters.class = e.target.value;
            this.filterCharacters();
        });

        document.getElementById('characterRaceFilter')?.addEventListener('change', (e) => {
            this.filters.race = e.target.value;
            this.filterCharacters();
        });

        document.getElementById('characterLevelFilter')?.addEventListener('change', (e) => {
            this.filters.level = e.target.value;
            this.filterCharacters();
        });

        document.getElementById('characterStatusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.filterCharacters();
        });

        // Сортировка
        document.getElementById('sortBy')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortCharacters();
        });

        // Кнопки
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        document.getElementById('resetSearch')?.addEventListener('click', () => {
            this.clearFilters();
        });

        document.getElementById('refreshCharacters')?.addEventListener('click', () => {
            this.loadCharacters();
        });
    },

    async loadCharacters() {
        try {
            this.showLoader();
            
            console.log('📥 Загрузка персонажей...');
            this.characters = await CharacterManager.loadAllCharacters();
            
            console.log(`✅ Загружено персонажей: ${this.characters.length}`);
            
            // Обновляем фильтры
            this.updateFilters();
            
            // Отображаем персонажей
            this.filterCharacters();
            this.sortCharacters();
            this.updateStats();
            
            this.hideLoader();
            
            Utils.showNotification(`Загружено ${this.characters.length} персонажей`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            this.hideLoader();
            Utils.showNotification('Не удалось загрузить персонажей', 'error');
        }
    },

    updateFilters() {
        // Обновляем список классов
        const classFilter = document.getElementById('characterClassFilter');
        if (classFilter) {
            const uniqueClasses = [...new Set(this.characters
                .map(c => c.class)
                .filter(Boolean)
                .map(classId => CharacterManager.getClassDisplayName(classId))
                .sort())];
            
            // Очищаем опции (кроме "Все классы")
            while (classFilter.options.length > 1) {
                classFilter.remove(1);
            }
            
            uniqueClasses.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classFilter.appendChild(option);
            });
        }

        // Обновляем список рас
        const raceFilter = document.getElementById('characterRaceFilter');
        if (raceFilter) {
            const uniqueRaces = [...new Set(this.characters
                .map(c => c.race)
                .filter(Boolean)
                .map(raceId => CharacterManager.getRaceDisplayName(raceId))
                .sort())];
            
            while (raceFilter.options.length > 1) {
                raceFilter.remove(1);
            }
            
            uniqueRaces.forEach(raceName => {
                const option = document.createElement('option');
                option.value = raceName;
                option.textContent = raceName;
                raceFilter.appendChild(option);
            });
        }
    },

    filterCharacters() {
        let filtered = [...this.characters];

        // Фильтр по поиску
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(character => 
                (character.name && character.name.toLowerCase().includes(searchLower)) ||
                (character.background && character.background.toLowerCase().includes(searchLower))
            );
        }

        // Фильтр по классу
        if (this.filters.class) {
            filtered = filtered.filter(character => 
                CharacterManager.getClassDisplayName(character.class) === this.filters.class
            );
        }

        // Фильтр по расе
        if (this.filters.race) {
            filtered = filtered.filter(character => 
                CharacterManager.getRaceDisplayName(character.race) === this.filters.race
            );
        }

        // Фильтр по уровню
        if (this.filters.level) {
            const [min, max] = this.filters.level.split('-').map(Number);
            filtered = filtered.filter(character => {
                const level = character.level || 1;
                return level >= min && level <= max;
            });
        }

        // Фильтр по статусу
        if (this.filters.status) {
            filtered = filtered.filter(character => {
                const status = CharacterManager.getCharacterStatus(character);
                return status === this.filters.status;
            });
        }

        this.filteredCharacters = filtered;
        this.displayCharacters();
    },

    sortCharacters() {
        switch (this.sortBy) {
            case 'name':
                this.filteredCharacters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'name-desc':
                this.filteredCharacters.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'level':
                this.filteredCharacters.sort((a, b) => (a.level || 1) - (b.level || 1));
                break;
            case 'level-desc':
                this.filteredCharacters.sort((a, b) => (b.level || 1) - (a.level || 1));
                break;
            case 'updated':
                this.filteredCharacters.sort((a, b) => {
                    const aDate = a.updatedAt || a.createdAt || 0;
                    const bDate = b.updatedAt || b.createdAt || 0;
                    return bDate - aDate;
                });
                break;
            case 'created':
                this.filteredCharacters.sort((a, b) => {
                    const aDate = a.createdAt || 0;
                    const bDate = b.createdAt || 0;
                    return bDate - aDate;
                });
                break;
        }

        this.displayCharacters();
    },

    displayCharacters() {
        const list = document.getElementById('charactersList');
        const emptyState = document.getElementById('emptyCharacters');
        const noResults = document.getElementById('noCharactersFound');

        if (!list || !emptyState || !noResults) return;

        list.innerHTML = '';

        if (this.characters.length === 0) {
            Utils.toggleElement(emptyState, true);
            Utils.toggleElement(noResults, false);
            return;
        }

        Utils.toggleElement(emptyState, false);

        if (this.filteredCharacters.length === 0) {
            Utils.toggleElement(noResults, true);
            return;
        }

        Utils.toggleElement(noResults, false);

        // Отображаем отфильтрованных персонажей
        this.filteredCharacters.forEach(character => {
            const card = this.createCharacterCard(character);
            list.appendChild(card);
        });
    },

    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.characterId = character.id;
        
        const status = CharacterManager.getCharacterStatus(character);
        const statusClass = CharacterManager.getStatusClass(status);
        const statusText = CharacterManager.getStatusText(status);
        
        const updatedDate = character.updatedAt ? 
            new Date(character.updatedAt).toLocaleDateString('ru-RU') : 'Неизвестно';
        
        const ac = CharacterManager.calculateAC(character);
        
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="character-name">${character.name || 'Без имени'}</h3>
                    <div class="character-meta">
                        <span class="character-level">Уровень ${character.level || 1}</span>
                        <span class="character-class">${CharacterManager.getClassDisplayName(character.class)}</span>
                        <span class="character-race">${CharacterManager.getRaceDisplayName(character.race)}</span>
                        <span class="character-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="character-actions">
                    <button class="btn btn-primary view-character" data-id="${character.id}">
                        <i class="fas fa-eye"></i> Просмотр
                    </button>
                    <button class="btn btn-secondary edit-character" data-id="${character.id}">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="btn btn-danger delete-character" data-id="${character.id}" data-name="${character.name || ''}">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
            
            <div class="character-info">
                <div class="info-item">
                    <div class="info-label">HP</div>
                    <div class="info-value">
                        ${character.hp?.current || 0}/${character.hp?.max || 10}
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">AC</div>
                    <div class="info-value">${ac}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Обновлен</div>
                    <div class="info-value">${updatedDate}</div>
                </div>
                ${character.alignment ? `
                <div class="info-item">
                    <div class="info-label">Мировоззрение</div>
                    <div class="info-value">${CharacterManager.getAlignmentDisplayName(character.alignment)}</div>
                </div>` : ''}
            </div>
            
            ${character.notes?.history ? `
                <div class="character-history">
                    <div class="info-label">История</div>
                    <p class="history-preview">${character.notes.history.substring(0, 150)}${character.notes.history.length > 150 ? '...' : ''}</p>
                </div>
            ` : ''}
        `;
        
        // Добавляем обработчики событий
        this.addCardEventListeners(card, character);
        
        return card;
    },

    addCardEventListeners(card, character) {
        // Просмотр
        const viewBtn = card.querySelector('.view-character');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                this.viewCharacter(character.id);
            });
        }
        
        // Редактирование
        const editBtn = card.querySelector('.edit-character');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editCharacter(character.id);
            });
        }
        
        // Удаление
        const deleteBtn = card.querySelector('.delete-character');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const characterId = deleteBtn.dataset.id;
                const characterName = deleteBtn.dataset.name;
                
                const deleted = await CharacterManager.deleteCharacter(characterId, characterName);
                if (deleted) {
                    // Удаляем из локального массива
                    this.characters = this.characters.filter(c => c.id !== characterId);
                    this.filteredCharacters = this.filteredCharacters.filter(c => c.id !== characterId);
                    
                    // Удаляем карточку из DOM
                    card.remove();
                    
                    // Обновляем статистику
                    this.updateStats();
                    
                    // Если больше нет персонажей, показываем пустое состояние
                    if (this.characters.length === 0) {
                        this.displayCharacters();
                    }
                }
            });
        }
    },

    viewCharacter(characterId) {
        window.location.href = `character-view.html?id=${characterId}`;
    },

    editCharacter(characterId) {
        window.location.href = `character-edit.html?id=${characterId}`;
    },

    clearFilters() {
        this.filters = {
            search: '',
            class: '',
            race: '',
            level: '',
            status: ''
        };

        document.getElementById('characterSearch').value = '';
        document.getElementById('characterClassFilter').value = '';
        document.getElementById('characterRaceFilter').value = '';
        document.getElementById('characterLevelFilter').value = '';
        document.getElementById('characterStatusFilter').value = '';
        document.getElementById('sortBy').value = 'updated';

        this.filterCharacters();
        this.sortCharacters();
        
        Utils.showNotification('Фильтры сброшены', 'info');
    },

    updateStats() {
        const countElement = document.getElementById('charactersCount');
        if (countElement) {
            countElement.textContent = this.characters.length;
        }
    },

    showLoader() {
        const loader = document.getElementById('charactersLoader');
        const list = document.getElementById('charactersList');
        
        if (loader) Utils.toggleElement(loader, true);
        if (list) Utils.toggleElement(list, false);
    },

    hideLoader() {
        const loader = document.getElementById('charactersLoader');
        const list = document.getElementById('charactersList');
        
        if (loader) Utils.toggleElement(loader, false);
        if (list) Utils.toggleElement(list, true);
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    CharactersList.init();
});

window.CharactersList = CharactersList;