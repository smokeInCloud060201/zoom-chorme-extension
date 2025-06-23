const closeBtn = document.getElementById('close');
closeBtn.addEventListener('click', () => {
    const iframe = window.frameElement;
    if (iframe) iframe.remove();
});

let isDragging = false;
let offsetX, offsetY;

const header = document.getElementById('header');

header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = window.frameElement.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
    if (!isDragging) return;
    const iframe = window.frameElement;
    iframe.style.left = `${e.clientX - offsetX}px`;
    iframe.style.top = `${e.clientY - offsetY}px`;
    iframe.style.bottom = 'auto'; // override fixed bottom
}

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}
