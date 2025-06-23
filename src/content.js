import './widget/widget.css';

(function () {
    if (document.getElementById('my-widget-iframe')) return;

    const iframe = document.createElement('iframe');
    iframe.id = 'my-widget-iframe';
    iframe.src = chrome.runtime.getURL('widget.html');
    iframe.className = 'my-widget-iframe';

    document.body.appendChild(iframe);
})();
