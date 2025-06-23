// chrome.action.onClicked.addListener(() => {
//     chrome.windows.getCurrent({}, (currentWindow) => {
//         const WIDGET_WIDTH = 360;
//         const WIDGET_HEIGHT = 260;
//
//         const left = currentWindow.left + 20;
//         const top = currentWindow.top + currentWindow.height - WIDGET_HEIGHT - 40;
//
//         chrome.windows.create({
//             url: chrome.runtime.getURL('widget.html'),
//             type: 'popup',
//             focused: true,
//             width: WIDGET_WIDTH,
//             height: WIDGET_HEIGHT,
//             top: top,
//             left: left
//         });
//     });
// });
