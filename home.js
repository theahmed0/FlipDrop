// ==========================================
// 1. نظام حساب الزوار الفريدين (Unique Visitors)
// ==========================================
async function trackUniqueVisitor() {
    const counterElement = document.getElementById('visitor-count');
    // اسم مفتاح مخصص لموقعك لضمان عدم التداخل
    const namespace = "flipdrop_app_v1"; 
    const key = "visits";
    
    const hasVisited = localStorage.getItem('flipdrop_visited_user');

    try {
        if (!hasVisited) {
            // زائر جديد: زيادة العداد بمقدار 1
            const response = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}/up`);
            const data = await response.json();
            
            if (data && data.count !== undefined) {
                counterElement.innerText = data.count.toLocaleString();
                // حفظ العلامة في المتصفح لعدم زيادة العدد في المرات القادمة
                localStorage.setItem('flipdrop_visited_user', 'true');
            } else {
                counterElement.innerText = '1';
            }
        } else {
            // زائر قديم: جلب العدد الحالي فقط دون زيادة
            const response = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}`);
            const data = await response.json();
            
            if (data && data.count !== undefined) {
                counterElement.innerText = data.count.toLocaleString();
            } else {
                counterElement.innerText = '--';
            }
        }
    } catch (error) {
        console.error('Visitor counter error:', error);
        counterElement.innerText = '1+';
    }
}

// ==========================================
// 2. نظام تغيير اللغة (AR / EN)
// ==========================================
const translations = {
    ar: {
        logoSub: "انقل ملفاتك بين أي جهازين فوراً. بدون حسابات. بدون كابلات.",
        scrollBtn: "مرر للأسفل للبدء",
        startRoomBtn: "⚡ إنشاء غرفة نقل جديدة",
        joinBtn: "انضمام للغرفة",
        inputPlaceholder: "أدخل رمز الغرفة (مثال: 7K9X2P)",
        orText: "أو",
        langBtnText: "English",
        visitorText: "👁️ الزوار: ",
        dir: "rtl"
    },
    en: {
        logoSub: "Move files between any devices instantly. No accounts. No cables.",
        scrollBtn: "Scroll down to start",
        startRoomBtn: "⚡ Create New Transfer Room",
        joinBtn: "Join Room",
        inputPlaceholder: "Enter Room Code (e.g. 7K9X2P)",
        orText: "OR",
        langBtnText: "العربية",
        visitorText: "👁️ Visitors: ",
        dir: "ltr"
    }
};

let currentLang = localStorage.getItem('flipdrop_lang') || 'ar';

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('flipdrop_lang', lang);
    document.documentElement.dir = translations[lang].dir;
    document.documentElement.lang = lang;

    const t = translations[lang];
    if (document.querySelector('.hero-subtitle')) document.querySelector('.hero-subtitle').innerText = t.logoSub;
    if (document.querySelector('.scroll-indicator span')) document.querySelector('.scroll-indicator span').innerText = t.scrollBtn;
    if (document.querySelector('.btn-primary')) document.querySelector('.btn-primary').innerText = t.startRoomBtn;
    if (document.querySelector('.btn-secondary')) document.querySelector('.btn-secondary').innerText = t.joinBtn;
    if (document.getElementById('join-code-input')) document.getElementById('join-code-input').placeholder = t.inputPlaceholder;
    if (document.querySelector('.divider span')) document.querySelector('.divider span').innerText = t.orText;
    if (document.querySelector('.visitor-box span')) document.querySelector('.visitor-box span').innerText = t.visitorText;
    
    document.getElementById('lang-text').innerText = t.langBtnText;
}

function toggleLanguage() {
    applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
}

// ==========================================
// 3. التفاعل مع التمرير والانتقال للغرف
// ==========================================
window.addEventListener('scroll', () => {
    if (window.scrollY > 150) {
        document.body.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
    }
});

function startNewTransfer() {
    window.location.href = 'transfer.html?action=create';
}

function joinRoomByCode() {
    const input = document.getElementById('join-code-input');
    const code = input.value.trim().toUpperCase();
    
    if (code.length !== 6) {
        alert(currentLang === 'ar' ? 'يرجى إدخال رمز غرفة صحيح مكون من 6 أرقام/حروف' : 'Please enter a valid 6-character room code');
        return;
    }
    
    window.location.href = `transfer.html?action=join&code=${code}`;
}

// تشغيل العداد وتطبيق اللغة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    trackUniqueVisitor();
});
