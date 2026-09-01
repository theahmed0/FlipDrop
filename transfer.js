<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlipDrop ⚡ - Transfer Room</title>
    <link rel="stylesheet" href="home.css">
    <!-- إذا كان لديك ملف CSS خاص بالغرفة أضفه هنا -->
</head>
<body>

    <!-- الشريط العلوي المستقل لزر اللغة -->
    <header class="top-nav">
        <button type="button" class="nav-badge lang-badge" id="lang-btn">
            🌐 <span id="lang-text">English</span>
        </button>
    </header>

    <div class="action-section">
        <div class="action-card transfer-card">
            
            <h2 id="room-title">غرفة النقل المباشر ⚡</h2>
            
            <div class="room-code-box">
                <span id="label-room-code">رمز الغرفة:</span>
                <strong id="display-room-code">------</strong>
            </div>

            <!-- حالة الاتصال -->
            <div class="status-box">
                <span class="status-dot" id="status-dot"></span>
                <span id="status-text">جاري الاتصال بالسيرفر...</span>
            </div>

            <!-- منطقة رفع وتنزيل الملفات -->
            <div class="drop-zone" id="drop-zone">
                <p id="drop-text">اسحب وأسقط الملفات هنا أو</p>
                <label for="file-input" class="btn btn-primary" id="btn-select-file">اختر ملفاً للنقل</label>
                <input type="file" id="file-input" hidden>
            </div>

            <!-- قائمة الملفات المعلقة / المرسلة -->
            <div class="file-list" id="file-list"></div>

            <footer class="features-footer">
                <span>🔒 Encrypted P2P</span>
                <span>⚡ Direct Stream</span>
            </footer>

        </div>
    </div>

    <!-- ملف السكريبت الخاص بالغرفة -->
    <script src="transfer.js"></script>
</body>
</html>
