async function getSharePic(homeworkType) {
    try {
        const response = await fetchWithAuth(`https://api.wxzxzj.com/api/common/share/commonShare?share_id=${homeworkIdData}&share_type=${homeworkType}`);
        if (!response.ok) {
            throw new Error(`HTTP错误喵！状态码是：${response.status}`);
        }
        const data= await response.json();
        dohw.innerHTML=`
        <img src="${data.data.share_image}" height="400px" width="auto" />
        <mdui-button slot="action" variant="text" id="full">全屏</mdui-button>
        <mdui-button slot="action" variant="text" onclick="dohw.open=false;">关闭</mdui-button>
        `;
        const shareFull = document.getElementById('full');
        shareFull.addEventListener('click', function(event) {
            dohw.setAttribute('fullscreen', '');
            dohw.innerHTML=`
            <img src="${data.data.share_image}" />
            <mdui-button slot="action" variant="text" onclick="dohw.open=false;">关闭</mdui-button>
            `;
        });
    } catch (error) {
        console.error('请将此错误反馈给开发者：', error);
        showError(`呜…出错了！请把这个错误告诉开发者：${error.message}`);
        return null;
    }
}

const homeworkShare = document.getElementById('homeworkShare');
homeworkShare.addEventListener('click', function(event) {
    dohw.innerHTML="<mdui-circular-progress></mdui-circular-progress>"
    dohw.open=true;
    getSharePic('homework_student');
});
