// TING - Simple App Script 🐱
const GOOGLE_API_KEY = 'AIzaSyCJwK-IxopDH2EkQpsRQg8tKbM8xPpYfVA';

// Data Store
const store = {
    transactions: JSON.parse(localStorage.getItem('ting_transactions') || '[]'),
    settings: JSON.parse(localStorage.getItem('ting_settings') || '{"enableOcr": true}'),
    save() {
        localStorage.setItem('ting_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('ting_settings', JSON.stringify(this.settings));
    }
};

// Utilities
const formatCurrency = (amount) => '฿' + amount.toLocaleString('th-TH');
const today = () => new Date().toISOString().split('T')[0];
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Tab Navigation
document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update buttons
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));

        // Update sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// Update Dashboard
function updateDashboard() {
    const income = store.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = store.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
    document.getElementById('totalBalance').textContent = formatCurrency(income - expense);
    document.getElementById('totalSlips').textContent = store.transactions.length;

    // Recent list
    const recent = [...store.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const listEl = document.getElementById('recentList');

    if (recent.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>ยังไม่มีรายการ</p>
                <span>อัปโหลดสลิปเพื่อเริ่มต้นค่ะ~</span>
            </div>
        `;
    } else {
        listEl.innerHTML = recent.map(t => `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-icon">${t.type === 'income' ? '💰' : '💸'}</div>
                <div class="transaction-info">
                    <div class="transaction-title">${t.senderName || t.note || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย')}</div>
                    <div class="transaction-meta">
                        <span class="transaction-badge ${t.source}">${t.source === 'ig' ? 'IG' : 'LINE'}</span>
                        <span>${new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
            </div>
        `).join('');
    }

    // Full list
    const all = [...store.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const fullListEl = document.getElementById('fullList');

    if (all.length === 0) {
        fullListEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>ยังไม่มีรายการ</p>
                <span>อัปโหลดสลิปเพื่อเริ่มต้นค่ะ~</span>
            </div>
        `;
    } else {
        fullListEl.innerHTML = all.map(t => `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-icon">${t.type === 'income' ? '💰' : '💸'}</div>
                <div class="transaction-info">
                    <div class="transaction-title">${t.senderName || t.note || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย')}</div>
                    <div class="transaction-meta">
                        <span class="transaction-badge ${t.source}">${t.source === 'ig' ? 'IG' : 'LINE'}</span>
                        <span>${new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                        ${t.bank ? `<span>• ${t.bank}</span>` : ''}
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
            </div>
        `).join('');
    }
}

// Upload functionality
let currentType = 'income';
let currentSource = 'ig';
let currentImage = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewCard = document.getElementById('previewCard');
const previewImg = document.getElementById('previewImg');
const formCard = document.getElementById('formCard');
const ocrStatus = document.getElementById('ocrStatus');

document.getElementById('selectBtn').onclick = () => fileInput.click();
document.getElementById('cameraBtn').onclick = () => fileInput.click();
dropZone.onclick = () => fileInput.click();

dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
};

fileInput.onchange = (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
};

async function handleFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        currentImage = e.target.result;
        previewImg.src = currentImage;
        dropZone.classList.add('hidden');
        previewCard.classList.add('show');
        formCard.classList.add('show');
        document.getElementById('dateInput').value = today();

        // OCR
        if (store.settings.enableOcr) {
            ocrStatus.className = 'ocr-status loading';
            ocrStatus.textContent = 'กำลังอ่านสลิป...';
            ocrStatus.classList.remove('hidden');

            try {
                const data = await analyzeSlip(currentImage);
                ocrStatus.className = 'ocr-status success';
                ocrStatus.textContent = 'อ่านสลิปสำเร็จ! ตรวจสอบข้อมูลค่ะ~';

                if (data.amount) document.getElementById('amountInput').value = data.amount;
                if (data.date) document.getElementById('dateInput').value = data.date;
                if (data.senderName) document.getElementById('senderInput').value = data.senderName;
                if (data.receiverName) document.getElementById('receiverInput').value = data.receiverName;
                if (data.bank) document.getElementById('bankInput').value = data.bank;
            } catch (err) {
                ocrStatus.className = 'ocr-status';
                ocrStatus.textContent = 'ไม่สามารถอ่านอัตโนมัติได้ กรอกข้อมูลเองค่ะ';
            }
        } else {
            ocrStatus.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
}

document.getElementById('removeBtn').onclick = resetUpload;
document.getElementById('cancelBtn').onclick = resetUpload;

function resetUpload() {
    currentImage = null;
    fileInput.value = '';
    previewCard.classList.remove('show');
    formCard.classList.remove('show');
    dropZone.classList.remove('hidden');
    document.getElementById('amountInput').value = '';
    document.getElementById('senderInput').value = '';
    document.getElementById('receiverInput').value = '';
    document.getElementById('bankInput').value = '';
    document.getElementById('noteInput').value = '';
}

// Type/Source selectors
document.querySelectorAll('[data-type]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
    };
});

document.querySelectorAll('[data-source]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('[data-source]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSource = btn.dataset.source;
    };
});

// Save transaction
document.getElementById('saveBtn').onclick = async () => {
    const amount = parseFloat(document.getElementById('amountInput').value);
    if (!amount || amount <= 0) {
        showToast('กรุณากรอกจำนวนเงิน', 'error');
        return;
    }

    const transaction = {
        id: genId(),
        type: currentType,
        source: currentSource,
        amount: amount,
        date: document.getElementById('dateInput').value || today(),
        senderName: document.getElementById('senderInput').value,
        receiverName: document.getElementById('receiverInput').value,
        bank: document.getElementById('bankInput').value,
        note: document.getElementById('noteInput').value,
        image: currentImage,
        createdAt: new Date().toISOString()
    };

    store.transactions.push(transaction);
    store.save();

    // Sync to sheets if connected
    const sheetId = localStorage.getItem('ting_spreadsheet_id');
    if (sheetId) {
        try {
            await appendToSheet(sheetId, transaction);
            showToast('บันทึกและซิงค์สำเร็จ! 🎉');
        } catch (e) {
            showToast('บันทึกแล้ว (Sheets sync ล้มเหลว)');
        }
    } else {
        showToast('บันทึกสำเร็จ! 🎉');
    }

    resetUpload();
    updateDashboard();
};

// OCR Analysis
async function analyzeSlip(imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [{
                image: { content: base64Data },
                features: [{ type: 'TEXT_DETECTION' }]
            }]
        })
    });

    if (!response.ok) throw new Error('OCR failed');

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';

    // Parse data
    const result = { amount: null, date: null, senderName: null, receiverName: null, bank: null };

    // Amount
    const amountMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:บาท|THB|฿)/i) ||
        text.match(/฿?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
        result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Bank
    const banks = { 'กสิกร': 'กสิกรไทย', 'SCB': 'ไทยพาณิชย์', 'กรุงไทย': 'กรุงไทย', 'กรุงเทพ': 'กรุงเทพ', 'พร้อมเพย์': 'พร้อมเพย์' };
    for (const [key, val] of Object.entries(banks)) {
        if (text.includes(key)) { result.bank = val; break; }
    }

    return result;
}

// Google Sheets
async function appendToSheet(sheetId, transaction) {
    const values = [[
        transaction.date,
        transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        transaction.amount,
        transaction.source === 'ig' ? 'Instagram' : 'LINE',
        transaction.senderName || '',
        transaction.receiverName || '',
        transaction.bank || '',
        transaction.note || ''
    ]];

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:H:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
        }
    );

    if (!response.ok) throw new Error('Sheets failed');
    return response.json();
}

// Settings
document.getElementById('ocrToggle').onclick = function () {
    this.classList.toggle('active');
    store.settings.enableOcr = this.classList.contains('active');
    store.save();
    showToast(store.settings.enableOcr ? 'เปิด OCR แล้ว' : 'ปิด OCR แล้ว');
};

document.getElementById('connectBtn').onclick = async () => {
    const sheetId = document.getElementById('sheetIdInput').value.trim();
    if (!sheetId) {
        showToast('กรุณากรอก Spreadsheet ID', 'error');
        return;
    }

    try {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${GOOGLE_API_KEY}`);
        if (res.ok) {
            localStorage.setItem('ting_spreadsheet_id', sheetId);
            document.getElementById('connectionStatus').className = 'connection-badge connected';
            document.getElementById('connectionStatus').textContent = '✅ เชื่อมต่อแล้ว';
            showToast('เชื่อมต่อสำเร็จ! 🎉');
        } else {
            throw new Error();
        }
    } catch {
        document.getElementById('connectionStatus').className = 'connection-badge disconnected';
        document.getElementById('connectionStatus').textContent = '❌ เชื่อมต่อล้มเหลว';
        showToast('ไม่สามารถเชื่อมต่อได้', 'error');
    }
};

document.getElementById('exportBtn').onclick = () => {
    if (!store.transactions.length) {
        showToast('ไม่มีข้อมูล', 'error');
        return;
    }

    const headers = ['วันที่', 'ประเภท', 'จำนวนเงิน', 'แหล่ง', 'ผู้โอน', 'ผู้รับ', 'ธนาคาร', 'หมายเหตุ'];
    const rows = store.transactions.map(t => [
        t.date, t.type === 'income' ? 'รายรับ' : 'รายจ่าย', t.amount,
        t.source === 'ig' ? 'IG' : 'LINE', t.senderName || '', t.receiverName || '',
        t.bank || '', t.note || ''
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TING_${today()}.csv`;
    a.click();
    showToast('ส่งออกสำเร็จ!');
};

document.getElementById('clearBtn').onclick = () => {
    if (confirm('ลบข้อมูลทั้งหมด?')) {
        store.transactions = [];
        store.save();
        updateDashboard();
        showToast('ล้างข้อมูลแล้ว');
    }
};

// Initialize
document.getElementById('sheetIdInput').value = localStorage.getItem('ting_spreadsheet_id') || '';
if (localStorage.getItem('ting_spreadsheet_id')) {
    document.getElementById('connectionStatus').className = 'connection-badge connected';
    document.getElementById('connectionStatus').textContent = '✅ เชื่อมต่อแล้ว';
}
if (!store.settings.enableOcr) {
    document.getElementById('ocrToggle').classList.remove('active');
}

updateDashboard();
