// ===== ОСНОВНАЯ ЛОГИКА ПРИГЛАШЕНИЯ =====

document.addEventListener('DOMContentLoaded', function() {
    // ===== ПЕРЕМЕННЫЕ =====
    const lockWrapper = document.getElementById('lockWrapper');
    const lockCircle = document.getElementById('lockCircle');
    const lockIcon = document.getElementById('lockIcon');
    const unlockText = document.querySelector('.unlock-text');
    const coverBackground = document.getElementById('coverBackground');
    const hiddenContent = document.getElementById('hiddenContent');
    const musicToggle = document.getElementById('musicToggle');
    const musicIcon = document.getElementById('musicIcon');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicPlayer = document.querySelector('.music-player');
    
    let isUnlocked = false;
    let isMusicPlaying = false;
    
    // ===== ПОКАЗАТЬ ИКОНКУ МУЗЫКИ ВЕРХНЕМ ПРАВОМ УГЛУ =====
    function showMusicPlayer() {
        musicPlayer.style.display = 'block';
        setTimeout(() => {
            musicPlayer.style.opacity = '1';
            musicPlayer.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // ===== ФУНКЦИЯ ОТКРЫТИЯ ЗАМКА =====
    function unlockInvitation() {
        if (isUnlocked) return;
        
        isUnlocked = true;
        
        // 1. Анимация открытия замка
        lockIcon.classList.add('open');
        
        // 2. Изменение текста
        unlockText.textContent = 'приглашение открыто!';
        unlockText.style.color = '#D4AF37';
        unlockText.style.letterSpacing = '3px';
        
        // 3. Фон становится цветным
        setTimeout(() => {
            coverBackground.classList.add('colorized');
        }, 300);
        
        // 4. Показываем скрытый контент
        setTimeout(() => {
            hiddenContent.classList.add('visible');
            
            // Анимация появления элементов
            const weddingDate = document.querySelector('.wedding-date');
            const coupleName = document.querySelector('.couple-name');
            const scrollIndicator = document.querySelector('.scroll-indicator');
            
            weddingDate.style.animation = 'fadeInUp 0.8s ease-out forwards';
            coupleName.style.animation = 'fadeInUp 0.8s ease-out 0.3s forwards';
            scrollIndicator.style.animation = 'fadeIn 1s ease-out 0.6s forwards';
            
        }, 800);
        
        // 5. Плавное скрытие замка
        setTimeout(() => {
            lockWrapper.style.opacity = '0';
            lockWrapper.style.transform = 'translateY(20px)';
            lockWrapper.style.transition = 'all 1s ease';
            lockWrapper.style.pointerEvents = 'none';
        }, 2000);
        
        // 6. ПОКАЗЫВАЕМ ИКОНКУ МУЗЫКИ И ЗАПУСКАЕМ МУЗЫКУ
        setTimeout(() => {
            showMusicPlayer();
            startBackgroundMusic();
        }, 1200);
    }
    
    // ===== ЗАПУСК ФОНОВОЙ МУЗЫКИ =====
    function startBackgroundMusic() {
        if (backgroundMusic) {
            // Устанавливаем громкость (0.3 = 30%)
            backgroundMusic.volume = 0.3;
            
            // Пытаемся запустить автоматически
            const playPromise = backgroundMusic.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Музыка успешно запущена
                        isMusicPlaying = true;
                        musicIcon.classList.remove('fa-volume-up');
                        musicIcon.classList.add('fa-volume-mute');
                        console.log('Музыка запущена автоматически');
                    })
                    .catch(error => {
                        // Автозапуск заблокирован браузером
                        console.log('Автовоспроизведение заблокировано. Нужен клик пользователя.');
                        musicIcon.classList.remove('fa-volume-up');
                        musicIcon.classList.add('fa-volume-off');
                        
                        // Показываем подсказку
                        musicToggle.title = 'Нажмите для запуска музыки';
                    });
            }
        }
    }
    
    // ===== ПЕРЕКЛЮЧЕНИЕ МУЗЫКИ (ВКЛ/ВЫКЛ) =====
    function toggleMusic() {
        if (!backgroundMusic) return;
        
        if (isMusicPlaying) {
            // Выключаем музыку
            backgroundMusic.pause();
            musicIcon.classList.remove('fa-volume-mute', 'fa-volume-off');
            musicIcon.classList.add('fa-volume-up');
            isMusicPlaying = false;
        } else {
            // Включаем музыку
            backgroundMusic.volume = 0.3;
            backgroundMusic.play()
                .then(() => {
                    musicIcon.classList.remove('fa-volume-up', 'fa-volume-off');
                    musicIcon.classList.add('fa-volume-mute');
                    isMusicPlaying = true;
                })
                .catch(error => {
                    console.log('Ошибка воспроизведения:', error);
                });
        }
    }
    
    // ===== СКРОЛЛ К СЛЕДУЮЩЕМУ БЛОКУ =====
    function scrollToNextSection() {
        const musicSection = document.querySelector('.music-section');
        if (musicSection) {
            musicSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
    
    // Клик по замку
    lockWrapper.addEventListener('click', unlockInvitation);
    
    // Клик по кругу замка
    lockCircle.addEventListener('click', unlockInvitation);
    
    // Клик по индикатору скролла
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', scrollToNextSection);
    }
    
    // Управление музыкой
    musicToggle.addEventListener('click', toggleMusic);
    
    // Клик по всей первой секции после открытия
    const coverSection = document.querySelector('.cover-section');
    coverSection.addEventListener('click', function(e) {
        if (isUnlocked && 
            !lockWrapper.contains(e.target) && 
            !scrollIndicator.contains(e.target)) {
            scrollToNextSection();
        }
    });
    
    // ===== ИНИЦИАЛИЗАЦИЯ =====
    console.log('Свадебное приглашение загружено! 🎉');
    console.log('Дата свадьбы: 26 февраля 2026');
    console.log('Молодожены: Екатерина & Владислав');
    
    // Предзагрузка музыки для более быстрого старта
    if (backgroundMusic) {
        backgroundMusic.preload = 'auto';
    }
});