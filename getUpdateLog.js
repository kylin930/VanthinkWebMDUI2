function renderChangelog(data) {
    let html = '';

    html+=`<h3>${data.version}</h3>`;
    html+='<h3>预计更新时间</h3>';
    html+=`<p>${data.update_time || '未指定'}</p>`;
    html+='<h3>更新内容</h3>';

    if (data.added && data.added.length > 0) {
        html+='<h4>新增（Added）</h4>';
        html+='<ul class="update-list">';
        data.added.forEach(item => {
            html+=`<li>${item}</li>`;
        });
        html+='</ul>';
    }

    if (data.improved && data.improved.length > 0) {
        html+='<h4>优化（Improved）</h4>';
        html+='<ul class="update-list">';
        data.improved.forEach(item => {
            html+=`<li>${item}</li>`;
        });
        html+='</ul>';
    }

    if (data.fixed && data.fixed.length > 0) {
        html+='<h4>修复（Fixed）</h4>';
        html+='<ul class="update-list">';
        data.fixed.forEach(item => {
            html+=`<li>${item}</li>`;
        });
        html+='</ul>';
    }

    if (data.note) {
        html+=`<p>${data.note}</p>`;
    }

    return html;
}

async function showUpdateChangelog(manual=false) {
    try {
        const res = await fetch("https://zxzjverlog.930390.xyz/api/version");
        if (!res.ok) throw new Error(`HTTP错误喵! 状态: ${res.status}`);
        const data = await res.json();

        if (!manual) {
            const last = localStorage.getItem('last_update_version');
            if (last === data.version) return;
        }

        const html = renderChangelog(data);
        const dialog = document.getElementById('update-dialog');
        const content = document.getElementById('changelog-content');
        const snackbar = document.querySelector('mdui-snackbar');

        content.innerHTML = html;
        dialog.headline = manual ? '更新日志' : '已发现新版本喵';
        dialog.open=true;

        const handleAcknowledge = () => {
            dialog.open=false;

            if (manual == false) {
                localStorage.setItem('last_update_version', data.version);
                mdui.snackbar(snackbar, {
                    message: '你可以在“设置”中再次查看更新日志喵',
                    duration: 3000,
                });
            }
            document.getElementById('acknowledge-btn').removeEventListener('click', handleAcknowledge);
        };

        const btn = document.getElementById('acknowledge-btn');
        btn.replaceWith(btn.cloneNode(true));

        document.getElementById('acknowledge-btn').addEventListener('click', handleAcknowledge);

    } catch (err) {
        console.warn('加载更新日志失败:', err);
        if (manual) {
            mdui.snackbar(document.querySelector('mdui-snackbar'), {
                message: '无法加载更新日志喵',
                duration: 3000,
            });
        }
    }
}

// 启动检测
document.addEventListener('DOMContentLoaded', () => {
    showUpdateChangelog(false);

    document.getElementById('verlog-btn').addEventListener('click', () => {
        document.getElementById('about-dialog').open=false;
        showUpdateChangelog(true);
    });
});
