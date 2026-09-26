// ==========================================
// 1. قاموس ترجمة صفحة غرفة النقل (AR / EN)
// ==========================================
const roomTranslations = {
    ar: {
        roomTitle: "غرفة النقل المباشر ⚡",
        labelRoomCode: "رمز الغرفة:",
        qrHint: "امسح الرمز بواسطة كاميرا الهاتف للانضمام فوراً 📱",
        statusWaiting: "في انتظار انضمام الجهاز الآخر...",
        statusConnected: "متصل جاهز لنقل الملفات 🟢",
        statusDisconnected: "انقطع الاتصال 🔴",
        statusConnecting: "جاري الاتصال بالجهاز الآخر...",
        statusSlow: "الاتصال يستغرق وقتاً أطول من المعتاد، تأكد من الشبكة أو أعد تحميل الصفحة",
        dropText: "اسحب وأسقط الملفات هنا أو",
        selectFileBtn: "اختر ملفاً للنقل",
        transfersTitle: "الملفات المنقولة:",
        emptyMsg: "لا توجد ملفات مُرسلة أو مُستلمة بعد.",
        backText: "الرئيسية",
        langBtnText: "English",
        copiedAlert: "تم نسخ رمز الغرفة للحافظة!",
        fileSent: "تم إرسال:",
        fileReceived: "تم استلام:",
        sizeError: "الملف أكبر من الحد المسموح (100 ميجابايت).",
        waitForPeer: "انتظر اتصال الجهاز الآخر بالغرفة أولاً!",
        dir: "rtl"
    },
    en: {
        roomTitle: "Direct Transfer Room ⚡",
        labelRoomCode: "Room Code:",
        qrHint: "Scan code with phone camera to join instantly 📱",
        statusWaiting: "Waiting for peer to join...",
        statusConnected: "Connected & ready to transfer 🟢",
        statusDisconnected: "Disconnected 🔴",
        statusConnecting: "Connecting to peer...",
        statusSlow: "This is taking longer than usual. Check your connection or reload the page",
        dropText: "Drag & drop files here or",
        selectFileBtn: "Choose a file to send",
        transfersTitle: "Transferred Files:",
        emptyMsg: "No files sent or received yet.",
        backText: "Home",
        langBtnText: "العربية",
        copiedAlert: "Room code copied to clipboard!",
        fileSent: "Sent:",
        fileReceived: "Received:",
        sizeError: "File exceeds the 100MB limit.",
        waitForPeer: "Please wait for the other device to connect!",
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
    setElemText('qr-hint', t.qrHint);
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
// 2. توليد رمز QR Code
// ==========================================
function renderQRCode(code) {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';
    const joinUrl = `${window.location.origin}${window.location.pathname}?action=join&code=${code}`;

    new QRCode(qrContainer, {
        text: joinUrl,
        width: 110,
        height: 110,
        colorDark: "#ffffff",
        colorLight: "#121214",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// ==========================================
// 3. إدارة الاتصال عبر PeerJS (P2P)
// ==========================================
let peer = null;
let conn = null;
let roomCode = '';
let connectTimeoutTimer = null;
let idRetryCount = 0;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB حد أقصى
const CHUNK_SIZE = 64 * 1024;            // 64KB لكل جزء أثناء الإرسال

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function armConnectingTimeout() {
    clearConnectingTimeout();
    connectTimeoutTimer = setTimeout(() => {
        // فقط اعرض التنبيه إذا ما زلنا في وضع الانتظار/الاتصال بدون نجاح
        if (currentStatusKey === 'statusConnecting' || currentStatusKey === 'statusWaiting') {
            const statusTextEl = document.getElementById('status-text');
            if (statusTextEl) statusTextEl.textContent = roomTranslations[currentLang].statusSlow;
        }
    }, 15000);
}

function clearConnectingTimeout() {
    if (connectTimeoutTimer) {
        clearTimeout(connectTimeoutTimer);
        connectTimeoutTimer = null;
    }
}

function initPeerSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const codeParam = urlParams.get('code');

    if (action === 'join' && codeParam) {
        roomCode = codeParam.toUpperCase();
        const displayCodeEl = document.getElementById('display-room-code');
        if (displayCodeEl) displayCodeEl.textContent = roomCode;

        // إخفاء الـ QR عند الانضمام من جهاز ثاني
        const qrWrapper = document.getElementById('qrcode-wrapper');
        if (qrWrapper) qrWrapper.style.display = 'none';

        peer = new Peer();

        peer.on('open', () => {
            updateStatusUI('statusConnecting');
            armConnectingTimeout();
            conn = peer.connect(`flipdrop-room-${roomCode}`, { reliable: true });
            setupConnectionEvents();
        });

        peer.on('error', (err) => handlePeerError(err));

    } else {
        createRoomWithCode(generateCode());
    }
}

function createRoomWithCode(code) {
    roomCode = code;
    const displayCodeEl = document.getElementById('display-room-code');
    if (displayCodeEl) displayCodeEl.textContent = roomCode;

    renderQRCode(roomCode);

    // إغلاق أي اتصال سابق فاشل قبل إعادة المحاولة
    if (peer && !peer.destroyed) peer.destroy();

    peer = new Peer(`flipdrop-room-${roomCode}`);

    peer.on('open', () => {
        updateStatusUI('statusWaiting');
        armConnectingTimeout();
    });

    peer.on('connection', (incomingConn) => {
        clearConnectingTimeout();
        conn = incomingConn;
        setupConnectionEvents();
    });

    peer.on('error', (err) => handlePeerError(err));
}

function handlePeerError(err) {
    console.error('PeerJS Error:', err);

    // إذا كان رمز الغرفة مستخدماً مسبقاً (نادر لكن ممكن)، أنشئ رمزاً جديداً تلقائياً بدل التوقف
    if (err && err.type === 'unavailable-id' && idRetryCount < 3) {
        idRetryCount += 1;
        createRoomWithCode(generateCode());
        return;
    }

    clearConnectingTimeout();
    updateStatusUI('statusDisconnected');
}

function setupConnectionEvents() {
    if (!conn) return;

    conn.on('open', () => {
        clearConnectingTimeout();
        updateStatusUI('statusConnected');
    });

    conn.on('data', (data) => {
        if (!data || !data.kind) return;
        if (data.kind === 'file-start') startIncomingFile(data);
        else if (data.kind === 'file-chunk') receiveFileChunk(data);
        else if (data.kind === 'file-end') finishIncomingFile();
    });

    conn.on('close', () => {
        updateStatusUI('statusDisconnected');
    });

    conn.on('error', () => {
        updateStatusUI('statusDisconnected');
    });
}

// ==========================================
// 4. إرسال وتنزيل الملفات (بالتجزئة/Chunks)
// ==========================================
function setProgress(visible, percent) {
    const wrap = document.getElementById('progress-wrap');
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    if (!wrap || !bar || !label) return;

    wrap.hidden = !visible;
    bar.style.width = Math.max(0, Math.min(100, percent)).toFixed(0) + '%';
    label.textContent = Math.max(0, Math.min(100, percent)).toFixed(0) + '%';
}

function sendFile(file) {
    if (!conn || !conn.open) {
        alert(roomTranslations[currentLang].waitForPeer);
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        alert(roomTranslations[currentLang].sizeError);
        return;
    }

    conn.send({ kind: 'file-start', name: file.name, size: file.size, mime: file.type });
    setProgress(true, 0);

    let offset = 0;
    const reader = new FileReader();

    function readSlice(o) {
        reader.readAsArrayBuffer(file.slice(o, o + CHUNK_SIZE));
    }

    reader.onload = (e) => {
        conn.send({ kind: 'file-chunk', data: e.target.result });
        offset += e.target.result.byteLength;
        setProgress(true, (offset / file.size) * 100);

        if (offset < file.size) {
            readSlice(offset);
        } else {
            conn.send({ kind: 'file-end' });
            setProgress(false, 0);
            addFileToList(file.name, file.size, 'sent');
        }
    };

    reader.onerror = () => {
        setProgress(false, 0);
        alert(currentLang === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'An error occurred while reading the file.');
    };

    readSlice(0);
}

let incomingMeta = null;
let incomingChunks = [];
let incomingReceived = 0;

function startIncomingFile(data) {
    incomingMeta = { name: data.name, size: data.size, mime: data.mime || 'application/octet-stream' };
    incomingChunks = [];
    incomingReceived = 0;
    setProgress(true, 0);
}

function receiveFileChunk(data) {
    if (!incomingMeta) return;
    incomingChunks.push(data.data);
    incomingReceived += data.data.byteLength;
    setProgress(true, (incomingReceived / incomingMeta.size) * 100);
}

function finishIncomingFile() {
    if (!incomingMeta) return;
    const blob = new Blob(incomingChunks, { type: incomingMeta.mime });
    const downloadUrl = URL.createObjectURL(blob);
    addFileToList(incomingMeta.name, incomingMeta.size, 'received', downloadUrl);
    setProgress(false, 0);
    incomingMeta = null;
    incomingChunks = [];
    incomingReceived = 0;
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
// 5. الأحداث المباشرة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    applyRoomLanguage(currentLang);
    initPeerSession();

    // 1. تغيير اللغة
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nextLang = currentLang === 'ar' ? 'en' : 'ar';
            applyRoomLanguage(nextLang);
        });
    }

    // 2. نسخ الرمز
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(roomCode).then(() => {
                alert(roomTranslations[currentLang].copiedAlert);
            });
        });
    }

    // 3. رفع ملف عبر زر الاختيار
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                sendFile(e.target.files[0]);
                fileInput.value = '';
            }
        });
    }

    // 4. رفع ملف عبر السحب والإسقاط
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
