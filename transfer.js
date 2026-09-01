// ==========================================
// 1. قاموس ترجمة صفحة غرفة النقل (AR / EN)
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
        sendingFile: "جاري إرسال:",
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
        sendingFile: "Sending:",
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
// 2. منطق الاتصال المباشر عبر PeerJS (P2P)
// ==========================================
let peer = null;
let conn = null;
let roomCode = '';

// توليد رمز غرفة عشوائي مكون من 6 أحرف
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initPeerSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const codeParam = urlParams.get('code');

    if (action === 'join' && codeParam) {
        // الطرف المنضم للغرفة
        roomCode = codeParam.toUpperCase();
        document.getElementById('display-room-code').textContent = roomCode;
        
        peer = new Peer();
        
        peer.on('open', () => {
            updateStatusUI('statusConnecting');
            // الاتصال بالمُنشئ باستخدام رمز الغرفة
            conn = peer.connect(`flipdrop-room-${roomCode}`);
            setupConnectionEvents();
        });

    } else {
        // المنشئ لغرفة جديدة
        roomCode = generateCode();
        document.getElementById('display-room-code').textContent = roomCode;

        // تسجيل الـ Peer باستخدام الرمز
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
    conn.on('open', () => {
        updateStatusUI('statusConnected');
    });

    conn.on('data', (data) => {
        // استلام ملف من الطرف الآخر
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
// 3. إرسال واستلام الملفات
// ==========================================
function sendFile(file) {
    if (!conn || !conn.open) {
        alert(currentLang === 'ar' ? 'يجب أن يتصل الجهاز الآخر بالغرفة أولاً!' : 'Please wait for the other device to connect!');
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
    fileList.prepend(item);
}

// ==========================================
// 4. الأحداث وواجهة التفاعل (Drag & Drop / Copy)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    applyRoomLanguage(currentLang);
    initPeerSession();

    // 1. زر تغيير اللغة
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nextLang = currentLang === 'ar' ? 'en' : 'ar';
            applyRoomLanguage(nextLang);
        });
    }

    // 2. زر نسخ الرمز
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(roomCode).then(() => {
                alert(roomTranslations[currentLang].copiedAlert);
            });
        });
    }

    // 3. رفع الملف عبر اختيار الملفات
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                sendFile(e.target.files[0]);
            }
        });
    }

    // 4. رفع الملف عبر السحب والإسقاط (Drag and Drop)
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                sendFile(files[0]);
            }
        });
    }
});// ==========================================
// 1. قاموس ترجمة صفحة غرفة النقل (AR / EN)
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
        sendingFile: "جاري إرسال:",
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
        sendingFile: "Sending:",
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
// 2. منطق الاتصال المباشر عبر PeerJS (P2P)
// ==========================================
let peer = null;
let conn = null;
let roomCode = '';

// توليد رمز غرفة عشوائي مكون من 6 أحرف
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initPeerSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const codeParam = urlParams.get('code');

    if (action === 'join' && codeParam) {
        // الطرف المنضم للغرفة
        roomCode = codeParam.toUpperCase();
        document.getElementById('display-room-code').textContent = roomCode;
        
        peer = new Peer();
        
        peer.on('open', () => {
            updateStatusUI('statusConnecting');
            // الاتصال بالمُنشئ باستخدام رمز الغرفة
            conn = peer.connect(`flipdrop-room-${roomCode}`);
            setupConnectionEvents();
        });

    } else {
        // المنشئ لغرفة جديدة
        roomCode = generateCode();
        document.getElementById('display-room-code').textContent = roomCode;

        // تسجيل الـ Peer باستخدام الرمز
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
    conn.on('open', () => {
        updateStatusUI('statusConnected');
    });

    conn.on('data', (data) => {
        // استلام ملف من الطرف الآخر
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
// 3. إرسال واستلام الملفات
// ==========================================
function sendFile(file) {
    if (!conn || !conn.open) {
        alert(currentLang === 'ar' ? 'يجب أن يتصل الجهاز الآخر بالغرفة أولاً!' : 'Please wait for the other device to connect!');
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
    fileList.prepend(item);
}

// ==========================================
// 4. الأحداث وواجهة التفاعل (Drag & Drop / Copy)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    applyRoomLanguage(currentLang);
    initPeerSession();

    // 1. زر تغيير اللغة
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nextLang = currentLang === 'ar' ? 'en' : 'ar';
            applyRoomLanguage(nextLang);
        });
    }

    // 2. زر نسخ الرمز
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(roomCode).then(() => {
                alert(roomTranslations[currentLang].copiedAlert);
            });
        });
    }

    // 3. رفع الملف عبر اختيار الملفات
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                sendFile(e.target.files[0]);
            }
        });
    }

    // 4. رفع الملف عبر السحب والإسقاط (Drag and Drop)
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                sendFile(files[0]);
            }
        });
    }
});
