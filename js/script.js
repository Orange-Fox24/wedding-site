'use strict';

// ===== КОНСТАНТЫ И ПЕРЕМЕННЫЕ =====
const CONFIG = {
    WEDDING_DATE: new Date('2026-02-26T14:30:00+07:00'), // Красноярское время UTC+7
    COLOR_PALETTE: ['#1A0004', '#35000A', '#4E000E', '#6B0213', '#840017'],
    SCROLL_THRESHOLD: 50, // порог для свайпа
    MUSIC_VOLUME: 0.3,
    ANIMATION_DURATION: 1000,
    DEBOUNCE_DELAY: 100
};

// DOM элементы
const elements = {
    lockWrapper: document.getElementById('lockWrapper'),
    lockCircle: document.getElementById('lockCircle'),
    lockIcon: document.getElementById('lockIcon'),
    unlockText: document.querySelector('.unlock-text'),
    bwBackground: document.getElementById('bwBackground'), // Чёрно-белый фон
    colorBackground: document.getElementById('colorBackground'), // Цветной фон
    coverTitle: document.getElementById('coverTitle'),
    hiddenContent: document.getElementById('hiddenContent'),
    weddingDate: document.querySelector('.wedding-date'),
    coupleName: document.querySelector('.couple-name'),
    scrollIndicator: document.getElementById('scrollIndicator'),
    musicPlayer: document.getElementById('musicPlayer'),
    musicToggle: document.getElementById('musicToggle'),
    musicIcon: document.getElementById('musicIcon'),
    backgroundMusic: document.getElementById('backgroundMusic'),
    sections: {
        cover: document.querySelector('.cover-section'),
        music: document.querySelector('.music-section'),
        calendar: document.querySelector('.calendar-section'),
        venue: document.querySelector('.venue-section'),
        dresscode: document.querySelector('.dresscode-section'),
        details: document.querySelector('.details-section'),
        form: document.querySelector('.form-section'),
        photo: document.querySelector('.photo-section'),
        timer: document.querySelector('.timer-section'),
        final: document.querySelector('.final-section')
    },
    timer: {
        months: document.getElementById('months'),
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    },
    highlightedDay: document.querySelector('.day.highlighted'),
    colorBoxes: document.querySelectorAll('.color-box')
};

// Состояние приложения
const state = {
    isUnlocked: false,
    isMusicPlaying: false,
    isScrolling: false,
    lastScrollTime: 0,
    touchStartY: 0,
    touchEndY: 0,
    currentSection: 'cover',
    timerInterval: null
};

// ===== УТИЛИТЫ =====
const utils = {
    // Дебаунс для оптимизации обработки событий
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Проверка видимости элемента в viewport
    isElementInViewport(el) {
        if (!el) return false;
        
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const elementHeight = rect.height;
        
        return visibleHeight > elementHeight * 0.3 && rect.left >= 0 && rect.right <= windowWidth;
    },

    // Форматирование времени (добавление ведущего нуля)
    formatTime(time) {
        return time < 10 ? `0${time}` : time.toString();
    },

    // Копирование текста в буфер обмена
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err2) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    // Показать уведомление
    showNotification(message, isError = false) {
        // Удаляем старое уведомление
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');

        // Стили уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: ${isError ? 'rgba(255, 50, 50, 0.9)' : 'rgba(132, 0, 23, 0.9)'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.5px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            text-align: center;
            max-width: 90vw;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        document.body.appendChild(notification);

        // Анимация появления
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }, 3000);
    },

    // Получение текущей видимой секции
    getCurrentVisibleSection() {
        const sections = ['cover', 'music', 'calendar', 'venue', 'dresscode', 'details', 'form', 'photo', 'timer', 'final'];
        
        for (let section of sections) {
            const element = elements.sections[section];
            if (element && this.isElementInViewport(element)) {
                return section;
            }
        }
        
        return 'cover';
    },


};

// ===== ОСНОВНАЯ ЛОГИКА =====
const app = {
    // Инициализация приложения
    init() {
        console.log('💍 Инициализация свадебного приглашения...');
        
        this.setupAccessibility();
        this.initEventListeners();
        this.initCalendar();
        this.initColorPalette();
        this.initCountdownTimer();
        this.checkFirstVisit();
        
        // Показываем скрытый контент если JS отключен
        document.documentElement.classList.remove('no-js');
        document.documentElement.classList.add('js');
        
        console.log('Приложение инициализировано');
        this.logWeddingInfo();
    },

    // Настройка доступности
    setupAccessibility() {
        // Замок
        elements.lockWrapper.setAttribute('role', 'button');
        elements.lockWrapper.setAttribute('tabindex', '0');
        elements.lockWrapper.setAttribute('aria-label', 'Разблокировать приглашение');
        
        // Кнопка музыки
        elements.musicToggle.setAttribute('aria-label', 'Включить/выключить музыку');
        
        // Фоны
        if (elements.bwBackground) {
            elements.bwBackground.setAttribute('aria-label', 'Черно-белая фотография пары');
        }
        if (elements.colorBackground) {
            elements.colorBackground.setAttribute('aria-label', 'Цветная фотография пары');
        }
        
        // Цветовые блоки
        elements.colorBoxes.forEach((box, index) => {
            const hex = box.getAttribute('title');
            box.setAttribute('role', 'button');
            box.setAttribute('tabindex', '0');
            box.setAttribute('aria-label', `Цвет свадебной палитры ${index + 1}: ${hex}. Нажмите для копирования`);
        });
        
        // Индикатор скролла
        if (elements.scrollIndicator) {
            elements.scrollIndicator.setAttribute('role', 'button');
            elements.scrollIndicator.setAttribute('tabindex', '0');
            elements.scrollIndicator.setAttribute('aria-label', 'Листайте дальше для продолжения');
        }
        
        // Подсвеченный день
        if (elements.highlightedDay) {
            elements.highlightedDay.setAttribute('aria-label', '26 февраля - день свадьбы');
        }
    },

    // Инициализация обработчиков событий
    initEventListeners() {
        // Открытие замка
        elements.lockWrapper.addEventListener('click', () => this.unlockInvitation());
        elements.lockWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.unlockInvitation();
            }
        });

        // Индикатор скролла
        if (elements.scrollIndicator) {
            elements.scrollIndicator.addEventListener('click', () => this.scrollToNextSection());
            elements.scrollIndicator.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.scrollToNextSection();
                }
            });
        }

        // Управление музыкой
        elements.musicToggle.addEventListener('click', () => this.toggleMusic());
        elements.musicToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMusic();
            }
        });

        // Скролл по клику на cover section
        elements.sections.cover.addEventListener('click', (e) => {
            if (state.isUnlocked && 
                !elements.lockWrapper.contains(e.target) && 
                !elements.scrollIndicator.contains(e.target)) {
                this.scrollToNextSection();
            }
        });

        // Управление с клавиатуры
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Обработка скролла
        window.addEventListener('scroll', utils.debounce(() => this.handleScroll(), CONFIG.DEBOUNCE_DELAY));

        // Touch события для мобильных устройств
        document.addEventListener('touchstart', (e) => {
            state.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            state.touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });

        // Обработка ошибок загрузки музыки
        if (elements.backgroundMusic) {
            elements.backgroundMusic.addEventListener('error', (e) => {
                console.error('Ошибка загрузки музыки:', e);
                elements.musicToggle.style.display = 'none';
                elements.musicPlayer.style.opacity = '0';
                elements.musicPlayer.style.pointerEvents = 'none';
                utils.showNotification('Не удалось загрузить музыку', true);
            });

            elements.backgroundMusic.addEventListener('canplaythrough', () => {
                console.log('🎵 Музыка готова к воспроизведению');
            });
        }

        // Предотвращение контекстного меню на кнопках
        [elements.lockWrapper, elements.musicToggle, elements.scrollIndicator].forEach(el => {
            if (el) {
                el.addEventListener('contextmenu', (e) => e.preventDefault());
            }
        });
    },

    // Проверка первого посещения
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('weddingInvitationVisited');
        if (!hasVisited) {
            console.log('Первое посещение сайта');
            localStorage.setItem('weddingInvitationVisited', 'true');
        }
    },

    // Открытие приглашения
    unlockInvitation() {
        if (state.isUnlocked) return;
        
        state.isUnlocked = true;
        console.log('Открытие приглашения...');
        
        // Анимация открытия замка
        elements.lockIcon.classList.add('open');
        
        // Изменение текста
        elements.unlockText.textContent = 'ПРИГЛАШЕНИЕ ОТКРЫТО!';
        elements.unlockText.style.color = '#a5001f';
        elements.unlockText.style.letterSpacing = '4px';
        elements.unlockText.style.fontWeight = '600';
        
        // Анимация смены фона: чёрно-белый → цветной
        setTimeout(() => {
            // Прячем черно-белый фон
            if (elements.bwBackground) {
                elements.bwBackground.style.opacity = '0';
            }
            
            // Показываем цветной фон
            if (elements.colorBackground) {
                elements.colorBackground.style.opacity = '1';
            }
        }, 300);
        
        // Скрытие заголовка
        setTimeout(() => {
            elements.coverTitle.style.opacity = '0';
            elements.coverTitle.style.visibility = 'hidden';
            elements.coverTitle.style.pointerEvents = 'none';
        }, 500);
        
        // Показ скрытого контента
        setTimeout(() => {
            elements.hiddenContent.classList.add('visible');
            
            // Анимация даты
            elements.weddingDate.style.animation = 'dateAppear 1s ease-out forwards';
            
            // Анимация имен
            setTimeout(() => {
                elements.coupleName.style.animation = 'namesAppear 1.2s ease-out forwards';
            }, 300);
            
            // Анимация индикатора скролла
            setTimeout(() => {
                elements.scrollIndicator.style.animation = 'indicatorAppear 1s ease-out forwards';
            }, 800);
            
        }, 800);
        
        // Скрытие замка
        setTimeout(() => {
            elements.lockWrapper.style.opacity = '0';
            elements.lockWrapper.style.transform = 'translateY(20px)';
            elements.lockWrapper.style.transition = 'all 1s ease';
            elements.lockWrapper.style.pointerEvents = 'none';
        }, 2000);
        
        // Показ и запуск музыки
        setTimeout(() => {
            this.showMusicPlayer();
            this.startBackgroundMusic();
        }, 1200);
    },

    // Показ музыкального плеера
    showMusicPlayer() {
        elements.musicPlayer.style.display = 'block';
        setTimeout(() => {
            elements.musicPlayer.style.opacity = '1';
            elements.musicPlayer.style.transform = 'translateY(0)';
        }, 100);
    },

    // Запуск фоновой музыки
    startBackgroundMusic() {
        if (!elements.backgroundMusic) return;
        
        elements.backgroundMusic.volume = CONFIG.MUSIC_VOLUME;
        
        // Попытка воспроизведения
        const playPromise = elements.backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    state.isMusicPlaying = true;
                    elements.musicIcon.classList.remove('fa-volume-up');
                    elements.musicIcon.classList.add('fa-volume-mute');
                    elements.musicToggle.title = 'Выключить музыку';
                    console.log('🎵 Музыка запущена');
                })
                .catch(error => {
                    console.log('🎵 Автовоспроизведение заблокировано');
                    elements.musicIcon.classList.remove('fa-volume-up');
                    elements.musicIcon.classList.add('fa-volume-off');
                    elements.musicToggle.title = 'Нажмите для запуска музыки';
                    utils.showNotification('Нажмите на кнопку музыки для запуска', false);
                });
        }
    },

    // Переключение музыки
    toggleMusic() {
        if (!elements.backgroundMusic) return;
        
        if (state.isMusicPlaying) {
            elements.backgroundMusic.pause();
            elements.musicIcon.classList.remove('fa-volume-mute', 'fa-volume-off');
            elements.musicIcon.classList.add('fa-volume-up');
            state.isMusicPlaying = false;
            elements.musicToggle.title = 'Включить музыку';
            console.log('Музыка выключена');
        } else {
            elements.backgroundMusic.volume = CONFIG.MUSIC_VOLUME;
            elements.backgroundMusic.play()
                .then(() => {
                    elements.musicIcon.classList.remove('fa-volume-up', 'fa-volume-off');
                    elements.musicIcon.classList.add('fa-volume-mute');
                    state.isMusicPlaying = true;
                    elements.musicToggle.title = 'Выключить музыку';
                    console.log('Музыка включена');
                })
                .catch(error => {
                    console.log('Ошибка воспроизведения:', error);
                    elements.musicIcon.classList.remove('fa-volume-up');
                    elements.musicIcon.classList.add('fa-volume-off');
                    elements.musicToggle.title = 'Ошибка воспроизведения';
                    utils.showNotification('Не удалось воспроизвести музыку', true);
                });
        }
    },

    // Скролл к следующей секции
    scrollToNextSection() {
        if (state.isScrolling) return;
        
        state.currentSection = utils.getCurrentVisibleSection();
        let targetSection;
        
        const sectionOrder = {
            'cover': 'music',
            'music': 'calendar',
            'calendar': 'venue',
            'venue': 'dresscode',
            'dresscode': 'details',
            'details': 'form',
            'form': 'photo',
            'photo': 'timer',
            'timer': 'final',
            'final': 'cover'
        };
        
        const nextSection = sectionOrder[state.currentSection];
        targetSection = elements.sections[nextSection];
        
        if (targetSection) {
            utils.smoothScrollTo(targetSection);
        }
    },

    // Обработка навигации с клавиатуры
    handleKeyboardNavigation(e) {
        // Навигация вниз
        if ((e.key === 'ArrowDown' || e.key === 'PageDown') && state.isUnlocked) {
            e.preventDefault();
            this.scrollToNextSection();
        }
        
        // Навигация вверх
        if ((e.key === 'ArrowUp' || e.key === 'PageUp') && state.isUnlocked) {
            e.preventDefault();
            this.scrollToPreviousSection();
        }
        
        // Управление музыкой
        if (e.key === ' ' && e.target === document.body) {
            e.preventDefault();
            this.toggleMusic();
        }
        
        if (e.key === 'Escape' && state.isMusicPlaying) {
            this.toggleMusic();
        }
        
        // Быстрая навигация
        if (e.key === 'Home' && state.isUnlocked) {
            e.preventDefault();
            utils.smoothScrollTo(elements.sections.cover);
        }
        
        if (e.key === 'End' && state.isUnlocked) {
            e.preventDefault();
            utils.smoothScrollTo(elements.sections.final);
        }
        
        // Копирование цвета по Enter/Space
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('color-box')) {
            e.preventDefault();
            e.target.click();
        }
    },

    // Скролл к предыдущей секции
    scrollToPreviousSection() {
        if (state.isScrolling) return;
        
        state.currentSection = utils.getCurrentVisibleSection();
        let targetSection;
        
        const sectionOrder = {
            'music': 'cover',
            'calendar': 'music',
            'venue': 'calendar',
            'dresscode': 'venue',
            'details': 'dresscode',
            'form': 'details',
            'photo': 'form',
            'timer': 'photo',
            'final': 'timer',
            'cover': 'final'
        };
        
        const prevSection = sectionOrder[state.currentSection];
        targetSection = elements.sections[prevSection];
        
        if (targetSection) {
            utils.smoothScrollTo(targetSection);
        }
    },

    // Обработка скролла для анимаций
    handleScroll() {
        const windowHeight = window.innerHeight;
        
        // Проверяем видимость каждой секции
        Object.keys(elements.sections).forEach(sectionKey => {
            const section = elements.sections[sectionKey];
            if (section) {
                const sectionTop = section.getBoundingClientRect().top;
                if (sectionTop < windowHeight * 0.75) {
                    section.classList.add('visible');
                }
            }
        });
        
        // Обновляем текущую секцию
        state.currentSection = utils.getCurrentVisibleSection();
    },

    // Обработка свайпа на мобильных устройствах
    handleSwipe() {
        const swipeThreshold = CONFIG.SCROLL_THRESHOLD;
        const diff = state.touchStartY - state.touchEndY;
        
        // Свайп вверх - следующая секция
        if (diff > swipeThreshold && state.isUnlocked) {
            this.scrollToNextSection();
        }
        
        // Свайп вниз - предыдущая секция
        if (diff < -swipeThreshold && state.isUnlocked) {
            this.scrollToPreviousSection();
        }
    },

    // Инициализация календаря
    initCalendar() {
        if (!elements.highlightedDay) return;
        
        console.log('Инициализация календаря...');
        
        // Анимация появления дней
        const days = document.querySelectorAll('.calendar-days .day');
        days.forEach((day, index) => {
            day.style.animationDelay = `${index * 0.05}s`;
            day.style.animation = 'calendarAppear 0.5s ease-out forwards';
            day.style.opacity = '0';
            
            setTimeout(() => {
                day.style.opacity = '1';
            }, index * 50);
        });
        
        // Анимация подсвеченного дня
        setTimeout(() => {
            elements.highlightedDay.style.animation = 'calendarPulse 2s infinite alternate, calendarAppear 0.5s ease-out forwards';
        }, days.length * 50);
        
        // Интерактивность для подсвеченного дня
        elements.highlightedDay.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        elements.highlightedDay.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        elements.highlightedDay.addEventListener('click', function() {
            this.style.transform = 'scale(1.15)';
            setTimeout(() => {
                this.style.transform = 'scale(1.1)';
            }, 300);
        });
        
        console.log('Календарь инициализирован');
    },

    // Инициализация цветовой палитры
    initColorPalette() {
        console.log('Инициализация цветовой палитры...');
        
        elements.colorBoxes.forEach(box => {
            box.addEventListener('click', async () => {
                const hex = box.getAttribute('title');
                
                const success = await utils.copyToClipboard(hex);
                if (success) {
                    console.log('Скопирован цвет:', hex);
                    utils.showNotification(`Скопирован цвет: ${hex}`);
                } else {
                    console.log('Ошибка копирования цвета');
                    utils.showNotification(`Цвет: ${hex} (скопируйте вручную)`, true);
                }
            });
            
            box.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    box.click();
                }
            });
            
            box.addEventListener('mouseenter', function() {
                const hex = this.getAttribute('title');
                this.setAttribute('aria-label', `Цвет ${hex}. Нажмите для копирования`);
            });
        });
        
        console.log('Цветовая палитра инициализирована');
    },

    // Инициализация таймера обратного отсчета
    initCountdownTimer() {
        console.log('Инициализация таймера...');
        
        // Добавляем классы для адаптивности
        this.setupTimerClasses();
        
        // Сразу применяем адаптацию
        this.updateTimerVisibilityOnResize();
        
        function updateTimer() {
            const now = new Date();
            const timeDiff = CONFIG.WEDDING_DATE - now;
            
            // Если время уже наступило
            if (timeDiff <= 0) {
                elements.timer.months.textContent = '00';
                elements.timer.days.textContent = '00';
                elements.timer.hours.textContent = '00';
                elements.timer.minutes.textContent = '00';
                elements.timer.seconds.textContent = '00';
                
                // Изменяем текст
                const timerText = document.querySelector('.timer-text p');
                if (timerText) {
                    timerText.textContent = 'свадьба сегодня!';
                }
                
                // Скрываем все разделители
                document.querySelectorAll('.time-separator').forEach(sep => {
                    sep.style.display = 'none';
                });
                
                return;
            }
            
            // Рассчитываем временные единицы
            const totalSeconds = Math.floor(timeDiff / 1000);
            const totalMinutes = Math.floor(totalSeconds / 60);
            const totalHours = Math.floor(totalMinutes / 60);
            const totalDays = Math.floor(totalHours / 24);
            
            // Более точный расчет месяцев
            const years = CONFIG.WEDDING_DATE.getFullYear() - now.getFullYear();
            const months = (CONFIG.WEDDING_DATE.getMonth() + (years * 12)) - now.getMonth();
            
            // Корректируем дни
            let remainingMonths = months;
            let remainingDays = totalDays;
            
            if (now.getDate() > CONFIG.WEDDING_DATE.getDate()) {
                remainingMonths = Math.max(0, months - 1);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                remainingDays = (lastDayOfMonth - now.getDate()) + CONFIG.WEDDING_DATE.getDate();
            } else {
                remainingDays = CONFIG.WEDDING_DATE.getDate() - now.getDate();
            }
            
            // Оставшееся время
            const remainingHours = totalHours % 24;
            const remainingMinutes = totalMinutes % 60;
            const remainingSeconds = totalSeconds % 60;
            
            // Обновляем элементы с анимацией
            updateWithAnimation(elements.timer.months, utils.formatTime(remainingMonths));
            updateWithAnimation(elements.timer.days, utils.formatTime(remainingDays));
            updateWithAnimation(elements.timer.hours, utils.formatTime(remainingHours));
            updateWithAnimation(elements.timer.minutes, utils.formatTime(remainingMinutes));
            updateWithAnimation(elements.timer.seconds, utils.formatTime(remainingSeconds));
            
            // Адаптивное управление отображением
            app.manageTimerVisibility(remainingMonths, remainingDays);
        }
        
        // Обновление с анимацией
        function updateWithAnimation(element, newValue) {
            if (element.textContent !== newValue) {
                element.classList.add('changing');
                element.textContent = newValue;
                
                setTimeout(() => {
                    element.classList.remove('changing');
                }, 300);
            }
        }
        
        // Инициализация таймера
        updateTimer();
        
        // Обновляем каждую секунду
        state.timerInterval = setInterval(updateTimer, 1000);
        
        // Обработка изменения размера окна
        window.addEventListener('resize', utils.debounce(() => {
            app.updateTimerVisibilityOnResize();
        }, 250));
        
        console.log('Таймер инициализирован (Красноярское время UTC+7)');
    },

    // Новая функция для настройки классов таймера
    setupTimerClasses() {
        // Добавляем классы для адаптивного скрытия
        if (elements.timer.months && elements.timer.months.parentElement) {
            elements.timer.months.parentElement.classList.add('months');
        }
        if (elements.timer.days && elements.timer.days.parentElement) {
            elements.timer.days.parentElement.classList.add('days');
        }
        if (elements.timer.hours && elements.timer.hours.parentElement) {
            elements.timer.hours.parentElement.classList.add('hours');
        }
        if (elements.timer.minutes && elements.timer.minutes.parentElement) {
            elements.timer.minutes.parentElement.classList.add('minutes');
        }
        if (elements.timer.seconds && elements.timer.seconds.parentElement) {
            elements.timer.seconds.parentElement.classList.add('seconds');
        }
        
        // Добавляем классы разделителям для адаптивного скрытия
        const separators = document.querySelectorAll('.time-separator');
        if (separators.length >= 4) {
            separators[0].classList.add('hide-on-tablet');
            separators[1].classList.add('hide-on-mobile');
            separators[2].classList.add('hide-on-small-mobile');
            separators[3].classList.add('hide-on-tablet');
        }
    },

    // Управление видимостью единиц времени
    manageTimerVisibility(months, days) {
        const width = window.innerWidth;
        
        // На больших экранах показываем всё
        if (width > 1024) {
            this.showAllTimerUnits();
            return;
        }
        
        // На планшетах скрываем секунды
        if (width > 768 && width <= 1024) {
            this.hideTimerUnit('seconds');
            this.showTimerUnit('minutes');
            this.showTimerUnit('hours');
            this.showTimerUnit('days');
            this.showTimerUnit('months');
        }
        
        // На телефонах скрываем секунды и минуты
        if (width > 480 && width <= 768) {
            this.hideTimerUnit('seconds');
            this.hideTimerUnit('minutes');
            this.showTimerUnit('hours');
            this.showTimerUnit('days');
            this.showTimerUnit('months');
        }
        
        // На маленьких телефонах скрываем секунды, минуты и часы
        if (width <= 480) {
            this.hideTimerUnit('seconds');
            this.hideTimerUnit('minutes');
            this.hideTimerUnit('hours');
            this.showTimerUnit('days');
            this.showTimerUnit('months');
        }
        
        // На очень маленьких телефонах показываем только месяцы и дни
        if (width <= 360) {
            this.hideTimerUnit('seconds');
            this.hideTimerUnit('minutes');
            this.hideTimerUnit('hours');
            this.showTimerUnit('days');
            this.showTimerUnit('months');
        }
        
        // Если осталось меньше месяца, скрываем блок месяцев
        if (months < 1 && width <= 768) {
            this.hideTimerUnit('months');
        }
        
        // Если осталось меньше дня, скрываем блок дней
        if (days < 1 && width <= 480) {
            this.hideTimerUnit('days');
        }
    },

    // Обновление видимости при изменении размера окна
    updateTimerVisibilityOnResize() {
        // Получаем текущие значения
        const months = parseInt(elements.timer.months.textContent) || 0;
        const days = parseInt(elements.timer.days.textContent) || 0;
        
        this.manageTimerVisibility(months, days);
    },

    // Вспомогательные функции для управления видимостью
    showTimerUnit(unit) {
        const element = document.querySelector(`.time-unit.${unit}`);
        const separatorBefore = this.getSeparatorBeforeUnit(unit);
        
        if (element) {
            element.style.display = 'flex';
        }
        
        if (separatorBefore) {
            separatorBefore.style.display = 'flex';
        }
    },

    hideTimerUnit(unit) {
        const element = document.querySelector(`.time-unit.${unit}`);
        const separatorBefore = this.getSeparatorBeforeUnit(unit);
        
        if (element) {
            element.style.display = 'none';
        }
        
        if (separatorBefore) {
            separatorBefore.style.display = 'none';
        }
    },

    showAllTimerUnits() {
        document.querySelectorAll('.time-unit').forEach(unit => {
            unit.style.display = 'flex';
        });
        
        document.querySelectorAll('.time-separator').forEach(sep => {
            sep.style.display = 'flex';
        });
    },

    // Получение разделителя перед единицей времени
    getSeparatorBeforeUnit(unit) {
        const units = ['months', 'days', 'hours', 'minutes', 'seconds'];
        const index = units.indexOf(unit);
        
        if (index > 0) {
            const separators = document.querySelectorAll('.time-separator');
            return separators[index - 1];
        }
        
        return null;
    },

    // Логирование информации о свадьбе
    logWeddingInfo() {
        console.log('Свадебное приглашение загружено!');
        console.log('Дата свадьбы: 26 ФЕВРАЛЯ 2026');
        console.log('Молодожены: Екатерина • Владислав');
        console.log('ЗАГС: ул. Фабричная, 3 (14:30)');
        console.log('Загородный домик: ул. Лермонтова, 6а (16:00)');
        console.log('Цветовая палитра:', CONFIG.COLOR_PALETTE.join(' → '));
        console.log('Организатор: ИЛЬЯ (Telegram)');
        console.log('Анкета гостя: подтверждение до 26.01.2026');
        console.log('Telegram группа для фото и видео');
        console.log('Таймер обратного отсчета до 26 февраля 2026');
        console.log('Финальный блок: Ждем Вас!');
        
        console.log('\n=== УПРАВЛЕНИЕ ===');
        console.log('• Нажмите на замок, чтобы открыть приглашение');
        console.log('• Кликните по стрелке или используйте колесико мыши для скролла');
        console.log('• Используйте стрелки вниз/вверх для навигации');
        console.log('• PageUp/PageDown для быстрого скролла');
        console.log('• Home/End для перехода в начало/конец');
        console.log('• Нажмите пробел для управления музыкой');
        console.log('• Нажмите Escape для выключения музыки');
        console.log('• На мобильных: свайп вверх/вниз для навигации');
        
        console.log('\n=== БЛОКИ ===');
        console.log('1. Приветствие с замком (чёрно-белое → цветное)');
        console.log('2. Музыка и приветствие');
        console.log('3. Календарь с датой');
        console.log('4. Места проведения');
        console.log('5. Dress Code и палитра');
        console.log('6. Подарки и организатор');
        console.log('7. Анкета гостя');
        console.log('8. Telegram для фото');
        console.log('9. Таймер обратного отсчета (адаптивный)');
        console.log('10. Финальное обращение (всегда сверху)');
        
        console.log('\n С наилучшими пожеланиями, Владислав и Екатерина ');
    }
};

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    // Задержка для полной загрузки DOM
    setTimeout(() => {
        app.init();
    }, 100);
});

// ===== SERVICE WORKER (опционально) для PWA =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('ServiceWorker зарегистрирован:', registration.scope);
        }).catch(error => {
            console.log('Ошибка регистрации ServiceWorker:', error);
        });
    });
}

// ===== ОБРАБОТКА ОШИБОК =====
window.addEventListener('error', (e) => {
    console.error('Произошла ошибка:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Необработанное обещание:', e.reason);
});

// Экспорт для тестирования 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, utils, CONFIG };
}