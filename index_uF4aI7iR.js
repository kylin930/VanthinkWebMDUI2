var homeworkInfoData;
var homeworkIdData;
var dohw=document.getElementById('dohw');
var rankListDialog=document.getElementById("ranklist-dialog");
var load1=document.getElementById("load1");
async function renderHomeworkInfo(homeworkId) {
    homeworkIdData = homeworkId;
    try {
        load1.style.cssText = "display: block;";
        document.getElementById('homework-list').innerHTML="<mdui-circular-progress></mdui-circular-progress>";
        document.getElementById("homeworkShare").setAttribute('disabled', '');
        document.getElementById("homeworkOneDo").setAttribute('disabled', '');
        let response = await fetchWithAuth(`https://api.wxzxzj.com/api/homework/student/getHomeworkInfo?homework_id=${homeworkId}`);
        if (!response.ok) {
            throw new Error(`HTTP错误喵! 状态: ${response.status}`);
        }
        renderInfo(await response.json());
    } catch (error) {
        console.error('请将此错误反馈给开发者：', error);
        showError(`呜…出错了！请把这个错误告诉开发者：${error.message}`);
        return null;
    } finally {
        load1.style.cssText = "display: none;";
        document.getElementById("homeworkShare").removeAttribute('disabled');
        document.getElementById("homeworkOneDo").removeAttribute('disabled');
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseTimeToSeconds(timeStr) {
    // 支持 "m:ss" 或 "mm:ss"
    if (typeof timeStr !== 'string') return 30;
    const parts = timeStr.split(':').map(part => parseInt(part, 10));
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 30;
}

async function submitGameScore(game_id, homework_id, testbank_id, spend_time) {
    // 计算时间字段
    const now = new Date();
    const startTime = now.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:MM:SS
    const endTime = new Date(now.getTime() + spend_time * 1000)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);

    // 格式化耗时为 HH:MM:SS
    const h = Math.floor(spend_time / 3600);
    const m = Math.floor((spend_time % 3600) / 60);
    const s = spend_time % 60;
    const spendTimeStr = [h, m, s]
    .map(n => n.toString().padStart(2, '0'))
    .join(':');

    const formData = new URLSearchParams();
    formData.append('record_id', '0');
    formData.append('game_id', String(game_id));
    formData.append('homework_id', homework_id);
    formData.append('testbank_id', testbank_id);
    formData.append('start_time', startTime);
    formData.append('end_time', endTime);
    formData.append('spend_time', spendTimeStr);
    formData.append('wrong_exercises', '[]');
    formData.append('scores', '0');
    formData.append('stars', '0');
    formData.append('correct_rate', '0');

    const response = await postWithAuth(
        'https://api.wxzxzj.com/api/game/saveScore',
        formData
    );
    return await response.json();
}

function renderInfo(oridata) {
    const data=oridata.data;
    homeworkInfoData=data;
    const appBar=document.getElementById('appbar-title');
    const hwDetail=document.getElementById('detail');
    const homeworkIds=[];
    appBar.innerHTML=data.name;
    document.getElementById("homework-list").innerHTML = "";
    hwDetail.innerHTML=`这是${data.teacher_name}老师于${data.created_at}布置给 “${data.vanclass.name}” 的练习喵，${data.type.name}。`;
    data.testbanks.forEach(item => {
        const list = document.createElement('mdui-list-item');
        list.setAttribute('rounded', '');
        list.innerHTML = `
            ${item.game.name} ${item.name}
            <span slot="description">达标：${item.standard*100}分/${item.accuracy}</span>
            <mdui-avatar slot="icon" src="${item.game.icon}"></mdui-avatar>
        `;
        document.getElementById('homework-list').appendChild(list);
        homeworkIds.push(item.id);
        console.log(`name: ${item.game.name}, id: ${item.id}`);
    });
}

async function saveScores(gameId, homeworkId, testBankId) {
    try {
        const spendTime = document.getElementById('spend-time').value;
        const response = await submitGameScore(gameId, homeworkId, testBankId, spendTime);
        for (let i=0;i <= 100;i+=Math.floor(Math.random() * (5 - 1 + 1)) + 1) {
            dohw.innerHTML=`黑客破解服务器中🥴
            <mdui-linear-progress value="${i}" max="100"></mdui-linear-progress>`;
            await wait(200);
        }
        dohw.innerHTML=`黑客破解服务器中🥴
        <mdui-linear-progress></mdui-linear-progress>`;
        await wait(1000);
        dohw.open=false;
        await wait(500);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        } else {
            dohw.innerHTML=`已破解成功🥴`;
            dohw.open=true;
        }
        console.log(await response.json());
    } catch (error) {
        console.error('请将此错误反馈给开发者：', error);
        showError(`呜…出错了！请把这个错误告诉开发者：${error.message}`);
        return null;
    }
}

async function rankList(homeworkId, testbankId) {
    try {
        dohw.innerHTML=`
        正在请求排行榜API喵
        <mdui-linear-progress></mdui-linear-progress>
        `;
        const response = await fetchWithAuth(`https://api.wxzxzj.com/api/homework/student/getTestbankRankList?homework_id=${homeworkId}&testbank_id=${testbankId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        dohw.open=false;
        document.getElementById('rankingList').innerHTML=`<img src="https://teachermate.oss-cn-qingdao.aliyuncs.com/LD4G9-1765032053399-4235666@2x.png" style="position: absolute;left: 35px;bottom: -3px;width: 95px;" />`;
        const data = await response.json();
        const rankList = data.data.list[0].rank_list;

        rankList.forEach((participant, index) => {
            const participantDiv = document.createElement('mdui-list-item');
            participantDiv.setAttribute('rounded', '');
            participantDiv.innerHTML = `
            ${index + 1}. ${participant.account.nickname}
            <mdui-avatar slot="icon" src="${participant.account.head_url}"></mdui-avatar>
            <span slot="description">准确率: ${participant.accuracy}%&nbsp;&nbsp;耗时: ${participant.spend_time}</span>
            `;
            document.getElementById('rankingList').appendChild(participantDiv);
        });
        rankListDialog.open=true;
    } catch (error) {
        mdui.alert({
            headline: "喵！出错了！",
            description: `请将此错误反馈给开发者喵：${error}`,
            confirmText: "OK"
        });
    }
}

function getListItemIndex(listItem) {
    const listItems = document.querySelectorAll('#homework-list mdui-list-item');
    return Array.from(listItems).indexOf(listItem);
}

const homeworkOneDo = document.getElementById('homeworkOneDo');
homeworkOneDo.addEventListener('click', async function(event) {
    dohw.removeAttribute('close-on-overlay-click');
    if (!homeworkInfoData || !homeworkInfoData.testbanks) {
        showError("请先加载作业信息喵！");
        return;
    }
    const autoTasks = [];
    homeworkInfoData.testbanks.forEach(item => {
        if (!(item.game.name.includes("读") && item.game.name !== "阅读理解")) {
            autoTasks.push(item);
        }
    });

    if (autoTasks.length == 0) {
        dohw.innerHTML = "没有可以一键完成的题目喵";
        dohw.open=true;
        await wait(1500);
        dohw.open=false;
        return;
    }
    dohw.open=true;
    let successCount=0;

    for (let i = 0; i < autoTasks.length; i++) {
        const item = autoTasks[i];
        const stepMsg = `正在执行的步骤 (${i + 1}/${autoTasks.length})：${item.game.name} - ${item.name}`;
        dohw.innerHTML = `${stepMsg}
        <mdui-linear-progress value="${(i / autoTasks.length) * 100}" max="100"></mdui-linear-progress>`;
        let spendTime = 30;
        let detailInfo = "";
        try {
            const rankRes = await fetchWithAuth(`https://api.wxzxzj.com/api/homework/student/getTestbankRankList?homework_id=${homeworkInfoData.id}&testbank_id=${item.id}`);
            if (rankRes.ok) {
                const rankData = await rankRes.json();
                const list = rankData.data?.list?.[0]?.rank_list || [];
                if (list.length > 0) {
                    const first = list[0];
                    const original = parseTimeToSeconds(first.spend_time);
                    const delta = Math.floor(Math.random() * 5) + 1; // 1~5，只增
                    spendTime = original + delta;
                    detailInfo = `<br><span style="color: gray; font-size: 0.85em;">参考第一名「${first.account.nickname}」(${original}秒)，增加 ${delta} 秒 → 提交 ${spendTime}秒</span>`;
                } else {
                    // 没人做？那就自己定个合理的（只增 1~5）
                    const delta = Math.floor(Math.random() * 5) + 1;
                    spendTime = 30 + delta;
                    detailInfo = `<br><span style="color: gray; font-size: 0.85em;">这道题还没人做过喵，按默认30秒增加 ${delta} 秒 → 提交 ${spendTime}秒</span>`;
                }
            } else {
                // 排行榜请求失败（只增 1~5）
                const delta = Math.floor(Math.random() * 5) + 1;
                spendTime = 30 + delta;
                detailInfo = `<br><span style="color: gray; font-size: 0.85em;">排行榜请求失败了喵，按默认30秒增加 ${delta} 秒 → 提交 ${spendTime}秒</span>`;
            }
        } catch (err) {
            console.error("获取排行榜时出错：", err);
            // 出错也走默认（只增 1~5）
            const delta = Math.floor(Math.random() * 5) + 1;
            spendTime = 30 + delta;
            detailInfo = `<br><span style="color: gray; font-size: 0.85em;">出错了，按默认30秒增加 ${delta} 秒 → 提交 ${spendTime}秒</span>`;
        }
        dohw.innerHTML = `${stepMsg}${detailInfo}
        <mdui-linear-progress value="${((i + 1) / autoTasks.length) * 100}" max="100"></mdui-linear-progress>`;

        try {
            const submitRes = await submitGameScore(item.game.id, homeworkInfoData.id, item.id, spendTime);
            if (submitRes.errcode === 0) {
                successCount++;
            } else {
                console.warn(`提交失败 (${item.name})，状态：`, submitRes.status);
            }
        } catch (err) {
            console.error("提交分数时出错：", err);
        }

        await wait(400);
    }


    dohw.setAttribute('close-on-overlay-click', '');
    dohw.innerHTML = `
    一键完成作业成功了喵！<br>
    共 ${autoTasks.length} 题，成功提交 ${successCount} 题
    <mdui-button slot="action" variant="text" onclick="dohw.open=false;">关闭</mdui-button>
    `;
});

// ====== 配置 ======
const MAX_SELECT_COUNT = 30;
const MIN_WAIT_MS = 3000;
const MAX_WAIT_MS = 6000;

async function randomWait() {
    const delay = Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS + 1)) + MIN_WAIT_MS;
    await wait(delay);
}

document.getElementById('homeworkBatchDo')?.addEventListener('click', async () => {
    isMultiple = true;
    loadData("all", "undone");
    await wait(500);

    if (!Array.isArray(window.allData) || window.allData.length === 0) {
        showError("没有可选的作业喵！");
        isMultiple = false;
        return;
    }

    const maxDisplay = Math.min(window.allData.length, 100);
    const container = document.getElementById('homeworkCheckboxes');
    container.innerHTML = '';
    const checkboxes = [];

    const selectAllDiv = document.createElement('div');
    selectAllDiv.style.cssText = 'padding: 8px 0; border-bottom: 1px solid var(--mdui-color-outline-variant); margin-bottom: 8px;';
    const selectAllCb = document.createElement('mdui-checkbox');
    selectAllCb.label = `全选（最多 ${MAX_SELECT_COUNT} 个）`;
    selectAllDiv.appendChild(selectAllCb);
    container.appendChild(selectAllDiv);

    for (let i = 0; i < maxDisplay; i++) {
        const hw = window.allData[i];
        const checkbox = document.createElement('mdui-checkbox');
        checkbox.value = i;
        checkbox.label = `${hw.name}（${hw.testbank_count || 0}题）- ${hw.vanclass_name}`;
        checkbox.style.cssText = 'display: block; padding: 4px 0;';
        checkbox.addEventListener('change', updateBatchButton);
        container.appendChild(checkbox);
        checkboxes.push(checkbox);
    }

    selectAllCb.addEventListener('change', () => {
        const isChecked = selectAllCb.checked;
        checkboxes.forEach(cb => {
            if (isChecked) {
                const selectedCount = checkboxes.filter(c => c.checked).length;
                if (selectedCount < MAX_SELECT_COUNT) cb.checked = true;
            } else {
                cb.checked = false;
            }
        });
        updateBatchButton();
    });

    const startBtn = document.getElementById('startBatchBtn');
    startBtn.textContent = `开始执行（0/${MAX_SELECT_COUNT}）`;
    startBtn.disabled = true;
    startBtn.onclick = null;

    const dialog = document.getElementById('selectHomeworkDialog');
    dialog.open = true;

    function updateBatchButton() {
        const selected = checkboxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
        if (selected.length > MAX_SELECT_COUNT) {
            const lastChecked = checkboxes.find(cb =>
                cb.checked && !selected.slice(0, -1).includes(parseInt(cb.value))
            );
            if (lastChecked) lastChecked.checked = false;
            mdui.snackbar({ message: `最多只能选择 ${MAX_SELECT_COUNT} 个作业喵！`, timeout: 2000 });
            return;
        }
        startBtn.textContent = `开始执行（${selected.length}/${MAX_SELECT_COUNT}）`;
        startBtn.disabled = selected.length === 0;
        startBtn.onclick = selected.length > 0 ? () => executeBatch(selected) : null;
    }
});

async function executeBatch(selectedIndices) {
    const selectDialog = document.getElementById('selectHomeworkDialog');
    const dohw = document.getElementById('dohw');
    selectDialog.open = false;

    // ==================== 统计变量 ====================
    const stats = {
        totalItems: 0,
        successCount: 0,
        skippedCompleted: 0,
        skippedVoice: 0,
        voiceItems: [],
        notDoneItems: []
    };

    // ==================== 第1步：加载所有选中作业的详细信息 ====================
    dohw.removeAttribute('close-on-overlay-click');
    dohw.open = true;
    dohw.innerHTML = `正在加载作业详情...<mdui-linear-progress></mdui-linear-progress>`;

    const allTasks = [];

    for (let i = 0; i < selectedIndices.length; i++) {
        const hwIdx = selectedIndices[i];
        const hwBasic = window.allData[hwIdx];
        if (!hwBasic) continue;

        dohw.innerHTML = `
            正在加载作业详情 (${i + 1}/${selectedIndices.length})<br>
            「${hwBasic.name}」
            <mdui-linear-progress value="${((i + 1) / selectedIndices.length) * 100}" max="100"></mdui-linear-progress>
        `;

        try {
            const res = await fetchWithAuth(
                `https://api.wxzxzj.com/api/homework/student/getHomeworkInfo?homework_id=${hwBasic.id}`
            );
            if (!res.ok) continue;
            const hwData = await res.json();
            if (hwData.errcode !== 0 || !hwData.data?.testbanks) continue;

            const homework = hwData.data;
            for (const item of homework.testbanks) {
                const isVoice = item.game.name.includes("读") && item.game.name !== "阅读理解";
                const isStandardMode = item.standard !== undefined && item.standard !== null;
                allTasks.push({
                    homework,
                    item,
                    isVoice,
                    isStandardMode
                });
            }
        } catch (e) {
            console.warn(`加载作业详情失败: ${hwBasic.name}`, e);
        }

        await wait(200);
    }

    if (allTasks.length === 0) {
        dohw.setAttribute('close-on-overlay-click', '');
        dohw.innerHTML = `选中的作业中没有找到任何题目喵`;
        await wait(2000);
        dohw.open = false;
        isMultiple = false;
        return;
    }

    // ==================== 第2步：分类任务 ====================
    const autoTasks = allTasks.filter(t => !t.isVoice);
    const voiceTasks = allTasks.filter(t => t.isVoice);

    stats.totalItems = allTasks.length;
    voiceTasks.forEach(t => stats.voiceItems.push({
        homeworkName: t.homework.name,
        itemName: `${t.item.game.name} - ${t.item.name}`
    }));

    if (autoTasks.length === 0) {
        dohw.setAttribute('close-on-overlay-click', '');
        const voiceList = voiceTasks.map(t => `• 「${t.homework.name}」→ ${t.item.game.name} - ${t.item.name}`).join('<br>');
        dohw.innerHTML = `
            选中的作业全是语音类题目，已全部跳过喵～<br><br>
            <strong>跳过的语音题（${voiceTasks.length}个）：</strong><br>
            <div style="max-height: 200px; overflow-y: auto; font-size: 0.9em;">
                ${voiceList || '无'}
            </div>
            <mdui-button slot="action" variant="text" onclick="this.closest('#dohw').open=false;">关闭</mdui-button>
        `;
        isMultiple = false;
        return;
    }

    // ==================== 第3步：设置防离开 ====================
    const beforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '作业正在自动完成中，请不要关闭或刷新页面喵！';
        return e.returnValue;
    };
    window.addEventListener('beforeunload', beforeUnload);

    // ==================== 第4步：逐题执行 ====================
    const batchStartTime = Date.now();
    const historyTimes = [];

    for (let i = 0; i < autoTasks.length; i++) {
        const { homework, item, isStandardMode } = autoTasks[i];
        const current = i + 1;
        const total = autoTasks.length;

        // 预估剩余时间
        let estRemainingSec = 0;
        if (historyTimes.length > 0) {
            const avgMs = historyTimes.reduce((a, b) => a + b, 0) / historyTimes.length;
            const remainTasks = total - current;
            estRemainingSec = Math.round(avgMs * remainTasks / 1000) + remainTasks * 4;
        }

        const passThreshold = isStandardMode ? 100 : 80;

        const stepMsg = `
            <strong>⚠️ 请勿离开页面！</strong><br>
            <div style="margin-top: 8px;">
                进度：<strong>${current}</strong> / ${total}<br>
                当前作业：「${homework.name}」<br>
                当前题目：${item.game.name} - ${item.name}<br>
                模式：<span style="color: ${isStandardMode ? '#d32f2f' : '#1976d2'};">
                    ${isStandardMode ? `达标模式（需${passThreshold}分）` : `普通模式（需${passThreshold}分）`}
                </span>
            </div>
            ${estRemainingSec > 0 ? `<small style="color: #888;">预计还需约 ${formatTime(estRemainingSec)}</small>` : ''}
        `;

        dohw.innerHTML = `${stepMsg}
            <mdui-linear-progress value="${((current - 1) / total) * 100}" max="100" style="margin-top: 12px;"></mdui-linear-progress>
        `;

        const taskStartTime = Date.now();

        // ========== 获取排行榜（同时检测完成状态） ==========
        let rankData = null;
        let isAlreadyCompleted = false;
        try {
            const rankRes = await fetchWithAuth(
                `https://api.wxzxzj.com/api/homework/student/getTestbankRankList?homework_id=${homework.id}&testbank_id=${item.id}`
            );
            if (rankRes.ok) {
                rankData = await rankRes.json();
                const self = rankData?.data?.list?.[0]?.self;
                if (self && self.is_answered === 1 && self.accuracy >= passThreshold) {
                    isAlreadyCompleted = true;
                }
            }
        } catch (err) {
            console.warn(`获取排行榜失败: ${item.name}`, err);
        }

        // ========== 已完成则跳过 ==========
        if (isAlreadyCompleted) {
            stats.skippedCompleted++;
            const skipReason = isStandardMode
                ? `已达标（满分），跳过`
                : `已完成（≥${passThreshold}分），跳过`;
            dohw.innerHTML = `${stepMsg}
                <br><small style="color: #4caf50;">✓ ${skipReason}</small>
                <mdui-linear-progress value="${(current / total) * 100}" max="100" style="margin-top: 12px;"></mdui-linear-progress>
            `;
            await wait(300);
            historyTimes.push(Date.now() - taskStartTime);
            continue;
        }

        // ========== 语音题检测（双重保险） ==========
        if (item.game.name.includes("读") && item.game.name !== "阅读理解") {
            stats.skippedVoice++;
            dohw.innerHTML = `${stepMsg}
                <br><small style="color: #ff9800;">语音类题目，跳过</small>
                <mdui-linear-progress value="${(current / total) * 100}" max="100" style="margin-top: 12px;"></mdui-linear-progress>
            `;
            await wait(300);
            historyTimes.push(Date.now() - taskStartTime);
            continue;
        }

        // ========== 计算答题耗时 ==========
        let spendTime = 30;
        let detailInfo = "";
        if (rankData) {
            const list = rankData.data?.list?.[0]?.rank_list || [];
            if (list.length > 0) {
                const first = list[0];
                const original = parseTimeToSeconds(first.spend_time);
                const delta = Math.floor(Math.random() * 5) + 1;
                spendTime = original + delta;
                detailInfo = `<span style="color: #888; font-size: 0.85em;">参考「${first.account.nickname}」(${original}秒)，+${delta} → ${spendTime}秒</span>`;
            } else {
                const delta = Math.floor(Math.random() * 5) + 1;
                spendTime = 30 + delta;
                detailInfo = `<span style="color: #888; font-size: 0.85em;">无人做过，设为 ${spendTime}秒</span>`;
            }
        } else {
            const delta = Math.floor(Math.random() * 5) + 1;
            spendTime = 30 + delta;
            detailInfo = `<span style="color: #888; font-size: 0.85em;">默认 ${spendTime}秒</span>`;
        }

        // ========== 模拟真人答题等待 ==========
        await randomWait();

        // ========== 提交 ==========
        let submitOk = false;
        try {
            const submitRes = await submitGameScore(item.game.id, homework.id, item.id, spendTime);
            if (submitRes?.errcode === 0) {
                submitOk = true;
                stats.successCount++;
            } else {
                console.warn(`提交失败: ${homework.name} - ${item.name}`, submitRes);
                stats.notDoneItems.push({
                    homeworkName: homework.name,
                    itemName: `${item.game.name} - ${item.name}`,
                    reason: submitRes?.errstr || '提交失败'
                });
            }
        } catch (err) {
            console.error("提交出错:", err);
            stats.notDoneItems.push({
                homeworkName: homework.name,
                itemName: `${item.game.name} - ${item.name}`,
                reason: err.message || '网络错误'
            });
        }

        historyTimes.push(Date.now() - taskStartTime);

        // ========== 更新进度 ==========
        const statusTag = submitOk
            ? `<small style="color: #4caf50;">✓ 提交成功</small>`
            : `<small style="color: #f44336;">✗ 提交失败</small>`;
        dohw.innerHTML = `${stepMsg}
            <br>${detailInfo} ${statusTag}
            <mdui-linear-progress value="${(current / total) * 100}" max="100" style="margin-top: 12px;"></mdui-linear-progress>
        `;
    }

    // ==================== 第5步：清理与结果展示 ====================
    window.removeEventListener('beforeunload', beforeUnload);
    dohw.setAttribute('close-on-overlay-click', '');
    isMultiple = false;

    const totalTimeSec = Math.round((Date.now() - batchStartTime) / 1000);

    const voiceListHtml = stats.voiceItems.length > 0
        ? stats.voiceItems.map(v => `• 「${v.homeworkName}」→ ${v.itemName}`).join('<br>')
        : '无';

    const notDoneListHtml = stats.notDoneItems.length > 0
        ? stats.notDoneItems.map(v => `• 「${v.homeworkName}」→ ${v.itemName}（${v.reason}）`).join('<br>')
        : '无';

    dohw.innerHTML = `
        🎉 多选自动做题完成喵！<br><br>
        <div style="text-align: left; padding: 8px 0;">
            <strong>📊 统计信息：</strong><br>
            • 总题目数：${stats.totalItems}<br>
            • 成功提交：<span style="color: #4caf50;">${stats.successCount}</span><br>
            • 跳过（已完成）：${stats.skippedCompleted}<br>
            • 跳过（语音题）：${stats.voiceItems.length}<br>
            • 未成功：<span style="color: #f44336;">${stats.notDoneItems.length}</span><br>
            • 总耗时：${formatTime(totalTimeSec)}
        </div>
        <br>
        <mdui-panel>
            <mdui-panel-item>
                <div slot="header">🎤 未做的语音题（${stats.voiceItems.length}个）</div>
                <div style="max-height: 150px; overflow-y: auto; font-size: 0.9em; padding: 8px;">
                    ${voiceListHtml}
                </div>
            </mdui-panel-item>
            <mdui-panel-item>
                <div slot="header">❌ 未完成的题目（${stats.notDoneItems.length}个）</div>
                <div style="max-height: 150px; overflow-y: auto; font-size: 0.9em; padding: 8px;">
                    ${notDoneListHtml}
                </div>
            </mdui-panel-item>
        </mdui-panel>
        <mdui-button slot="action" variant="text" onclick="this.closest('#dohw').open=false;">关闭</mdui-button>
    `;
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
}

const dataContainer = document.getElementById('homework-list');
dataContainer.addEventListener('click', function(event) {
    const listItem = event.target.closest('mdui-list-item');
    dohw.innerHTML="";
    if (listItem) {
        const index = getListItemIndex(listItem);
        let i=0;
        homeworkInfoData.testbanks.forEach(item => {
            if (i == index) {
                console.log(`${item.game.id},${homeworkInfoData.id},${item.id}`);
                if(item.game.name == "微课") {
                    item.entity_list.forEach(entity => {
                        const entityJSON=JSON.parse(entity.testbank_extra_value);
                        dohw.innerHTML=`<video src="${entityJSON.video.video}" width="410px" height="auto" controls></video>
                        <mdui-text-field slot="action" label="通关时间（秒）" id="spend-time"></mdui-text-field>
                        <mdui-button slot="action" variant="tonal" onclick="saveScores(${item.game.id},${homeworkInfoData.id},${item.id});">提交分数</mdui-button>
                        <mdui-button slot="action" variant="text" onclick="dohw.open=false;">关闭</mdui-button>`;
                        dohw.open=true;
                    });
                } else if (!item.game.name.includes("读") || item.game.name == "阅读理解") {
                    dohw.innerHTML=`可以点击下面的按钮一键通关喵
                    <mdui-text-field label="通关时间（秒）" id="spend-time"></mdui-text-field>
                    <mdui-button slot="action" variant="tonal" onclick="saveScores(${item.game.id},${homeworkInfoData.id},${item.id});">提交分数</mdui-button>
                    <mdui-button slot="action" variant="text" onclick="rankList(${homeworkInfoData.id},${item.id});">排行榜</mdui-button>
                    <img src="https://teachermate.oss-cn-qingdao.aliyuncs.com/TfJrZ-1765031516988-4235675@2x.png" style="position: absolute;left: 5px;bottom: -3px;width: 90px;" />
                    <mdui-button slot="action" variant="text" onclick="dohw.open=false;">关闭</mdui-button>`;
                    dohw.open=true;
                } else if (item.game.name == "单词跟读" || item.game.name == "口语跟读" || item.game.name == "口语看读") {
                    doReadGame('c'+item.id,homeworkInfoData.id);
                } else {
                    mdui.confirm({
                        headline: "提示",
                        description: "目前小林只测试了单词跟读、口语跟读、口语看读的适配，其它的暂未测试，你确定要继续吗",
                        confirmText: "好的",
                        cancelText: "让我访问！",
                        onCancel: () => doReadGame('c'+item.id,homeworkInfoData.id),
                    });
                }
            }
            i++;
        });
        i=0;
    }
});

dohw.addEventListener('closed', function(event) {
    dohw.innerHTML="";
    dohw.removeAttribute('fullscreen');
});
