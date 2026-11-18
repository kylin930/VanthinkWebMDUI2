// advancedEasterEgg.js
import { gsap } from 'https://unpkg.com/gsap@3.12.5/index.js';

let level1Active = false;
let level2Triggered = false;

/**
 * 启动高级彩蛋系统
 * @param {string} triggerSelector - 用于 Level 1 的触发元素选择器（如 '#secret'）
 */
export function startAdvancedEasterEgg(triggerSelector) {
    const triggerEl = document.querySelector(triggerSelector);
    if (!triggerEl) {
        console.warn('[EasterEgg] Trigger element not found:', triggerSelector);
        return;
    }

    // 存储时间戳
    const triggerClicks = [];   // Level 1: 触发器点击
    const globalClicks = [];    // Level 2: 全局点击

    const TIME_WINDOW_L1 = 5000;   // 5 秒
    const TIME_WINDOW_L2 = 7000;  // 15 秒
    const COUNT_L1 = 5;
    const COUNT_L2 = 15;

    // 全局点击监听（包括触发器）
    document.addEventListener('click', (e) => {
        const now = Date.now();

        // === Level 2: 全局点击计数 ===
        globalClicks.push(now);
        // 清理超出 15 秒的旧记录
        while (globalClicks.length > 0 && now - globalClicks[0] > TIME_WINDOW_L2) {
            globalClicks.shift();
        }
        if (!level2Triggered && globalClicks.length >= COUNT_L2) {
            triggerLevel2Explosion();
            level2Triggered = true;
            return; // 立即返回，不再处理 Level 1
        }

        // === Level 1: 仅当点击的是触发器 ===
        if (e.target === triggerEl || triggerEl.contains(e.target)) {
            triggerClicks.push(now);
            // 清理超出 5 秒的旧记录
            while (triggerClicks.length > 0 && now - triggerClicks[0] > TIME_WINDOW_L1) {
                triggerClicks.shift();
            }
            if (!level1Active && triggerClicks.length >= COUNT_L1) {
                activateLevel1Mode();
                level1Active = true;
            }
        }
    }, true); // 捕获阶段，确保最先触发
}

// ===== Level 1: 双击任意元素爆炸 =====
function activateLevel1Mode() {
    console.log('🎉 Level 1 Activated: Double-click any element to destroy it!');
    document.addEventListener('dblclick', handleDblClick, true);
}

function handleDblClick(e) {
    let target = e.target;
    if (
        target === document.body ||
        target === document.documentElement ||
        window.getComputedStyle(target).display === 'none' ||
        !target.offsetParent
    ) {
        return;
    }

    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + rect.height / 2 + window.scrollY;

    gsap.to(target, {
        opacity: 0,
        scale: 0.1,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => (target.style.visibility = 'hidden')
    });

    createExplosion(x, y, gsap.utils.random(80, 120));
    triggerVibration('level1');
}

// ===== Level 2: 全屏终极爆炸 =====
function triggerLevel2Explosion() {

}

// ===== 通用工具 =====
function createExplosion(x, y, particleCount) {
    const container = document.body;
    for (let i = 0; i < particleCount; i++) {
        const size = gsap.utils.random(3, 12);
        const angle = gsap.utils.random(0, Math.PI * 2);
        const distance = gsap.utils.random(80, 250);
        const hue = gsap.utils.random(0, 360);

        const p = document.createElement('div');
        gsap.set(p, {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: `hsl(${hue}, 100%, ${gsap.utils.random(50, 85)}%)`,
                 left: x,
                 top: y,
                 opacity: 1,
                 zIndex: 9999999
        });
        container.appendChild(p);

        gsap.to(p, {
            x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: 0,
                duration: gsap.utils.random(0.8, 1.8),
                ease: 'power2.out',
                onComplete: () => p.remove()
        });
    }

    // 闪光
    const flash = document.createElement('div');
    gsap.set(flash, {
        position: 'fixed',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        background: 'white',
        left: x - 75,
        top: y - 75,
        opacity: 0.9,
        zIndex: 9999998
    });
    document.body.appendChild(flash);

    gsap.to(flash, {
        width: '500px',
        height: '500px',
        left: x - 250,
        top: y - 250,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        onComplete: () => flash.remove()
    });
}
/**
 * 触发设备震动（短促、不扰人）
 * @param {'level1' | 'level2'} type - 震动类型
 */
function triggerVibration(type = 'level1') {
    if (!('vibrate' in navigator)) return;

    let pattern;
    if (type === 'level2') {
        // Level 2：更强但依然短（总 260ms）
        pattern = [80, 30, 80, 30, 40]; // 震-停-震-停-震
    } else {
        // Level 1：轻快反馈（总 150ms）
        pattern = [50, 30, 50]; // 轻震-短停-轻震
    }

    navigator.vibrate(pattern);
}
