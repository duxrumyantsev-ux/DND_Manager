// firebase-config.js - Упрощенная конфигурация Firebase

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB9qmo7LNB4z4eq9VipDo5NuvVqwlD10ww",
    authDomain: "dnd-manager-3e79e.firebaseapp.com",
    databaseURL: "https://dnd-manager-3e79e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dnd-manager-3e79e",
    storageBucket: "dnd-manager-3e79e.firebasestorage.app",
    messagingSenderId: "758021913982",
    appId: "1:758021913982:web:be9be6802925f2e135c72f"
};

// Глобальные переменные
let app = null;
let db = null;
let isInitialized = false;

// Основная функция инициализации Firebase
async function initializeFirebase() {
    if (isInitialized) {
        return { app, db };
    }

    try {
        console.log("🔄 Инициализация Firebase...");
        
        // Проверяем, загружены ли скрипты Firebase
        if (typeof firebase === 'undefined') {
            console.error("❌ Firebase SDK не загружен");
            return null;
        }

        // Проверяем, не инициализирован ли Firebase уже
        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase приложение инициализировано");
        } else {
            app = firebase.app();
            console.log("ℹ️ Используем существующее приложение Firebase");
        }

        db = firebase.database();
        isInitialized = true;
        
        console.log("✅ Firebase Database готов к использованию");
        return { app, db };
        
    } catch (error) {
        console.error("❌ Ошибка инициализации Firebase:", error);
        return null;
    }
}

// Функция проверки подключения
async function checkConnection() {
    try {
        if (!isInitialized) {
            await initializeFirebase();
        }
        
        // Пробуем несколько раз для надежности
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const testRef = db.ref('.info/connected');
                
                const connected = await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.log(`⏱️ Таймаут проверки подключения (попытка ${attempt})`);
                        resolve(false);
                    }, 1500);
                    
                    testRef.once('value', (snapshot) => {
                        clearTimeout(timeout);
                        const connected = snapshot.val() === true;
                        resolve(connected);
                    }, (error) => {
                        clearTimeout(timeout);
                        console.error(`❌ Ошибка проверки подключения (попытка ${attempt}):`, error);
                        resolve(false);
                    });
                });
                
                if (connected) {
                    console.log(`✅ Подключение к Firebase установлено (попытка ${attempt})`);
                    return true;
                }
                
                if (attempt < 3) {
                    console.log(`🔄 Повторная попытка подключения... (${attempt + 1}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
            } catch (error) {
                console.error(`❌ Ошибка в checkConnection (попытка ${attempt}):`, error);
            }
        }
        
        console.log("❌ Не удалось установить подключение к Firebase");
        return false;
        
    } catch (error) {
        console.error("❌ Критическая ошибка в checkConnection:", error);
        return false;
    }
}

// Функция для работы с двойной вложенностью (основная)
async function getDoubleNestedDataFunction(mainPath) {
    try {
        if (!isInitialized) {
            await initializeFirebase();
        }

        const isConnected = await checkConnection();
        if (!isConnected) {
            console.log(`⚠️ Нет подключения для двойной вложенности: ${mainPath}`);
            return null;
        }

        // Путь с двойной вложенностью
        const path = `${mainPath}/${mainPath}`;
        console.log(`🔄 Загрузка двойной вложенности: ${path}`);
        
        const snapshot = await db.ref(path).once('value');
        const data = snapshot.exists() ? snapshot.val() : null;
        
        if (!data || typeof data !== 'object') {
            console.log(`📭 Нет данных по пути: ${path}`);
            return null;
        }
        
        // Преобразуем объект в массив
        const result = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        console.log(`✅ Загружено ${result.length} записей из ${path}`);
        
        return result;
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки двойной вложенности ${mainPath}:`, error);
        return null;
    }
}

// Функция для получения всех данных по определенному критерию
async function getDataByFieldValue(mainPath, fieldName, fieldValue) {
    try {
        if (!isInitialized) {
            await initializeFirebase();
        }

        const isConnected = await checkConnection();
        if (!isConnected) {
            console.log(`⚠️ Нет подключения для фильтрации: ${mainPath} где ${fieldName}=${fieldValue}`);
            return null;
        }

        // Загружаем все данные
        const allData = await getDoubleNestedDataFunction(mainPath);
        if (!allData) {
            return [];
        }
        
        // Фильтруем по значению поля
        const filtered = allData.filter(item => item[fieldName] === fieldValue);
        console.log(`✅ Найдено ${filtered.length} записей где ${fieldName}=${fieldValue}`);
        
        return filtered;
        
    } catch (error) {
        console.error(`❌ Ошибка фильтрации ${mainPath} по ${fieldName}=${fieldValue}:`, error);
        return null;
    }
}

// Объект DB для работы с базой данных
const DB = {
    // Проверка подключения
    async checkConnection() {
        return await checkConnection();
    },

    // Получение данных
    async getData(path) {
        try {
            if (!isInitialized) {
                await initializeFirebase();
            }

            const isConnected = await this.checkConnection();
            if (!isConnected) {
                console.log(`⚠️ Нет подключения, пытаемся получить локальные данные для: ${path}`);
                return this.getLocalFallback(path);
            }

            const snapshot = await db.ref(path).once('value');
            const data = snapshot.exists() ? snapshot.val() : null;
            
            // Сохраняем в локальное хранилище как fallback
            if (data) {
                this.saveLocalFallback(path, data);
            }
            
            return data;
            
        } catch (error) {
            console.error(`❌ Ошибка получения данных из ${path}:`, error);
            return this.getLocalFallback(path);
        }
    },

    // Получение данных в виде массива
    async getArrayData(path) {
        try {
            const data = await this.getData(path);
            
            if (!data || typeof data !== 'object') {
                console.log(`📭 Нет данных для пути: ${path}`);
                return [];
            }
            
            // Обычное преобразование объекта в массив
            const result = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            
            console.log(`✅ Преобразовано ${result.length} записей из ${path}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Ошибка получения массива из ${path}:`, error);
            return this.getArrayLocalFallback(path);
        }
    },

    // Функция для двойной вложенности (универсальная)
    async getDoubleNestedData(mainPath) {
        return await getDoubleNestedDataFunction(mainPath);
    },

    // Функция для получения данных по значению поля
    async getDataByFieldValue(mainPath, fieldName, fieldValue) {
        return await getDataByFieldValue(mainPath, fieldName, fieldValue);
    },

    // Сохранение данных
    async saveData(path, data) {
        try {
            if (!isInitialized) {
                await initializeFirebase();
            }

            const isConnected = await this.checkConnection();
            
            if (isConnected) {
                await db.ref(path).set(data);
                console.log(`✅ Данные сохранены в Firebase: ${path}`);
            }
            
            // Всегда сохраняем локально как fallback
            this.saveLocalFallback(path, data);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения данных в ${path}:`, error);
            this.saveLocalFallback(path, data);
            return false;
        }
    },

    // Обновление данных
    async updateData(path, data) {
        try {
            if (!isInitialized) {
                await initializeFirebase();
            }

            const isConnected = await this.checkConnection();
            
            if (isConnected) {
                await db.ref(path).update(data);
                console.log(`✅ Данные обновлены в Firebase: ${path}`);
            }
            
            // Обновляем локальные данные
            this.updateLocalFallback(path, data);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка обновления данных в ${path}:`, error);
            this.updateLocalFallback(path, data);
            return false;
        }
    },

    // Удаление данных
    async deleteData(path) {
        try {
            if (!isInitialized) {
                await initializeFirebase();
            }

            const isConnected = await this.checkConnection();
            
            if (isConnected) {
                await db.ref(path).remove();
                console.log(`✅ Данные удалены из Firebase: ${path}`);
            }
            
            // Удаляем локальные данные
            this.deleteLocalFallback(path);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка удаления данных из ${path}:`, error);
            this.deleteLocalFallback(path);
            return false;
        }
    },

    // Локальное хранилище (fallback)
    saveLocalFallback(path, data) {
        try {
            localStorage.setItem(`firebase-fallback-${path}`, JSON.stringify(data));
        } catch (error) {
            console.error(`❌ Ошибка сохранения в localStorage: ${path}`, error);
        }
    },

    getLocalFallback(path) {
        try {
            const data = localStorage.getItem(`firebase-fallback-${path}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ Ошибка получения из localStorage: ${path}`, error);
            return null;
        }
    },

    getArrayLocalFallback(path) {
        try {
            const data = this.getLocalFallback(path);
            if (!data || typeof data !== 'object') {
                return [];
            }
            
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } catch (error) {
            console.error(`❌ Ошибка получения массива из localStorage: ${path}`, error);
            return [];
        }
    },

    updateLocalFallback(path, data) {
        try {
            const existing = this.getLocalFallback(path) || {};
            localStorage.setItem(`firebase-fallback-${path}`, JSON.stringify({
                ...existing,
                ...data
            }));
        } catch (error) {
            console.error(`❌ Ошибка обновления localStorage: ${path}`, error);
        }
    },

    deleteLocalFallback(path) {
        try {
            localStorage.removeItem(`firebase-fallback-${path}`);
        } catch (error) {
            console.error(`❌ Ошибка удаления из localStorage: ${path}`, error);
        }
    }
};

// Функция для исследования структуры БД
window.exploreFirebaseStructure = async function() {
    console.log("🔍 Исследование структуры Firebase БД...");
    
    try {
        await initializeFirebase();
        const isConnected = await checkConnection();
        
        if (!isConnected) {
            console.log("❌ Нет подключения к Firebase");
            return;
        }
        
        // Проверяем основные пути
        const pathsToCheck = [
            'races',
            'classes', 
            'spells',
            'rules',
            'feats',
            'backgrounds',
            'subclasses'
        ];
        
        for (const path of pathsToCheck) {
            console.log(`\n--- Проверка: ${path} ---`);
            
            // Проверяем корневой путь
            const rootSnapshot = await db.ref(path).once('value');
            const rootData = rootSnapshot.exists() ? rootSnapshot.val() : null;
            
            if (rootData) {
                console.log(`✅ ${path} существует`);
                console.log(`   Тип: ${typeof rootData}`);
                console.log(`   Ключи первого уровня:`, Object.keys(rootData));
                
                // Проверяем вложенность
                if (rootData[path] && typeof rootData[path] === 'object') {
                    console.log(`   🔍 Обнаружена двойная вложенность: ${path}/${path}`);
                    const nestedKeys = Object.keys(rootData[path]);
                    console.log(`   Количество записей:`, nestedKeys.length);
                    
                    // Проверяем первую запись
                    const firstKey = nestedKeys[0];
                    if (firstKey) {
                        console.log(`   Пример записи (${firstKey}):`, {
                            keys: Object.keys(rootData[path][firstKey]),
                            sample: Object.keys(rootData[path][firstKey]).reduce((acc, key) => {
                                const val = rootData[path][firstKey][key];
                                if (typeof val === 'string' && val.length < 50) {
                                    acc[key] = val;
                                } else if (typeof val === 'number' || typeof val === 'boolean') {
                                    acc[key] = val;
                                } else if (Array.isArray(val) && val.length < 3) {
                                    acc[key] = val;
                                }
                                return acc;
                            }, {})
                        });
                    }
                } else {
                    console.log(`   ℹ️ Нет двойной вложенности, проверяем напрямую`);
                }
            } else {
                console.log(`❌ ${path} не существует или пустой`);
            }
            
            // Проверяем путь с двойной вложенностью
            const doublePath = `${path}/${path}`;
            const doubleSnapshot = await db.ref(doublePath).once('value');
            const doubleData = doubleSnapshot.exists() ? doubleSnapshot.val() : null;
            
            if (doubleData) {
                console.log(`✅ ${doublePath} существует напрямую`);
                const keys = Object.keys(doubleData);
                console.log(`   Количество записей:`, keys.length);
                
                // Показываем пример записи
                const firstKey = keys[0];
                if (firstKey) {
                    console.log(`   Пример записи (${firstKey}):`, {
                        keys: Object.keys(doubleData[firstKey]),
                        sample: Object.keys(doubleData[firstKey]).reduce((acc, key) => {
                            const val = doubleData[firstKey][key];
                            if (typeof val === 'string' && val.length < 50) {
                                acc[key] = val;
                            } else if (typeof val === 'number' || typeof val === 'boolean') {
                                acc[key] = val;
                            } else if (Array.isArray(val) && val.length < 3) {
                                acc[key] = val;
                            }
                            return acc;
                        }, {})
                    });
                }
            }
        }
        
        console.log("\n🎯 РЕКОМЕНДАЦИЯ ПО СТРУКТУРЕ:");
        console.log("Для загрузки данных используйте window.DB.getDoubleNestedData('название_таблицы')");
        console.log("Пример: window.DB.getDoubleNestedData('classes') загрузит все классы");
        console.log("Пример: window.DB.getDoubleNestedData('subclasses') загрузит все подклассы");
        
    } catch (error) {
        console.error("❌ Ошибка исследования структуры:", error);
    }
};

// Универсальная функция для загрузки данных
window.getUniversalData = async function(path) {
    try {
        console.log(`🌐 Универсальная загрузка: ${path}`);
        
        if (!window.DB) {
            console.error("❌ DB не доступен");
            return [];
        }
        
        // Вариант 1: Двойная вложенность
        const doubleData = await window.DB.getDoubleNestedData(path);
        if (doubleData && doubleData.length > 0) {
            console.log(`✅ Данные загружены из двойной вложенности: ${doubleData.length}`);
            return doubleData;
        }
        
        // Вариант 2: Обычная загрузка
        const normalData = await window.DB.getArrayData(path);
        if (normalData && normalData.length > 0) {
            console.log(`✅ Данные загружены обычным способом: ${normalData.length}`);
            return normalData;
        }
        
        // Вариант 3: Локальные данные
        const localData = await window.DB.getArrayLocalFallback(path);
        if (localData && localData.length > 0) {
            console.log(`📁 Используем локальные данные: ${localData.length}`);
            return localData;
        }
        
        console.log(`📭 Нет данных для: ${path}`);
        return [];
        
    } catch (error) {
        console.error(`❌ Ошибка универсальной загрузки ${path}:`, error);
        return [];
    }
};

// Экспортируем для использования
window.DB = DB;
window.firebaseDb = db;
window.firebaseApp = app;

// Функция ожидания готовности Firebase (для синхронизации загрузки)
window.waitForFirebase = function(callback) {
    const checkReady = () => {
        if (isInitialized) {
            callback();
        } else {
            setTimeout(checkReady, 100);
        }
    };
    checkReady();
};

// Автоматически инициализируем при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Начало инициализации приложения...");
    
    try {
        // Инициализируем Firebase
        await initializeFirebase();
        
        // Проверяем подключение (но не блокируем загрузку)
        setTimeout(async () => {
            const isConnected = await checkConnection();
            if (isConnected) {
                console.log("🎉 Firebase готов к работе!");
            }
        }, 500);
        
    } catch (error) {
        console.error("⚠️ Ошибка при запуске приложения:", error);
    }
});

console.log("📦 Firebase конфигурация загружена");

window.getNestedPathData = async function(mainPath) {
    try {
        console.log(`🔄 Получение данных по вложенному пути: ${mainPath}`);
        
        if (!window.DB) {
            console.error("❌ DB не доступен");
            return [];
        }
        
        // Вариант 1: Попробовать получить данные по пути mainPath/mainPath
        const doublePath = `${mainPath}/${mainPath}`;
        const doubleData = await window.DB.getData(doublePath);
        
        if (doubleData && typeof doubleData === 'object' && Object.keys(doubleData).length > 0) {
            console.log(`✅ Данные найдены по вложенному пути: ${doublePath}`);
            // Преобразуем объект в массив
            const result = Object.keys(doubleData).map(key => ({
                id: key,
                ...doubleData[key]
            }));
            console.log(`📊 Преобразовано записей: ${result.length}`);
            return result;
        }
        
        // Вариант 2: Попробовать получить данные напрямую по mainPath
        const directData = await window.DB.getArrayData(mainPath);
        if (directData && directData.length > 0) {
            console.log(`✅ Данные найдены по прямому пути: ${mainPath}`);
            return directData;
        }
        
        // Вариант 3: Локальные данные
        const localData = window.DB.getArrayLocalFallback(mainPath);
        if (localData && localData.length > 0) {
            console.log(`📁 Используем локальные данные: ${localData.length}`);
            return localData;
        }
        
        console.log(`📭 Нет данных для: ${mainPath}`);
        return [];
        
    } catch (error) {
        console.error(`❌ Ошибка получения вложенных данных ${mainPath}:`, error);
        return [];
    }
};

// Специальная функция для вашей структуры Firebase (mainPath/mainPath)
window.getFirebaseNestedData = async function(mainPath) {
    console.log(`🔄 Загрузка данных Firebase: ${mainPath}/${mainPath}`);
    
    try {
        // Ждем готовности Firebase
        if (window.waitForFirebase) {
            await new Promise((resolve) => {
                window.waitForFirebase(resolve);
            });
        }
        
        if (!window.DB) {
            console.error("❌ DB не доступен");
            return [];
        }
        
        // Вариант 1: Прямой путь mainPath/mainPath (ваша структура)
        const doublePath = `${mainPath}/${mainPath}`;
        console.log(`📡 Пробуем загрузить: ${doublePath}`);
        
        const doubleData = await window.DB.getData(doublePath);
        console.log(`📊 Результат загрузки ${doublePath}:`, doubleData ? `Объект с ${Object.keys(doubleData).length} ключами` : 'нет данных');
        
        if (doubleData && typeof doubleData === 'object' && Object.keys(doubleData).length > 0) {
            // Преобразуем объект в массив
            const result = Object.keys(doubleData).map(key => {
                const item = doubleData[key];
                return {
                    id: key,
                    ...item
                };
            });
            
            console.log(`✅ Данные загружены из ${doublePath}: ${result.length} записей`);
            
            // Отладочная информация
            if (result.length > 0) {
                console.log(`🔍 Пример первой записи ${mainPath}:`, {
                    id: result[0].id,
                    name: result[0].name || result[0].title || 'Без названия',
                    keys: Object.keys(result[0]).slice(0, 5)
                });
            }
            
            return result;
        }
        
        // Вариант 2: Прямой путь mainPath
        console.log(`📡 Пробуем загрузить напрямую: ${mainPath}`);
        const directData = await window.DB.getArrayData(mainPath);
        
        if (directData && directData.length > 0) {
            console.log(`✅ Данные загружены из ${mainPath}: ${directData.length} записей`);
            return directData;
        }
        
        // Вариант 3: Локальные данные
        const localData = window.DB.getArrayLocalFallback(mainPath);
        if (localData && localData.length > 0) {
            console.log(`📁 Используем локальные данные: ${localData.length} записей`);
            return localData;
        }
        
        console.log(`📭 Нет данных для: ${mainPath}`);
        return [];
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки данных ${mainPath}:`, error);
        return [];
    }
};

// Автоматически предлагаем исследовать структуру
setTimeout(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log("Для исследования структуры БД введите: exploreFirebaseStructure()");
    }
}, 5000);