// TING - Main Application
import { store, utils, icons, UI } from './core.js';
import { OCRService, SheetsService } from './google-services.js';

// ============ Navigation ============
function initNavigation() {
    const navTabs = document.getElementById('navTabs');
    const mobileNav = document.getElementById('mobileNav');

    const tabs = [
        { id: 'dashboard', label: 'แดชบอร์ด', icon: icons.dashboard },
        { id: 'upload', label: 'อัปโหลดสลิป', icon: icons.upload },
        { id: 'transactions', label: 'รายการ', icon: icons.list },
        { id: 'settings', label: 'ตั้งค่า', icon: icons.settings }
    ];

    // Desktop nav
    navTabs.innerHTML = tabs.map((tab, i) => `
        <button class="nav-tab ${i === 0 ? 'active' : ''}" data-tab="${tab.id}">
            ${tab.icon}
            <span>${tab.label}</span>
        </button>
    `).join('');

    // Mobile nav
    mobileNav.innerHTML = tabs.map((tab, i) => `
        <button class="mobile-nav-item ${i === 0 ? 'active' : ''}" data-tab="${tab.id}">
            ${tab.icon}
            <span>${tab.label}</span>
        </button>
    `).join('');

    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update nav active states
            document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(b => {
                b.classList.toggle('active', b.dataset.tab === tabId);
            });

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });
}

// ============ Dashboard ============
function renderDashboard() {
    const dashboard = document.getElementById('dashboard');
    const month = store.currentMonth.getMonth();
    const year = store.currentMonth.getFullYear();
    const transactions = utils.getMonthTransactions(month, year);

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    const igTrans = transactions.filter(t => t.source === 'ig');
    const lineTrans = transactions.filter(t => t.source === 'line');
    const igAmount = igTrans.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const lineAmount = lineTrans.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

    const recentTrans = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    dashboard.innerHTML = `
        <div class="dashboard-header">
            <h1>แดชบอร์ด</h1>
            <div class="month-selector">
                <button class="month-nav" id="prevMonth">${icons.chevronLeft}</button>
                <span id="currentMonth">${utils.formatMonthYear(store.currentMonth)}</span>
                <button class="month-nav" id="nextMonth">${icons.chevronRight}</button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card income">
                <div class="stat-icon">${icons.arrowUp}</div>
                <div class="stat-info">
                    <span class="stat-label">รายรับ</span>
                    <span class="stat-value">${utils.formatCurrency(income)}</span>
                </div>
            </div>
            <div class="stat-card expense">
                <div class="stat-icon">${icons.arrowDown}</div>
                <div class="stat-info">
                    <span class="stat-label">รายจ่าย</span>
                    <span class="stat-value">${utils.formatCurrency(expense)}</span>
                </div>
            </div>
            <div class="stat-card balance">
                <div class="stat-icon">${icons.money}</div>
                <div class="stat-info">
                    <span class="stat-label">คงเหลือ</span>
                    <span class="stat-value">${utils.formatCurrency(balance)}</span>
                </div>
            </div>
            <div class="stat-card slips">
                <div class="stat-icon">${icons.file}</div>
                <div class="stat-info">
                    <span class="stat-label">จำนวนสลิป</span>
                    <span class="stat-value">${transactions.length}</span>
                </div>
            </div>
        </div>

        <div class="chart-section">
            <div class="chart-card">
                <h3>แหล่งที่มา</h3>
                <div class="source-chart">
                    <div class="source-item">
                        <div class="source-icon ig">${icons.ig}</div>
                        <div class="source-info">
                            <span class="source-name">Instagram</span>
                            <span class="source-count">${igTrans.length} รายการ</span>
                        </div>
                        <span class="source-amount">${utils.formatCurrency(igAmount)}</span>
                    </div>
                    <div class="source-item">
                        <div class="source-icon line">${icons.line}</div>
                        <div class="source-info">
                            <span class="source-name">LINE</span>
                            <span class="source-count">${lineTrans.length} รายการ</span>
                        </div>
                        <span class="source-amount">${utils.formatCurrency(lineAmount)}</span>
                    </div>
                </div>
            </div>
            <div class="chart-card">
                <h3>รายการล่าสุด</h3>
                <div class="recent-transactions">
                    ${recentTrans.length ? recentTrans.map(t => `
                        <div class="transaction-item" data-id="${t.id}">
                            <div class="transaction-icon ${t.type}">${t.type === 'income' ? '💰' : '💸'}</div>
                            <div class="transaction-info">
                                <div class="transaction-title">${t.senderName || t.category || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย')}</div>
                                <div class="transaction-meta">
                                    <span>${t.source === 'ig' ? 'IG' : 'LINE'}</span>
                                    <span>•</span>
                                    <span>${utils.formatDate(t.date)}</span>
                                </div>
                            </div>
                            <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${utils.formatCurrency(t.amount)}</div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            ${icons.clipboard}
                            <p>ยังไม่มีรายการ</p>
                            <span>อัปโหลดสลิปเพื่อเริ่มต้น</span>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Month navigation
    document.getElementById('prevMonth').onclick = () => {
        store.currentMonth.setMonth(store.currentMonth.getMonth() - 1);
        renderDashboard();
    };
    document.getElementById('nextMonth').onclick = () => {
        store.currentMonth.setMonth(store.currentMonth.getMonth() + 1);
        renderDashboard();
    };

    // Transaction click
    dashboard.querySelectorAll('.transaction-item').forEach(item => {
        item.onclick = () => {
            const transaction = store.transactions.find(t => t.id === item.dataset.id);
            if (transaction) UI.showModal(transaction);
        };
    });
}

// ============ Upload Section ============
function renderUpload() {
    const upload = document.getElementById('upload');
    const today = new Date().toISOString().split('T')[0];

    upload.innerHTML = `
        <div class="upload-container">
            <h1>อัปโหลดสลิป</h1>
            <p class="subtitle">อัปโหลดสลิปโอนเงินจาก Instagram หรือ LINE</p>

            <div class="upload-area">
                <div class="upload-zone" id="uploadZone">
                    <input type="file" id="slipInput" accept="image/*" capture="environment" hidden>
                    <div class="upload-icon">${icons.upload}</div>
                    <h3>ลากไฟล์มาวางที่นี่</h3>
                    <p>หรือคลิกเพื่อเลือกไฟล์</p>
                    <div class="upload-buttons">
                        <button class="btn btn-primary" id="selectFileBtn">${icons.upload} เลือกไฟล์</button>
                        <button class="btn btn-secondary" id="cameraBtn">${icons.camera} ถ่ายรูป</button>
                    </div>
                </div>

                <div class="preview-area hidden" id="previewArea">
                    <div class="preview-image-container">
                        <img id="previewImage" src="" alt="Preview">
                        <button class="remove-image" id="removeImage">${icons.x}</button>
                    </div>
                </div>
            </div>

            <form class="slip-form hidden" id="slipForm">
                <h2>ข้อมูลสลิป</h2>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>ประเภท</label>
                        <div class="type-selector">
                            <button type="button" class="type-btn active" data-type="income">${icons.arrowUp} รายรับ</button>
                            <button type="button" class="type-btn" data-type="expense">${icons.arrowDown} รายจ่าย</button>
                        </div>
                        <input type="hidden" id="transactionType" value="income">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>แหล่งที่มา</label>
                        <div class="source-selector">
                            <button type="button" class="source-btn active" data-source="ig">${icons.ig} Instagram</button>
                            <button type="button" class="source-btn" data-source="line">${icons.line} LINE</button>
                        </div>
                        <input type="hidden" id="source" value="ig">
                    </div>
                </div>

                <div class="form-row two-col">
                    <div class="form-group">
                        <label for="amount">จำนวนเงิน (บาท)</label>
                        <div class="input-with-icon">
                            <span class="input-icon">฿</span>
                            <input type="number" id="amount" placeholder="0.00" step="0.01" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="transactionDate">วันที่</label>
                        <input type="date" id="transactionDate" value="${today}" required>
                    </div>
                </div>

                <div class="form-row two-col">
                    <div class="form-group">
                        <label for="senderName">ชื่อผู้โอน</label>
                        <input type="text" id="senderName" placeholder="ชื่อผู้โอน">
                    </div>
                    <div class="form-group">
                        <label for="receiverName">ชื่อผู้รับ</label>
                        <input type="text" id="receiverName" placeholder="ชื่อผู้รับ">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="bank">ธนาคาร</label>
                        <select id="bank">
                            <option value="">เลือกธนาคาร</option>
                            <option value="กสิกรไทย">ธนาคารกสิกรไทย</option>
                            <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                            <option value="กรุงไทย">ธนาคารกรุงไทย</option>
                            <option value="กรุงเทพ">ธนาคารกรุงเทพ</option>
                            <option value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
                            <option value="กรุงศรี">ธนาคารกรุงศรีอยุธยา</option>
                            <option value="ออมสิน">ธนาคารออมสิน</option>
                            <option value="พร้อมเพย์">พร้อมเพย์</option>
                            <option value="TrueMoney">TrueMoney</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="category">หมวดหมู่</label>
                        <select id="category">
                            <option value="">เลือกหมวดหมู่</option>
                            <option value="ขายสินค้า">ขายสินค้า</option>
                            <option value="ค่าบริการ">ค่าบริการ</option>
                            <option value="คืนเงิน">คืนเงิน</option>
                            <option value="ค่าส่ง">ค่าส่ง</option>
                            <option value="ซื้อสินค้า">ซื้อสินค้า</option>
                            <option value="ค่าโฆษณา">ค่าโฆษณา</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="note">หมายเหตุ</label>
                        <textarea id="note" placeholder="รายละเอียดเพิ่มเติม..." rows="3"></textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-outline" id="cancelBtn">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary">${icons.save} บันทึก</button>
                </div>
            </form>
        </div>
    `;

    initUploadHandlers();
}

function initUploadHandlers() {
    const uploadZone = document.getElementById('uploadZone');
    const slipInput = document.getElementById('slipInput');
    const previewArea = document.getElementById('previewArea');
    const previewImage = document.getElementById('previewImage');
    const slipForm = document.getElementById('slipForm');

    // File selection
    document.getElementById('selectFileBtn').onclick = (e) => {
        e.stopPropagation();
        slipInput.click();
    };

    document.getElementById('cameraBtn').onclick = (e) => {
        e.stopPropagation();
        slipInput.click();
    };

    uploadZone.onclick = () => slipInput.click();

    // Drag and drop
    uploadZone.ondragover = (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    };

    uploadZone.ondragleave = () => uploadZone.classList.remove('dragover');

    uploadZone.ondrop = (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    };

    slipInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    };

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            previewImage.src = e.target.result;
            uploadZone.classList.add('hidden');
            previewArea.classList.remove('hidden');
            slipForm.classList.remove('hidden');

            // Auto OCR scan
            const ocrEnabled = store.settings.enableOcr !== false;
            if (ocrEnabled) {
                try {
                    // Show loading state
                    const scanBtn = document.createElement('div');
                    scanBtn.className = 'ocr-loading';
                    scanBtn.innerHTML = '<div class="spinner"></div><span>กำลังอ่านสลิป...</span>';
                    previewArea.appendChild(scanBtn);

                    const ocrData = await OCRService.analyzeSlip(e.target.result);

                    // Remove loading
                    scanBtn.remove();

                    // Fill form with OCR data
                    if (ocrData.amount) {
                        document.getElementById('amount').value = ocrData.amount;
                    }
                    if (ocrData.date) {
                        document.getElementById('transactionDate').value = ocrData.date;
                    }
                    if (ocrData.senderName) {
                        document.getElementById('senderName').value = ocrData.senderName;
                    }
                    if (ocrData.receiverName) {
                        document.getElementById('receiverName').value = ocrData.receiverName;
                    }
                    if (ocrData.bank) {
                        const bankSelect = document.getElementById('bank');
                        for (let option of bankSelect.options) {
                            if (option.value === ocrData.bank) {
                                bankSelect.value = ocrData.bank;
                                break;
                            }
                        }
                    }

                    UI.showToast('อ่านสลิปสำเร็จ! กรุณาตรวจสอบข้อมูล');
                } catch (error) {
                    console.error('OCR Error:', error);
                    UI.showToast('ไม่สามารถอ่านสลิปอัตโนมัติได้', 'error');
                }
            }
        };
        reader.readAsDataURL(file);
    }

    // Remove image
    document.getElementById('removeImage').onclick = resetUpload;
    document.getElementById('cancelBtn').onclick = resetUpload;

    function resetUpload() {
        slipInput.value = '';
        previewImage.src = '';
        uploadZone.classList.remove('hidden');
        previewArea.classList.add('hidden');
        slipForm.classList.add('hidden');
        slipForm.reset();
    }

    // Type selector
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('transactionType').value = btn.dataset.type;
        };
    });

    // Source selector
    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('source').value = btn.dataset.source;
        };
    });

    // Form submit
    slipForm.onsubmit = async (e) => {
        e.preventDefault();

        const transaction = {
            id: utils.generateId(),
            type: document.getElementById('transactionType').value,
            source: document.getElementById('source').value,
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('transactionDate').value,
            senderName: document.getElementById('senderName').value,
            receiverName: document.getElementById('receiverName').value,
            bank: document.getElementById('bank').value,
            category: document.getElementById('category').value,
            note: document.getElementById('note').value,
            image: previewImage.src,
            createdAt: new Date().toISOString()
        };

        store.transactions.push(transaction);
        store.save();

        // Sync to Google Sheets if connected
        const spreadsheetId = SheetsService.getSpreadsheetId();
        if (spreadsheetId) {
            try {
                await SheetsService.appendTransaction(transaction);
                UI.showToast('บันทึกและซิงค์ Google Sheets สำเร็จ!');
            } catch (error) {
                console.error('Sheets sync error:', error);
                UI.showToast('บันทึกสำเร็จ (แต่ซิงค์ Sheets ล้มเหลว)', 'error');
            }
        } else {
            UI.showToast('บันทึกสำเร็จ!');
        }

        resetUpload();
        renderDashboard();
        renderTransactions();
    };
}

// ============ Transactions List ============
function renderTransactions() {
    const container = document.getElementById('transactions');
    const allTransactions = [...store.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
        <div class="transactions-container">
            <div class="transactions-header">
                <h1>รายการทั้งหมด</h1>
                <div class="filter-bar">
                    <div class="search-box">
                        ${icons.search}
                        <input type="text" id="searchInput" placeholder="ค้นหา...">
                    </div>
                    <select id="filterType" class="filter-select">
                        <option value="all">ทั้งหมด</option>
                        <option value="income">รายรับ</option>
                        <option value="expense">รายจ่าย</option>
                    </select>
                    <select id="filterSource" class="filter-select">
                        <option value="all">ทุกแหล่ง</option>
                        <option value="ig">Instagram</option>
                        <option value="line">LINE</option>
                    </select>
                </div>
            </div>

            <div class="transactions-list" id="transactionsList">
                ${renderTransactionItems(allTransactions)}
            </div>
        </div>
    `;

    // Filter handlers
    const filterTransactions = () => {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const type = document.getElementById('filterType').value;
        const source = document.getElementById('filterSource').value;

        const filtered = allTransactions.filter(t => {
            const matchSearch = !search ||
                (t.senderName && t.senderName.toLowerCase().includes(search)) ||
                (t.receiverName && t.receiverName.toLowerCase().includes(search)) ||
                (t.note && t.note.toLowerCase().includes(search)) ||
                (t.category && t.category.toLowerCase().includes(search));
            const matchType = type === 'all' || t.type === type;
            const matchSource = source === 'all' || t.source === source;
            return matchSearch && matchType && matchSource;
        });

        document.getElementById('transactionsList').innerHTML = renderTransactionItems(filtered);
        attachTransactionClickHandlers();
    };

    document.getElementById('searchInput').oninput = filterTransactions;
    document.getElementById('filterType').onchange = filterTransactions;
    document.getElementById('filterSource').onchange = filterTransactions;

    attachTransactionClickHandlers();
}

function renderTransactionItems(transactions) {
    if (!transactions.length) {
        return `
            <div class="empty-state">
                ${icons.clipboard}
                <p>ยังไม่มีรายการ</p>
                <span>อัปโหลดสลิปเพื่อเริ่มต้น</span>
            </div>
        `;
    }

    return transactions.map(t => `
        <div class="transaction-list-item" data-id="${t.id}">
            <div class="transaction-icon ${t.type}">${t.type === 'income' ? '💰' : '💸'}</div>
            <div class="transaction-info">
                <div class="transaction-title">${t.senderName || t.category || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย')}</div>
                <div class="transaction-meta">
                    <span class="transaction-source-badge ${t.source}">${t.source === 'ig' ? 'IG' : 'LINE'}</span>
                    <span>${utils.formatDate(t.date)}</span>
                    ${t.bank ? `<span>• ${t.bank}</span>` : ''}
                </div>
            </div>
            <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${utils.formatCurrency(t.amount)}</div>
        </div>
    `).join('');
}

function attachTransactionClickHandlers() {
    document.querySelectorAll('.transaction-list-item').forEach(item => {
        item.onclick = () => {
            const transaction = store.transactions.find(t => t.id === item.dataset.id);
            if (transaction) UI.showModal(transaction);
        };
    });
}

// ============ Settings ============
function renderSettings() {
    const container = document.getElementById('settings');
    const savedSpreadsheetId = SheetsService.getSpreadsheetId() || '';
    const ocrEnabled = store.settings.enableOcr !== false;

    container.innerHTML = `
        <div class="settings-container">
            <h1>ตั้งค่า</h1>

            <div class="settings-section">
                <h2>${icons.link} Google Sheets</h2>
                <div class="settings-card">
                    <div class="settings-item">
                        <div class="settings-info">
                            <label>Spreadsheet ID</label>
                            <p>คัดลอก ID จาก URL ของ Google Sheets<br>
                            <small>ตัวอย่าง: docs.google.com/spreadsheets/d/<strong>[ID นี้]</strong>/edit</small></p>
                        </div>
                        <input type="text" id="spreadsheetId" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgm..." class="settings-input" value="${savedSpreadsheetId}">
                    </div>
                    <div class="settings-item">
                        <div class="settings-info">
                            <label>สถานะการเชื่อมต่อ</label>
                        </div>
                        <div class="connection-status ${store.settings.connected ? 'connected' : 'disconnected'}" id="connectionStatus">
                            <span class="status-dot"></span>
                            <span>${store.settings.connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}</span>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="connectGoogleSheets">${icons.link} บันทึกและทดสอบการเชื่อมต่อ</button>
                </div>
            </div>

            <div class="settings-section">
                <h2>${icons.camera} OCR อ่านสลิปอัตโนมัติ</h2>
                <div class="settings-card">
                    <div class="settings-item toggle-item">
                        <div class="settings-info">
                            <label>เปิดใช้งาน OCR</label>
                            <p>อ่านข้อมูลจากสลิปโดยอัตโนมัติ (ฟรี 1,000 รูป/เดือน)</p>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="enableOcr" ${ocrEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2>${icons.file} ข้อมูล</h2>
                <div class="settings-card">
                    <div class="settings-item">
                        <div class="settings-info">
                            <label>ส่งออกข้อมูล</label>
                            <p>ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ CSV</p>
                        </div>
                        <button class="btn btn-outline" id="exportData">${icons.download} ส่งออก CSV</button>
                    </div>
                    <div class="settings-item danger">
                        <div class="settings-info">
                            <label>ล้างข้อมูลทั้งหมด</label>
                            <p>ลบรายการทั้งหมด (ไม่สามารถกู้คืนได้)</p>
                        </div>
                        <button class="btn btn-danger" id="clearData">${icons.trash} ล้างข้อมูล</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // OCR toggle
    document.getElementById('enableOcr').onchange = (e) => {
        store.settings.enableOcr = e.target.checked;
        store.save();
        UI.showToast(e.target.checked ? 'เปิดใช้งาน OCR แล้ว' : 'ปิดใช้งาน OCR แล้ว');
    };

    // Google Sheets connection
    document.getElementById('connectGoogleSheets').onclick = async () => {
        const spreadsheetId = document.getElementById('spreadsheetId').value.trim();

        if (!spreadsheetId) {
            UI.showToast('กรุณากรอก Spreadsheet ID', 'error');
            return;
        }

        // Save the ID
        SheetsService.setSpreadsheetId(spreadsheetId);
        store.settings.spreadsheetId = spreadsheetId;

        // Test connection
        const statusEl = document.getElementById('connectionStatus');
        statusEl.innerHTML = '<span class="status-dot"></span><span>กำลังทดสอบ...</span>';

        const result = await SheetsService.testConnection();

        if (result.success) {
            store.settings.connected = true;
            store.save();
            statusEl.className = 'connection-status connected';
            statusEl.innerHTML = '<span class="status-dot"></span><span>เชื่อมต่อแล้ว</span>';
            UI.showToast(result.message);

            // Create headers if it's a new sheet
            await SheetsService.createHeaders();
        } else {
            store.settings.connected = false;
            store.save();
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<span class="status-dot"></span><span>เชื่อมต่อล้มเหลว</span>';
            UI.showToast(result.message, 'error');
        }
    };

    // Export CSV
    document.getElementById('exportData').onclick = () => {
        if (!store.transactions.length) {
            UI.showToast('ไม่มีข้อมูลให้ส่งออก', 'error');
            return;
        }

        const headers = ['วันที่', 'ประเภท', 'จำนวนเงิน', 'แหล่ง', 'ผู้โอน', 'ผู้รับ', 'ธนาคาร', 'หมวดหมู่', 'หมายเหตุ'];
        const rows = store.transactions.map(t => [
            t.date,
            t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            t.amount,
            t.source === 'ig' ? 'Instagram' : 'LINE',
            t.senderName || '',
            t.receiverName || '',
            t.bank || '',
            t.category || '',
            t.note || ''
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TING_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('ส่งออกสำเร็จ!');
    };

    // Clear data
    document.getElementById('clearData').onclick = () => {
        if (confirm('ต้องการลบข้อมูลทั้งหมด? การดำเนินการนี้ไม่สามารถยกเลิกได้')) {
            store.transactions = [];
            store.save();
            renderDashboard();
            renderTransactions();
            UI.showToast('ล้างข้อมูลแล้ว');
        }
    };
}

// ============ Initialize App ============
function init() {
    initNavigation();
    renderDashboard();
    renderUpload();
    renderTransactions();
    renderSettings();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
