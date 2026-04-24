// 元素射击游戏 - Elemental Shooter
// 完整游戏代码

// ==================== 游戏配置 ====================
const CONFIG = {
    GAME_DURATION: 180,  // 3分钟
    PLAYER_SPEED: 5,
    PLAYER_HEALTH: 100,
    BULLET_SPEED: 10,
    SPAWN_INTERVAL: 1500,  // 更快的生成间隔
    BOSS_SPAWN_TIME: 150,  // 2.5分钟出现BOSS
    MAX_LEVEL: 999,  // 取消等级限制，设为一个很大的数
    XP_PER_LEVEL: [0, 200, 550, 1050, 1700, 2500, 3450, 4550, 5800, 7200, 8750, 10450, 12300, 14300, 16450, 18750, 21200]
};

const TALENTS = {
    fire: { name: '烈焰', icon: '🔥', color: '#ff6b6b', bulletType: 'fire', damage: 25, fireRate: 200, skillCooldown: 8000, skillDuration: 3000 },
    wind: { name: '疾风', icon: '💨', color: '#48dbfb', bulletType: 'wind', damage: 15, fireRate: 100, skillCooldown: 6000, skillDuration: 2000 },
    thunder: { name: '雷霆', icon: '⚡', color: '#feca57', bulletType: 'thunder', damage: 20, fireRate: 150, skillCooldown: 10000, skillDuration: 2500 },
    ice: { name: '寒冰', icon: '❄️', color: '#a29bfe', bulletType: 'ice', damage: 18, fireRate: 180, skillCooldown: 7000, skillDuration: 4000 }
};

const GameState = {
    MENU: 'menu',
    TALENT_SELECT: 'talent_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

// ==================== 游戏类 ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        this.state = GameState.MENU;
        this.selectedTalents = [];
        this.score = 0;
        this.level = 1;
        this.xp = 0;
        this.gameTime = 0;
        this.lastTime = 0;
        
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.touch = { active: false, x: 0, y: 0 };
        
        this.shake = 0;
        
        this.setupEventListeners();
        this.setupTouchControl();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape' && this.state === GameState.PLAYING) {
                this.pause();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            // 鼠标移动时自动激活控制
            this.mouse.active = true;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.mouse.active = true;
            // 鼠标左键 = J技能 (索引0)
            if (e.button === 0 && this.state === GameState.PLAYING && this.player) {
                e.preventDefault();
                this.player.activateSkill(0);
            }
            // 鼠标右键 = K技能 (索引1)
            if (e.button === 2 && this.state === GameState.PLAYING && this.player) {
                e.preventDefault();
                this.player.activateSkill(1);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        // 禁用右键菜单，用于K技能
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouse.down = true;
            if (e.touches.length > 0) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mouse.down = false;
        });
    }
    
    setupTouchControl() {
        // 全屏触摸控制 - 手指位置决定移动方向
        const handleTouchStart = (e) => {
            if (this.state !== GameState.PLAYING) return;
            // 忽略技能按钮区域的触摸
            if (e.target.closest('.skill-buttons')) return;
            
            this.touch.active = true;
            // 触摸时禁用键盘控制
            this.keyboardActive = false;
            if (e.touches.length > 0) {
                this.touch.x = e.touches[0].clientX;
                this.touch.y = e.touches[0].clientY;
            }
        };
        
        const handleTouchMove = (e) => {
            if (!this.touch.active) return;
            if (e.touches.length > 0) {
                this.touch.x = e.touches[0].clientX;
                this.touch.y = e.touches[0].clientY;
            }
        };
        
        const handleTouchEnd = (e) => {
            this.touch.active = false;
        };
        
        // 鼠标控制 - 鼠标移动即可控制，无需按住
        const handleMouseMove = (e) => {
            if (this.state !== GameState.PLAYING) return;
            // 如果键盘正在控制，忽略鼠标移动
            if (this.keyboardActive) return;
            
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            // 鼠标移动时自动激活控制
            this.mouse.active = true;
        };
        
        // 鼠标点击时切换到鼠标控制
        const handleMouseDown = (e) => {
            if (this.state !== GameState.PLAYING) return;
            // 点击时切换到鼠标控制
            this.keyboardActive = false;
            this.mouse.active = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        };
        
        // 鼠标离开窗口时停止控制
        const handleMouseLeave = () => {
            this.mouse.active = false;
        };
        
        const handleMouseEnter = () => {
            if (this.state === GameState.PLAYING && !this.keyboardActive) {
                this.mouse.active = true;
            }
        };
        
        // 绑定到整个文档以实现全屏控制
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
    }
    
    start(selectedTalents) {
        this.selectedTalents = selectedTalents;
        this.state = GameState.PLAYING;
        this.score = 0;
        this.level = 1;
        this.xp = 0;
        this.gameTime = CONFIG.GAME_DURATION;
        
        this.player = new Player(this.width / 2, this.height - 150, selectedTalents);
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.miniBoss = null;  // 精英守卫（第3个就是最终守卫/大BOSS）
        
        this.lastSpawnTime = 0;
        this.miniBossCount = 0;  // 已生成的精英守卫数量
        this.nextMiniBossTime = 60;  // 第一个精英守卫在60秒时出现（第1分钟）
        // 第2个在120秒（第2分钟），第3个在180秒（第3分钟）
        this.backgroundPhase = 0;  // 背景阶段，每消灭一个精英守卫更换
        this.finalGuardSpawned = false;  // 最终守卫是否已生成
        this.finalGuardActive = false;  // 最终守卫战斗阶段（时间停止）
        
        this.updateUI();
        this.setupSkillButtons();
        
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('talentSelect').classList.remove('active');
        document.getElementById('hud').classList.add('active');
        document.getElementById('skillButtons').style.display = 'flex';
        document.getElementById('gameOver').classList.remove('active');
    }
    
    setupSkillButtons() {
        const container = document.getElementById('skillButtons');
        if (!container) return;
        container.innerHTML = '';
        
        this.selectedTalents.forEach((talentKey, index) => {
            const talent = TALENTS[talentKey];
            const btn = document.createElement('div');
            btn.className = 'skill-btn';
            btn.style.borderColor = talent.color;
            btn.innerHTML = `
                <span class="icon">${talent.icon}</span>
                <span class="key">${index === 0 ? 'J' : 'K'}</span>
                <div class="cooldown-overlay" id="skill-cd-${index}"></div>
            `;
            btn.onclick = () => this.player && this.player.activateSkill(index);
            container.appendChild(btn);
        });
    }
    
    pause() {
        this.state = GameState.PAUSED;
        document.getElementById('pauseMenu').classList.add('active');
    }
    
    resume() {
        this.state = GameState.PLAYING;
        document.getElementById('pauseMenu').classList.remove('active');
        this.lastTime = performance.now();
    }
    
    gameOver(victory = false) {
        this.state = victory ? GameState.VICTORY : GameState.GAME_OVER;
        document.getElementById('gameOverTitle').textContent = victory ? '胜利!' : '游戏结束';
        document.getElementById('gameOverTitle').style.color = victory ? '#4CAF50' : '#ff6b6b';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('gameOver').classList.add('active');
        document.getElementById('hud').classList.remove('active');
        document.getElementById('skillButtons').style.display = 'none';
        document.getElementById('bossHud').classList.remove('active');

        // 保存分数到排行榜
        saveScoreToLeaderboard(this.score, this.level);
        // 显示排行榜
        displayLeaderboard('leaderboardList');
    }
    
    spawnEnemy() {
        const types = ['basic', 'fast', 'tank', 'shooter'];
        // 随等级增加，敌人种类更多样化，高级敌人出现概率增加
        const levelBonus = Math.min(this.level * 0.02, 0.2);
        const weights = [
            Math.max(0.3, 0.5 - levelBonus),  // basic减少
            0.25 + levelBonus * 0.5,           // fast增加
            0.15 + levelBonus * 0.3,           // tank增加
            0.1 + levelBonus * 0.2             // shooter增加
        ];
        
        // 基础生成2-3个敌人
        const enemyCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < enemyCount; i++) {
            const type = this.weightedRandom(types, weights);
            const x = Math.random() * (this.width - 60) + 30;
            this.enemies.push(new Enemy(x, -50 - i * 40, type, this.level));
        }
        
        // 高等级时额外生成更多敌人
        if (this.level >= 3 && Math.random() < 0.4) {
            const x2 = Math.random() * (this.width - 60) + 30;
            const type2 = this.weightedRandom(types, weights);
            this.enemies.push(new Enemy(x2, -50, type2, this.level));
        }
        if (this.level >= 8 && Math.random() < 0.3) {
            const x3 = Math.random() * (this.width - 60) + 30;
            const type3 = this.weightedRandom(types, weights);
            this.enemies.push(new Enemy(x3, -50, type3, this.level));
        }
    }
    
    // 大BOSS现在就是第3个精英守卫（最终守卫），不再单独生成
    
    spawnMiniBoss() {
        this.miniBossCount++;
        const isFinalGuard = this.miniBossCount >= 3;  // 第3个是最终守卫
        
        // 生成精英守卫
        const miniBoss = new Boss(this.width / 2, -100, true);  // true表示小BOSS
        
        if (isFinalGuard) {
            // 最终守卫（大BOSS）：最强的BOSS
            miniBoss.maxHealth = 8000;
            miniBoss.health = 8000;
            miniBoss.size = 130;
            miniBoss.radius = 65;
            miniBoss.speed = 1.5;
            miniBoss.damageMultiplier = 0.5;
            miniBoss.bulletSpeed = 5;
            miniBoss.name = '最终守卫';
            miniBoss.isFinalGuard = true;  // 标记为最终守卫
            miniBoss.isBoss = true;  // 标记为大BOSS
            this.finalGuardSpawned = true;  // 设置最终守卫已生成标志
        } else {
            // 普通精英守卫（第1和第2个）- 血量增加20%
            miniBoss.maxHealth = 3600;
            miniBoss.health = 3600;
            miniBoss.size = 100;
            miniBoss.radius = 50;
            miniBoss.name = '精英守卫';
        }
        
        this.miniBoss = miniBoss;
        
        // 显示警告
        const warningText = document.getElementById('warningText');
        if (warningText) {
            warningText.textContent = isFinalGuard ? '⚠️ 最终守卫出现！' : '⚠️ 精英守卫出现！';
            warningText.classList.add('active');
            setTimeout(() => {
                warningText.classList.remove('active');
                warningText.textContent = '⚠️ 警告：BOSS出现！';
            }, 3000);
        }
        
        // 显示BOSS血条
        document.getElementById('bossHud').classList.add('active');
        // 第1个和第2个守卫间隔60秒，第3个守卫在第3分钟出现
        const timeIncrement = this.miniBossCount >= 2 ? 60 : 60;
        this.nextMiniBossTime += timeIncrement;
    }
    
    weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[0];
    }
    
    addXP(amount) {
        this.xp += amount;
        const nextLevelXP = this.getNextLevelXP();
        if (this.xp >= nextLevelXP && this.level < CONFIG.MAX_LEVEL) {
            this.levelUp();
        }
        this.updateUI();
    }

    getNextLevelXP() {
        // 如果在预定义数组范围内，使用数组值
        if (this.level < CONFIG.XP_PER_LEVEL.length) {
            return CONFIG.XP_PER_LEVEL[this.level];
        }
        // 超出范围后，每级需要额外2500 XP
        const lastDefinedXP = CONFIG.XP_PER_LEVEL[CONFIG.XP_PER_LEVEL.length - 1];
        const extraLevels = this.level - CONFIG.XP_PER_LEVEL.length + 1;
        return lastDefinedXP + extraLevels * 2500;
    }
    
    levelUp() {
        this.level++;
        this.pause();
        this.showLevelUpOptions();
    }
    
    showLevelUpOptions() {
        const modal = document.getElementById('levelUpModal');
        if (modal) {
            // 根据升级次数更新选项显示
            this.updateLevelUpDisplay();
            modal.classList.add('active');
            // 重置选择为选项A
            levelUpSelection = 0;
            updateLevelUpSelection();
        }
    }

    updateLevelUpDisplay() {
        const optionA = document.getElementById('levelUpOptionA');
        const optionB = document.getElementById('levelUpOptionB');
        
        if (!this.player || !optionA || !optionB) return;
        
        // 选项A：弹道或血量
        if (this.player.multishotUpgrades >= 4) {
            optionA.querySelector('h3').textContent = '血量增加';
            optionA.querySelector('p').innerHTML = '最大血量+10<br>当前已满级';
            optionA.querySelector('.option-icon').textContent = '❤️';
        } else {
            optionA.querySelector('h3').textContent = '增加弹道';
            optionA.querySelector('p').innerHTML = `额外发射1发子弹<br>当前${this.player.multishotUpgrades}/4次`;
            optionA.querySelector('.option-icon').textContent = '🔫';
        }
        
        // 选项B：子弹强化或护盾
        if (this.player.widthUpgrades >= 4) {
            optionB.querySelector('h3').textContent = '护盾增加';
            optionB.querySelector('p').innerHTML = '护盾+2<br>当前已满级';
            optionB.querySelector('.option-icon').textContent = '🛡️';
        } else {
            optionB.querySelector('h3').textContent = '子弹强化';
            optionB.querySelector('p').innerHTML = `子弹大小+30%<br>当前${this.player.widthUpgrades}/4次`;
            optionB.querySelector('.option-icon').textContent = '💥';
        }
    }
    
    selectLevelUpOption(option) {
        if (this.player) {
            if (option === 'multishot') {
                // 弹道最多4次，满级后恢复30点血量（不增加上限）
                if (this.player.multishotUpgrades < 4) {
                    this.player.extraBullets = (this.player.extraBullets || 0) + 1;
                    this.player.multishotUpgrades++;
                } else {
                    this.player.health = Math.min(this.player.health + 30, this.player.maxHealth); // 恢复30点血量
                }
            } else if (option === 'width') {
                // 子弹强化最多4次，满级后改为护盾+30
                if (this.player.widthUpgrades < 4) {
                    this.player.bulletWidthMultiplier = (this.player.bulletWidthMultiplier || 1) + 0.3;
                    this.player.widthUpgrades++;
                } else {
                    this.player.shield += 30; // 增加30护盾
                }
            }
        }
        
        const modal = document.getElementById('levelUpModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        this.resume();
        
        const levelUpEl = document.getElementById('levelUp');
        if (levelUpEl) {
            levelUpEl.classList.add('active');
            setTimeout(() => levelUpEl.classList.remove('active'), 2000);
        }
    }
    
    updateUI() {
        const scoreEl = document.getElementById('scoreText');
        const levelEl = document.getElementById('levelText');
        const healthEl = document.getElementById('healthFill');
        const xpEl = document.getElementById('xpFill');
        const timerEl = document.getElementById('timer');
        const bossHealthEl = document.getElementById('bossHealthFill');
        
        if (scoreEl) scoreEl.textContent = this.score;
        if (levelEl) levelEl.textContent = this.level;
        
        if (this.player && healthEl) {
            healthEl.style.width = (this.player.health / this.player.maxHealth * 100) + '%';
            // 显示剩余生命
            const livesEl = document.getElementById('livesText');
            if (livesEl) livesEl.textContent = '❤️'.repeat(this.player.lives);
        }
        
        const nextLevelXP = this.getNextLevelXP();
        const prevLevelXP = this.level > 1 ? this.getNextLevelXP(this.level - 1) : 0;
        const xpPercent = ((this.xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
        if (xpEl) xpEl.style.width = Math.max(0, Math.min(100, xpPercent)) + '%';
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        if (timerEl) timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 显示精英守卫血条
        if (this.miniBoss && bossHealthEl) {
            bossHealthEl.style.width = (this.miniBoss.health / this.miniBoss.maxHealth * 100) + '%';
        }
    }
    
    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    showDodgeText(x, y) {
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.textContent = '闪避!';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.fontSize = '16px';
        el.style.color = '#48dbfb';
        el.style.textShadow = '0 0 10px #48dbfb';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    showScoreText(x, y, amount, color) {
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.textContent = amount > 0 ? `+${amount}` : `${amount}`;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.fontSize = '20px';
        el.style.color = color;
        el.style.fontWeight = 'bold';
        el.style.textShadow = `0 0 10px ${color}`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
    
    screenShake(amount) {
        this.shake = Math.max(this.shake, amount);
    }
    
    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.state === GameState.PLAYING) {
            this.update(deltaTime);
            this.render();
        }
        
        requestAnimationFrame(this.loop);
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        
        this.gameTime -= dt;
        // 时间结束时，如果最终守卫存在，时间停止，继续游戏直到最终守卫被消灭或主角死亡
        if (this.gameTime <= 0) {
            // 时间停止在0，不再生成新守卫
            this.gameTime = 0;
            // 如果最终守卫已出现，标记战斗阶段
            if (this.finalGuardSpawned) {
                this.finalGuardActive = true;
            }
        }
        
        // 检查是否需要生成精英守卫（每分钟一个，最多3个）
        // 第1、2个守卫需要时间在0以上，第3个守卫可以在时间为0时生成
        const elapsedTime = CONFIG.GAME_DURATION - this.gameTime;
        const canSpawn = !this.miniBoss && elapsedTime >= this.nextMiniBossTime && this.miniBossCount < 3;
        const timeCheck = this.miniBossCount < 2 ? this.gameTime > 0 : true;
        if (canSpawn && timeCheck) {
            this.spawnMiniBoss();
        }
        
        this.lastSpawnTime += deltaTime;
        const spawnInterval = Math.max(500, CONFIG.SPAWN_INTERVAL - (this.level * 100));
        // 只有最终守卫存在时才停止生成普通敌人
        if (this.lastSpawnTime > spawnInterval && !(this.miniBoss && this.miniBoss.isFinalGuard)) {
            this.spawnEnemy();
            this.lastSpawnTime = 0;
        }
        
        if (this.player) this.player.update(dt, this);
        
        // 更新子弹，限制最大数量以优化性能
        this.bullets = this.bullets.filter(bullet => {
            const wasActive = bullet.active;
            const prevY = bullet.y;
            bullet.update(dt);

            // 躲闪检测：敌人子弹从玩家附近飞过但未击中
            if (wasActive && bullet.fromEnemy && this.player && !this.player.invincible) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // 子弹在危险距离内飞过（30-60像素），且没有击中玩家
                if (dist > 25 && dist < 60 && prevY < this.player.y && bullet.y >= this.player.y) {
                    // 成功躲避，增加积分
                    this.score += 5;
                    // 偶尔显示躲避提示
                    if (Math.random() < 0.1) {
                        this.showDodgeText(this.player.x, this.player.y - 30);
                    }
                }
            }

            return bullet.active && bullet.x > -50 && bullet.x < this.width + 50 && bullet.y > -50 && bullet.y < this.height + 50;
        });
        // 如果子弹太多，移除最早的子弹
        if (this.bullets.length > 150) {
            this.bullets = this.bullets.slice(-150);
        }
        
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(dt, this);
            // basic(红色)和fast(蓝色)敌人可以穿过屏幕底部消失
            if (enemy.type === 'basic' || enemy.type === 'fast') {
                return enemy.active && enemy.y < this.height + 200;
            }
            // 其他敌人在屏幕底部外100像素处消失
            return enemy.active && enemy.y < this.height + 100;
        });
        // 限制敌人数量
        if (this.enemies.length > 20) {
            this.enemies = this.enemies.slice(-20);
        }
        
        // 更新精英守卫
        if (this.miniBoss) {
            this.miniBoss.update(dt, this);
            if (!this.miniBoss.active) {
                this.miniBoss = null;
                document.getElementById('bossHud').classList.remove('active');
            }
        }
        
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return p.active;
        });
        // 限制粒子数量
        if (this.particles.length > 100) {
            this.particles = this.particles.slice(-100);
        }
        
        this.checkCollisions();
        this.updateUI();
        this.shake *= 0.9;
        if (this.shake < 0.5) this.shake = 0;
    }
    
    checkCollisions() {
        this.bullets.forEach(bullet => {
            if (!bullet.active || bullet.fromEnemy) return;
            
            this.enemies.forEach(enemy => {
                if (!enemy.active) return;
                if (this.checkCollision(bullet, enemy)) {
                    bullet.hit(enemy, this);
                }
            });
            
            // 检查是否击中精英守卫
            if (this.miniBoss && this.miniBoss.active) {
                if (this.checkCollision(bullet, this.miniBoss)) {
                    bullet.hit(this.miniBoss, this);
                }
            }
        });
        
        this.bullets.forEach(bullet => {
            if (!bullet.active || !bullet.fromEnemy) return;
            
            // 检查是否击中玩家分身（风技能）
            if (this.player && this.player.skillEffects.windDance && this.player.clones.length > 0) {
                let hitClone = false;
                this.player.clones.forEach((clone, index) => {
                    if (hitClone) return;
                    const dx = bullet.x - clone.x;
                    const dy = bullet.y - clone.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 25) { // 分身碰撞半径
                        hitClone = true;
                        bullet.active = false;
                        this.createParticles(clone.x, clone.y, '#48dbfb', 8);
                        // 分身承受伤害，主角不受伤害
                        this.screenShake(2);
                    }
                });
                if (hitClone) return; // 如果击中分身，不再检查主角
            }
            
            // 检查是否击中护盾
            if (this.player && this.player.shield > 0) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                // 护盾半径45，击中护盾时消耗护盾
                if (dist < 45 && dist > this.player.radius) {
                    this.player.shield--;
                    bullet.active = false;
                    this.createParticles(bullet.x, bullet.y, '#00d2d3', 8);
                    this.screenShake(1);
                    // 护盾被击中扣5分
                    this.score -= 5;
                    return; // 护盾挡住子弹，不再检查主角
                }
            }
            
            if (this.player && this.checkCollision(bullet, this.player)) {
                this.player.takeDamage(bullet.damage);
                bullet.active = false;
                this.createParticles(bullet.x, bullet.y, '#ff6b6b', 5);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            // 检查敌人是否撞上分身
            if (this.player && this.player.skillEffects.windDance && this.player.clones.length > 0) {
                let hitClone = false;
                this.player.clones.forEach(clone => {
                    if (hitClone) return;
                    const dx = enemy.x - clone.x;
                    const dy = enemy.y - clone.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < enemy.radius + 25) {
                        hitClone = true;
                        enemy.takeDamage(enemy.health, this); // 敌人撞分身直接死
                        this.createParticles(clone.x, clone.y, '#48dbfb', 10);
                        this.screenShake(3);
                    }
                });
                if (hitClone) return;
            }
            
            if (this.player && this.checkCollision(enemy, this.player)) {
                this.player.takeDamage(enemy.damage);
                enemy.takeDamage(enemy.health, this);
                this.screenShake(5);
            }
        });
        
        // 精英守卫碰撞检测
        if (this.miniBoss && this.miniBoss.active && this.player) {
            // 精英守卫撞分身
            if (this.player.skillEffects.windDance && this.player.clones.length > 0) {
                this.player.clones.forEach(clone => {
                    const dx = this.miniBoss.x - clone.x;
                    const dy = this.miniBoss.y - clone.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.miniBoss.radius + 25) {
                        this.miniBoss.takeDamage(50, this);
                        this.createParticles(clone.x, clone.y, '#48dbfb', 15);
                        this.screenShake(5);
                    }
                });
            }
            
            if (this.checkCollision(this.miniBoss, this.player)) {
                this.player.takeDamage(15);
                this.screenShake(6);
            }
        }
    }
    
    checkCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (a.radius || a.size / 2) + (b.radius || b.size / 2);
    }
    
    render() {
        this.ctx.fillStyle = '#0a0a15';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawBackground();
        
        this.ctx.save();
        if (this.shake > 0) {
            const shakeX = (Math.random() - 0.5) * this.shake;
            const shakeY = (Math.random() - 0.5) * this.shake;
            this.ctx.translate(shakeX, shakeY);
        }
        
        this.particles.forEach(p => p.render(this.ctx));
        this.bullets.forEach(b => b.render(this.ctx));
        this.enemies.forEach(e => e.render(this.ctx));
        if (this.miniBoss && this.miniBoss.active) this.miniBoss.render(this.ctx);
        if (this.player) this.player.render(this.ctx);
        
        this.ctx.restore();
    }
    
    drawBackground() {
        const ctx = this.ctx;
        const time = this.gameTime;
        const phase = this.backgroundPhase || 0;

        // 四个主题：天空、草原、大海、宇宙
        const themes = [
            // 主题0：天空 - 暗色天空
            {
                draw: () => {
                    // 暗色天空渐变
                    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
                    gradient.addColorStop(0, '#1a2a3a');
                    gradient.addColorStop(0.5, '#2a3a4a');
                    gradient.addColorStop(1, '#3a4a5a');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, this.width, this.height);

                    // 暗色太阳
                    const sunGradient = ctx.createRadialGradient(this.width * 0.8, 80, 0, this.width * 0.8, 80, 60);
                    sunGradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
                    sunGradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.2)');
                    sunGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
                    ctx.fillStyle = sunGradient;
                    ctx.beginPath();
                    ctx.arc(this.width * 0.8, 80, 60, 0, Math.PI * 2);
                    ctx.fill();

                    // 暗色云朵
                    for (let i = 0; i < 5; i++) {
                        const x = ((i * 150 + time * 10) % (this.width + 200)) - 100;
                        const y = 60 + i * 40 + Math.sin(time + i) * 10;
                        this.drawCloud(ctx, x, y, 0.6 + i * 0.1);
                    }

                    // 飞鸟
                    for (let i = 0; i < 3; i++) {
                        const x = ((i * 200 + time * 30) % (this.width + 100)) - 50;
                        const y = 100 + i * 50;
                        this.drawBird(ctx, x, y);
                    }
                }
            },
            // 主题1：草原 - 暗色草原
            {
                draw: () => {
                    // 暗色天空到草地渐变
                    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
                    gradient.addColorStop(0, '#2a3a4a');
                    gradient.addColorStop(0.4, '#3a4a3a');
                    gradient.addColorStop(0.6, '#2a3a2a');
                    gradient.addColorStop(1, '#1a2a1a');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, this.width, this.height);

                    // 远处的山
                    ctx.fillStyle = '#1a3a2a';
                    ctx.beginPath();
                    ctx.moveTo(0, this.height * 0.5);
                    for (let x = 0; x <= this.width; x += 50) {
                        const y = this.height * 0.5 - Math.sin(x * 0.01) * 30 - Math.sin(x * 0.02) * 20;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(this.width, this.height);
                    ctx.lineTo(0, this.height);
                    ctx.fill();

                    // 草地上的花
                    for (let i = 0; i < 15; i++) {
                        const x = (i * 80 + time * 2) % this.width;
                        const y = this.height * 0.7 + Math.sin(i * 0.5) * 50;
                        this.drawFlower(ctx, x, y, i % 3);
                    }

                    // 飘动的草
                    for (let i = 0; i < 30; i++) {
                        const x = (i * 40) % this.width;
                        const y = this.height - 20 - Math.random() * 30;
                        const sway = Math.sin(time * 2 + i) * 5;
                        ctx.strokeStyle = '#0a2a0a';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.quadraticCurveTo(x + sway, y - 15, x + sway * 1.5, y - 25);
                        ctx.stroke();
                    }
                }
            },
            // 主题2：大海 - 深海暗色
            {
                draw: () => {
                    // 深海暗色渐变
                    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
                    gradient.addColorStop(0, '#0a1a2a');
                    gradient.addColorStop(0.3, '#1a2a3a');
                    gradient.addColorStop(0.7, '#0a2a3a');
                    gradient.addColorStop(1, '#1a3a4a');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, this.width, this.height);

                    // 暗色光线效果
                    for (let i = 0; i < 5; i++) {
                        const x = this.width * 0.2 + i * this.width * 0.15;
                        const lightGradient = ctx.createLinearGradient(x, 0, x + 30, this.height);
                        lightGradient.addColorStop(0, 'rgba(100, 150, 200, 0.15)');
                        lightGradient.addColorStop(0.5, 'rgba(80, 120, 160, 0.08)');
                        lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = lightGradient;
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x + 40, this.height);
                        ctx.lineTo(x + 70, this.height);
                        ctx.lineTo(x + 30, 0);
                        ctx.fill();
                    }

                    // 暗色气泡
                    for (let i = 0; i < 20; i++) {
                        const x = (i * 50 + Math.sin(time + i) * 20) % this.width;
                        const y = ((time * 30 + i * 100) % (this.height + 100)) - 50;
                        const size = 2 + (i % 4);
                        ctx.fillStyle = 'rgba(150, 180, 200, 0.2)';
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 游动的鱼
                    for (let i = 0; i < 5; i++) {
                        const x = ((i * 150 + time * 20) % (this.width + 100)) - 50;
                        const y = this.height * 0.3 + i * 60 + Math.sin(time + i) * 20;
                        this.drawFish(ctx, x, y, i % 2 === 0);
                    }

                    // 暗色海草
                    for (let i = 0; i < 10; i++) {
                        const x = (i * 80 + 20) % this.width;
                        const sway = Math.sin(time * 1.5 + i) * 15;
                        ctx.strokeStyle = '#1a3a2a';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(x, this.height);
                        ctx.quadraticCurveTo(x + sway, this.height - 40, x + sway * 0.5, this.height - 80);
                        ctx.stroke();
                    }
                }
            },
            // 主题3：宇宙 - 星空银河
            {
                draw: () => {
                    // 深空背景
                    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
                    gradient.addColorStop(0, '#0a0a2e');
                    gradient.addColorStop(0.5, '#1a1a4e');
                    gradient.addColorStop(1, '#2d1b69');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, this.width, this.height);

                    // 银河
                    const galaxyGradient = ctx.createRadialGradient(
                        this.width * 0.3, this.height * 0.4, 0,
                        this.width * 0.3, this.height * 0.4, 300
                    );
                    galaxyGradient.addColorStop(0, 'rgba(147, 112, 219, 0.3)');
                    galaxyGradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.15)');
                    galaxyGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = galaxyGradient;
                    ctx.fillRect(0, 0, this.width, this.height);

                    // 星星
                    for (let i = 0; i < 100; i++) {
                        const x = (i * 137.5 + time * 0.5) % this.width;
                        const y = (i * 73.3 + time * 0.8) % this.height;
                        const size = (i % 4) * 0.5 + 0.5;
                        const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
                        const colors = ['#ffffff', '#ffe4b5', '#b0e0e6', '#dda0dd'];
                        ctx.fillStyle = colors[i % 4];
                        ctx.globalAlpha = twinkle;
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;

                    // 流星
                    for (let i = 0; i < 2; i++) {
                        const x = ((time * 100 + i * 300) % (this.width + 200)) - 100;
                        const y = (i * 150 + time * 30) % (this.height * 0.5);
                        this.drawMeteor(ctx, x, y);
                    }

                    // 行星
                    this.drawPlanet(ctx, this.width * 0.75, this.height * 0.25, 40, '#ff6b6b', '#c0392b');
                    this.drawPlanet(ctx, this.width * 0.15, this.height * 0.7, 25, '#48dbfb', '#2980b9');
                }
            }
        ];

        // 绘制选中的主题
        themes[Math.min(phase, themes.length - 1)].draw();
    }

    // 绘制云朵
    drawCloud(ctx, x, y, scale) {
        ctx.fillStyle = 'rgba(150, 160, 180, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
        ctx.arc(x + 20 * scale, y - 10 * scale, 25 * scale, 0, Math.PI * 2);
        ctx.arc(x + 45 * scale, y, 20 * scale, 0, Math.PI * 2);
        ctx.arc(x + 25 * scale, y + 5 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制飞鸟
    drawBird(ctx, x, y) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.quadraticCurveTo(x, y - 5, x + 8, y);
        ctx.stroke();
    }

    // 绘制花朵
    drawFlower(ctx, x, y, type) {
        const colors = ['rgba(200, 100, 150, 0.6)', 'rgba(180, 160, 80, 0.6)', 'rgba(180, 80, 80, 0.6)'];
        ctx.fillStyle = colors[type];
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            ctx.beginPath();
            ctx.arc(x + Math.cos(angle) * 5, y + Math.sin(angle) * 5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(180, 160, 80, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制鱼
    drawFish(ctx, x, y, facingRight) {
        ctx.fillStyle = facingRight ? 'rgba(180, 100, 80, 0.7)' : 'rgba(160, 120, 60, 0.7)';
        ctx.save();
        ctx.translate(x, y);
        if (!facingRight) ctx.scale(-1, 1);

        // 鱼身
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 鱼尾
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-22, -8);
        ctx.lineTo(-22, 8);
        ctx.closePath();
        ctx.fill();

        // 鱼眼
        ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.beginPath();
        ctx.arc(8, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.beginPath();
        ctx.arc(9, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 绘制流星
    drawMeteor(ctx, x, y) {
        const gradient = ctx.createLinearGradient(x, y, x - 30, y + 30);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 30, y + 30);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制行星
    drawPlanet(ctx, x, y, radius, color1, color2) {
        const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 行星环
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.6, radius * 0.4, Math.PI * 0.2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ==================== 玩家类 ====================
class Player {
    constructor(x, y, talents) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.radius = 20;
        this.speed = CONFIG.PLAYER_SPEED;
        this.maxHealth = CONFIG.PLAYER_HEALTH;
        this.health = this.maxHealth;
        this.lives = 2;  // 2条命
        this.talents = talents;
        
        this.lastFireTime = 0;
        this.invincible = false;
        this.invincibleTime = 0;
        
        this.skills = talents.map((t) => ({
            key: t,
            cooldown: 0,
            active: false,
            duration: 0
        }));
        
        this.skillEffects = {
            fireStorm: false,
            windDance: false,
            thunderChain: false,
            iceField: false
        };
        
        this.extraBullets = 0;
        this.bulletWidthMultiplier = 1;
        
        // 升级次数限制
        this.multishotUpgrades = 0;  // 弹道升级次数
        this.widthUpgrades = 0;      // 子弹强化次数
        
        // 护盾系统
        this.shield = 0;  // 护盾值
        
        // 风技能分身
        this.clones = [];  // 分身位置
    }
    
    update(dt, game) {
        let dx = 0, dy = 0;
        let usingTouchOrMouse = false;
        
        // 键盘控制 - 优先使用键盘
        const keyUp = game.keys['w'] || game.keys['arrowup'];
        const keyDown = game.keys['s'] || game.keys['arrowdown'];
        const keyLeft = game.keys['a'] || game.keys['arrowleft'];
        const keyRight = game.keys['d'] || game.keys['arrowright'];
        
        if (keyUp) dy -= 1;
        if (keyDown) dy += 1;
        if (keyLeft) dx -= 1;
        if (keyRight) dx += 1;
        
        // 如果有键盘输入，设置标志并禁用鼠标/触摸控制
        const usingKeyboard = dx !== 0 || dy !== 0;
        if (usingKeyboard) {
            game.keyboardActive = true;
        }
        
        // 触摸控制 - 仅在未使用键盘时
        if (!usingKeyboard && game.touch.active && !usingTouchOrMouse) {
            const targetX = game.touch.x;
            const targetY = game.touch.y;
            const diffX = targetX - this.x;
            const diffY = targetY - this.y;
            const distance = Math.sqrt(diffX * diffX + diffY * diffY);
            
            if (distance > 10) {
                dx = diffX / distance;
                dy = diffY / distance;
                usingTouchOrMouse = true;
            }
        }
        
        // 鼠标控制 - 仅在未使用键盘时
        if (!usingKeyboard && game.mouse.active && !usingTouchOrMouse) {
            const targetX = game.mouse.x;
            const targetY = game.mouse.y;
            const diffX = targetX - this.x;
            const diffY = targetY - this.y;
            const distance = Math.sqrt(diffX * diffX + diffY * diffY);
            
            if (distance > 10) {
                dx = diffX / distance;
                dy = diffY / distance;
                usingTouchOrMouse = true;
            }
        }
        
        if (dx !== 0 || dy !== 0) {
            if (!usingTouchOrMouse) {
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 0) {
                    dx /= length;
                    dy /= length;
                }
            }
            
            if (this.talents.includes('wind')) {
                dx *= this.speed * 1.3;
                dy *= this.speed * 1.3;
            } else {
                dx *= this.speed;
                dy *= this.speed;
            }
            
            this.x += dx;
            this.y += dy;
        }
        
        this.x = Math.max(this.radius, Math.min(game.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(game.height - this.radius, this.y));
        
        this.fire(dt, game);
        this.updateSkills(dt, game);
        
        if (this.invincible) {
            this.invincibleTime -= dt;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }
        
        if (this.skillEffects.iceField) {
            game.enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    enemy.speedMultiplier = 0.5;
                }
            });
        }
    }
    
    fire(dt, game) {
        const now = Date.now();
        let fireRate = 200;
        
        if (this.talents.includes('wind')) fireRate = 100;
        else if (this.talents.includes('fire')) fireRate = 200;
        else if (this.talents.includes('thunder')) fireRate = 150;
        else if (this.talents.includes('ice')) fireRate = 180;
        
        if (this.skillEffects.windDance) fireRate *= 0.5;
        
        if (now - this.lastFireTime > fireRate) {
            this.talents.forEach((talent, index) => {
                this.createBullet(talent, game, index, this.x, this.y);
                
                // 风技能分身也发射子弹
                if (this.skillEffects.windDance && talent === 'wind') {
                    this.clones.forEach(clone => {
                        this.createBullet(talent, game, index, clone.x, clone.y, 0.7);
                    });
                }
            });
            this.lastFireTime = now;
        }
    }
    
    createBullet(talent, game, index, x, y, damageMultiplier = 1) {
        const t = TALENTS[talent];
        const baseOffset = index === 0 ? -10 : 10;
        const damage = this.getBulletDamage(t.damage) * damageMultiplier;
        const speed = CONFIG.BULLET_SPEED * (talent === 'wind' ? 1.5 : 1);
        const radius = 5 * this.bulletWidthMultiplier;
        
        // 基础子弹
        game.bullets.push(new Bullet(
            x + baseOffset, y - 20,
            0, -speed,
            damage, t.color, talent, talent === 'wind', radius
        ));
        
        // 额外弹道
        const totalExtra = this.extraBullets;
        for (let i = 0; i < totalExtra; i++) {
            const angleOffset = ((i + 1) / (totalExtra + 1) - 0.5) * Math.PI / 3;
            const vx = Math.sin(angleOffset) * speed * 0.3;
            const vy = -Math.cos(angleOffset) * speed;
            const xOffset = (i % 2 === 0 ? -1 : 1) * (15 + i * 8);
            
            game.bullets.push(new Bullet(
                x + baseOffset + xOffset, y - 20,
                vx, vy,
                damage * 0.7, t.color, talent, talent === 'wind', radius * 0.8
            ));
        }
    }
    
    activateSkill(index) {
        const skill = this.skills[index];
        if (!skill || skill.cooldown > 0 || skill.active) return;

        const t = TALENTS[skill.key];
        skill.cooldown = t.skillCooldown / 1000;
        skill.active = true;
        skill.duration = t.skillDuration / 1000;

        // 释放技能时获得短暂无敌时间（0.8秒）
        this.invincible = true;
        this.invincibleTime = 0.8;

        // 释放技能扣300分
        if (window.game) {
            window.game.score -= 300;
            window.game.showScoreText(this.x, this.y - 50, -300, '#ff6b6b');
        }

        // 清屏所有敌人子弹
        if (window.game) {
            window.game.bullets.forEach(bullet => {
                if (bullet.fromEnemy) {
                    bullet.active = false;
                    window.game.createParticles(bullet.x, bullet.y, '#fff', 3);
                }
            });
        }

        switch(skill.key) {
            case 'fire': this.skillEffects.fireStorm = true; break;
            case 'wind': this.skillEffects.windDance = true; break;
            case 'thunder': this.skillEffects.thunderChain = true; break;
            case 'ice': this.skillEffects.iceField = true; break;
        }
    }
    
    updateSkills(dt, game) {
        this.skills.forEach((skill, index) => {
            if (skill.cooldown > 0) {
                skill.cooldown -= dt;
                const overlay = document.getElementById(`skill-cd-${index}`);
                const btn = overlay?.parentElement;
                if (overlay) {
                    const t = TALENTS[skill.key];
                    const percent = (skill.cooldown / (t.skillCooldown / 1000)) * 100;
                    // J技能(索引0)从右向左填充宽度，K技能(索引1)从下向上填充高度
                    if (index === 0) {
                        overlay.style.width = percent + '%';
                    } else {
                        overlay.style.height = percent + '%';
                    }
                }
                if (btn) btn.classList.add('cooldown');
            } else {
                const overlay = document.getElementById(`skill-cd-${index}`);
                const btn = overlay?.parentElement;
                if (btn) btn.classList.remove('cooldown');
            }
            
            if (skill.active) {
                skill.duration -= dt;
                if (skill.duration <= 0) {
                    skill.active = false;
                    this.skillEffects.fireStorm = false;
                    this.skillEffects.windDance = false;
                    this.skillEffects.thunderChain = false;
                    this.skillEffects.iceField = false;
                }
            }
        });
        
        // 烈焰技能 - 发射火苗 + 清屏子弹
        if (this.skillEffects.fireStorm) {
            // 持续发射环绕火球
            if (Math.random() < 0.4) {
                const count = 12;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + Date.now() / 500;
                    const speed = 6 + Math.random() * 3;
                    const bullet = new Bullet(
                        this.x + Math.cos(angle) * 30, this.y + Math.sin(angle) * 30,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        20, '#ff6b6b', 'fire'
                    );
                    bullet.radius = 8 + Math.random() * 4;
                    game.bullets.push(bullet);
                }
            }
            // 火焰粒子效果
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 40;
                game.particles.push(new Particle(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ['#ff6b6b', '#feca57', '#ff8585'][Math.floor(Math.random() * 3)],
                    4 + Math.random() * 4,
                    0.5 + Math.random() * 0.5
                ));
            }

            // 火焰清屏 - 烧毁所有敌人子弹
            if (Math.random() < 0.3) {
                game.bullets.forEach(bullet => {
                    if (bullet.fromEnemy) {
                        bullet.active = false;
                        game.createParticles(bullet.x, bullet.y, '#ff6b6b', 3);
                    }
                });
            }
        }
        
        // 疾风技能 - 分身效果 + 全屏伤害
        if (this.skillEffects.windDance) {
            // 更新分身位置（在主角两侧）
            this.clones = [
                { x: this.x - 60, y: this.y, offset: -60 },
                { x: this.x + 60, y: this.y, offset: 60 }
            ];

            // 分身拖尾效果
            if (Math.random() < 0.3) {
                this.clones.forEach(clone => {
                    game.particles.push(new WindCloneParticle(clone.x, clone.y));
                });
            }

            // 全屏风刃伤害 - 对所有敌人造成10%额外伤害
            if (Math.random() < 0.3) {
                game.enemies.forEach(enemy => {
                    if (enemy.active) {
                        enemy.takeDamage(enemy.maxHealth * 0.1, game);
                        // 风刃特效
                        game.createParticles(enemy.x, enemy.y, '#48dbfb', 3);
                    }
                });
                // 对BOSS也造成伤害
                if (game.boss && game.boss.active) {
                    game.boss.takeDamage(game.boss.maxHealth * 0.01, game);
                    game.createParticles(game.boss.x, game.boss.y, '#48dbfb', 5);
                }
            }
        } else {
            this.clones = [];
        }
        
        // 雷霆技能特效 + 清屏 + 全屏伤害
        if (this.skillEffects.thunderChain) {
            // 限制粒子总数，避免卡顿
            const maxParticlesPerFrame = 2;
            let particleCount = 0;

            // 超大面积闪电 - 覆盖全屏，降低频率和数量
            if (Math.random() < 0.15 && particleCount < maxParticlesPerFrame) {
                const lightningCount = 2;
                for (let i = 0; i < lightningCount && particleCount < maxParticlesPerFrame; i++) {
                    const angle = (Math.PI * 2 / lightningCount) * i + Date.now() / 200;
                    const startDist = 15;
                    const endDist = 350 + Math.random() * 200;
                    game.particles.push(new UltraLightningParticle(
                        this.x + Math.cos(angle) * startDist,
                        this.y + Math.sin(angle) * startDist,
                        this.x + Math.cos(angle) * endDist,
                        this.y + Math.sin(angle) * endDist
                    ));
                    particleCount++;
                }
            }

            // 电火花风暴 - 减少数量
            if (particleCount < maxParticlesPerFrame && Math.random() < 0.2) {
                const sparkCount = Math.min(2, maxParticlesPerFrame - particleCount);
                for (let i = 0; i < sparkCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 20 + Math.random() * 150;
                    game.particles.push(new ThunderSparkParticle(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist
                    ));
                }
                particleCount += sparkCount;
            }

            // 雷霆光环 - 降低频率
            if (Math.random() < 0.05 && particleCount < maxParticlesPerFrame) {
                game.particles.push(new ThunderRing(this.x, this.y));
            }

            // 雷霆清屏 + 全屏伤害 - 对所有敌人造成15%伤害（比风冰更强）
            if (Math.random() < 0.4) {
                // 清屏所有敌人子弹
                game.bullets.forEach(bullet => {
                    if (bullet.fromEnemy) {
                        bullet.active = false;
                        game.createParticles(bullet.x, bullet.y, '#feca57', 2);
                    }
                });

                // 对所有敌人造成伤害
                game.enemies.forEach(enemy => {
                    if (enemy.active) {
                        enemy.takeDamage(enemy.maxHealth * 0.15, game);
                        // 雷霆特效
                        game.createParticles(enemy.x, enemy.y, '#feca57', 3);
                    }
                });

                // 对BOSS/精英守卫造成伤害
                if (game.boss && game.boss.active) {
                    game.boss.takeDamage(game.boss.maxHealth * 0.02, game);
                    game.createParticles(game.boss.x, game.boss.y, '#feca57', 8);
                    game.screenShake(3);
                }
            }
        }

        // 寒冰技能特效 + 全屏伤害
        if (this.skillEffects.iceField) {
            // 限制粒子总数
            const maxParticlesPerFrame = 2;
            let particleCount = 0;

            // 大范围冰霜粒子 - 减少数量
            if (Math.random() < 0.2 && particleCount < maxParticlesPerFrame) {
                const iceCount = Math.min(2, maxParticlesPerFrame - particleCount);
                for (let i = 0; i < iceCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 180;
                    game.particles.push(new BigIceParticle(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist
                    ));
                }
                particleCount += iceCount;
            }

            // 雪花效果 - 减少数量
            if (Math.random() < 0.15 && particleCount < maxParticlesPerFrame) {
                game.particles.push(new BigSnowParticle(
                    this.x + (Math.random() - 0.5) * 250,
                    this.y + (Math.random() - 0.5) * 250
                ));
            }

            // 冰霜光环 - 降低频率
            if (Math.random() < 0.05) {
                game.particles.push(new IceRing(this.x, this.y));
            }

            // 全屏冰霜伤害 - 对所有敌人造成10%额外伤害并冰冻
            if (Math.random() < 0.3) {
                game.enemies.forEach(enemy => {
                    if (enemy.active) {
                        enemy.takeDamage(enemy.maxHealth * 0.1, game);
                        enemy.speedMultiplier = 0.3;
                        enemy.slowTime = 1;
                        // 冰霜特效
                        game.createParticles(enemy.x, enemy.y, '#a29bfe', 3);
                    }
                });
                // 对BOSS也造成伤害并减速
                if (game.boss && game.boss.active) {
                    game.boss.takeDamage(game.boss.maxHealth * 0.01, game);
                    game.createParticles(game.boss.x, game.boss.y, '#a29bfe', 5);
                }
            }
        }
    }
    
    takeDamage(damage) {
        if (this.invincible) return;

        // 护盾优先承受伤害，每点护盾可以抵挡15点伤害（满级10点护盾可挡150伤害，超过100血量的80%）
        if (this.shield > 0) {
            const shieldAbsorb = Math.min(this.shield * 15, damage);
            const shieldCost = Math.ceil(shieldAbsorb / 15);
            this.shield -= shieldCost;
            damage -= shieldAbsorb;

            // 护盾抵消伤害扣5分（不显示）
            if (window.game) {
                window.game.score -= 5;
            }

            if (damage <= 0) {
                // 护盾完全吸收了伤害
                if (window.game) {
                    window.game.createParticles(this.x, this.y, '#00d2d3', 8);
                    window.game.screenShake(2);
                }
                return;
            }
        }

        this.health -= damage;
        this.invincible = true;
        this.invincibleTime = 1;

        // 掉血扣3分（不显示）
        if (window.game) {
            window.game.score -= 3;
            window.game.screenShake(5);
        }

        if (this.health <= 0 && window.game) {
            this.lives--;
            if (this.lives > 0) {
                // 还有命，复活
                this.health = this.maxHealth;
                this.invincibleTime = 3;  // 复活后3秒无敌
                window.game.screenShake(10);
                window.game.createParticles(this.x, this.y, '#fff', 30);
            } else {
                // 没命了，游戏结束
                window.game.gameOver(false);
            }
        }
    }
    
    onLevelUp() {
        this.maxHealth += 20;
        this.health = this.maxHealth;
        this.speed += 0.5;
        this.bulletDamageMultiplier = 1 + (game.level - 1) * 0.1;
    }
    
    getBulletDamage(baseDamage) {
        return baseDamage * (this.bulletDamageMultiplier || 1);
    }
    
    render(ctx) {
        ctx.save();
        
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // 飞船主体 - 三角形设计
        const time = Date.now() / 200;
        const floatY = Math.sin(time) * 3;
        
        ctx.translate(this.x, this.y + floatY);
        
        // 引擎火焰效果
        const flameHeight = 15 + Math.random() * 10;
        const flameGradient = ctx.createLinearGradient(0, 10, 0, 25 + flameHeight);
        flameGradient.addColorStop(0, '#667eea');
        flameGradient.addColorStop(0.5, '#feca57');
        flameGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(-8, 15);
        ctx.lineTo(0, 25 + flameHeight);
        ctx.lineTo(8, 15);
        ctx.fill();
        
        // 飞船主体渐变
        const bodyGradient = ctx.createLinearGradient(0, -25, 0, 20);
        bodyGradient.addColorStop(0, '#a8c0ff');
        bodyGradient.addColorStop(0.5, '#667eea');
        bodyGradient.addColorStop(1, '#764ba2');
        
        // 飞船主体
        ctx.fillStyle = bodyGradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#667eea';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(18, 15);
        ctx.lineTo(0, 10);
        ctx.lineTo(-18, 15);
        ctx.closePath();
        ctx.fill();
        
        // 飞船细节 - 中心核心
        const coreGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 12);
        coreGradient.addColorStop(0, '#fff');
        coreGradient.addColorStop(0.5, '#feca57');
        coreGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(0, -5, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 天赋图标显示
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.talents[0]) {
            ctx.fillStyle = TALENTS[this.talents[0]].color;
            ctx.beginPath();
            ctx.arc(-10, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(TALENTS[this.talents[0]].icon, -10, 1);
        }
        if (this.talents[1]) {
            ctx.fillStyle = TALENTS[this.talents[1]].color;
            ctx.beginPath();
            ctx.arc(10, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(TALENTS[this.talents[1]].icon, 10, 1);
        }
        
        // 侧翼装饰
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-15, 5);
        ctx.lineTo(-22, 12);
        ctx.lineTo(-15, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(15, 5);
        ctx.lineTo(22, 12);
        ctx.lineTo(15, 10);
        ctx.fill();
        
        ctx.restore();
        
        // 冰封领域效果
        if (this.skillEffects.iceField) {
            ctx.save();
            ctx.strokeStyle = 'rgba(162, 155, 254, 0.4)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
            ctx.stroke();
            
            // 内部淡蓝色光晕
            const iceGradient = ctx.createRadialGradient(this.x, this.y, 50, this.x, this.y, 150);
            iceGradient.addColorStop(0, 'rgba(162, 155, 254, 0.1)');
            iceGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = iceGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 150, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // 绘制风技能分身
        if (this.skillEffects.windDance && this.clones.length > 0) {
            this.clones.forEach(clone => {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.translate(clone.x, clone.y);
                
                // 分身飞船（简化版）
                const bodyGradient = ctx.createLinearGradient(0, -20, 0, 15);
                bodyGradient.addColorStop(0, '#85e3ff');
                bodyGradient.addColorStop(0.5, '#48dbfb');
                bodyGradient.addColorStop(1, '#0abde3');
                
                ctx.fillStyle = bodyGradient;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#48dbfb';
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(15, 12);
                ctx.lineTo(0, 8);
                ctx.lineTo(-15, 12);
                ctx.closePath();
                ctx.fill();
                
                // 核心
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, -3, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            });
        }
        
        // 绘制护盾 - 增强视觉效果
        if (this.shield > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);

            const time = Date.now() / 500;
            const pulse = Math.sin(time) * 0.2 + 0.8;

            // 护盾外圈 - 根据护盾值显示不同强度
            const shieldAlpha = Math.min(0.9, 0.4 + this.shield * 0.08);
            const shieldRadius = 45 + this.shield * 2;

            // 外层光晕
            ctx.shadowBlur = 25 + this.shield * 3;
            ctx.shadowColor = `rgba(0, 210, 211, ${shieldAlpha * pulse})`;

            // 绘制护盾外环 - 多层
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = `rgba(0, 210, 211, ${shieldAlpha * (1 - i * 0.3)})`;
                ctx.lineWidth = 4 - i;
                ctx.beginPath();
                ctx.arc(0, 0, shieldRadius + i * 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 护盾内部填充 - 更强的光晕效果
            const shieldGradient = ctx.createRadialGradient(0, 0, 20, 0, 0, shieldRadius);
            shieldGradient.addColorStop(0, `rgba(0, 210, 211, ${shieldAlpha * 0.5 * pulse})`);
            shieldGradient.addColorStop(0.5, `rgba(0, 210, 211, ${shieldAlpha * 0.2})`);
            shieldGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = shieldGradient;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.fill();

            // 护盾能量线条 - 旋转效果
            ctx.strokeStyle = `rgba(0, 210, 211, ${shieldAlpha * 0.6})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (time + i * Math.PI / 3) % (Math.PI * 2);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
                ctx.lineTo(Math.cos(angle) * shieldRadius, Math.sin(angle) * shieldRadius);
                ctx.stroke();
            }

            // 护盾数值显示 - 更大的字体和发光效果
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d2d3';
            ctx.fillText(`🛡️${this.shield}`, 0, -shieldRadius - 10);

            ctx.restore();
        }
    }
}

// ==================== 子弹类 ====================
class Bullet {
    constructor(x, y, vx, vy, damage, color, type, penetrate = false, radius = 5) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;
        this.type = type;
        this.penetrate = penetrate;
        this.active = true;
        this.radius = radius;
        this.hitEnemies = new Set();
        this.fromEnemy = false;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        
        if (Math.random() < 0.3 && window.game) {
            window.game.particles.push(new Particle(this.x, this.y, this.color, 1, 0.3));
        }
    }
    
    hit(target, game) {
        if (this.hitEnemies.has(target)) return;
        
        let damage = this.damage;
        
        if (this.type === 'thunder' && game.player && game.player.skillEffects.thunderChain) {
            damage *= 2;
            game.enemies.forEach(enemy => {
                if (enemy !== target && enemy.active) {
                    const dx = enemy.x - target.x;
                    const dy = enemy.y - target.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        enemy.takeDamage(damage * 0.5, game);
                        for (let i = 0; i < 5; i++) {
                            game.particles.push(new Particle(
                                target.x + (enemy.x - target.x) * (i / 5),
                                target.y + (enemy.y - target.y) * (i / 5),
                                '#feca57', 2, 0.2
                            ));
                        }
                    }
                }
            });
        }
        
        if (this.type === 'ice') {
            target.speedMultiplier = 0.6;
            target.slowTime = 2;
        }
        
        if (this.type === 'fire') {
            target.burning = 3;
        }
        
        target.takeDamage(damage, game);
        
        if (!this.penetrate) {
            this.active = false;
        } else {
            this.hitEnemies.add(target);
        }
        
        game.createParticles(this.x, this.y, this.color, 5);
    }
    
    render(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 加速子弹类 ====================
class AcceleratingBullet extends Bullet {
    constructor(x, y, vx, vy, damage, color, type, initialSpeed) {
        super(x, y, vx * initialSpeed, vy * initialSpeed, damage, color, type);
        this.directionX = vx;
        this.directionY = vy;
        this.currentSpeed = initialSpeed;
        this.maxSpeed = initialSpeed * 3;
        this.acceleration = initialSpeed * 0.02;
        this.fromEnemy = true;
    }
    
    update(dt) {
        // 逐渐加速
        if (this.currentSpeed < this.maxSpeed) {
            this.currentSpeed += this.acceleration;
        }
        
        this.vx = this.directionX * this.currentSpeed;
        this.vy = this.directionY * this.currentSpeed;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // 加速时产生粒子效果
        if (Math.random() < 0.5 && window.game) {
            window.game.particles.push(new Particle(this.x, this.y, this.color, 1.5, 0.3));
        }
    }
    
    render(ctx) {
        ctx.save();
        // 根据速度改变大小和颜色强度
        const speedRatio = this.currentSpeed / this.maxSpeed;
        const size = this.radius * (1 + speedRatio);
        
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15 + speedRatio * 10;
        ctx.shadowColor = this.color;
        
        // 绘制拖尾效果
        const gradient = ctx.createLinearGradient(
            this.x - this.vx * 3, this.y - this.vy * 3,
            this.x, this.y
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, this.color);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x - this.vx * 3, this.y - this.vy * 3);
        ctx.lineTo(this.x + size, this.y);
        ctx.lineTo(this.x, this.y + size);
        ctx.lineTo(this.x - size, this.y);
        ctx.closePath();
        ctx.fill();
        
        // 核心
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 追踪子弹类 ====================
class HomingBullet extends Bullet {
    constructor(x, y, vx, vy, damage, color, type, target) {
        super(x, y, vx, vy, damage, color, type);
        this.target = target;
        this.homingStrength = 0.08;
        this.maxSpeed = Math.sqrt(vx * vx + vy * vy) * 1.5;
        this.fromEnemy = true;
        this.lifeTime = 0;
        this.maxLifeTime = 5; // 5秒后自动销毁
    }
    
    update(dt) {
        this.lifeTime += dt;
        
        if (this.lifeTime > this.maxLifeTime) {
            this.active = false;
            return;
        }
        
        // 追踪目标
        if (this.target && this.target.active !== false) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // 计算朝向目标的方向
                const targetVx = (dx / dist) * this.maxSpeed;
                const targetVy = (dy / dist) * this.maxSpeed;
                
                // 平滑转向
                this.vx += (targetVx - this.vx) * this.homingStrength;
                this.vy += (targetVy - this.vy) * this.homingStrength;
                
                // 限制最大速度
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > this.maxSpeed) {
                    this.vx = (this.vx / currentSpeed) * this.maxSpeed;
                    this.vy = (this.vy / currentSpeed) * this.maxSpeed;
                }
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // 追踪时产生粒子效果
        if (Math.random() < 0.4 && window.game) {
            window.game.particles.push(new Particle(this.x, this.y, '#ff9ff3', 1, 0.2));
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // 计算旋转角度
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // 追踪弹特效 - 菱形
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff9ff3';
        
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(0, -8);
        ctx.lineTo(-10, 0);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        
        // 核心发光
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 敌人类 ====================
class Enemy {
    constructor(x, y, type, level) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = level;
        this.active = true;
        this.speedMultiplier = 1;
        this.slowTime = 0;
        this.burning = 0;
        
        switch(type) {
            case 'basic':
                this.size = 30; this.radius = 15;
                this.health = 30 + level * 5;
                this.speed = 2 + level * 0.1;
                this.damage = 10; this.score = 10; this.xp = 10;
                this.color = '#ff6b6b';
                break;
            case 'fast':
                this.size = 25; this.radius = 12;
                this.health = 20 + level * 3;
                this.speed = 4 + level * 0.15;
                this.damage = 8; this.score = 15; this.xp = 15;
                this.color = '#48dbfb';
                break;
            case 'tank':
                this.size = 45; this.radius = 22;
                this.health = 80 + level * 10;
                this.speed = 1 + level * 0.05;
                this.damage = 15; this.score = 25; this.xp = 25;
                this.color = '#a29bfe';
                break;
            case 'shooter':
                this.size = 30; this.radius = 15;
                this.health = 40 + level * 5;
                this.speed = 1.5 + level * 0.08;
                this.damage = 12; this.score = 20; this.xp = 20;
                this.color = '#feca57';
                this.lastShot = 0;
                break;
        }
        this.maxHealth = this.health;
    }
    
    update(dt, game) {
        if (this.slowTime > 0) {
            this.slowTime -= dt;
            if (this.slowTime <= 0) this.speedMultiplier = 1;
        }
        
        if (this.burning > 0) {
            this.burning -= dt;
            this.health -= 2 * dt;
            if (Math.random() < 0.3) {
                game.particles.push(new Particle(this.x, this.y, '#ff6b6b', 1, 0.3));
            }
        }
        
        const dx = game.player.x - this.x;
        const dy = game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * this.speedMultiplier;
            this.y += (dy / dist) * this.speed * this.speedMultiplier;
        }
        
        // 所有敌人都会发射子弹
        // 快速敌人(fast)从2级开始，其他从1级开始
        const canShoot = this.type === 'fast' ? this.level >= 2 : this.level >= 1;
        if (canShoot) {
            this.lastShot = (this.lastShot || 0) + dt * 1000;
            const shotInterval = this.getShotInterval();
            if (this.lastShot > shotInterval) {
                this.shoot(game);
                this.lastShot = 0;
            }
        }
        
        if (this.health <= 0) {
            this.die(game);
        }
    }
    
    getShotInterval() {
        // 根据敌人类型返回不同的射击间隔，随等级提高而加快
        // 每升1级加快500ms，但基础间隔降低
        const levelBonus = Math.max(0, (this.level - 1) * 500); // 每升1级加快500ms
        
        switch(this.type) {
            case 'basic': return Math.max(2000, 4000 - levelBonus);      // 基础敌人4秒一发，最低2秒
            case 'fast': return Math.max(800, 1500 - levelBonus);        // 快速敌人1.5秒一发，最低0.8秒（保持较快）
            case 'tank': return Math.max(3000, 5000 - levelBonus);       // 坦克敌人5秒一发，最低3秒
            case 'shooter': return Math.max(1200, 2500 - levelBonus);    // 射击敌人2.5秒一发，最低1.2秒
            default: return 3000;
        }
    }
    
    shoot(game) {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        
        // 敌人子弹伤害系数（比BOSS低很多，让玩家有耐久体验）
        const damageScale = 0.3; // 只有30%的面板伤害
        
        // 子弹速度固定，不随等级提升
        switch(this.type) {
            case 'basic':
                // 基础敌人 - 2连发（随等级增加）
                const basicCount = Math.min(3, 1 + Math.floor(this.level / 5));
                for (let i = 0; i < basicCount; i++) {
                    setTimeout(() => {
                        if (this.active) {
                            const spreadAngle = angle + (Math.random() - 0.5) * 0.1;
                            this.createEnemyBullet(game, spreadAngle, 3.5, this.damage * damageScale, 4);
                        }
                    }, i * 150);
                }
                break;
            case 'fast':
                // 快速敌人 - 3连发快速弹
                const fastCount = Math.min(4, 2 + Math.floor(this.level / 4));
                for (let i = 0; i < fastCount; i++) {
                    setTimeout(() => {
                        if (this.active) {
                            const spreadAngle = angle + (Math.random() - 0.5) * 0.15;
                            const speed = 5 + Math.random() * 1.5;
                            this.createEnemyBullet(game, spreadAngle, speed, this.damage * damageScale * 0.8, 3);
                        }
                    }, i * 100);
                }
                break;
            case 'tank':
                // 坦克敌人 - 扇形散射5发
                const tankCount = Math.min(7, 3 + Math.floor(this.level / 3));
                const spreadAngle = Math.PI / 4; // 45度扇形
                for (let i = 0; i < tankCount; i++) {
                    const bulletAngle = angle - spreadAngle / 2 + (spreadAngle / (tankCount - 1)) * i;
                    this.createEnemyBullet(game, bulletAngle, 2.5, this.damage * damageScale * 1.2, 6);
                }
                break;
            case 'shooter':
                // 射击敌人 - 5连射
                const shooterCount = Math.min(6, 3 + Math.floor(this.level / 3));
                for (let i = 0; i < shooterCount; i++) {
                    setTimeout(() => {
                        if (this.active) {
                            const spreadAngle = angle + (Math.random() - 0.5) * 0.25;
                            this.createEnemyBullet(game, spreadAngle, 4.5, this.damage * damageScale, 4);
                        }
                    }, i * 80);
                }
                break;
        }
    }
    
    createEnemyBullet(game, angle, speed, damage, radius) {
        const bullet = new Bullet(
            this.x, this.y,
            Math.cos(angle) * speed, Math.sin(angle) * speed,
            damage, this.color, this.type
        );
        bullet.fromEnemy = true;
        bullet.radius = radius;
        game.bullets.push(bullet);
    }
    
    takeDamage(damage, game) {
        if (this.dying || !this.active) return;  // 如果正在死亡或已不活跃，不再受伤
        this.health -= damage;
        this.showDamage(damage);
        if (this.health <= 0 && !this.dying) {
            this.dying = true;
            this.die(game);
        }
    }
    
    showDamage(damage) {
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.textContent = Math.floor(damage);
        el.style.left = this.x + 'px';
        el.style.top = this.y + 'px';
        el.style.color = this.burning > 0 ? '#ff6b6b' : '#fff';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
    
    die(game) {
        this.active = false;
        game.score += this.score;
        game.addXP(this.xp);
        game.createParticles(this.x, this.y, this.color, 15);
        game.screenShake(3);
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const time = Date.now() / 300;
        const pulse = 1 + Math.sin(time * 2) * 0.05;
        ctx.scale(pulse, pulse);
        
        // 根据敌人类型绘制不同形状
        switch(this.type) {
            case 'basic':
                this.renderBasic(ctx);
                break;
            case 'fast':
                this.renderFast(ctx);
                break;
            case 'tank':
                this.renderTank(ctx);
                break;
            case 'shooter':
                this.renderShooter(ctx);
                break;
        }
        
        ctx.restore();
        
        // 血条（在变换外绘制）
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - 22, this.y - this.size / 2 - 15, 44, 7);
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#f44336';
        ctx.fillRect(this.x - 20, this.y - this.size / 2 - 13, 40 * healthPercent, 3);
        
        // 减速效果
        if (this.speedMultiplier < 1) {
            ctx.save();
            ctx.strokeStyle = '#a29bfe';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // 燃烧效果
        if (this.burning > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 107, 107, ${0.2 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    renderBasic(ctx) {
        // 基础敌人 - 火焰恶魔造型
        const time = Date.now() / 200;
        const pulse = Math.sin(time) * 0.1 + 1;
        
        // 外层火焰光环
        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size/2 * pulse);
        outerGradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
        outerGradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.3)');
        outerGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体 - 菱形带尖刺
        const gradient = ctx.createLinearGradient(0, -this.size/2, 0, this.size/2);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#ff4757');
        gradient.addColorStop(1, '#c0392b');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff6b6b';
        ctx.beginPath();
        // 上尖
        ctx.moveTo(0, -this.size/2);
        ctx.lineTo(this.size/3, -this.size/6);
        ctx.lineTo(this.size/2, 0);
        ctx.lineTo(this.size/3, this.size/6);
        // 下尖
        ctx.lineTo(0, this.size/2);
        ctx.lineTo(-this.size/3, this.size/6);
        ctx.lineTo(-this.size/2, 0);
        ctx.lineTo(-this.size/3, -this.size/6);
        ctx.closePath();
        ctx.fill();
        
        // 邪恶眼睛
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.ellipse(-5, -3, 4, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(5, -3, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳孔
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-5, -3, 2, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(5, -3, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 嘴巴
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 5, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
    
    renderFast(ctx) {
        // 快速敌人 - 闪电幽灵造型
        const time = Date.now() / 100;
        
        // 闪电拖尾
        ctx.strokeStyle = 'rgba(72, 219, 251, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#48dbfb';
        for (let i = 0; i < 3; i++) {
            const offset = (time + i * 2) % 10;
            ctx.beginPath();
            ctx.moveTo(-8 + Math.sin(time + i) * 3, this.size/2 + offset);
            ctx.lineTo(0, this.size/2 + offset + 8);
            ctx.lineTo(8 + Math.cos(time + i) * 3, this.size/2 + offset);
            ctx.stroke();
        }
        
        // 主体 - 流线型
        const gradient = ctx.createLinearGradient(0, -this.size/2, 0, this.size/2);
        gradient.addColorStop(0, '#48dbfb');
        gradient.addColorStop(0.5, '#0abde3');
        gradient.addColorStop(1, '#0984e3');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        // 尖头
        ctx.moveTo(0, -this.size/2);
        ctx.quadraticCurveTo(this.size/2, -this.size/4, this.size/3, this.size/3);
        ctx.lineTo(0, this.size/2);
        ctx.lineTo(-this.size/3, this.size/3);
        ctx.quadraticCurveTo(-this.size/2, -this.size/4, 0, -this.size/2);
        ctx.closePath();
        ctx.fill();
        
        // 能量核心
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 闪电纹路
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.lineTo(0, 0);
        ctx.lineTo(3, -8);
        ctx.stroke();
    }
    
    renderTank(ctx) {
        // 坦克敌人 - 重装机械造型
        const time = Date.now() / 300;
        
        // 护盾光环
        ctx.strokeStyle = `rgba(162, 155, 254, ${0.5 + Math.sin(time) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#a29bfe';
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // 主体 - 厚重六边形
        const gradient = ctx.createLinearGradient(-this.size/2, -this.size/2, this.size/2, this.size/2);
        gradient.addColorStop(0, '#a29bfe');
        gradient.addColorStop(0.5, '#6c5ce7');
        gradient.addColorStop(1, '#5f3dc4');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a29bfe';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const r = this.size/2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 装甲板
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const r = this.size/3;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 核心能量
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 装甲铆钉
        ctx.fillStyle = '#4834d4';
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + Math.PI / 6;
            const r = this.size/2.5;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderShooter(ctx) {
        // 射击敌人 - 狙击炮台造型
        const time = Date.now() / 200;
        const aimAngle = Math.sin(time) * 0.3;
        
        // 瞄准线
        ctx.strokeStyle = 'rgba(254, 202, 87, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(aimAngle) * 60, Math.cos(aimAngle) * 60);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 主体 - 圆形炮台
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size/2);
        gradient.addColorStop(0, '#feca57');
        gradient.addColorStop(0.5, '#f39c12');
        gradient.addColorStop(1, '#d68910');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 旋转炮塔底座
        ctx.strokeStyle = '#b7791f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.size/3, 0, Math.PI * 2);
        ctx.stroke();
        
        // 炮管（可旋转）
        ctx.save();
        ctx.rotate(aimAngle);
        
        // 炮管主体
        const barrelGradient = ctx.createLinearGradient(0, 0, 0, this.size/2 + 10);
        barrelGradient.addColorStop(0, '#f39c12');
        barrelGradient.addColorStop(1, '#8e44ad');
        ctx.fillStyle = barrelGradient;
        ctx.fillRect(-6, 0, 12, this.size/2 + 12);
        
        // 炮口发光
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(0, this.size/2 + 12, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // 瞄准镜
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
}

// ==================== BOSS类 ====================
class Boss {
    constructor(x, y, isMiniBoss = false) {
        this.x = x;
        this.y = y;
        this.isMiniBoss = isMiniBoss;
        this.size = isMiniBoss ? 100 : 140;
        this.radius = isMiniBoss ? 50 : 70;
        this.maxHealth = isMiniBoss ? 3000 : 6000;  // 小BOSS 3000，大BOSS 6000
        this.health = this.maxHealth;
        this.speed = isMiniBoss ? 1.5 : 1.2;
        this.active = true;
        this.phase = 1;
        this.lastAttack = 0;
        this.attackInterval = isMiniBoss ? 2000 : 2500;
        this.targetX = x;
        this.targetY = y;
        this.name = isMiniBoss ? '精英守卫' : '元素吞噬者';
        this.damageMultiplier = isMiniBoss ? 0.25 : 0.3;  // 进一步降低伤害倍率
        this.bulletSpeed = isMiniBoss ? 3.5 : 3;  // 降低子弹速度，便于躲避
        this.attackPatterns = isMiniBoss ? 
            ['spread', 'laser', 'fan', 'ring'] : 
            ['spread', 'laser', 'spiral', 'fan', 'ring', 'burst', 'cross', 'accelerate', 'homing'];
        this.rageMode = false;
        this.dying = false;  // 防止重复死亡
    }
    
    update(dt, game) {
        if (this.dying || !this.active) return;  // 如果正在死亡或已不活跃，跳过更新
        
        const healthPercent = this.health / this.maxHealth;
        
        // 阶段转换 - 更平滑的难度曲线
        if (healthPercent < 0.75 && this.phase === 1) {
            this.phase = 2;
            this.attackInterval = 2000;
            this.damageMultiplier = this.isMiniBoss ? 0.4 : 0.5;  // 降低伤害增长
            this.bulletSpeed = 3.8;  // 稍微加速但仍较慢
            this.attackPatterns = ['spread', 'laser'];
            game.screenShake(10);
        } else if (healthPercent < 0.5 && this.phase === 2) {
            this.phase = 3;
            this.attackInterval = 1500;
            this.speed = 1.8;
            this.damageMultiplier = this.isMiniBoss ? 0.55 : 0.7;  // 降低伤害增长
            this.bulletSpeed = 4.5;  // 中等速度
            this.attackPatterns = ['spread', 'laser', 'spiral'];
            game.screenShake(15);
        } else if (healthPercent < 0.25 && this.phase === 3) {
            this.phase = 4;  // 新增第4阶段 - 狂暴模式
            this.rageMode = true;
            this.attackInterval = 1000;
            this.speed = 2.5;
            this.damageMultiplier = this.isMiniBoss ? 0.75 : 0.9;  // 狂暴模式伤害适中
            this.bulletSpeed = 5.5;  // 狂暴模式速度适中，不至于太快
            this.attackPatterns = ['spread', 'laser', 'spiral', 'chaos'];
            game.screenShake(20);
        }
        
        // BOSS移动 - 更智能的追踪
        this.targetX = game.player.x;
        this.targetY = Math.min(game.player.y - 150, game.height * 0.25);
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        this.x += dx * this.speed * dt * 0.8;
        this.y += dy * this.speed * dt * 0.8;
        
        // 狂暴模式下额外移动
        if (this.rageMode) {
            this.x += Math.sin(Date.now() / 500) * 2;
        }
        
        this.lastAttack += dt * 1000;
        if (this.lastAttack > this.attackInterval) {
            this.attack(game);
            this.lastAttack = 0;
        }
        
        // 狂暴模式下额外攻击
        if (this.rageMode && this.lastAttack > this.attackInterval * 0.5) {
            if (Math.random() < 0.3) {
                this.quickShot(game);
            }
        }
        
        if (this.health <= 0 && !this.dying) {
            this.dying = true;
            this.die(game);
        }
    }
    
    attack(game) {
        const pattern = this.attackPatterns[Math.floor(Math.random() * this.attackPatterns.length)];
        switch(pattern) {
            case 'spread': this.spreadShot(game); break;
            case 'laser': this.laserShot(game); break;
            case 'spiral': this.spiralShot(game); break;
            case 'chaos': this.chaosShot(game); break;
            case 'fan': this.fanShot(game); break;
            case 'ring': this.ringShot(game); break;
            case 'burst': this.burstShot(game); break;
            case 'cross': this.crossShot(game); break;
            case 'accelerate': this.accelerateShot(game); break;
            case 'homing': this.homingShot(game); break;
        }
    }
    
    spreadShot(game) {
        const bulletCount = 10 + this.phase * 3;
        const waves = this.rageMode ? 2 : 1;
        
        for (let w = 0; w < waves; w++) {
            setTimeout(() => {
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (Math.PI * 2 / bulletCount) * i + (w * Math.PI / bulletCount);
                    const bullet = new Bullet(
                        this.x, this.y + this.size / 2,
                        Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed,
                        15 * this.damageMultiplier, '#ff6b6b', 'boss'
                    );
                    bullet.fromEnemy = true;
                    bullet.radius = 8 + this.phase;
                    game.bullets.push(bullet);
                }
                game.screenShake(5);
            }, w * 300);
        }
    }
    
    laserShot(game) {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        const bulletCount = 5 + this.phase * 2;
        
        for (let i = 0; i < bulletCount; i++) {
            setTimeout(() => {
                const bullet = new Bullet(
                    this.x, this.y + this.size / 2,
                    Math.cos(angle) * (this.bulletSpeed + i * 0.5), Math.sin(angle) * (this.bulletSpeed + i * 0.5),
                    20 * this.damageMultiplier, '#feca57', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 10 + this.phase;
                game.bullets.push(bullet);
            }, i * 100);
        }
        game.screenShake(3);
    }
    
    spiralShot(game) {
        const time = Date.now() / 1000;
        const bulletCount = 12 + this.phase * 3;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i + time;
            const bullet = new Bullet(
                this.x, this.y,
                Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed,
                12 * this.damageMultiplier, '#a29bfe', 'boss'
            );
            bullet.fromEnemy = true;
            bullet.radius = 6 + this.phase;
            game.bullets.push(bullet);
        }
        
        // 追踪弹
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        const trackingBullet = new Bullet(
            this.x, this.y,
            Math.cos(angle) * (this.bulletSpeed + 2), Math.sin(angle) * (this.bulletSpeed + 2),
            25 * this.damageMultiplier, '#ff6b6b', 'boss'
        );
        trackingBullet.fromEnemy = true;
        trackingBullet.radius = 12 + this.phase;
        game.bullets.push(trackingBullet);
        game.screenShake(8);
    }
    
    chaosShot(game) {
        // 狂暴模式专属 - 随机弹幕
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = this.bulletSpeed + Math.random() * 3;
            const bullet = new Bullet(
                this.x, this.y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                18 * this.damageMultiplier, '#e74c3c', 'boss'
            );
            bullet.fromEnemy = true;
            bullet.radius = 6 + Math.random() * 6;
            game.bullets.push(bullet);
        }
        game.screenShake(10);
    }
    
    quickShot(game) {
        // 快速射击
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        const bullet = new Bullet(
            this.x, this.y,
            Math.cos(angle) * 8, Math.sin(angle) * 8,
            15 * this.damageMultiplier, '#fff', 'boss'
        );
        bullet.fromEnemy = true;
        bullet.radius = 5;
        game.bullets.push(bullet);
    }
    
    // 1. 扇形散弹 - 大范围扇形弹幕
    fanShot(game) {
        const bulletCount = 15 + this.phase * 3;
        const fanAngle = Math.PI / 2; // 90度扇形
        const startAngle = -Math.PI / 2 - fanAngle / 2; // 指向上方
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = startAngle + (fanAngle / (bulletCount - 1)) * i;
            const speed = this.bulletSpeed * (0.8 + Math.random() * 0.4);
            const bullet = new Bullet(
                this.x, this.y + this.size / 2,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                12 * this.damageMultiplier, '#ff6b6b', 'boss'
            );
            bullet.fromEnemy = true;
            bullet.radius = 6 + this.phase;
            game.bullets.push(bullet);
        }
        
        // 快慢弹组合 - 第二波慢速弹
        setTimeout(() => {
            for (let i = 0; i < bulletCount / 2; i++) {
                const angle = startAngle + (fanAngle / (bulletCount / 2 - 1)) * i;
                const bullet = new Bullet(
                    this.x, this.y + this.size / 2,
                    Math.cos(angle) * this.bulletSpeed * 0.5, Math.sin(angle) * this.bulletSpeed * 0.5,
                    18 * this.damageMultiplier, '#ff4757', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 8 + this.phase;
                game.bullets.push(bullet);
            }
        }, 400);
        
        game.screenShake(6);
    }
    
    // 2. 环形弹幕 - 多层环形扩散
    ringShot(game) {
        const ringCount = 2 + Math.floor(this.phase / 2);
        
        for (let r = 0; r < ringCount; r++) {
            setTimeout(() => {
                const bulletCount = 16 + this.phase * 2;
                const offsetAngle = r * Math.PI / bulletCount;
                
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (Math.PI * 2 / bulletCount) * i + offsetAngle;
                    const speed = this.bulletSpeed * (0.6 + r * 0.3);
                    const bullet = new Bullet(
                        this.x, this.y,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        14 * this.damageMultiplier, '#a29bfe', 'boss'
                    );
                    bullet.fromEnemy = true;
                    bullet.radius = 7 + this.phase;
                    game.bullets.push(bullet);
                }
            }, r * 300);
        }
        
        game.screenShake(5);
    }
    
    // 3. 定向连射 - 快速连续射击
    burstShot(game) {
        const burstCount = 5 + this.phase * 2;
        let baseAngle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        
        for (let i = 0; i < burstCount; i++) {
            setTimeout(() => {
                // 轻微散射
                const angle = baseAngle + (Math.random() - 0.5) * 0.2;
                const speed = this.bulletSpeed * (1.2 + i * 0.1);
                const bullet = new Bullet(
                    this.x, this.y + this.size / 2,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    16 * this.damageMultiplier, '#feca57', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 6 + this.phase;
                game.bullets.push(bullet);
                
                // 每3发加一发慢速大弹
                if (i % 3 === 0) {
                    const slowBullet = new Bullet(
                        this.x, this.y + this.size / 2,
                        Math.cos(angle) * this.bulletSpeed * 0.4, Math.sin(angle) * this.bulletSpeed * 0.4,
                        25 * this.damageMultiplier, '#d68910', 'boss'
                    );
                    slowBullet.fromEnemy = true;
                    slowBullet.radius = 12 + this.phase;
                    game.bullets.push(slowBullet);
                }
            }, i * 80);
        }
        
        game.screenShake(4);
    }
    
    // 4. 交叉封锁 - 交叉弹幕封锁移动
    crossShot(game) {
        const armCount = 4 + this.phase;
        
        for (let arm = 0; arm < armCount; arm++) {
            const baseAngle = (Math.PI * 2 / armCount) * arm;
            
            // 每条臂发射3发子弹，不同速度形成交叉
            for (let i = 0; i < 3; i++) {
                const speed = this.bulletSpeed * (0.5 + i * 0.4);
                const bullet = new Bullet(
                    this.x, this.y,
                    Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed,
                    15 * this.damageMultiplier, '#00d2d3', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 7 + this.phase;
                game.bullets.push(bullet);
            }
        }
        
        // 补充对角线封锁
        setTimeout(() => {
            for (let arm = 0; arm < armCount; arm++) {
                const baseAngle = (Math.PI * 2 / armCount) * arm + Math.PI / armCount;
                const bullet = new Bullet(
                    this.x, this.y,
                    Math.cos(baseAngle) * this.bulletSpeed * 0.7, Math.sin(baseAngle) * this.bulletSpeed * 0.7,
                    20 * this.damageMultiplier, '#54a0ff', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 9 + this.phase;
                game.bullets.push(bullet);
            }
        }, 350);
        
        game.screenShake(6);
    }
    
    // 5. 渐变加速弹 - 速度逐渐加快的子弹
    accelerateShot(game) {
        const waveCount = 3 + this.phase;
        const bulletsPerWave = 6;
        
        for (let w = 0; w < waveCount; w++) {
            setTimeout(() => {
                const baseAngle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                
                for (let i = 0; i < bulletsPerWave; i++) {
                    const angle = baseAngle + (i - bulletsPerWave / 2) * 0.15;
                    const bullet = new AcceleratingBullet(
                        this.x, this.y + this.size / 2,
                        Math.cos(angle), Math.sin(angle),
                        12 * this.damageMultiplier, '#5f27cd', 'boss',
                        this.bulletSpeed * (0.3 + w * 0.2)
                    );
                    bullet.fromEnemy = true;
                    bullet.radius = 6 + this.phase;
                    game.bullets.push(bullet);
                }
            }, w * 400);
        }
        
        game.screenShake(5);
    }
    
    // 6. 追踪弹 - 追踪玩家的子弹
    homingShot(game) {
        const homingCount = 3 + this.phase;
        
        for (let i = 0; i < homingCount; i++) {
            setTimeout(() => {
                const bullet = new HomingBullet(
                    this.x, this.y + this.size / 2,
                    0, this.bulletSpeed * 0.6,
                    20 * this.damageMultiplier, '#ff9ff3', 'boss',
                    game.player
                );
                bullet.fromEnemy = true;
                bullet.radius = 10 + this.phase;
                game.bullets.push(bullet);
            }, i * 250);
        }
        
        // 配合普通弹幕增加压力
        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const bullet = new Bullet(
                    this.x, this.y,
                    Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed,
                    10 * this.damageMultiplier, '#f368e0', 'boss'
                );
                bullet.fromEnemy = true;
                bullet.radius = 5;
                game.bullets.push(bullet);
            }
        }, 300);
        
        game.screenShake(7);
    }

    takeDamage(damage, game) {
        if (this.dying || !this.active) return;  // 如果正在死亡或已不活跃，不再受伤
        this.health -= damage;
        this.showDamage(damage);
        if (this.health <= 0 && !this.dying) {
            this.dying = true;
            this.die(game);
        }
    }

    showDamage(damage) {
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.textContent = Math.floor(damage);
        el.style.left = this.x + 'px';
        el.style.top = this.y + 'px';
        el.style.fontSize = '24px';
        el.style.color = '#feca57';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
    
    die(game) {
        if (!this.active) return;  // 防止重复死亡
        this.active = false;
        game.score += this.isMiniBoss ? 500 : 1000;
        game.createParticles(this.x, this.y, '#ff6b6b', 50);
        game.screenShake(20);

        // 大BOSS死亡或最终守卫死亡都触发胜利
        if (!this.isMiniBoss) {
            game.gameOver(true);
        } else if (this.isFinalGuard) {
            // 最终守卫死亡，游戏胜利
            game.gameOver(true);
        } else {
            // 普通精英守卫死亡，更换背景
            game.backgroundPhase = (game.backgroundPhase || 0) + 1;
        }

        // 延迟添加XP，避免在死亡处理过程中触发升级导致状态冲突
        setTimeout(() => {
            if (game && game.addXP) {
                game.addXP(this.isMiniBoss ? 300 : 500);
            }
        }, 100);
    }
    
    render(ctx) {
        ctx.save();
        const time = Date.now() / 1000;
        
        if (this.isFinalGuard) {
            // 最终守卫（大BOSS）- 威严的魔王形象
            this.renderFinalGuard(ctx, time);
        } else if (this.isMiniBoss) {
            // 精英守卫 - 装甲骑士形象
            this.renderEliteGuard(ctx, time);
        } else {
            // 普通BOSS渲染（备用）
            this.renderNormalBoss(ctx, time);
        }
        
        ctx.restore();
    }
    
    renderFinalGuard(ctx, time) {
        const pulse = Math.sin(time * 2) * 0.1 + 1;
        const size = this.size * pulse;
        
        // 外圈黑暗光环
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#2d1b4e';
        ctx.fillStyle = 'rgba(45, 27, 78, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体 - 暗紫色魔王核心
        const gradient = ctx.createRadialGradient(
            this.x - size * 0.2, this.y - size * 0.2, 0,
            this.x, this.y, size / 2
        );
        gradient.addColorStop(0, '#9b59b6');
        gradient.addColorStop(0.5, '#6c3483');
        gradient.addColorStop(1, '#2d1b4e');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#9b59b6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 魔王之眼（中央发光核心）
        ctx.fillStyle = '#e74c3c';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#e74c3c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳孔
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 16, 0, Math.PI * 2);
        ctx.fill();
        
        // 旋转的黑暗能量环
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time * 0.5;
            const radius = size / 2 + 15 + Math.sin(time * 3 + i) * 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, angle, angle + Math.PI / 2);
            ctx.stroke();
        }
        
        // 尖刺装饰（魔王之角）
        ctx.fillStyle = '#4a235a';
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const spikeLength = size * 0.4;
            const x1 = this.x + Math.cos(angle) * (size / 2);
            const y1 = this.y + Math.sin(angle) * (size / 2);
            const x2 = this.x + Math.cos(angle) * (size / 2 + spikeLength);
            const y2 = this.y + Math.sin(angle) * (size / 2 + spikeLength);
            const x3 = this.x + Math.cos(angle + 0.2) * (size / 2 + spikeLength * 0.7);
            const y3 = this.y + Math.sin(angle + 0.2) * (size / 2 + spikeLength * 0.7);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    renderEliteGuard(ctx, time) {
        const pulse = Math.sin(time * 3) * 0.05 + 1;
        const size = this.size * pulse;
        
        // 外圈能量光环
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.phase === 2 ? '#f39c12' : '#3498db';
        ctx.fillStyle = this.phase === 2 ? 'rgba(243, 156, 18, 0.2)' : 'rgba(52, 152, 219, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体 - 金属装甲质感
        const gradient = ctx.createRadialGradient(
            this.x - size * 0.15, this.y - size * 0.15, 0,
            this.x, this.y, size / 2
        );
        if (this.phase === 2) {
            // 第二阶段 - 金色装甲
            gradient.addColorStop(0, '#f1c40f');
            gradient.addColorStop(0.5, '#e67e22');
            gradient.addColorStop(1, '#d35400');
        } else {
            // 第一阶段 - 蓝色装甲
            gradient.addColorStop(0, '#5dade2');
            gradient.addColorStop(0.5, '#2980b9');
            gradient.addColorStop(1, '#1a5276');
        }
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.phase === 2 ? '#f1c40f' : '#5dade2';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 装甲核心
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 装甲纹路
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(angle) * (size / 2 - 5),
                this.y + Math.sin(angle) * (size / 2 - 5)
            );
            ctx.stroke();
        }
        
        // 旋转护盾环
        ctx.strokeStyle = this.phase === 2 ? 'rgba(241, 196, 15, 0.5)' : 'rgba(93, 173, 226, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2 + 8, time, time + Math.PI * 1.5);
        ctx.stroke();
    }
    
    renderNormalBoss(ctx, time) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size / 2);
        if (this.phase === 1) {
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(1, '#c0392b');
        } else if (this.phase === 2) {
            gradient.addColorStop(0, '#feca57');
            gradient.addColorStop(1, '#d35400');
        } else {
            gradient.addColorStop(0, '#a29bfe');
            gradient.addColorStop(1, '#8e44ad');
        }
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.phase === 3 ? '#a29bfe' : this.phase === 2 ? '#feca57' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i + time;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 10, angle, angle + Math.PI / 3);
            ctx.stroke();
        }
    }
}

// ==================== 粒子类 ====================
class Particle {
    constructor(x, y, color, size = 3, life = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.active = true;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        this.size *= 0.98;
        
        if (this.life <= 0 || this.size < 0.5) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 风刃粒子 ====================
class WindParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 0.5 + Math.random() * 0.3;
        this.maxLife = this.life;
        this.active = true;
        this.width = 20 + Math.random() * 15;
        this.height = 3 + Math.random() * 2;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        this.width *= 0.98;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.7;
        ctx.fillStyle = '#48dbfb';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 速度线粒子 ====================
class SpeedLine {
    constructor(x, y) {
        this.x = x + (Math.random() - 0.5) * 60;
        this.y = y + 30 + Math.random() * 40;
        this.vy = -8 - Math.random() * 4;
        this.length = 20 + Math.random() * 20;
        this.life = 0.4;
        this.maxLife = this.life;
        this.active = true;
    }
    
    update(dt) {
        this.y += this.vy;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.6;
        ctx.strokeStyle = '#a8c0ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
        ctx.restore();
    }
}

// ==================== 闪电粒子 ====================
class LightningParticle {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.life = 0.15 + Math.random() * 0.1;
        this.maxLife = this.life;
        this.active = true;
        this.segments = this.generateSegments();
    }
    
    generateSegments() {
        const segments = [];
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const count = Math.floor(dist / 8);
        
        let x = this.x1;
        let y = this.y1;
        
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / count;
            const targetX = this.x1 + dx * t;
            const targetY = this.y1 + dy * t;
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = (Math.random() - 0.5) * 15;
            
            segments.push({
                x1: x,
                y1: y,
                x2: targetX + offsetX,
                y2: targetY + offsetY
            });
            
            x = targetX + offsetX;
            y = targetY + offsetY;
        }
        
        segments.push({
            x1: x,
            y1: y,
            x2: this.x2,
            y2: this.y2
        });
        
        return segments;
    }
    
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#feca57';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x1, this.segments[0].y1);
        for (const seg of this.segments) {
            ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        
        // 内部亮线
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.stroke();
        
        ctx.restore();
    }
}

// ==================== 大范围闪电粒子 ====================
class BigLightningParticle {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.life = 0.2 + Math.random() * 0.15;
        this.maxLife = this.life;
        this.active = true;
        this.segments = this.generateSegments();
        this.branches = this.generateBranches();
    }
    
    generateSegments() {
        const segments = [];
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const count = Math.floor(dist / 15);
        
        let x = this.x1;
        let y = this.y1;
        
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / count;
            const targetX = this.x1 + dx * t;
            const targetY = this.y1 + dy * t;
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            
            segments.push({
                x1: x,
                y1: y,
                x2: targetX + offsetX,
                y2: targetY + offsetY
            });
            
            x = targetX + offsetX;
            y = targetY + offsetY;
        }
        
        segments.push({
            x1: x,
            y1: y,
            x2: this.x2,
            y2: this.y2
        });
        
        return segments;
    }
    
    generateBranches() {
        const branches = [];
        const numBranches = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numBranches; i++) {
            const segIndex = Math.floor(Math.random() * (this.segments.length - 1)) + 1;
            const seg = this.segments[segIndex];
            const angle = Math.random() * Math.PI * 2;
            const length = 30 + Math.random() * 50;
            
            branches.push({
                x1: seg.x1,
                y1: seg.y1,
                x2: seg.x1 + Math.cos(angle) * length,
                y2: seg.y1 + Math.sin(angle) * length
            });
        }
        
        return branches;
    }
    
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        
        // 外层粗线
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 8;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#feca57';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.drawPath(ctx, this.segments);
        
        // 中层
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        this.drawPath(ctx, this.segments);
        
        // 内层亮线
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        this.drawPath(ctx, this.segments);
        
        // 绘制分支
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        for (const branch of this.branches) {
            ctx.beginPath();
            ctx.moveTo(branch.x1, branch.y1);
            ctx.lineTo(branch.x2, branch.y2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawPath(ctx, segments) {
        ctx.beginPath();
        ctx.moveTo(segments[0].x1, segments[0].y1);
        for (const seg of segments) {
            ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
    }
}

// ==================== 雷霆电火花粒子 ====================
class ThunderSparkParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 0.3 + Math.random() * 0.2;
        this.maxLife = this.life;
        this.active = true;
        this.size = 6 + Math.random() * 6;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= dt;
        this.size *= 0.95;
        
        if (this.life <= 0 || this.size < 1) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        
        // 外层光晕
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 内层核心
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 雷霆光环 ====================
class ThunderRing {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.maxRadius = 200;
        this.life = 0.4;
        this.maxLife = this.life;
        this.active = true;
    }
    
    update(dt) {
        this.radius += (this.maxRadius - this.radius) * 0.1;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.6;
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内部填充
        ctx.fillStyle = 'rgba(254, 202, 87, 0.1)';
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 超酷炫闪电粒子 ====================
class UltraLightningParticle {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.life = 0.25 + Math.random() * 0.15;
        this.maxLife = this.life;
        this.active = true;
        this.segments = this.generateSegments();
        this.branches = this.generateBranches();
        this.glowIntensity = 1 + Math.random();
    }
    
    generateSegments() {
        const segments = [];
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const count = Math.floor(dist / 12);
        
        let x = this.x1;
        let y = this.y1;
        
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / count;
            const targetX = this.x1 + dx * t;
            const targetY = this.y1 + dy * t;
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            
            segments.push({
                x1: x,
                y1: y,
                x2: targetX + offsetX,
                y2: targetY + offsetY
            });
            
            x = targetX + offsetX;
            y = targetY + offsetY;
        }
        
        segments.push({
            x1: x,
            y1: y,
            x2: this.x2,
            y2: this.y2
        });
        
        return segments;
    }
    
    generateBranches() {
        const branches = [];
        const numBranches = 3 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < numBranches; i++) {
            const segIndex = Math.floor(Math.random() * (this.segments.length - 1)) + 1;
            const seg = this.segments[segIndex];
            const angle = Math.random() * Math.PI * 2;
            const length = 40 + Math.random() * 80;
            
            const branchSegments = [];
            let bx = seg.x1;
            let by = seg.y1;
            const steps = 3 + Math.floor(Math.random() * 3);
            
            for (let j = 0; j < steps; j++) {
                const t = (j + 1) / steps;
                const targetX = seg.x1 + Math.cos(angle) * length * t;
                const targetY = seg.y1 + Math.sin(angle) * length * t;
                const offsetX = (Math.random() - 0.5) * 25;
                const offsetY = (Math.random() - 0.5) * 25;
                
                branchSegments.push({
                    x1: bx,
                    y1: by,
                    x2: targetX + offsetX,
                    y2: targetY + offsetY
                });
                
                bx = targetX + offsetX;
                by = targetY + offsetY;
            }
            
            branches.push(branchSegments);
        }
        
        return branches;
    }
    
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        
        // 外层超强光晕
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 12 * this.glowIntensity;
        ctx.shadowBlur = 50 * this.glowIntensity;
        ctx.shadowColor = '#feca57';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.drawPath(ctx, this.segments);
        
        // 中层光晕
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 30;
        this.drawPath(ctx, this.segments);
        
        // 内层核心
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        this.drawPath(ctx, this.segments);
        
        // 绘制分支
        for (const branch of this.branches) {
            ctx.strokeStyle = '#feca57';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            this.drawPath(ctx, branch);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            this.drawPath(ctx, branch);
        }
        
        ctx.restore();
    }
    
    drawPath(ctx, segments) {
        if (segments.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(segments[0].x1, segments[0].y1);
        for (const seg of segments) {
            ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
    }
}

// ==================== 雷霆核心爆发 ====================
class ThunderCore {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = 80;
        this.life = 0.5;
        this.maxLife = this.life;
        this.active = true;
        this.pulseCount = 0;
    }
    
    update(dt) {
        this.radius += (this.maxRadius - this.radius) * 0.15;
        this.life -= dt;
        this.pulseCount += dt * 20;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        
        // 脉冲效果
        const pulse = Math.sin(this.pulseCount) * 0.3 + 0.7;
        
        // 外圈光晕
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
        gradient.addColorStop(0.5, 'rgba(254, 202, 87, 0.4)');
        gradient.addColorStop(1, 'rgba(254, 202, 87, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#feca57';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 闪电纹路
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + this.pulseCount * 0.5;
            const r1 = this.radius * 0.3;
            const r2 = this.radius * 0.9;
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(angle) * r1, this.y + Math.sin(angle) * r1);
            ctx.lineTo(this.x + Math.cos(angle) * r2, this.y + Math.sin(angle) * r2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// ==================== 大风刃粒子 ====================
class BigWindParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 0.6 + Math.random() * 0.4;
        this.maxLife = this.life;
        this.active = true;
        this.width = 35 + Math.random() * 25;
        this.height = 6 + Math.random() * 4;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        this.width *= 0.97;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.9;
        
        // 外层光晕
        ctx.fillStyle = '#48dbfb';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 内层核心
        ctx.fillStyle = '#a8c0ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a8c0ff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 3, this.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 风之光环 ====================
class WindRing {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.maxRadius = 150;
        this.life = 0.5;
        this.maxLife = this.life;
        this.active = true;
    }
    
    update(dt) {
        this.radius += (this.maxRadius - this.radius) * 0.08;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.7;
        ctx.strokeStyle = '#48dbfb';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ==================== 大冰霜粒子 ====================
class BigIceParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.life = 1.2 + Math.random() * 0.6;
        this.maxLife = this.life;
        this.active = true;
        this.size = 8 + Math.random() * 8;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 3;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = (this.life / this.maxLife) * 0.9;
        
        // 外层光晕
        ctx.fillStyle = '#a29bfe';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#a29bfe';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const r = i % 2 === 0 ? this.size : this.size / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 内层核心
        ctx.fillStyle = '#e0e0ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e0e0ff';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const r = i % 2 === 0 ? this.size * 0.6 : this.size * 0.3;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 大雪花粒子 ====================
class BigSnowParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = -0.8 - Math.random() * 0.8;
        this.life = 2.5 + Math.random();
        this.maxLife = this.life;
        this.active = true;
        this.size = 4 + Math.random() * 5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = (this.life / this.maxLife) * 0.8;
        ctx.fillStyle = '#e0e0ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a29bfe';
        
        // 绘制六角雪花
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e0e0ff';
        ctx.stroke();
        
        // 中心点
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== 风分身粒子 ====================
class WindCloneParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 2 + 1;
        this.life = 0.5 + Math.random() * 0.3;
        this.maxLife = this.life;
        this.active = true;
        this.size = 3 + Math.random() * 3;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.6;
        ctx.fillStyle = '#48dbfb';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#48dbfb';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 冰霜光环 ====================
class IceRing {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 50;
        this.maxRadius = 180;
        this.life = 0.6;
        this.maxLife = this.life;
        this.active = true;
    }
    
    update(dt) {
        this.radius += (this.maxRadius - this.radius) * 0.06;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.7;
        ctx.strokeStyle = '#a29bfe';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#a29bfe';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内部填充
        ctx.fillStyle = 'rgba(162, 155, 254, 0.15)';
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 冰霜粒子 ====================
class IceParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.life = 1 + Math.random() * 0.5;
        this.maxLife = this.life;
        this.active = true;
        this.size = 4 + Math.random() * 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = (this.life / this.maxLife) * 0.8;
        ctx.fillStyle = '#a29bfe';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a29bfe';
        
        // 绘制六角星
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const r = i % 2 === 0 ? this.size : this.size / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// ==================== 雪花粒子 ====================
class SnowParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = -0.5 - Math.random() * 0.5;
        this.life = 2 + Math.random();
        this.maxLife = this.life;
        this.active = true;
        this.size = 2 + Math.random() * 3;
    }
    
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.6;
        ctx.fillStyle = '#e0e0ff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a29bfe';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== UI 控制函数 ====================
let game;

window.onload = () => {
    game = new Game();
    window.game = game;
};

function showMainMenu() {
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('talentSelect').classList.remove('active');
    document.getElementById('gameOver').classList.remove('active');
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('skillButtons').style.display = 'none';
    document.getElementById('bossHud').classList.remove('active');
    document.getElementById('instructionsModal')?.classList.remove('active');
    
    if (game) {
        game.state = GameState.MENU;
    }
}

function showTalentSelect() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('talentSelect').classList.add('active');
    document.getElementById('gameOver').classList.remove('active');
    
    selectedTalents = [];
    updateTalentUI();
}

function showInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

let selectedTalents = [];

function selectTalent(talent) {
    const index = selectedTalents.indexOf(talent);
    
    if (index > -1) {
        selectedTalents.splice(index, 1);
    } else if (selectedTalents.length < 2) {
        selectedTalents.push(talent);
    }
    
    updateTalentUI();
}

function updateTalentUI() {
    document.querySelectorAll('.talent-card').forEach(card => {
        const talent = card.dataset.talent;
        if (selectedTalents.includes(talent)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    document.getElementById('selectedCount').textContent = selectedTalents.length;
    
    const startBtn = document.getElementById('startGameBtn');
    startBtn.disabled = selectedTalents.length !== 2;
}

function startGame() {
    if (selectedTalents.length !== 2) return;
    game.start(selectedTalents);
}

function pauseGame() {
    if (game) game.pause();
}

function resumeGame() {
    if (game) game.resume();
}

function returnToMenu() {
    if (game) {
        game.state = GameState.MENU;
    }
    showMainMenu();
}

document.addEventListener('touchmove', (e) => {
    if (e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// 等级提升弹窗键盘控制
let levelUpSelection = 0; // 0 = 选项A, 1 = 选项B

document.addEventListener('keydown', (e) => {
    // 等级提升弹窗的键盘控制
    const levelUpModal = document.getElementById('levelUpModal');
    if (levelUpModal && levelUpModal.classList.contains('active')) {
        const key = e.key.toLowerCase();
        
        // A/左箭头 - 选择选项A
        if (key === 'a' || key === 'arrowleft') {
            levelUpSelection = 0;
            updateLevelUpSelection();
            e.preventDefault();
        }
        // D/右箭头 - 选择选项B
        else if (key === 'd' || key === 'arrowright') {
            levelUpSelection = 1;
            updateLevelUpSelection();
            e.preventDefault();
        }
        // Enter/空格 - 确认选择
        else if (key === 'enter' || key === ' ') {
            const option = levelUpSelection === 0 ? 'multishot' : 'width';
            if (game) game.selectLevelUpOption(option);
            e.preventDefault();
        }
        return;
    }
    
    if (!game || game.state !== GameState.PLAYING) return;
    
    if (e.key.toLowerCase() === 'j') {
        game.player.activateSkill(0);
    }
    if (e.key.toLowerCase() === 'k') {
        game.player.activateSkill(1);
    }
});

function updateLevelUpSelection() {
    const optionA = document.getElementById('levelUpOptionA');
    const optionB = document.getElementById('levelUpOptionB');
    
    if (optionA && optionB) {
        if (levelUpSelection === 0) {
            optionA.classList.add('selected');
            optionB.classList.remove('selected');
        } else {
            optionA.classList.remove('selected');
            optionB.classList.add('selected');
        }
    }
}

window.showMainMenu = showMainMenu;
window.showTalentSelect = showTalentSelect;
window.showInstructions = showInstructions;
window.closeInstructions = closeInstructions;
window.selectTalent = selectTalent;
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.returnToMenu = returnToMenu;
window.selectLevelUpOption = (option) => game && game.selectLevelUpOption(option);

// ==================== 排行榜系统 ====================
const LEADERBOARD_KEY = 'elementalShooterLeaderboard';
const PLAYER_ID_KEY = 'elementalShooterPlayerId';

// 获取当前玩家ID
function getCurrentPlayerId() {
    const input = document.getElementById('playerIdInput');
    const id = input ? input.value.trim() : '';
    if (id) {
        localStorage.setItem(PLAYER_ID_KEY, id);
        return id;
    }
    // 尝试从localStorage获取
    const savedId = localStorage.getItem(PLAYER_ID_KEY);
    if (savedId) {
        if (input) input.value = savedId;
        return savedId;
    }
    return '匿名玩家';
}

// 保存分数到排行榜
function saveScoreToLeaderboard(score, level) {
    const playerId = getCurrentPlayerId();
    const leaderboard = getLeaderboard();

    const entry = {
        id: playerId,
        score: score,
        level: level,
        date: new Date().toISOString()
    };

    leaderboard.push(entry);
    // 按分数排序，保留前50名
    leaderboard.sort((a, b) => b.score - a.score);
    const trimmedLeaderboard = leaderboard.slice(0, 50);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmedLeaderboard));
}

// 获取排行榜数据
function getLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

// 显示排行榜
function displayLeaderboard(containerId, limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const leaderboard = getLeaderboard();

    if (leaderboard.length === 0) {
        container.innerHTML = '<div class="no-data">暂无数据</div>';
        return;
    }

    const currentPlayerId = getCurrentPlayerId();
    const displayData = leaderboard.slice(0, limit);

    container.innerHTML = displayData.map((entry, index) => {
        const isTop3 = index < 3;
        const isCurrentPlayer = entry.id === currentPlayerId;
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

        return `
            <div class="leaderboard-item ${isTop3 ? 'top3' : ''}" style="${isCurrentPlayer ? 'border: 1px solid #48dbfb;' : ''}">
                <span class="leaderboard-rank">${rankEmoji}</span>
                <span class="leaderboard-name">${escapeHtml(entry.id)}</span>
                <span class="leaderboard-score">${entry.score}分</span>
            </div>
        `;
    }).join('');
}

// HTML转义，防止XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示排行榜弹窗
function showLeaderboard() {
    displayLeaderboard('modalLeaderboardList', 20);
    document.getElementById('leaderboardModal').classList.add('active');
}

// 隐藏排行榜弹窗
function hideLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('active');
}

window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;

console.log('🎮 元素射击游戏已加载！');
console.log('✅ 游戏系统初始化完成！');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log(isMobile ? '📱 检测到移动设备' : '💻 检测到电脑设备');
