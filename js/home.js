// home.js - Скрипты для главной страницы

const Home = {
    init() {
        this.loadStatistics();
        this.initActionCards();
        Utils.logAction('Главная страница инициализирована');
    },

    // Загрузка статистики
    async loadStatistics() {
        try {
            // Здесь можно загрузить статистику из БД
            const characters = CharacterStorage.loadCharacters();
            const statsElement = document.getElementById('statsInfo');
            
            if (statsElement) {
                statsElement.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${characters.length}</div>
                            <div class="stat-label">Персонажей</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${characters.filter(c => c.level >= 5).length}</div>
                            <div class="stat-label">Уровень 5+</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${new Set(characters.map(c => c.class)).size}</div>
                            <div class="stat-label">Классов</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    },

    // Инициализация карточек действий
    initActionCards() {
        const actionCards = document.querySelectorAll('.action-card');
        
        actionCards.forEach(card => {
            card.addEventListener('click', () => {
                Utils.logAction(`Переход к: ${card.querySelector('h3').textContent}`);
            });
        });
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    Home.init();
});