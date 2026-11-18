let currentPage = 1;
var messageListDialog=document.getElementById("message-list");
var noticeList=[];
const pageSize = 50;

async function doReadNotice(noticeId) {
    try {
        const ncid = document.getElementById("nc" + noticeId);
        let orihtml = ncid.innerHTML;
        ncid.innerHTML = `
        ${ncid.innerHTML}
        <mdui-circular-progress slot="end-icon"></mdui-circular-progress>
        `;

        const params = new URLSearchParams();
        params.append('notice_id_array', JSON.stringify([noticeId]));

        const response = await postWithAuth(
            'https://api.wxzxzj.com/api/notice/student/doReadNotice',
            params
        );

        ncid.innerHTML = `${orihtml}`;
        ncid.removeAttribute('active');
    } catch (error) {
        ncid.innerHTML = `${orihtml}`;
        mdui.alert({
            headline: "喵！出错了！",
            description: `将此错误反馈给开发者喵：${error.message || error}`,
            confirmText: "OK"
        });
    }
}

async function oneReadNotice() {
    try {
        document.getElementById('page-info').innerHTML = "<mdui-circular-progress></mdui-circular-progress>";

        const params = new URLSearchParams();
        params.append('notice_id_array', JSON.stringify(noticeList));

        const response = await postWithAuth(
            'https://api.wxzxzj.com/api/notice/student/doReadNotice',
            params
        );

        loadNoticeList(currentPage);
    } catch (error) {
        mdui.alert({
            headline: "喵！出错了！",
            description: `将此错误反馈给开发者喵：${error.message || error}`,
            confirmText: "OK"
        });
    }
}

async function loadNoticeList(page) {
    try {
        document.getElementById('page-info').innerHTML="<mdui-circular-progress></mdui-circular-progress>";
        const formData = new FormData();
        formData.append('type', 'notice');
        formData.append('page', page.toString());
        formData.append('page_size', pageSize.toString());

        const response = await postWithAuth('https://api.wxzxzj.com/api/notice/getNoticeList', formData);
        //const response = await fetchWithAuth(`https://api.wxzxzj.com/api/notice/getNoticeList?page=${page}`);
        if (!response.ok) throw new Error(`HTTP错误喵！状态码是：${response.status}`);
        const result = await response.json();

        const { list, count } = result.data;
        renderNoticeList(list);
        updatePagination(page, count);
        currentPage = page;
    } catch (error) {
        mdui.alert({
            headline: "喵！出错了！",
            description: `将此错误反馈给开发者喵：${error}`,
            confirmText: "OK"
        });
        document.getElementById('notice-list').innerHTML = `
        <mdui-list-item headline="加载失败" nonclickable></mdui-list-item>
        `;
        document.getElementById('page-info').textContent = "加载失败";
    }
}

async function renderNoticeList(notices) {
    const listEl = document.getElementById('notice-list');

    if (notices.length === 0) {
        listEl.innerHTML = '<mdui-list-item headline="暂无通知喵" nonclickable></mdui-list-item>';
        return;
    }

    const itemsHtml = notices.map(item => {
        const senderName = item.sender?.nickname || '系统';
        const time = new Date(item.created_at.replace(' ', 'T')).toLocaleString('zh-CN');
        const avatarUrl = item.sender?.head_url;
        const isActive = !item.has_read ? ' active' : '';

        const iconHtml = avatarUrl
        ? `<mdui-avatar slot="icon" src="${avatarUrl}"></mdui-avatar>`
        : `<mdui-icon slot="icon" name="person"></mdui-icon>`;

        const safeContent = escapeHtml(item.content);
        const safeSender = escapeHtml(senderName);
        noticeList.push(item.id);

        return `
        <mdui-list-item
        headline="${safeContent}"
        description="${safeSender} · ${time}"
        onclick="doReadNotice(${item.id});"
        id="nc${item.id}"
        alignment="start"
        headline-line="2"
        description-line="1"
        ${isActive}
        >
        ${iconHtml}
        </mdui-list-item>
        `;
    }).join('');

    listEl.innerHTML = itemsHtml;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updatePagination(currentPage, total) {
    const totalPages = Math.ceil(total / pageSize);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    pageInfo.textContent = totalPages > 0
    ? `第 ${currentPage} 页，共 ${totalPages} 页`
    : "无数据";

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

    prevBtn.onclick = () => loadNoticeList(currentPage - 1);
    nextBtn.onclick = () => loadNoticeList(currentPage + 1);
}

const msgList=document.getElementById('msglist')
msgList.addEventListener("click", () => {
    messageListDialog.open=true;
    loadNoticeList(1);
});

const readpage=document.getElementById('read-page')
readpage.addEventListener("click", () => {
    oneReadNotice();
});
