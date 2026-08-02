document.addEventListener('DOMContentLoaded', function() {
    function getListItemIndex(listItem) {
        const listItems = document.querySelectorAll('#data-container mdui-list-item');
        return Array.from(listItems).indexOf(listItem);
    }

    function switchPage(pageId, index) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');

            if (pageId === 'page2' && typeof index === 'number') {
                if (typeof renderHomeworkInfo === 'function') {
                    const homeworkId = homeworkDataList[index];
                    renderHomeworkInfo(homeworkId);
                }
            }
        }
    }

    const dataContainer = document.getElementById('data-container');
    dataContainer.addEventListener('click', function(event) {
            const listItem = event.target.closest('mdui-list-item');
            if (listItem) {
                const index = getListItemIndex(listItem);
                if(isMultiple == false){
                    switchPage('page2', index);
                }
            }
    });

    const back = document.getElementById('back');
    back.addEventListener('click', function(event) {
        loadData();
        switchPage('page1');
    });
});
