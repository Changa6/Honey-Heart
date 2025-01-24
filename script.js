class HeartGame {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initializeElements();
        this.initializeGameState();
        this.setupEventListeners();
        this.updateLives();
        this.lastTime = 0;
    }

    initializeElements() {
        this.gameArea = document.getElementById('gameArea');
        this.player = document.getElementById('player');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives-container');
        this.highScoreElement = document.getElementById('highScore');
        this.startButton = document.getElementById('startButton');
        this.restartButton = document.getElementById('restartButton');
        this.gameOverModal = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.finalHighScoreElement = document.getElementById('finalHighScore');
        
        // Powerup buttons
        this.shieldBtn = document.getElementById('shieldPowerup');
        this.magnetBtn = document.getElementById('magnetPowerup');
        this.slowBtn = document.getElementById('slowPowerup');

        if (!this.gameArea || !this.player || !this.startButton) {
            console.error('Required game elements not found!');
            return;
        }

        // Set initial player position
        this.player.textContent = '🐝';
        this.player.style.left = '50%';
        this.player.style.transform = 'translateX(-50%)';
        
        // Store game area bounds
        this.updateGameBounds();
        window.addEventListener('resize', () => this.updateGameBounds());
    }

    initializeGameState() {
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.combo = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.gameActive = false;
        this.hearts = [];
        this.obstacles = [];
        this.powerups = {
            shield: { active: false, duration: 5000 },
            magnet: { active: false, duration: 8000 },
            slow: { active: false, duration: 6000 }
        };
        this.updateScore(0);
        this.lastMouseX = null;
    }

    startGame() {
        if (!this.gameArea || !this.player) return;
        
        // Reset game state
        this.gameActive = true;
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        
        // Update UI
        this.updateScore();
        this.updateLives();
        
        // Show player
        this.player.classList.add('active');
        
        // Hide start screen
        const startScreen = document.querySelector('.start-screen');
        if (startScreen) {
            startScreen.classList.add('hidden');
        }
        
        // Clear any existing items
        this.clearItems();
        
        // Start spawning items
        this.spawnLoop();
        
        // Reset power-ups
        this.resetPowerups();
        
        this.lastTime = performance.now();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    spawnLoop() {
        if (!this.gameActive) return;
        
        this.spawnHeart();
        if (Math.random() < 0.2) {
            this.spawnObstacle();
        }

        const spawnDelay = this.powerups.slow.active ? 1500 : 1000;
        setTimeout(() => this.spawnLoop(), spawnDelay);
    }

    spawnHeart() {
        const heart = document.createElement('div');
        heart.className = 'heart falling';
        
        const isSpecial = Math.random() < 0.2;
        heart.textContent = isSpecial ? '💝' : '🍯';
        heart.dataset.value = isSpecial ? '20' : '10';
        
        heart.style.left = Math.random() * (this.gameArea.offsetWidth - 20) + 'px';
        heart.style.top = '-20px';
        
        const duration = this.powerups.slow.active ? '4s' : '3s';
        heart.style.animationDuration = duration;
        
        this.gameArea.appendChild(heart);
        this.hearts.push(heart);

        heart.addEventListener('animationend', () => {
            if (this.hearts.includes(heart)) {
                this.hearts = this.hearts.filter(h => h !== heart);
                heart.remove();
                if (!this.powerups.shield.active) {
                    this.loseLife();
                }
            }
        });
    }

    spawnObstacle() {
        const obstacle = document.createElement('div');
        obstacle.className = 'heart falling';
        obstacle.textContent = '🕷️';
        
        obstacle.style.left = Math.random() * (this.gameArea.offsetWidth - 20) + 'px';
        obstacle.style.top = '-20px';
        
        const duration = this.powerups.slow.active ? '4s' : '3s';
        obstacle.style.animationDuration = duration;
        
        this.gameArea.appendChild(obstacle);
        this.obstacles.push(obstacle);

        obstacle.addEventListener('animationend', () => {
            if (this.obstacles.includes(obstacle)) {
                this.obstacles = this.obstacles.filter(o => o !== obstacle);
                obstacle.remove();
            }
        });
    }

    gameLoop(currentTime) {
        if (!this.gameActive) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.checkCollisions();
        
        if (this.powerups.magnet.active) {
            this.updateHeartPositions();
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateHeartPositions() {
        const playerRect = this.player.getBoundingClientRect();
        const playerCenter = {
            x: playerRect.left + playerRect.width / 2,
            y: playerRect.top + playerRect.height / 2
        };

        this.hearts.forEach(heart => {
            const heartRect = heart.getBoundingClientRect();
            const heartCenter = {
                x: heartRect.left + heartRect.width / 2,
                y: heartRect.top + heartRect.height / 2
            };

            const dx = playerCenter.x - heartCenter.x;
            const dy = playerCenter.y - heartCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                const angle = Math.atan2(dy, dx);
                const speed = 5;
                const currentTransform = new DOMMatrix(getComputedStyle(heart).transform);
                
                heart.style.transform = `
                    translate(
                        ${currentTransform.e + Math.cos(angle) * speed}px,
                        ${currentTransform.f + Math.sin(angle) * speed}px
                    )
                `;
            }
        });
    }

    checkCollisions() {
        const playerRect = this.player.getBoundingClientRect();

        this.hearts.forEach(heart => {
            const heartRect = heart.getBoundingClientRect();
            if (this.isColliding(playerRect, heartRect)) {
                this.hearts = this.hearts.filter(h => h !== heart);
                heart.remove();
                const points = parseInt(heart.dataset.value);
                this.updateScore(points);
            }
        });

        this.obstacles.forEach(obstacle => {
            const obstacleRect = obstacle.getBoundingClientRect();
            if (this.isColliding(playerRect, obstacleRect)) {
                this.obstacles = this.obstacles.filter(o => o !== obstacle);
                obstacle.remove();
                if (!this.powerups.shield.active) {
                    this.loseLife();
                }
            }
        });
    }

    isColliding(rect1, rect2) {
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }

    updateScore(points) {
        if (points > 0) {
            this.combo++;
            const comboBonus = 5 * (this.combo - 1);
            points += comboBonus;
        }
        
        this.score += points;
        this.scoreElement.textContent = this.score;
    }

    updateLives() {
        if (!this.livesElement) return;
        const hearts = '❤️'.repeat(this.lives);
        this.livesElement.innerHTML = hearts;
    }

    loseLife() {
        if (this.powerups.shield.active) return;
        
        this.lives = Math.max(0, this.lives - 1);
        this.updateLives();
        
        if (this.lives <= 0) {
            this.endGame();
        } else {
            // Visual feedback when losing a life
            if (this.player) {
                this.player.style.opacity = '0.5';
                setTimeout(() => {
                    this.player.style.opacity = '1';
                }, 200);
            }
        }
    }

    gainLife() {
        if (this.lives < this.maxLives) {
            this.lives++;
            this.updateLives();
            // Visual feedback when gaining a life
            if (this.livesElement) {
                this.livesElement.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.livesElement.style.transform = '';
                }, 200);
            }
        }
    }

    activatePowerup(type) {
        if (!this.gameActive) return;

        const powerup = this.powerups[type];
        if (powerup.active) return;

        powerup.active = true;
        const btn = this[`${type}Btn`];
        btn.disabled = true;
        btn.classList.add('active');

        setTimeout(() => {
            powerup.active = false;
            btn.disabled = false;
            btn.classList.remove('active');
        }, powerup.duration);
    }

    endGame() {
        this.gameActive = false;
        
        // Show start screen
        const startScreen = document.querySelector('.start-screen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
        }
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            if (this.highScoreElement) {
                this.highScoreElement.textContent = this.highScore;
            }
        }
        
        // Show game over modal
        if (this.gameOverModal) {
            const finalScore = this.gameOverModal.querySelector('.final-score');
            if (finalScore) {
                finalScore.textContent = this.score;
            }
            this.gameOverModal.classList.remove('hidden');
        }
        
        // Hide player
        if (this.player) {
            this.player.classList.remove('active');
        }
        
        // Clear all items
        this.clearItems();
        
        // Reset power-ups
        this.resetPowerups();
    }

    clearItems() {
        this.hearts.forEach(heart => heart.remove());
        this.obstacles.forEach(obstacle => obstacle.remove());
        this.hearts = [];
        this.obstacles = [];
    }

    resetPowerups() {
        Object.keys(this.powerups).forEach(type => {
            this.powerups[type].active = false;
            const btn = this[`${type}Btn`];
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('active');
            }
        });
    }

    setupEventListeners() {
        if (!this.gameArea || !this.startButton) return;

        // Touch handling
        let touchStartX = null;
        let lastTouchX = null;
        let lastMoveTime = 0;
        const moveThrottle = 1000 / 60;

        const handleMove = (clientX) => {
            if (!this.gameActive) return;
            
            const now = performance.now();
            if (now - lastMoveTime < moveThrottle) return;
            lastMoveTime = now;

            const rect = this.gameArea.getBoundingClientRect();
            const x = clientX - rect.left;
            const newX = Math.max(0, Math.min(x - this.playerWidth / 2, this.maxX));
            
            if (lastTouchX !== null) {
                const delta = newX - lastTouchX;
                const smoothX = lastTouchX + delta * 0.7; // Increased smoothing for mobile
                this.player.style.left = `${smoothX}px`;
                lastTouchX = smoothX;
            } else {
                this.player.style.left = `${newX}px`;
                lastTouchX = newX;
            }
            
            this.player.style.transform = 'translateX(0)';
        };

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Touch events for player movement
        this.gameArea.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            lastTouchX = null;
        }, { passive: true });

        this.gameArea.addEventListener('touchmove', (e) => {
            if (touchStartX !== null) {
                handleMove(e.touches[0].clientX);
            }
        }, { passive: true });

        this.gameArea.addEventListener('touchend', () => {
            touchStartX = null;
            lastTouchX = null;
        }, { passive: true });

        // Mouse events (for desktop)
        this.gameArea.addEventListener('mousemove', (e) => {
            handleMove(e.clientX);
        }, { passive: true });

        // Game control buttons
        this.startButton.addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });

        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                if (this.gameOverModal) {
                    this.gameOverModal.classList.add('hidden');
                }
                this.startGame();
            });
        }

        // Powerup buttons with touch feedback
        const addPowerupListener = (btn, type) => {
            if (!btn) return;
            
            const handlePowerup = () => {
                if (!btn.disabled) {
                    this.activatePowerup(type);
                    btn.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        btn.style.transform = '';
                    }, 100);
                }
            };

            btn.addEventListener('touchstart', handlePowerup, { passive: true });
            btn.addEventListener('mousedown', handlePowerup, { passive: true });
        };

        addPowerupListener(this.shieldBtn, 'shield');
        addPowerupListener(this.magnetBtn, 'magnet');
        addPowerupListener(this.slowBtn, 'slow');

        // Handle screen orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateGameBounds();
                if (this.player) {
                    const x = Math.min(this.player.offsetLeft, this.maxX);
                    this.player.style.left = `${x}px`;
                }
            }, 100);
        });

        // Prevent zooming on double tap
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
            }
            lastTap = currentTime;
        });
    }

    updateGameBounds() {
        this.gameAreaRect = this.gameArea.getBoundingClientRect();
        this.playerWidth = this.player.offsetWidth;
        this.maxX = this.gameArea.offsetWidth - this.playerWidth;
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new HeartGame();
});
