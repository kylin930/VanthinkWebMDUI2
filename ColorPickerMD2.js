function applyColor(hex) {
    if (!/^#[0-9A-Fa-f]{3,6}$/.test(hex.trim())) return;
    mdui.setColorScheme(hex);
    mdui.snackbar({message: `主题已切换为 ${hex}`});

    const checkbox = document.getElementById('rememberColorCheckbox');
    if (checkbox && checkbox.checked) {
        localStorage.setItem('mdui_rem_color', hex);
        localStorage.setItem('mdui_rem_enabled', 'true');
    }
}

const STORAGE_KEY = 'mdui_custom_colors_v1';
let customColors = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function saveCustomColors() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customColors));
    renderCustomColors();
}

function addCustomColor(hex) {
    customColors = customColors.filter(c => c !== hex);
    customColors.unshift(hex);
    if (customColors.length > 5) customColors.pop();
    saveCustomColors();
    applyColor(hex);
}

function clearCustomColors() {
    customColors = [];
    saveCustomColors();
    mdui.snackbar({message: '已清除所有自选颜色'});
}

function renderCustomColors() {
    const container = document.getElementById('custom-colors-container');
    container.innerHTML = '';

    const addBtn = document.createElement('div');
    addBtn.innerHTML = '<mdui-button-icon icon="add"></mdui-button-icon>';
    addBtn.firstElementChild.onclick = openColorPicker;
    container.appendChild(addBtn);

    customColors.forEach(color => {
        const el = document.createElement('div');
        el.className = 'color-custom';
        el.style.backgroundColor = color;
        el.title = color;
        el.onclick = () => applyColor(color);
        container.appendChild(el);
    });

    if (customColors.length > 0) {
        const deleteBtn = document.createElement('div');
        deleteBtn.innerHTML = '<mdui-button-icon icon="clear_all"></mdui-button-icon>';
        deleteBtn.firstElementChild.onclick = () => {
            customColors = [];
            saveCustomColors();
            mdui.snackbar({message: '已清除所有自选颜色'});
        };
        container.appendChild(deleteBtn);
    }
}

function openColorPicker() {
    document.getElementById('colorPicker').click();
}

document.getElementById('colorPicker').addEventListener('input', (e) => {
    addCustomColor(e.target.value);
});

document.getElementById('wallpaperInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 清空 input，以便下次选择同一张图也能触发
    e.target.value = '';

    try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();

        // 使用 MDUI 2 内置方法提取主色
        const color = await mdui.getColorFromImage(img);
        URL.revokeObjectURL(img.src);

        // 应用颜色
        applyColor(color);

        // 可选：自动加入自选颜色（避免重复）
        if (!customColors.includes(color)) {
            addCustomColor(color); // 会自动去重、截断、保存
        }

        // 显示结果
        document.getElementById('extractedColor').textContent = `已应用：${color}`;
        mdui.snackbar(`从壁纸提取并应用颜色 ${color}`);
    } catch (err) {
        console.error('取色失败:', err);
        mdui.snackbar('壁纸取色失败，请重试');
        document.getElementById('extractedColor').textContent = '';
    }
});

renderCustomColors();

// 预设颜色点击（事件委托，使用 data-color）
document.querySelector('.color-preset').addEventListener('click', (e) => {
    const target = e.target;
    // 确保点击的是预设色块（有 data-color 属性）
    if (target.matches('[data-color]')) {
        const color = target.getAttribute('data-color');
        if (color) applyColor(color);
    }
});

// 2. 自选颜色区域：事件委托（处理色块、+、🗑️）
document.getElementById('custom-colors-container').addEventListener('click', (e) => {
    const target = e.target;

    // 点击“+”按钮（通过图标或按钮识别）
    if (target.closest('mdui-button-icon')?.getAttribute('name') === 'add') {
        openColorPicker();
        return;
    }

    // 点击“删除”按钮
    if (target.closest('mdui-button-icon')?.getAttribute('name') === 'delete') {
        customColors = [];
        saveCustomColors();
        mdui.snackbar('已清除所有自选颜色');
        return;
    }

    // 点击自定义色块（非按钮）
    const colorEl = e.target.closest('.color-custom');
    if (colorEl && !colorEl.querySelector('mdui-button-icon')) {
        const bgColor = getComputedStyle(colorEl).backgroundColor;
        // 转换 rgb(r,g,b) → #rrggbb
        const rgbMatch = bgColor.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
            const hex = '#' + rgbMatch.slice(0, 3).map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
            applyColor(hex);
        }
    }
});

// 3. 文件选择按钮
document.getElementById('wallpaperBtn')?.addEventListener('click', () => {
    document.getElementById('wallpaperInput').click();
});

// 4. 颜色选择器 input
document.getElementById('colorPicker').addEventListener('input', (e) => {
    addCustomColor(e.target.value);
});

// 5. 壁纸 input（自动提取）
document.getElementById('wallpaperInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // 允许重复选择同一文件

    try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const color = await mdui.getColorFromImage(img);
        URL.revokeObjectURL(img.src);

        applyColor(color);
        if (!customColors.includes(color)) {
            addCustomColor(color);
        }

        document.getElementById('extractedColor').textContent = `已应用：${color}`;
        mdui.snackbar(`从壁纸提取并应用颜色 ${color}`);
    } catch (err) {
        console.error('取色失败:', err);
        mdui.snackbar('壁纸取色失败，请重试');
        document.getElementById('extractedColor').textContent = '';
    }
});

const savedColor = localStorage.getItem('mdui_rem_color');
const isEnabled = localStorage.getItem('mdui_rem_enabled') === 'true';
const checkbox = document.getElementById('rememberColorCheckbox');

if (checkbox) {
    checkbox.checked = isEnabled;
    checkbox.addEventListener('change', (e) => {
        localStorage.setItem('mdui_rem_enabled', e.target.checked ? 'true' : 'false');
    });
    if (isEnabled && savedColor) {
        applyColor(savedColor);
    }
}
