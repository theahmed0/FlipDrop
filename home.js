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