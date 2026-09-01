// ==========================================
// 1. نظام حساب الزوار الفريدين
// ==========================================
function trackUniqueVisitor() {
    const counterElement = document.getElementById('visitor-count');
    const storageKey = 'flipdrop_unique_visit';
    const totalKey = 'flipdrop_visitors_total';

    let totalVisits = parseInt(localStorage.getItem(totalKey) || '1');

    if (!localStorage.getItem(storageKey)) {
        totalVisits += 1;
        localStorage.setItem(storageKey, 'true');
        localStorage.setItem(totalKey, totalVisits.toString());
    }

    if (counterElement) {
        counterElement.innerText = totalVisits.toLocaleString();
    }
}

// ==========================================
// 2. نظام التبديل الفوري بين اللغة العربية والإنجليزية
// ==========================================
const translations = {
    ar: {
        logoSub: "انقل ملفاتك بين أي جهازين فوراً. بدون حسابات. بدون كابلات.",
        scrollBtn: "مرر للأسفل للبدء",
        cardTitle: "ابدأ جلسة النقل 🚀",
        cardDesc: "اختر إنشاء غرفة جديدة أو أدخل الرمز للانضمام لغرفة قائمة.",
        startRoomBtn: "⚡ إنشاء غرفة نقل جديدة",
        joinBtn: "انضمام للغرفة",
        inputPlaceholder: "أدخل رمز الغرفة (مثال: 7K9X2P)",
        orText: "أو",
        langBtnText: "English",
        visitorText: "👁️ الزوار:",
        dir: "rtl"
    },
    en: {
        logoSub: "Move files between any devices instantly. No accounts. No cables.",
        scrollBtn: "Scroll down to start",
        cardTitle: "Start Transfer Session 🚀",
        cardDesc: "Create a new transfer room or enter code to join an existing session.",
        startRoomBtn: "⚡ Create New Transfer Room",
        joinBtn: "Join Room",
        inputPlaceholder: "Enter Room Code (e.g. 7K9X2P)",
        orText: "OR",
        langBtnText: "العربية",
        visitorText: "👁️ Visitors:",
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

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElemText('hero-subtitle', t.logoSub);
    setElemText('scroll-text', t.scrollBtn);
    setElemText('card-title', t.cardTitle);
    setElemText('card-desc', t.cardDesc);
    setElemText('btn-create', t.startRoomBtn);
    setElemText('btn-join', t.joinBtn);
    setElemText('or-text', t.orText);
    setElemText('lang-text', t.langBtnText);
    setElemText('visitor-label', t.visitorText);

    const input = document.getElementById('join-code-input');
    if (input) input.placeholder = t.inputPlaceholder;
}

function toggleLanguage() {
    const nextLang = currentLang === 'ar' ? 'en' : 'ar';
    applyLanguage(nextLang);
}

// ==========================================
// 3. التمرير والانتقال
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
    const code = input ? input.value.trim().toUpperCase() : '';
    
    if (code.length !== 6) {
        alert(currentLang === 'ar' ? 'يرجى إدخال رمز غرفة صحيح مكون من 6 أرقام/حروف' : 'Please enter a valid 6-character room code');
        return;
    }
    
    window.location.href = `transfer.html?action=join&code=${code}`;
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    trackUniqueVisitor();
});
