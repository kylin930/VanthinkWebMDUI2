/**
 * 使用 davidshimjs/qrcodejs 生成二维码
 * 要求已在 HTML 中引入: <script src="qrcode.js"></script>
 *
 * @param {string} text - 要编码的内容
 * @param {string|HTMLElement} container - 容器 ID 或 DOM 元素（将被清空并用于渲染二维码）
 * @param {Object} [options] - 可选配置（透传给 QRCode）
 *   常用选项：
 *     width: 128,
 *     height: 128,
 *     colorDark: "#000000",
 *     colorLight: "#ffffff",
 *     correctLevel: QRCode.CorrectLevel.H
 */
function createQRCode(text, container, options) {
    if (!text) {
        console.error('createQRCode: text is required');
        return;
    }

    var el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) {
        console.error('createQRCode: container not found');
        return;
    }

    // 检查 QRCode 是否已加载
    if (typeof QRCode !== 'function') {
        console.error('QRCode 未定义，请确保已引入 qrcode.js（davidshimjs 版本）');
        return;
    }

    // 清空容器
    el.innerHTML = '';

    // 合并默认配置
    var defaultOptions = {
        width: 150,
        height: 150,
        colorDark: "#7b636b",
        colorLight: "transparent",
        correctLevel: QRCode.CorrectLevel.M
    };

    var finalOptions = Object.assign(defaultOptions, options || {}, {
        text: text // 强制覆盖 text
    });

    try {
        new QRCode(el, finalOptions);
    } catch (e) {
        console.error('生成二维码失败:', e);
    }

    const pollInterval = 3000;
    const encodedText = text.replace("https://zxzjurl.930390.xyz/", "");;
    const abortController = new AbortController();

    const poll = async () => {
        if (abortController.signal.aborted) return;

        try {
            const res = await fetch(`https://zxzjurl.930390.xyz/status/${encodedText}`, {
                signal: abortController.signal // 关联中止信号
            });

            if (abortController.signal.aborted) return;

            if (!res.ok) {
                console.warn('轮询状态接口返回非 2xx:', res.status);
                setTimeout(poll, pollInterval);
                return;
            }

            const data = await res.json();

            if (data.used) {
                el.innerHTML = '<mdui-chip>二维码已被扫描了喵</mdui-chip>';
                return;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.debug('轮询被中止');
                return;
            }
            console.warn('轮询扫码状态失败:', error.message || error);
        }

        if (!abortController.signal.aborted) {
            setTimeout(poll, pollInterval);
        }
    };

    poll();

    // 页面卸载时中止所有 pending 请求和定时器
    const cleanup = () => {
        abortController.abort();
    };

    // 监听页面卸载（刷新、关闭、跳转等）
    window.addEventListener('beforeunload', cleanup);
}

/**
 * 启动摄像头扫码（使用 jsQR）
 * 要求已在 HTML 中引入 jsQR
 *
 * @param {string|HTMLVideoElement} video - video 元素 ID 或 DOM 对象
 * @param {Function} onSuccess - function(data)
 * @param {Function} [onError] - function(errorMsg)
 * @returns {Function} 停止扫描的函数
 */
function startQRScanner(video, onSuccess, onError) {
    var videoEl = typeof video === 'string' ? document.getElementById(video) : video;
    if (!videoEl || !(videoEl instanceof HTMLVideoElement)) {
        var msg = 'Invalid video element';
        if (onError) onError(msg);
        else console.error(msg);
        return function () {};
    }

    var stream = null;
    var scanning = true;

    function stopScan() {
        if (stream) {
            stream.getTracks().forEach(function (track) { track.stop(); });
        }
        videoEl.srcObject = null;
        scanning = false;
    }

    if (typeof jsQR !== 'function') {
        var msg = 'jsQR 未加载，请确保已在 HTML 中引入';
        if (onError) onError(msg);
        else console.error(msg);
        return stopScan;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function (s) {
        stream = s;
        videoEl.srcObject = stream;
        videoEl.play();

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        function detect() {
            if (!scanning) return;
            if (videoEl.readyState < videoEl.HAVE_CURRENT_DATA) {
                requestAnimationFrame(detect);
                return;
            }

            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = jsQR(imageData.data, canvas.width, canvas.height);

            if (code) {
                onSuccess(code.data);
                stopScan(); // 默认识别一次就停
                return;
            }

            requestAnimationFrame(detect);
        }

        detect();
    })
    .catch(function (err) {
        scanning = false;
        var msg = '摄像头访问被拒绝或不可用: ' + (err.message || err);
        if (onError) onError(msg);
        else console.error(msg);
    });

        return stopScan;
}
