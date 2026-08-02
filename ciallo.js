const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let audioBuffer = null;

async function loadSound() {
    try {
        const response = await fetch("ciallo.aac");
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error('音频加载/解码失败:', e);
    }
}

function playSound() {
    if (!audioBuffer || audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.error);
        return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    source.start();
}

document.getElementById('ciallo').addEventListener('click', playSound);
loadSound();
