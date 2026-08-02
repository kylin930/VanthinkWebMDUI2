function saveAuth(token) {
    localStorage.setItem('token', token);
}

function getAuth() {
    return localStorage.getItem('token');
}

function clearAuth() {
    localStorage.removeItem('token');
}

function genUuidAuth() {
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    return uniqueId;
}

async function fetchWithAuth(url, options={}) {
    const headers = {
        ...(options.headers || {}),
        Authorization: localStorage.getItem('token'),
    };
    const config = { ...options, headers,};
    const response = await fetch(url, config);

    if (!response.ok) {
        throw new Error(`HTTP出错了喵！状态码是：${response.status}`);
    }
    return response;
}

async function postWithAuth(url, data, options = {}) {
    let body = data;
    let headers = { ...options.headers };

    if (data instanceof URLSearchParams) {
        body = data;
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers,
        };
    }
    else if (data !== null && typeof data === 'object' && !(data instanceof FormData)) {
        body = JSON.stringify(data);
        headers = {
            'Content-Type': 'application/json',
            ...headers,
        };
    }

    return await fetchWithAuth(url, {
        method: 'POST',
        body,
        headers,
        ...options,
    });
}

async function renderStudentInfo() {
    try {
        const response = await fetchWithAuth(`https://api.wxzxzj.com/api/userinfo/getAccount`);
        if (!response.ok) {
            throw new Error(`HTTP出错了喵！状态码是：${response.status}`);
        }
        const data = await response.json();
        const avatarFrame = document.querySelector(".avatar-frame");
        const vipIcon = document.querySelector(".vip-icon");
        const nickName = document.querySelector(".nickname");
        const userId = document.querySelector(".id");
        const avatar = document.getElementById("ava");

        avatarFrame.style.backgroundImage = `url(${data.data.pendant_url})`;
        avatar.src = data.data.head_url;
        avatar.innerHTML = '';
        vipIcon.src = data.data.vip_icon;
        nickName.innerHTML = data.data.nickname;
        userId.innerHTML = `id: ${data.data.id}`;
    } catch (error) {
        mdui.alert({
            headline: "喵！出错了！",
            description: `请将此错误反馈给开发者喵：${error}`,
            confirmText: "OK"
        });
    }
}

async function getToken() {
    const formData = new FormData();
    formData.append("phone", document.getElementById('phone').value);
    formData.append("password", document.getElementById('pass').value);
    try {
        const response = await fetch("https://api.wxzxzj.com/api/auth/student/login", {
            method: "POST",
            // 将 FormData 实例设置为请求正文
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`HTTP出错了喵！状态码是：${response.status}`);
        }
        const data=await response.json();
        if (data.data.token) {
            saveAuth(data.data.token);
            dohw.open=false;
            mdui.alert({
                headline: "喵",
                description: "成功登录了喵",
                confirmText: "OK"
            });
            loadData();
            renderStudentInfo();
        } else {
            mdui.alert({
                headline: "喵！出错了！",
                description: "账号或密码输入错了喵",
                confirmText: "OK"
            });
        }
    } catch (e) {
        mdui.alert({
            headline: "喵！出错了！",
            description: `请将此错误反馈给开发者：${e}`,
            confirmText: "OK"
        });
        loadData();
    }
}

async function checkLogin() {
    if (!getAuth()) {
        dohw.innerHTML=`
        <span slot="headline">在线助教学生登录</span>
        <mdui-text-field label="手机号" id="phone"></mdui-text-field>
        <mdui-text-field type="password" toggle-password label="密码" id="pass"></mdui-text-field>
        <mdui-button variant="text" id="authLogin">扫码登录</mdui-button>
        <mdui-button variant="tonal" id="subLogin">登录</mdui-button>
        `;
        dohw.open=true;

        document.querySelector("#subLogin").addEventListener("click", function(event) {
            getToken();
        });
        document.querySelector("#authLogin").addEventListener("click", function(event) {
            dohw.open=false;
            document.getElementById('mode-dialog').open=true;
            chooseMode('login');
        });

    } else {
        loadData();
        renderStudentInfo();
    }
}

const navigationDrawer = document.getElementById("navDraw");
const openNavButton = document.getElementById("openNav");
const closeNavButton = document.getElementById("closeNav");
const logOut = document.getElementById("logout");

openNavButton.addEventListener("click", () => navigationDrawer.open = true);
closeNavButton.addEventListener("click", () => navigationDrawer.open = false);
logOut.addEventListener("click", function(event) {
    clearAuth();
    mdui.alert({
        headline: "提示",
        description:  "已退出登录（清除Auth），点击确定会自动刷新页面的喵",
        confirmText: "OK",
        onConfirm: () => window.location.reload()
    });
});
