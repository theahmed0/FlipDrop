// ==========================================
// 1. ترجمة الصفحة
// ==========================================
const roomTranslations = {
    ar: {
        roomTitle: "غرفة النقل المباشر ⚡",
        labelRoomCode: "رمز الغرفة:",
        statusWaiting: "في انتظار انضمام الجهاز الآخر...",
        statusConnected: "متصل جاهز لنقل الملفات 🟢",
        statusDisconnected: "انقطع الاتصال 🔴",
        statusConnecting: "جاري الاتصال بالجهاز الآخر...",
        dropText: "اسحب وأسقط الملفات هنا أو",
        selectFileBtn: "اختر ملفاً للنقل",
        transfersTitle: "الملفات المنقولة:",
        emptyMsg: "لا توجد ملفات مُرسلة أو مُستلمة بعد.",
        backText: "الرئيسية",
        langBtnText: "English",
        copiedAlert: "تم نسخ رمز الغرفة للحافظة!",
        fileSent: "تم إرسال:",
        fileReceived: "تم استلام:",
        dir: "rtl"
    },
    en: {
        roomTitle: "Direct Transfer Room ⚡",
        labelRoomCode: "Room Code:",
        statusWaiting: "Waiting for peer to join...",
        statusConnected: "Connected & ready to transfer 🟢",
        statusDisconnected: "Disconnected 🔴",
        statusConnecting: "Connecting to peer...",
        dropText: "Drag & drop files here or",
        selectFileBtn: "Choose a file to send",
        transfersTitle: "Transferred Files:",
        emptyMsg: "No files sent or received yet.",
        backText: "Home",
        langBtnText: "العربية",
        copiedAlert: "Room code copied to clipboard!",
        fileSent: "Sent:",
        fileReceived: "Received:",
        dir: "ltr"
    }
};

let currentLang = localStorage.getItem('flipdrop_lang') || 'ar';
let currentStatusKey = 'statusConnecting';

function applyRoomLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('flipdrop_lang', lang);

    document.documentElement.setAttribute('dir', roomTranslations[lang].dir);
    document.documentElement.setAttribute('lang', lang);

    const t = roomTranslations[lang];

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElemText('room-title', t.roomTitle);
    setElemText('label-room-code', t.labelRoomCode);
    setElemText('drop-text', t.dropText);
    setElemText('btn-select-file', t.selectFileBtn);
    setElemText('transfers-title', t.transfersTitle);
    setElemText('back-text', t.backText);
    setElemText('lang-text', t.langBtnText);

    const emptyMsg = document.getElementById('empty-msg');
    if (emptyMsg) emptyMsg.textContent = t.emptyMsg;

    updateStatusUI(currentStatusKey);
}

function updateStatusUI(statusKey) {
    currentStatusKey = statusKey;
    const statusTextEl = document.getElementById('status-text');
    const statusDotEl = document.getElementById('status-dot');
    const t = roomTranslations[currentLang];

    if (statusTextEl) statusTextEl.textContent = t[statusKey] || statusKey;
    
    if (statusDotEl) {
        statusDotEl.className = 'status-dot';
        if (statusKey === 'statusConnected') statusDotEl.classList.add('online');
        else if (statusKey === 'statusDisconnected') statusDotEl.classList.add('offline');
        else statusDotEl.classList.add('waiting');
    }
}

// ==========================================
// 2. إدارة PeerJS (P2P)
// ==========================================
let peer = null;
let conn = null;
let roomCode = '';

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initPeerSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const codeParam = urlParams.get('code');

    if (action === 'join' && codeParam) {
        roomCode = codeParam.toUpperCase();
        const displayCodeEl = document.getElementById('display-room-code');
        if (displayCodeEl) displayCodeEl.textContent = roomCode;
        
        peer = new Peer();
        
        peer.on('open', () => {
            updateStatusUI('statusConnecting');
            conn = peer.connect(`flipdrop-room-${roomCode}`);
            setupConnectionEvents();
        });

    } else {
        roomCode = generateCode();
        const displayCodeEl = document.getElementById('display-room-code');
        if (displayCodeEl) displayCodeEl.textContent = roomCode;

        peer = new Peer(`flipdrop-room-${roomCode}`);

        peer.on('open', () => {
            updateStatusUI('statusWaiting');
        });

        peer.on('connection', (incomingConn) => {
            conn = incomingConn;
            setupConnectionEvents();
        });
    }

    peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        updateStatusUI('statusDisconnected');
    });
}

function setupConnectionEvents() {
    if (!conn) return;

    conn.on('open', () => {
        updateStatusUI('statusConnected');
    });

    conn.on('data', (data) => {
        if (data && data.fileData) {
            handleReceivedFile(data);
        }
    });

    conn.on('close', () => {
        updateStatusUI('statusDisconnected');
    });

    conn.on('error', () => {
        updateStatusUI('statusDisconnected');
    });
}

// ==========================================
// 3. إرسال وتنزيل الملفات
// ==========================================
function sendFile(file) {
    if (!conn || !conn.open) {
        alert(currentLang === 'ar' ? 'يجب انتخار الجهاز الآخر حتى يتصل أولاً!' : 'Please wait for the other device to connect!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const filePackage = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: e.target.result
        };

        conn.send(filePackage);
        addFileToList(file.name, file.size, 'sent');
    };

    reader.readAsArrayBuffer(file);
}

function handleReceivedFile(data) {
    const blob = new Blob([data.fileData], { type: data.fileType });
    const downloadUrl = URL.createObjectURL(blob);
    addFileToList(data.fileName, data.fileSize, 'received', downloadUrl);
}

function addFileToList(name, size, type, downloadUrl = null) {
    const fileList = document.getElementById('file-list');
    const emptyMsg = document.getElementById('empty-msg');
    
    if (emptyMsg) emptyMsg.remove();

    const t = roomTranslations[currentLang];
    const sizeMB = (size / (1024 * 1024)).toFixed(2);

    const item = document.createElement('div');
    item.className = `file-item ${type}`;
    
    let content = `
        <div class="file-info">
            <span class="file-icon">📄</span>
            <div>
                <strong class="file-name">${name}</strong>
                <small class="file-size">${sizeMB} MB • ${type === 'sent' ? t.fileSent : t.fileReceived}</small>
            </div>
        </div>
    `;

    if (downloadUrl) {
        content += `<a href="${downloadUrl}" download="${name}" class="btn-download">⬇️</a>`;
    }

    item.innerHTML = content;
    if (fileList) fileList.prepend(item);
}

// ==========================================
// 4. ربط الأحداث المباشرة عند التجميل
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    applyRoomLanguage(currentLang);
    initPeerSession();

    // 1. زر اللغة
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nextLang = currentLang === 'ar' ? 'en' : 'ar';
            applyRoomLanguage(nextLang);
        });
    }

    // 2. زر النسخ
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(roomCode).then(() => {
                alert(roomTranslations[currentLang].copiedAlert);
            });
        });
    }

    // 3. رفع ملف عبر الاختيار
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                sendFile(e.target.files[0]);
            }
        });
    }

    // 4. رفع ملف عبر السحب والإسقاط (Drag & Drop)
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files.length > 0) {
                sendFile(dt.files[0]);
            }
        });
    }
});
