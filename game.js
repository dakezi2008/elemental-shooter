// 元素射击游戏 - Elemental Shooter
// 完整游戏代码

// ==================== 游戏配置 ====================
const CONFIG = {
    GAME_DURATION: 180,  // 3分钟
    PLAYER_SPEED: 5,
    PLAYER_HEALTH: 100,
    BULLET_SPEED: 10,
    SPAWN_INTERVAL: 1500,  // 更快的生成间隔
    BOSS_SPAWN_TIME: 120,  // 2分钟出现BOSS
    MAX_LEVEL: 20,
    XP_PER_LEVEL: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450]
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
        this.boss = null;
        
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
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouse.down = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
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
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            // 鼠标移动时自动激活控制
            this.mouse.active = true;
        };
        
        // 鼠标离开窗口时停止控制
        const handleMouseLeave = () => {
            this.mouse.active = false;
        };
        
        const handleMouseEnter = () => {
            if (this.state === GameState.PLAYING) {
                this.mouse.active = true;
            }
        };
        
        // 绑定到整个文档以实现全屏控制
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);
        
        document.addEventListener('mousemove', handleMouseMove);
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
        this.boss = null;
        
        this.lastSpawnTime = 0;
        this.bossSpawned = false;
        
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
        const type = this.weightedRandom(types, weights);
        const x = Math.random() * (this.width - 60) + 30;
        this.enemies.push(new Enemy(x, -50, type, this.level));
        
        // 高等级时额外生成敌人
        if (this.level >= 5 && Math.random() < 0.3) {
            const x2 = Math.random() * (this.width - 60) + 30;
            const type2 = this.weightedRandom(types, weights);
            this.enemies.push(new Enemy(x2, -50, type2, this.level));
        }
        if (this.level >= 10 && Math.random() < 0.2) {
            const x3 = Math.random() * (this.width - 60) + 30;
            const type3 = this.weightedRandom(types, weights);
            this.enemies.push(new Enemy(x3, -50, type3, this.level));
        }
    }
    
    spawnBoss() {
        this.boss = new Boss(this.width / 2, -100);
        this.bossSpawned = true;
        document.getElementById('bossHud').classList.add('active');
        document.getElementById('warningText').classList.add('active');
        setTimeout(() => {
            document.getElementById('warningText').classList.remove('active');
        }, 3000);
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
        const nextLevelXP = CONFIG.XP_PER_LEVEL[this.level] || CONFIG.XP_PER_LEVEL[CONFIG.XP_PER_LEVEL.length - 1];
        if (this.xp >= nextLevelXP && this.level < CONFIG.MAX_LEVEL) {
            this.levelUp();
        }
        this.updateUI();
    }
    
    levelUp() {
        this.level++;
        this.pause();
        this.showLevelUpOptions();
    }
    
    showLevelUpOptions() {
        const modal = document.getElementById('levelUpModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    selectLevelUpOption(option) {
        if (this.player) {
            if (option === 'multishot') {
                this.player.extraBullets = (this.player.extraBullets || 0) + 1;
            } else if (option === 'width') {
                this.player.bulletWidthMultiplier = (this.player.bulletWidthMultiplier || 1) + 0.3;
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
        }
        
        const nextLevelXP = CONFIG.XP_PER_LEVEL[this.level] || CONFIG.XP_PER_LEVEL[CONFIG.XP_PER_LEVEL.length - 1];
        const prevLevelXP = CONFIG.XP_PER_LEVEL[this.level - 1] || 0;
        const xpPercent = ((this.xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
        if (xpEl) xpEl.style.width = Math.max(0, Math.min(100, xpPercent)) + '%';
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        if (timerEl) timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.boss && bossHealthEl) {
            bossHealthEl.style.width = (this.boss.health / this.boss.maxHealth * 100) + '%';
        }
    }
    
    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
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
        if (this.gameTime <= 0) {
            this.gameOver(true);
            return;
        }
        
        if (!this.bossSpawned && this.gameTime <= CONFIG.GAME_DURATION - CONFIG.BOSS_SPAWN_TIME) {
            this.spawnBoss();
        }
        
        this.lastSpawnTime += deltaTime;
        const spawnInterval = Math.max(500, CONFIG.SPAWN_INTERVAL - (this.level * 100));
        if (this.lastSpawnTime > spawnInterval && !this.boss) {
            this.spawnEnemy();
            this.lastSpawnTime = 0;
        }
        
        if (this.player) this.player.update(dt, this);
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(dt);
            return bullet.active && bullet.x > -50 && bullet.x < this.width + 50 && bullet.y > -50 && bullet.y < this.height + 50;
        });
        
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(dt, this);
            return enemy.active && enemy.y < this.height + 100;
        });
        
        if (this.boss) {
            this.boss.update(dt, this);
            if (!this.boss.active) {
                this.boss = null;
                document.getElementById('bossHud').classList.remove('active');
            }
        }
        
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return p.active;
        });
        
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
            
            if (this.boss && this.boss.active) {
                if (this.checkCollision(bullet, this.boss)) {
                    bullet.hit(this.boss, this);
                }
            }
        });
        
        this.bullets.forEach(bullet => {
            if (!bullet.active || !bullet.fromEnemy) return;
            if (this.player && this.checkCollision(bullet, this.player)) {
                this.player.takeDamage(bullet.damage);
                bullet.active = false;
                this.createParticles(bullet.x, bullet.y, '#ff6b6b', 5);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            if (this.player && this.checkCollision(enemy, this.player)) {
                this.player.takeDamage(enemy.damage);
                enemy.takeDamage(enemy.health, this);
                this.screenShake(5);
            }
        });
        
        if (this.boss && this.boss.active && this.player) {
            if (this.checkCollision(this.boss, this.player)) {
                this.player.takeDamage(20);
                this.screenShake(8);
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
        if (this.boss) this.boss.render(this.ctx);
        if (this.player) this.player.render(this.ctx);
        
        this.ctx.restore();
    }
    
    drawBackground() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137.5 + this.gameTime * 10) % this.width;
            const y = (i * 73.3 + this.gameTime * 20) % this.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
        
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offset = (this.gameTime * 30) % gridSize;
        
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = offset; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
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
    }
    
    update(dt, game) {
        let dx = 0, dy = 0;
        let usingTouchOrMouse = false;
        
        // 键盘控制
        if (game.keys['w'] || game.keys['arrowup']) dy -= 1;
        if (game.keys['s'] || game.keys['arrowdown']) dy += 1;
        if (game.keys['a'] || game.keys['arrowleft']) dx -= 1;
        if (game.keys['d'] || game.keys['arrowright']) dx += 1;
        
        // 触摸控制 - 手指位置相对于玩家位置决定移动方向
        if (game.touch.active && !usingTouchOrMouse) {
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
        
        // 鼠标控制 - 鼠标移动即可控制，无需按住
        if (game.mouse.active && !usingTouchOrMouse) {
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
                this.createBullet(talent, game, index);
            });
            this.lastFireTime = now;
        }
    }
    
    createBullet(talent, game, index) {
        const t = TALENTS[talent];
        const baseOffset = index === 0 ? -10 : 10;
        const damage = this.getBulletDamage(t.damage);
        const speed = CONFIG.BULLET_SPEED * (talent === 'wind' ? 1.5 : 1);
        const radius = 5 * this.bulletWidthMultiplier;
        
        // 基础子弹
        game.bullets.push(new Bullet(
            this.x + baseOffset, this.y - 20,
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
                this.x + baseOffset + xOffset, this.y - 20,
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
        
        // 烈焰技能 - 发射火苗
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
        }
        
        // 疾风技能特效 - 增强版
        if (this.skillEffects.windDance) {
            // 大范围风刃 - 更宽更明显
            if (Math.random() < 0.8) {
                for (let i = 0; i < 5; i++) {
                    const side = Math.random() < 0.5 ? -1 : 1;
                    game.particles.push(new BigWindParticle(
                        this.x + side * (40 + Math.random() * 30),
                        this.y - 30 + (Math.random() - 0.5) * 60,
                        side * (3 + Math.random() * 4),
                        (Math.random() - 0.5) * 3
                    ));
                }
            }
            // 速度线效果 - 更多更密集
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++) {
                    game.particles.push(new SpeedLine(this.x + (Math.random() - 0.5) * 40, this.y));
                }
            }
            // 风之光环
            if (Math.random() < 0.2) {
                game.particles.push(new WindRing(this.x, this.y));
            }
        }
        
        // 雷霆技能特效 - 超酷炫全屏闪电风暴
        if (this.skillEffects.thunderChain) {
            // 超大面积闪电 - 覆盖全屏
            if (Math.random() < 0.8) {
                const lightningCount = 8;
                for (let i = 0; i < lightningCount; i++) {
                    const angle = (Math.PI * 2 / lightningCount) * i + Date.now() / 150 + Math.random() * 0.8;
                    const startDist = 15;
                    const endDist = 350 + Math.random() * 200; // 几乎全屏
                    game.particles.push(new UltraLightningParticle(
                        this.x + Math.cos(angle) * startDist,
                        this.y + Math.sin(angle) * startDist,
                        this.x + Math.cos(angle) * endDist,
                        this.y + Math.sin(angle) * endDist
                    ));
                }
            }
            // 交叉闪电网络
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++) {
                    const angle1 = Math.random() * Math.PI * 2;
                    const angle2 = angle1 + Math.PI / 2 + (Math.random() - 0.5);
                    const dist = 200 + Math.random() * 250;
                    game.particles.push(new UltraLightningParticle(
                        this.x + Math.cos(angle1) * dist,
                        this.y + Math.sin(angle1) * dist,
                        this.x + Math.cos(angle2) * dist,
                        this.y + Math.sin(angle2) * dist
                    ));
                }
            }
            // 电火花风暴
            for (let i = 0; i < 12; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 150;
                game.particles.push(new ThunderSparkParticle(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist
                ));
            }
            // 多层雷霆光环
            if (Math.random() < 0.4) {
                game.particles.push(new ThunderRing(this.x, this.y));
            }
            if (Math.random() < 0.2) {
                game.particles.push(new ThunderRing(this.x, this.y));
            }
            // 雷霆核心爆发
            if (Math.random() < 0.3) {
                game.particles.push(new ThunderCore(this.x, this.y));
            }
        }
        
        // 寒冰技能特效 - 增强版
        if (this.skillEffects.iceField) {
            // 大范围冰霜粒子 - 更多更大
            if (Math.random() < 0.6) {
                for (let i = 0; i < 10; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 180;
                    game.particles.push(new BigIceParticle(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist
                    ));
                }
            }
            // 雪花效果 - 更密集
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++) {
                    game.particles.push(new BigSnowParticle(
                        this.x + (Math.random() - 0.5) * 250,
                        this.y + (Math.random() - 0.5) * 250
                    ));
                }
            }
            // 冰霜光环
            if (Math.random() < 0.2) {
                game.particles.push(new IceRing(this.x, this.y));
            }
        }
    }
    
    takeDamage(damage) {
        if (this.invincible) return;
        
        this.health -= damage;
        this.invincible = true;
        this.invincibleTime = 1;
        
        if (window.game) window.game.screenShake(5);
        
        if (this.health <= 0 && window.game) {
            window.game.gameOver(false);
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
        
        if (this.type === 'shooter') {
            this.lastShot += dt * 1000;
            if (this.lastShot > 2000) {
                this.shoot(game);
                this.lastShot = 0;
            }
        }
        
        if (this.health <= 0) {
            this.die(game);
        }
    }
    
    shoot(game) {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        const bullet = new Bullet(
            this.x, this.y,
            Math.cos(angle) * 5, Math.sin(angle) * 5,
            this.damage, this.color, this.type
        );
        bullet.fromEnemy = true;
        game.bullets.push(bullet);
    }
    
    takeDamage(damage, game) {
        this.health -= damage;
        this.showDamage(damage);
        if (this.health <= 0) {
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 140;
        this.radius = 70;
        this.maxHealth = 5000;  // 大幅增加血量
        this.health = this.maxHealth;
        this.speed = 1.2;
        this.active = true;
        this.phase = 1;
        this.lastAttack = 0;
        this.attackInterval = 2500;
        this.targetX = x;
        this.targetY = y;
        this.name = '元素吞噬者';
        this.damageMultiplier = 1;
        this.bulletSpeed = 4;
        this.attackPatterns = ['spread'];
        this.rageMode = false;
    }
    
    update(dt, game) {
        const healthPercent = this.health / this.maxHealth;
        
        // 阶段转换 - 更平滑的难度曲线
        if (healthPercent < 0.75 && this.phase === 1) {
            this.phase = 2;
            this.attackInterval = 2000;
            this.damageMultiplier = 1.3;
            this.bulletSpeed = 5;
            this.attackPatterns = ['spread', 'laser'];
            game.screenShake(10);
        } else if (healthPercent < 0.5 && this.phase === 2) {
            this.phase = 3;
            this.attackInterval = 1500;
            this.speed = 1.8;
            this.damageMultiplier = 1.6;
            this.bulletSpeed = 6;
            this.attackPatterns = ['spread', 'laser', 'spiral'];
            game.screenShake(15);
        } else if (healthPercent < 0.25 && this.phase === 3) {
            this.phase = 4;  // 新增第4阶段 - 狂暴模式
            this.rageMode = true;
            this.attackInterval = 1000;
            this.speed = 2.5;
            this.damageMultiplier = 2;
            this.bulletSpeed = 7;
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
        
        if (this.health <= 0) {
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
    
    takeDamage(damage, game) {
        this.health -= damage;
        this.showDamage(damage);
        if (this.health <= 0) {
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
        this.active = false;
        game.score += 1000;
        game.addXP(500);
        game.createParticles(this.x, this.y, '#ff6b6b', 50);
        game.screenShake(20);
        game.gameOver(true);
    }
    
    render(ctx) {
        ctx.save();
        
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
        
        const time = Date.now() / 1000;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i + time;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 10, angle, angle + Math.PI / 3);
            ctx.stroke();
        }
        
        ctx.restore();
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

document.addEventListener('keydown', (e) => {
    if (!game || game.state !== GameState.PLAYING) return;
    
    if (e.key.toLowerCase() === 'j') {
        game.player.activateSkill(0);
    }
    if (e.key.toLowerCase() === 'k') {
        game.player.activateSkill(1);
    }
});

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

console.log('🎮 元素射击游戏已加载！');
console.log('✅ 游戏系统初始化完成！');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log(isMobile ? '📱 检测到移动设备' : '💻 检测到电脑设备');
