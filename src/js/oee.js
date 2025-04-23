var curpage=''

function waitForDeps(callback, interval = 100, timeout = 5000) {
    const startTime = Date.now();

    const checkExist = setInterval(() => {
        if (typeof window.page1 === 'function') {
            clearInterval(checkExist);
            callback();
        } else if (Date.now() - startTime > timeout) {
            clearInterval(checkExist);
            console.warn("Timeout: window.page1 not found.");
        }
    }, interval);
}

window.loadPage= function loadPage(page) {
    if (curpage!=page){
        curpage=page;
        fetch(page)
            .then(response => response.text())
            .then(html => {
                if(window.activeCharts){
                    window.activeCharts.forEach(chart => {
                       try {
                         if (chart && chart.destroy) {
                             chart.destroy();
                         }
                       } catch (error) {
                            console.log('errrr')
                       }
                    });
                    window.activeCharts = [];
                }
                const contentDiv = document.getElementById("curpage");
                contentDiv.innerHTML = html;
                waitForDeps(() => {
                    if (page === '/dash_one.html') {
                        window.page1();
                    }
                    if (page === '/dash_two.html') {
                        window.page2();
                    }
                    feather.replace();
                });
               
            })
            .catch(error => console.error('Error loading the page:', error));
    }
}
if (curpage==''){
    loadPage("/dash_one.html");
}