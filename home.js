function startNewTransfer() {
    // التوجيه لصفحة النقل بحالة إنشاء غرفة
    window.location.href = 'transfer.html?action=create';
}

function joinRoomByCode() {
    const code = document.getElementById('join-code-input').value.trim().toUpperCase();
    if (code.length !== 6) {
        alert('يرجى إدخال رمز غرفة صحيح مكون من 6 أرقام/حروف');
        return;
    }
    // التوجيه لصفحة النقل بحالة انضمام مع الرمز
    window.location.href = `transfer.html?action=join&code=${code}`;
}
// خوارزمية تسجيل وزيادة الزوار الفريدين
function trackUniqueVisitor() {
    const namespace = 'flipdrop-project-unique-visitors'; // معرف مشروعك
    const key = 'visits';
    const hasVisited = localStorage.getItem('flipdrop_visited');

    if (!hasVisited) {
        // إذا كانت هذه الزيارة الأولى لهذا الجهاز، قم بزيادة العداد
        fetch(`https://api.countapi.xyz/hit/${namespace}/${key}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('visitor-count').innerText = data.value;
                // علم على المتصفح بأنه زار الموقع لعدم تكرار الزيادة عند Refresh
                localStorage.setItem('flipdrop_visited', 'true');
            })
            .catch(err => console.error('خطأ في جلب العداد:', err));
    } else {
        // إذا كان زار الموقع من قبل، أظهر العدد فقط دون زيادة
        fetch(`https://api.countapi.xyz/get/${namespace}/${key}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('visitor-count').innerText = data.value;
            })
            .catch(err => console.error('خطأ في جلب العداد:', err));
    }
}

// تشغيل العداد فور فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    trackUniqueVisitor();
});
