const qhButton = document.getElementById('qh');
let isdark = localStorage.getItem('dark') || 'no';
function dark() {
    isdark=localStorage.getItem('dark') || 'no';
    if (isdark == 'yes') {
        qhButton.setAttribute('icon', 'nightlight');
        mdui.snackbar({
            message: '已切换为深色模式',
            placement: 'bottom-end'
        });
        mdui.setTheme("dark");
    }
    if (isdark == 'no') {
        qhButton.setAttribute('icon', 'light_mode');
        if (mdui.getTheme() == "dark") {
            mdui.snackbar({
                message: '已切换为浅色模式',
                placement: 'bottom-end'
            });
            mdui.setTheme("light");
        }
    }
}
dark();
qhButton.addEventListener('click', function () {
    if (isdark == 'no') {
        isdark='yes';
    } else {
        isdark='no';
    }
    localStorage.setItem('dark', isdark);
    dark();
});
