// ==========================================
// FlipDrop Core Engine - Live P2P Transfer
// Isolated Rooms | 100MB Max | Chunking | WakeLock
// ==========================================

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const CHUNK_SIZE = 32 * 1024; // 32KB Chunking

let peer = null;
let conn = null;
let wakeLock = null;
let currentRoomCode = '';

// Transfer States
let incomingBuffer = [];
let receivedSize = 0;
let fileMetadata = null;
let isTransferring = false;

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 600, duration = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

// 1. Init Room Handling
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const code = urlParams.get('code');

    if (action === 'join' && code) {
        joinExistingRoom(code);
    } else {
        createNewIsolatedRoom();
    }

    setupDragAndDrop();
});

// Generate Unique Code
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
}

// Create Room
function createNewIsolatedRoom() {
    currentRoomCode = generateCode();
    document.getElementById('room-code-display').innerText = currentRoomCode;
    
    // QR Code Generation
    const joinUrl = `${window.location.origin}${window.location.pathname}?action=join&code=${currentRoomCode}`;
    new QRCode(document.getElementById('qrcode'), { text: joinUrl, width: 128, height: 128 });

    peer = new Peer('flipdrop-' + currentRoomCode);

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });

    peer.on('error', (err) => console.error(err));
}

// Join Room
function joinExistingRoom(code) {
    currentRoomCode = code;
    document.getElementById('room-info-box').style.display = 'none';
    
    peer = new Peer(); // Guest Peer
    peer.on('open', () => {
        conn = peer.connect('flipdrop-' + currentRoomCode);
        setupConnection();
    });
}

// Setup Active Connection
function setupConnection() {
    requestWakeLock();
    playBeep(800, 0.15);
    updateStatus(true);

    conn.on('data', handleData);
    conn.on('close', () => {
        alert('انقطع الاتصال أو أُغلقت الغرفة من الطرف الآخر');
        window.location.href = 'index.html';
    });

    window.addEventListener('beforeunload', () => {
        if (conn) conn.send({ type: 'HOST_DISCONNECTED' });
        cleanupSession();
    });
}

function updateStatus(connected) {
    const badge = document.getElementById('status-badge');
    const text = document.getElementById('status-text');
    const workspace = document.getElementById('workspace');

    if (connected) {
        badge.querySelector('.pulse-dot').className = 'pulse-dot green';
        text.innerText = 'متصل متزامن 🟢';
        workspace.classList.remove('hidden');
    }
}

// Handle Data Stream
function handleData(data) {
    if (data.type === 'HOST_DISCONNECTED') {
        alert('أغلق المستضيف الصفحَة، انتهت الجلسة.');
        window.location.href = 'index.html';
        return;
    }

    if (data.type === 'TEXT') {
        playBeep(1000, 0.1);
        const container = document.getElementById('text-received-container');
        container.innerHTML = `<div class="text-bubble"><p>${data.payload}</p><button onclick="navigator.clipboard.writeText('${data.payload}')">نسخ</button></div>`;
        return;
    }

    if (data.type === 'CANCEL') {
        resetTransfer();
        alert('تم إلغاء النقل من قبل الطرف الآخر.');
        return;
    }

    if (data.type === 'FILE_HEADER') {
        fileMetadata = data;
        incomingBuffer = [];
        receivedSize = 0;
        isTransferring = true;
        showProgress(true, fileMetadata.name);
        return;
    }

    if (data.type === 'FILE_CHUNK') {
        incomingBuffer.push(data.chunk);
        receivedSize += data.chunk.byteLength;
        const progress = Math.floor((receivedSize / fileMetadata.size) * 100);
        updateProgressUI(progress);

        if (receivedSize >= fileMetadata.size) {
            playBeep(1200, 0.2);
            downloadFile();
            resetTransfer();
        }
    }
}

// Send File
function sendFile(file) {
    if (!conn || file.size > MAX_FILE_SIZE_BYTES) {
        alert(`حجم الملف يتجاوز الحد الأقصى ${MAX_FILE_SIZE_MB}MB!`);
        return;
    }

    isTransferring = true;
    showProgress(true, file.name);

    conn.send({ type: 'FILE_HEADER', name: file.name, size: file.size, mime: file.type });

    let offset = 0;
    const reader = new FileReader();

    reader.onload = (e) => {
        if (!isTransferring) return;
        conn.send({ type: 'FILE_CHUNK', chunk: e.target.result });
        offset += e.target.result.byteLength;
        const progress = Math.floor((offset / file.size) * 100);
        updateProgressUI(progress);

        if (offset < file.size) {
            readNext();
        } else {
            playBeep(1200, 0.2);
            alert('تم إرسال الملف بنجاح! 🎉');
            resetTransfer();
        }
    };

    function readNext() {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    }
    readNext();
}

function sendQuickText() {
    const input = document.getElementById('quick-text-input');
    if (input.value.trim() && conn) {
        conn.send({ type: 'TEXT', payload: input.value });
        input.value = '';
    }
}

function downloadFile() {
    const blob = new Blob(incomingBuffer, { type: fileMetadata.mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileMetadata.name;
    a.click();
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) sendFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) sendFile(e.dataTransfer.files[0]);
    });
}

function showProgress(show, name = '') {
    const box = document.getElementById('progress-box');
    document.getElementById('progress-filename').innerText = name;
    box.classList.toggle('hidden', !show);
}

function updateProgressUI(percent) {
    document.getElementById('progress-bar').value = percent;
    document.getElementById('progress-percent').innerText = `${percent}%`;
    document.title = `(${percent}%) FlipDrop ⚡`;
}

function cancelTransfer() {
    if (conn) conn.send({ type: 'CANCEL' });
    resetTransfer();
}

function resetTransfer() {
    isTransferring = false;
    incomingBuffer = [];
    receivedSize = 0;
    document.title = 'FlipDrop ⚡';
    showProgress(false);
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode);
    alert('تم نسخ الرمز!');
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
}

function cleanupSession() {
    if (wakeLock) wakeLock.release();
    if (conn) conn.close();
    if (peer) peer.destroy();
}