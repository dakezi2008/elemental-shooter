
// ==================== UI 控制函数 ====================

let game;

// 初始化游戏
window.onload = () => {
    game = new Game();
};

// 显示主菜单
function showMainMenu() {
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('talentSelect').classList.remove('active');
    document.getElementById('gameOver').classList.remove('active');
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('joystickZone').style.display = 'none';
    document.getElementById('skillButtons').style.display = 'none';
    document.getElementById('bossHud').classList.remove('active');
    
    if (game) {
        game.state = GameState.MENU;
    }
}

// 显示天赋选择
function showTalentSelect() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('talentSelect').classList.add('active');
    document.getElementById('gameOver').classList.remove('active');
    
    // 重置选择
    selectedTalents = [];
    updateTalentUI();
}

// 显示游戏说明
function showInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// 关闭游戏说明
function closeInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 天赋选择
let selectedTalents = [];

function selectTalent(talent) {
    const index = selectedTalents.indexOf(talent);
    
    if (index > -1) {
        // 取消选择
        selectedTalents.splice(index, 1);
    } else if (selectedTalents.length < 2) {
        // 添加选择
        selectedTalents.push(talent);
    }
    
    updateTalentUI();
}

function updateTalentUI() {
    // 更新选中状态
    document.querySelectorAll('.talent-card').forEach(card => {
        const talent = card.dataset.talent;
        if (selectedTalents.includes(talent)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // 更新计数
    document.getElementById('selectedCount').textContent = selectedTalents.length;
    
    // 更新开始按钮
    const startBtn = document.getElementById('startGameBtn');
    startBtn.disabled = selectedTalents.length !== 2;
}

// 开始游戏
function startGame() {
    if (selectedTalents.length !== 2) return;
    game.start(selectedTalents);
}

// 暂停游戏
function pauseGame() {
    if (game) game.pause();
}

// 继续游戏
function resumeGame() {
    if (game) game.resume();
}

// 返回主菜单
function returnToMenu() {
    if (game) {
        game.state = GameState.MENU;
    }
    showMainMenu();
}

// 防止页面滚动（移动端）
document.addEventListener('touchmove', (e) => {
    if (e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
}, { passive: false });

// 防止双指缩放
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
});

document.addEventListener('gestureend', (e) => {
    e.preventDefault();
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (!game || game.state !== GameState.PLAYING) return;
    
    // Q键 - 技能1
    if (e.key.toLowerCase() === 'q') {
        game.player.activateSkill(0);
    }
    
    // W键 - 技能2
    if (e.key.toLowerCase() === 'w') {
        game.player.activateSkill(1);
    }
});

console.log('🎮 元素射击游戏已加载！');
console.log('按 "开始游戏" 选择天赋并开始战斗！');

// 导出到全局（用于调试）
window.game = game;
window.showMainMenu = showMainMenu;
window.showTalentSelect = showTalentSelect;
window.showInstructions = showInstructions;
window.closeInstructions = closeInstructions;
window.selectTalent = selectTalent;
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.returnToMenu = returnToMenu;

// ==================== 游戏结束 ====================
// 所有代码已加载完成
console.log('✅ 游戏系统初始化完成！');
console.log('📁 文件位置：d:\OOMM\AI-XIE\elemental-shooter\');
console.log('🌐 可以直接在浏览器中打开 index.html 开始游戏！');

// 检查是否在移动设备
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
    console.log('📱 检测到移动设备，已启用触屏控制');
} else {
    console.log('💻 检测到电脑设备，使用键盘+鼠标控制');
}

// 添加性能监控
if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`⏱️ 页面加载时间: ${pageLoadTime}ms`);
        }, 0);
    });
}

// 错误处理
window.addEventListener('error', (e) => {
    console.error('游戏错误:', e.message);
    console.error('文件:', e.filename);
    console.error('行号:', e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise错误:', e.reason);
});

// 页面可见性变化（切换标签页时暂停）
document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && game.state === GameState.PLAYING) {
        game.pause();
    }
});

// 防止右键菜单（游戏中）
document.addEventListener('contextmenu', (e) => {
    if (game && game.state === GameState.PLAYING) {
        e.preventDefault();
    }
});

// 添加触摸反馈（移动端震动）
function vibrate(pattern) {
    if (navigator.vibrate && isMobile) {
        navigator.vibrate(pattern);
    }
}

// 导出震动函数供游戏使用
window.vibrate = vibrate;

console.log('🎯 准备就绪！点击"开始游戏"开始你的元素射击之旅！');

// 添加PWA支持
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(
            (registration) => {
                console.log('✅ ServiceWorker 注册成功:', registration.scope);
            },
            (err) => {
                console.log('❌ ServiceWorker 注册失败:', err);
            }
        );
    });
}

// 添加到主屏幕提示（PWA）
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📲 可以添加到主屏幕');
});

// 导出安装函数
window.installPWA = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('用户接受了安装提示');
            } else {
                console.log('用户拒绝了安装提示');
            }
            deferredPrompt = null;
        });
    }
};

// 游戏版本
const GAME_VERSION = '1.0.0';
console.log(`🎮 元素射击 v${GAME_VERSION}`);
console.log('开发者: AI Assistant');
console.log('制作时间: 2026-04-24');

// 结束标记
console.log('%c 元素射击游戏已完全加载！ ', 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 20px; padding: 10px; border-radius: 5px;');
