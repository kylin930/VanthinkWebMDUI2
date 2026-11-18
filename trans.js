document.getElementById('trans-btn').addEventListener('click', () => {
    document.getElementById('mode-dialog').open = true;
});

let currentStopScan = null;

function chooseMode(mode) {
    const content = document.getElementById('dialog-content');
    const dialog = document.getElementById('mode-dialog');

    if (mode === 'sender') {
        createQr();
        dialog.headline = '生成二维码';
        content.innerHTML = `
        <div class="qr-container">
        <img id="left-corner" class="corner-img" src="https://teachermate.oss-cn-qingdao.aliyuncs.com/Cj8FC-1764931102896-Ch_van_img_03.png">
        <img id="right-corner" class="corner-img" src="https://teachermate.oss-cn-qingdao.aliyuncs.com/KVBjN-1764931099536-Ch_cho_img_03.png">
        <div id="qr-code"></div>
        </div>
        <mdui-button variant="text" onclick="resetDialog()">返回选择</mdui-button>
        `;
    } else if (mode === 'receiver') {
        dialog.headline = '扫码接收';
        content.innerHTML = `
        <p>对准二维码，将自动识别喵</p>
        <video id="preview-video" autoplay muted playsinline></video>
        <p id="scan-status">点击下方按钮开始扫描</p>
        <img src="https://teachermate.oss-cn-qingdao.aliyuncs.com/heeHx-1765032786723-56015@2x.png" style="position: absolute;right: 30px;bottom: -3px;width: 90px;" />
        <mdui-button id="btn-start-scan" onclick="startScanning()">开始扫描</mdui-button>
        <mdui-button variant="text" onclick="resetDialog()">返回选择</mdui-button>
        `;
    } else if (mode === 'login') {
        dialog.headline = '扫码登录';
        content.innerHTML = `
        <p>对准二维码，将自动识别喵</p>
        <video id="preview-video" autoplay muted playsinline></video>
        <p id="scan-status">点击下方按钮开始扫描</p>
        <mdui-button id="btn-start-scan" onclick="startScanning()">开始扫描</mdui-button>
        `;
    }
}

function createQr() {
    fetch(`https://zxzjurl.930390.xyz/create?auth=${localStorage.getItem('token')}`)
    .then(r => r.json())
    .then(data => createQRCode(data.url, 'qr-code'));
}

async function startScanning() {
    const btn = document.getElementById('btn-start-scan');
    const status = document.getElementById('scan-status');

    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = '扫描中...';
    status.textContent = '正在识别，请对准二维码喵';

    startQRScanner(
        'preview-video',
        (data) => {
            fetch(data)
            .then(r => r.json())
            .then(res => saveAuth(res.auth));
            mdui.confirm({
                headline: "识别状态",
                description: "识别成功喵",
                confirmText: "加载数据",
                cancelText: "补药",
                onConfirm: () => {
                    loadData();
                    renderStudentInfo();
                }
            });
            status.textContent = '扫描成功喵';
            btn.textContent = '重新扫描';
            btn.disabled = false;
        },
        (error) => {
            mdui.snackbar(error);
            status.textContent = '扫描失败喵';
            btn.textContent = '开始扫描';
            btn.disabled = false;
        }
    );
}

function resetDialog() {
    chooseMode(null);
    document.getElementById('mode-dialog').headline = '请选择你的传输角色喵';
    document.getElementById('dialog-content').innerHTML = `
    <mdui-button variant="tonal" onclick="chooseMode('sender')">我是被传端</mdui-button>
    <mdui-button variant="tonal" onclick="chooseMode('receiver')">我是接收端</mdui-button>
    <img src="https://teachermate.oss-cn-qingdao.aliyuncs.com/8Lt7L-1765032420370-56044@2x.png" style="width: 95px;" />
    `;
}
