async function transcribeWithWhisper(audioUrl) {
    if (!audioUrl) {
        throw new Error('Audio URL is required');
    }

    const url = `https://awasr.930390.xyz/asr?audio=${encodeURIComponent(audioUrl)}`;

    try {
        mdui.snackbar({ message: '正在语音识别...', timeout: 2000 });
        const response = await fetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
            const errMsg = await response.text().catch(() => 'Unknown error');
            throw new Error(`ASR 接口错误: ${response.status} ${errMsg}`);
        }

        const result = await response.json();

        // 🔍 关键：从 result.transcription 中取数据
        if (!result.transcription || typeof result.transcription.text !== 'string') {
            throw new Error('ASR 返回格式无效：缺少 transcription.text');
        }

        const { text, words = [] } = result.transcription;

        return { text, words };
    } catch (e) {
        console.error('ASR failed:', e);
        mdui.snackbar({ message: '语音识别失败: ' + (e.message || '未知错误'), timeout: 4000 });
        throw e;
    }
}

function computePhonicsScores(originalText, asrWords) {
    // 1. 原始文本：保留原始字符用于 spell，但清理后用于对齐
    const originalChars = originalText.split('');
    const cleanOriginal = originalText.toLowerCase().replace(/[^a-z]/g, '');

    if (!asrWords || asrWords.length === 0) {
        return originalChars.map(char => ({
            spell: char,
            phoneme: [char.toLowerCase()],
                                          overall: /[a-z]/i.test(char) ? 0.0 : 1.0
        }));
    }

    // 2. 清理 ASR 单词：移除每个 word 内部的非字母字符，再拼接
    const cleanedAsrWords = asrWords.map(w =>
    w.word.replace(/[^a-z]/gi, '') // 移除标点，如 "us." → "us"
    ).filter(w => w.length > 0); // 过滤空词

    const asrText = cleanedAsrWords.join('').toLowerCase();

    if (!asrText) {
        return originalChars.map(char => ({
            spell: char,
            phoneme: [char.toLowerCase()],
                                          overall: /[a-z]/i.test(char) ? 0.0 : 1.0
        }));
    }

    // 3. 对齐评分（改进版）
    const scores = new Array(cleanOriginal.length).fill(0.0);
    let asrIdx = 0;

    for (let i = 0; i < cleanOriginal.length; i++) {
        const target = cleanOriginal[i];
        let matched = false;

        // 允许最多跳过 2 个 ASR 字符（容忍插入错误）
        for (let j = 0; j <= 2 && asrIdx + j < asrText.length; j++) {
            if (asrText[asrIdx + j] === target) {
                scores[i] = 1.0;
                asrIdx += j + 1;
                matched = true;
                break;
            }
        }

        if (!matched) {
            // 尝试跳过当前 ASR 字符（容忍删除错误），最多跳 2 个
            let skipped = 0;
            while (skipped < 2 && asrIdx < asrText.length) {
                asrIdx++;
                skipped++;
                if (asrIdx < asrText.length && asrText[asrIdx] === target) {
                    scores[i] = 0.7; // 有偏移，扣分
                    asrIdx++;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                scores[i] = 0.0;
                // 不推进 asrIdx，留给后续字符尝试
            }
        }
    }

    // 4. 映射回原始字符
    let cleanIdx = 0;
    const result = [];
    for (const char of originalChars) {
        const lower = char.toLowerCase();
        if (/[a-z]/.test(lower)) {
            result.push({
                spell: char,
                phoneme: [lower],
                overall: scores[cleanIdx] ?? 0.0
            });
            cleanIdx++;
        } else {
            // 非字母字符（空格、句号等）→ 默认满分
            result.push({
                spell: char,
                phoneme: [lower],
                overall: 1.0
            });
        }
    }

    return result;
}

// 深度查找 word 或 sentence（优先 word）
function extractTextContent(obj) {
    const word = deepFindKey(obj, 'word');
    if (word != null && word !== '') return word;

    const sentence = deepFindKey(obj, 'sentence');
    if (sentence != null && sentence !== '') return sentence;

    return null;
}
// =============== 工具函数：深度查找键 ===============
function deepFindKey(obj, key) {
    if (obj == null || typeof obj !== 'object') return null;

    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }

    for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            const result = deepFindKey(obj[k], key);
            if (result !== null) return result;
        }
    }

    return null;
}

// =============== 获取 URL 参数 ===============
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

var readGameTestbankId;
var drg=document.getElementById("doreadgame");
let auth;

// =============== 全局状态 ===============
let currentPlayingAudios = [];
let exerciseAnswers = [];
let exercises = [];
let currentExerciseIndex = 0;
let startTime = null;
let ossClient = null;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let animationId = null;
let timerInterval = null;
let isTimerRunning = false;

// =============== 文件名生成 ===============
function generateAndroidFilename() {
    const hexChars = '0123456789abcdef';
    let result = 'android';
    for (let i = 0; i < 32; i++) {
        result += hexChars[Math.floor(Math.random() * 16)];
    }
    return result + '.mp3';
}

// =============== 初始化 OSS ===============
async function initOSS() {
    try {
        const res = await fetch(`https://zxzjapi.930390.xyz:2778/api/tool/upload/getStsToken?auth=${auth}`);
        const data = await res.json();
        if (data.StatusCode !== 200) throw new Error('STS 获取失败');

        ossClient = new OSS({
            region: 'oss-cn-qingdao',
            accessKeyId: data.AccessKeyId,
            accessKeySecret: data.AccessKeySecret,
            stsToken: data.SecurityToken,
            bucket: 'vanthink',
            refreshSTSToken: async () => {
                const res = await fetch(`https://zxzjapi.930390.xyz:2778/api/tool/upload/getStsToken?auth=${auth}`);
                const data = await res.json();
                return {
                    accessKeyId: data.AccessKeyId,
                    accessKeySecret: data.AccessKeySecret,
                    stsToken: data.SecurityToken,
                    expiration: data.Expiration
                };
            }
        });
    } catch (e) {
        mdui.snackbar({ message: '初始化上传服务失败: ' + e.message, timeout: 3000 });
        throw e;
    }
}

// =============== 波形绘制 ===============
function drawWaveform(array, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6200ea';

    const sliceWidth = width / array.length;
    let x = 0;

    for (let i = 0; i < array.length; i++) {
        // Uint8Array: 0~255，128 是静音中线
        const v = (array[i] - 128) / 128; // 归一化到 [-1, 1]
        const y = height / 2 + v * (height / 2); // 映射到 canvas 高度

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    ctx.stroke();
}

// =============== 自动播放原音 ===============
function autoPlayOriginalAudio(audioUrl) {
    const audio = new Audio(audioUrl);
    currentPlayingAudios.push(audio);
    audio.play().catch(e => {
        currentPlayingAudios = currentPlayingAudios.filter(a => a !== audio);
        console.log('Auto play original audio muted:', e);
    });
    audio.onended = () => {
        currentPlayingAudios = currentPlayingAudios.filter(a => a !== audio);
    };
}

// =============== 渲染单题 ===============
function renderExercise(index) {
    const rawEx = exercises[index];

    // 深度查找关键字段
    const image_url = deepFindKey(rawEx, 'image_url');
    const audio_url = deepFindKey(rawEx, 'audio_url');
    const word = extractTextContent(rawEx);
    const id = deepFindKey(rawEx, 'id');
    const asr_tool = rawEx._asr_tool;

    // 验证必要字段
    const missing = [];
    if (!image_url) missing.push('image_url');
    if (!audio_url) missing.push('audio_url');
    if (!word) missing.push('word');
    if (!id) missing.push('id');

    if (missing.length > 0) {
        mdui.snackbar({
            message: `第 ${index + 1} 题缺少字段: ${missing.join(', ')}`,
                      timeout: 4000
        });
        return; // 跳过这道题
    }

    // 构造标准化题目对象
    const ex = { image_url, audio_url, word, id, asr_tool };

    const container = document.createElement('div');
    container.className = 'exercise-container mdui-p-a-3';
    if (index === 0) container.classList.add('active');

    const img = document.createElement('img');
    img.src = ex.image_url;
    img.style.width = '100%';
    img.style.maxHeight = '300px';
    img.style.objectFit = 'contain';
    img.className = 'mdui-img-fluid';
    container.appendChild(img);

    const wordSection = document.createElement('div');
    wordSection.className = 'word-section';

    const wordEl = document.createElement('div');
    wordEl.className = 'mdui-typo-display-1 mdui-m-b-2';
    wordEl.textContent = ex.word;
    wordSection.appendChild(wordEl);

    const originalBtn = document.createElement('mdui-fab');
    originalBtn.setAttribute('icon', 'volume_up');
    originalBtn.setAttribute('size', 'small');
    originalBtn.addEventListener('click', () => {
        const audio = new Audio(ex.audio_url);
        currentPlayingAudios.push(audio);
        audio.play().catch(e => console.warn('Play original failed:', e));
        audio.onended = () => {
            currentPlayingAudios = currentPlayingAudios.filter(a => a !== audio);
        };
    });
    wordSection.appendChild(originalBtn);
    container.appendChild(wordSection);

    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'score-display';
    container.appendChild(scoreDisplay);

    const waveformDiv = document.createElement('div');
    waveformDiv.className = 'waveform';
    const canvas = document.createElement('canvas');
    waveformDiv.appendChild(canvas);
    container.appendChild(waveformDiv);

    const btnsDiv = document.createElement('div');
    btnsDiv.className = 'action-buttons';

    const playUserBtn = document.createElement('mdui-fab');
    playUserBtn.setAttribute('icon', 'play_arrow');
    playUserBtn.setAttribute('disabled', '');

    const recordBtn = document.createElement('mdui-fab');
    recordBtn.setAttribute('icon', 'mic');

    recordBtn.onclick = async () => {
        const currentIcon = recordBtn.getAttribute('icon');

        if (currentIcon === 'mic') {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                if (animationId) cancelAnimationFrame(animationId);
                if (audioContext) audioContext.close();
            }

            audioChunks = [];
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.start();

                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 64;

                const canvas = container.querySelector('.waveform canvas');
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;

                const updateWaveform = () => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        const dataArray = new Uint8Array(analyser.fftSize);
                        analyser.getByteTimeDomainData(dataArray);

                        const canvas = container.querySelector('.waveform canvas');
                        drawWaveform(dataArray, canvas);

                        animationId = requestAnimationFrame(updateWaveform);
                    }
                };
                updateWaveform();

                recordBtn.setAttribute('icon', 'stop');
            } catch (err) {
                mdui.snackbar({ message: '无法访问麦克风', timeout: 3000 });
                console.error(err);
            }

        } else if (currentIcon === 'stop') {
            mediaRecorder.stop();
            // if (animationId) cancelAnimationFrame(animationId);
            // if (audioContext) audioContext.close();
            //
            // await new Promise(resolve => {
            //     mediaRecorder.onstop = resolve;
            // });
            //
            // const userAudioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            // ex.userAudioBlob = userAudioBlob;
            // playUserBtn.removeAttribute('disabled');
            // recordBtn.setAttribute('loading', '');
            //
            // try {
            //     const filename = generateAndroidFilename();
            //     const result = await ossClient.put(filename, userAudioBlob);
            //     ex.audioUploadUrl = result.url;
            //
            //     const score = Math.floor(Math.random() * 21) + 80;
            //     ex.finalScore = score;
            //     scoreDisplay.textContent = `得分：${score}`;
            // } catch (e) {
            //     mdui.snackbar({ message: '上传失败，请重试', timeout: 3000 });
            //     return;
            // } finally {
            //     recordBtn.removeAttribute('loading');
            // }
            //
            // recordBtn.setAttribute('icon', 'mic');



            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext) audioContext.close();

            await new Promise(resolve => {
                mediaRecorder.onstop = resolve;
            });

            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            ex.audioBlob = audioBlob;
            playUserBtn.removeAttribute('disabled');
            recordBtn.setAttribute('loading', '');

            // 1. 上传到 OSS
            try {
                const filename = generateAndroidFilename();
                const ossUrl = await ossClient.put(filename, audioBlob);
                ex.audioUploadUrl = ossUrl.url;
            } catch (err) {
                mdui.snackbar({ message: '音频上传失败', timeout: 3000 });
                return;
            } finally {
                recordBtn.removeAttribute('loading');
            }

            // 2. 调用 Cloudflare Whisper ASR
            let asrResult = null;
            try {
                mdui.snackbar({ message: '正在语音识别...', timeout: 2000 });
                asrResult = await transcribeWithWhisper(ex.audioUploadUrl);
                console.log('ASR Result:', asrResult);
            } catch (e) {
                console.warn('ASR failed:', e);
                asrResult = null;
            }

            // 3. 计算 phonics 和总分
            ex.phonics = computePhonicsScores(ex.word, asrResult?.words || []);

            // 总分 = 所有字母字符的平均分 × 100（非字母不计入）
            const letterScores = ex.phonics
            .filter(p => /[a-z]/.test(p.phoneme[0]))
            .map(p => p.overall);

            const avgScore = letterScores.length > 0
            ? letterScores.reduce((a, b) => a + b, 0) / letterScores.length
            : 0;

            ex.finalScore = Math.round(avgScore * 100); // 0~100 整数
            ex.isWrong = ex.finalScore < 60 ? 1 : 0;   // 动态计算

            // 4. 更新 UI
            scoreDisplay.textContent = `${ex.finalScore} 分`;
            scoreDisplay.style.display = 'block';
            mdui.snackbar({
                message: asrResult ? `识别: "${asrResult.text}"` : '识别失败，使用默认评分',
                timeout: 3000
            });
            recordBtn.setAttribute('icon', 'mic');
        }
    };

    playUserBtn.onclick = () => {
        if (ex.userAudioBlob) {
            const url = URL.createObjectURL(ex.userAudioBlob);
            const audio = new Audio(url);
            currentPlayingAudios.push(audio);
            audio.play().catch(e => console.warn('播放失败:', e));
            audio.onended = () => {
                URL.revokeObjectURL(url);
                currentPlayingAudios = currentPlayingAudios.filter(a => a !== audio);
            };
        }
    };

    const nextBtn = document.createElement('mdui-fab');
    nextBtn.setAttribute('icon', index === exercises.length - 1 ? 'check' : 'arrow_forward');
    nextBtn.onclick = () => {
        // currentPlayingAudios.forEach(audio => {
        //     audio.pause();
        //     if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src);
        // });
        //     currentPlayingAudios = [];

            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                if (animationId) cancelAnimationFrame(animationId);
                if (audioContext) audioContext.close();
            }

            if (!ex.audioUploadUrl) {
                mdui.snackbar({ message: '请先完成录音', timeout: 2000 });
                return;
            }

            const phonics = ex.word.split('').map(c => ({
                spell: c,
                phoneme: [c.toLowerCase()],
                overall: ex.finalScore / 100
            }));

            const submission = {
                id: ex.id,
                right_answer: ex.textContent,        // 原始文本
                score: ex.finalScore,                // 0~100 整数
                phonics: ex.phonics,                 // 字符级评分数组
                custom_answer: ex.audioUploadUrl,    // OSS MP3 地址
                is_wrong: ex.isWrong,                // 0 或 1（动态）
                is_select: 1,
                asr_tool: ex.asr_tool,      // 标记引擎
                check_record: "0,",
                is_mobile: 0
            };
            exerciseAnswers.push(submission);

            container.classList.remove('active');
            currentExerciseIndex++;
            if (currentExerciseIndex < exercises.length) {
                const nextContainer = document.querySelectorAll('.exercise-container')[currentExerciseIndex];
                nextContainer.classList.add('active');
                autoPlayOriginalAudio(exercises[currentExerciseIndex].audio_url);
            } else {
                submitAll();
            }
    };

    btnsDiv.appendChild(playUserBtn);
    btnsDiv.appendChild(recordBtn);
    btnsDiv.appendChild(nextBtn);
    container.appendChild(btnsDiv);

    document.getElementById('exercises').appendChild(container);
}

// =============== 提交成绩 ===============
async function submitAll() {
    clearInterval(timerInterval); // 停止计时器

    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    const pad = n => n.toString().padStart(2, '0');
    const spendTime = `00:${pad(Math.floor(duration / 60))}:${pad(duration % 60)}`;

    const exercisesData = exerciseAnswers;
    const payload = new URLSearchParams();
    payload.append('game_id', '26');
    payload.append('testbank_id', readGameTestbankId);
    payload.append('start_time', startTime.toISOString().slice(0, 19).replace('T', ' '));
    payload.append('end_time', endTime.toISOString().slice(0, 19).replace('T', ' '));
    payload.append('spend_time', spendTime);
    payload.append('resource_id', '14362982');
    payload.append('record_id', '0');
    payload.append('exercises', JSON.stringify(exercisesData));
    payload.append('auth', auth);

    try {
        const res = await fetch('https://zxzjapi.930390.xyz:2778/api/common/saveSpokenScore', {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const result = await res.json();
        if (res.ok && result.errcode === 0) {
            mdui.snackbar({ message: '提交成功喵！', timeout: 3000 });
        } else {
            throw new Error(result.errstr || '提交失败了喵');
        }
    } catch (e) {
        mdui.snackbar({ message: '提交失败了喵: ' + e.message, timeout: 4000 });
    }
}

// =============== 启动计时器 ===============
function startTimer() {
    if (isTimerRunning) return;

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // 重置 UI
    const chip = document.getElementById('timer-chip');
    if (chip) chip.textContent = '00:00';

    let seconds = 0;
    isTimerRunning = true;

    timerInterval = setInterval(() => {
        seconds++;
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        const display = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        if (chip) chip.textContent = display;
    }, 1000);
}

// =============== 主流程 ===============
async function doReadGame (testbankId,homeworkId) {
    // 每次执行脚本前，重置全局状态（适用于嵌入场景）
    if (typeof window.__spokenExerciseInit === 'undefined') {
        window.__spokenExerciseInit = true;
    } else {
        // 如果已经初始化过，先清理
        if (timerInterval) clearInterval(timerInterval);
        if (currentPlayingAudios) {
            currentPlayingAudios.forEach(a => {
                a.pause();
                if (a.src?.startsWith('blob:')) URL.revokeObjectURL(a.src);
            });
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (animationId) cancelAnimationFrame(animationId);
        if (audioContext) audioContext.close().catch(() => {});
    }

    // 重置关键状态
    timerInterval = null;
    isTimerRunning = false;
    startTime = new Date(); // 新的开始时间
    currentPlayingAudios = [];
    mediaRecorder = null;
    audioChunks = [];
    audioContext = null;
    analyser = null;
    animationId = null;
    exercises = [];
    exerciseAnswers = [];
    currentExerciseIndex = 0;
    ossClient = null;
    try {
        drg.open=true;
        readGameTestbankId=testbankId;
        auth=getAuth();
        await initOSS();
        startTime = new Date();
        startTimer();

        const res = await fetch(`https://zxzjapi.930390.xyz:2778/api/game/getTestbankDetail_mobileV2?auth=${auth}&testbank_id=${readGameTestbankId}&homework_id=${homeworkId}`);
        const rawData = await res.json();
        if (rawData.errcode !== 0) throw new Error(rawData.errstr || '获取题目失败');

        const rawExercises = rawData.data.exercises || [];
        exercises = rawExercises
        .map(item => {
            const wr = item.WR || item;
            if (!wr) return null;
            const asrTool = deepFindKey(wr, 'asr_tool') || 'shengtong';
            return { ...wr, _asr_tool: asrTool };
        })
        .filter(Boolean);
        document.getElementById("readgame-load").style.cssText = "display: none;";

        if (exercises.length === 0) {
            mdui.snackbar({ message: '未获取到任何题目', timeout: 3000 });
            return;
        }

        exercises.forEach((_, i) => renderExercise(i));

        if (exercises.length > 0 && exercises[0].audio_url) {
            autoPlayOriginalAudio(exercises[0].audio_url);
        }
    } catch (e) {
        mdui.snackbar({ message: '加载失败: ' + e.message, timeout: 4000 });
    }
}

drg.addEventListener('closed', function(event) {
    drg.innerHTML=`
    <mdui-circular-progress id="readgame-load"></mdui-circular-progress>
    <mdui-chip id="timer-chip" variant="filled" color="primary">00:00</mdui-chip>
    <div class="mdui-container-fluid">
    <div id="exercises"></div>
    </div>
    <mdui-button slot="action" variant="text" onclick="drg.open=false;">取消</mdui-button>
    `;
});
