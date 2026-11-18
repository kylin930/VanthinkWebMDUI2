const API_URL = 'https://api.wxzxzj.com/api/homework/student/getHomeworkList';
var homeworkDataList=[];
var hwt="all";
var fid="all";
var isMultiple=false;
var loadCricle=document.getElementById('load');

async function loadData(homeworkTime="all",finishDegree="all") {
    loadCricle.style.cssText="position: relative; height: 100vh;display: block;";
    try {
        // 初始化分页状态
        window.currentPage = 1;
        window.pageSize = 50; // 与API参数一致
        window.totalItems = 0;
        window.allData = []; // 用于存储所有已加载数据
        window.hasMoreData = true; // 是否还有更多数据
        homeworkDataList=[];
        hwt=homeworkTime;
        fid=finishDegree;

        const response = await fetchWithAuth(`${API_URL}?page=${window.currentPage}&page_size=${window.pageSize}&time=${homeworkTime}&degree=${finishDegree}`);
        if (!response.ok) {
            throw new Error(`HTTP出错了喵！状态码是：${response.status}`);
        }

        const data = await response.json();

        if (data.errcode !== 0) {
            throw new Error(`${data.errstr}`);
        }
        if (isMultiple == false) {
            degfilter.querySelector("mdui-segmented-button[selected='']").removeAttribute('loading');
            degfilter.removeAttribute('disabled');
            timefilter.querySelector("mdui-segmented-button[selected='']").removeAttribute('loading');
            timefilter.removeAttribute('disabled');
        }


        // 从API响应中获取总记录数
        window.totalItems = data.data.total || data.data.list.length;

        // 处理数据
        const processedData = processHomeworkData(data.data.list);
        window.allData = processedData;

        // 渲染数据
        renderData();

        // 更新按钮状态
        updateLoadMoreButton();

        return processedData;

    } catch (error) {
        console.error('请将此错误反馈给开发者：', error);
        showError(`呜…出错了！请把这个错误告诉开发者：${error.message}`);
        return null;
    }
}

function processHomeworkData(homeworkList) {
    return homeworkList.map(homework => {
        const base = {
            id: homework.id || 'N/A',
            name: homework.name || '无名称',
            description: homework.description || '无描述',
            created_at: homework.created_at || '未知时间',
            updated_at: homework.updated_at || '未更新',
            completion_rate: homework.completion_rate !== null ? `${homework.completion_rate}` : '0',
            vanclass_name: homework.vanclass_name || '已退班'
        };

        const type = homework.type ? {
            name: homework.type.name || '未定义',
            type_code: homework.type.type_code || 'N/A'
        } : {
            name: '未定义',
            type_code: 'N/A'
        };

        const isPublic = homework.is_public === 1 ? '是' : '否';
        const forceDeleting = homework.forceDeleting ? '是' : '否';
        const isHistory = homework.is_history === 1 ? '是' : '否';
        const finishCount = homework.is_finish ? parseInt(homework.is_finish) : 0;

        return {
            ...base,
            type,
            is_public: isPublic,
            forceDeleting,
                is_history: isHistory,
                status: homework.status === 1 ? '正常' : '已停用',
                entity_count: homework.entity_count || 0,
                testbank_count: homework.testbank_count || 0,
                finish_count: finishCount
        };
    });
}

function renderData() {
    const container = document.getElementById('data-container');
    container.innerHTML = '';

    let i=0;
    if (isMultiple == false) {
        window.allData.forEach(homework => {
            const card = document.createElement('mdui-list-item');
            card.setAttribute('rounded', '');
            card.innerHTML = `
            ${homework.name} （${homework.vanclass_name}）
            <span slot="description">${homework.type.name} 布置时间${homework.created_at} 题数${homework.testbank_count}个 完成人数${homework.finish_count}</span>
            <mdui-circular-progress value="${homework.completion_rate}" max="100" slot="icon"></mdui-circular-progress>
            <span slot="end-icon">完成${homework.completion_rate}%</span>
            `;
            homeworkDataList.push(homework.id);
            container.appendChild(card);
            i++;
        });
    } else {
        window.allData.forEach(homework => {
            const card = document.createElement('mdui-list-item');
            card.setAttribute('rounded', '');
            card.innerHTML = `
            ${homework.name} （${homework.vanclass_name}）
            <span slot="description">${homework.type.name} 布置时间${homework.created_at} 题数${homework.testbank_count}个 完成人数${homework.finish_count}</span>
            <mdui-circular-progress value="${homework.completion_rate}" max="100" slot="icon"></mdui-circular-progress>
            <mdui-checkbox slot="end-icon"></mdui-checkbox>
            `;
            homeworkDataList.push(homework.id);
            container.appendChild(card);
            i++;
        });
    }

    if (i == 0) {
        const card = document.createElement('mdui-list-item');
        card.setAttribute('rounded', '');
        card.innerText = "没有更多作业了喵";
        document.getElementById('data-container').appendChild(card);
    }
    loadCricle.style.cssText="position: relative; height: 100vh;display: none;";
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (window.hasMoreData) {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.textContent = '加载更多 (第 ' + window.currentPage + ' 页)';
        loadMoreBtn.disabled = false;
    } else {
        loadMoreBtn.textContent = '已加载完所有数据';
        loadMoreBtn.removeAttribute('loading');
        loadMoreBtn.disabled = true;
    }
}

async function loadMoreData() {
    if (!window.hasMoreData || window.isLoading) return;

    window.isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.textContent = '加载中...';
    loadMoreBtn.setAttribute('loading', '');
    loadMoreBtn.disabled = true;

    try {
        window.currentPage++;

        const response = await fetchWithAuth(`${API_URL}?page=${window.currentPage}&page_size=${window.pageSize}&time=${hwt}&degree=${fid}`);
        if (!response.ok) {
            throw new Error(`HTTP出错了喵！状态码是：${response.status}`);
        }

        const data = await response.json();

        if (data.errcode !== 0) {
            throw new Error(`${data.errstr}`);
        }

        const newData = processHomeworkData(data.data.list);
        window.allData = window.allData.concat(newData);
        window.hasMoreData = data.data.list.length > 0 && window.allData.length < window.totalItems;

        renderData();

    } catch (error) {
        console.error('加载更多数据失败:', error);
        showError(`呜…出错了！请把这个错误告诉开发者：${error.message}`);
        window.isLoading = false;
        loadMoreBtn.textContent = '加载更多 (第 ' + window.currentPage + ' 页)';
        loadMoreBtn.disabled = false;
    } finally {
        window.isLoading = false;
    }
}

function showError(message) {
    mdui.alert({
        headline: " 提示",
        description: message,
        confirmText: "OK"
    });
}

const aboutbutton=document.getElementById('about');
aboutbutton.addEventListener("click", () => {
    document.getElementById('about-dialog').open=true;
});
document.getElementById('dis-btn').addEventListener("click", () => {
    document.getElementById('disclaimer-dialog').open=true;
});

document.getElementById('ciallo').addEventListener('click', () => {
    // 每次点击都创建一个新的 audio 元素
    const audio = new Audio("https://www.nekopara.uk/webfiles/ciallo.aac");
    audio.preload = 'auto';
    audio.volume = 0.7; // 可选：设置音量
    // 播放音频
    audio.play().catch(e => {
        console.warn('音频播放失败:', e);
    });
    audio.addEventListener('ended', () => {
        audio.remove();
    });
});

const loadMoreContainer = document.createElement('div');
loadMoreContainer.innerHTML = `
<mdui-button variant="tonal" id="load-more-btn" style="display: none;">加载更多</mdui-button>
`;
document.getElementById('page1').appendChild(loadMoreContainer);
const loadMoreBtn = document.getElementById('load-more-btn');
loadMoreBtn.addEventListener('click', loadMoreData);

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
});

const timefilter=document.getElementById('timefilter');
const degfilter=document.getElementById('degfilter');
timefilter.addEventListener("change", () => {
    try {
        loadData(timefilter.querySelector("mdui-segmented-button[selected='']").getAttribute('value'), degfilter.querySelector("mdui-segmented-button[selected='']").getAttribute('value'));
        degfilter.querySelector("mdui-segmented-button[selected='']").setAttribute('loading', '');
        degfilter.setAttribute('disabled', '');
        timefilter.querySelector("mdui-segmented-button[selected='']").setAttribute('loading', '');
        timefilter.setAttribute('disabled', '');
    } catch(e) {
        timefilter.querySelector("mdui-segmented-button[value='all']").click();
    }
});

degfilter.addEventListener("change", () => {
    try {
        loadData(timefilter.querySelector("mdui-segmented-button[selected='']").getAttribute('value'), degfilter.querySelector("mdui-segmented-button[selected='']").getAttribute('value'));
        degfilter.querySelector("mdui-segmented-button[selected='']").setAttribute('loading', '');
        degfilter.setAttribute('disabled', '');
        timefilter.querySelector("mdui-segmented-button[selected='']").setAttribute('loading', '');
        timefilter.setAttribute('disabled', '');
    } catch(e) {
        degfilter.querySelector("mdui-segmented-button[value='all']").click();
    }
});
