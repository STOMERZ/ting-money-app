// TING - Desktop App Script 🎀 (Manual TrueMoney Mode)

// Profit Calculation
window.calculateProfit = function (prefix) {
    const amount = parseFloat(document.getElementById(prefix + '-amount').value) || 0;
    const shipping = parseFloat(document.getElementById(prefix + '-shipping').value) || 0;
    const cost = parseFloat(document.getElementById(prefix + '-cost').value) || 0;

    // Profit = Amount - Shipping - Cost
    const profit = amount - shipping - cost;
    document.getElementById(prefix + '-profit').value = profit.toFixed(2);
};

// App Config - โหลดจาก config.json
// App Config - โหลดจาก config.json
let appConfig = {
    receiver: { name: 'ชนิสรา วู่', displayName: 'น.ส. ชนิสรา วู่' },
    banks: [],
    slipApiUrl: 'https://slip-c.oiioioiiioooioio.download',
    // 🔐 Hardcoded Credentials
    supabaseUrl: 'https://gvxgqkqvtlgkehceyidi.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2eGdxa3F2dGxna2VoY2V5aWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDI5MjQsImV4cCI6MjA4NTA3ODkyNH0.avXROBgh7ODwOztl4xKBoQndTnTWW3wb-B1OsX_RJf4',
    sheetUrl: 'https://script.google.com/macros/s/AKfycbylTV-a9oQ8QDvnxdnMGffjCkTqUGt8X0BGE1dEcp12r0UarlVgCdBOssc46ZRPxwuY/exec',
    sheetUrl: '',
    sheetId: '',
    defaultPin: '0990' // 🔐 Hardcoded PIN
};

// โหลด config จากไฟล์
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (response.ok) {
            const loaded = await response.json();
            // Merge loaded config with existing (hardcoded) config to preserve credentials
            appConfig = { ...appConfig, ...loaded };
            console.log('✅ Config loaded:', appConfig);
            updateBankDropdown();
        }
    } catch (e) {
        console.log('⚠️ Using default config');
    }
}

// อัปเดต dropdown ธนาคารตาม config
// อัปเดต dropdown ธนาคารตาม config
function updateBankDropdown() {
    const updateSelect = (id) => {
        const bankSelect = document.getElementById(id);
        if (bankSelect && appConfig.banks.length > 0) {
            bankSelect.innerHTML = '<option value="">เลือกธนาคาร</option>';
            appConfig.banks.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.name;
                option.textContent = `${bank.emoji} ${bank.name}`;
                bankSelect.appendChild(option);
            });
        }
    };
    updateSelect('d-bank');
    updateSelect('m-bank');
}

// Data Store
const store = {
    transactions: JSON.parse(localStorage.getItem('ting_transactions') || '[]'),
    settings: JSON.parse(localStorage.getItem('ting_settings') || '{"enableOcr": true, "shops": [], "shippingOptions": [], "costOptions": []}'),
    save() {
        localStorage.setItem('ting_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('ting_settings', JSON.stringify(this.settings));
    }
};

// Shop Management Functions
function addShop() {
    // Try to find value from desktop first, then mobile
    let name = '';
    const dInput = document.getElementById('new-shop-name');
    const mInput = document.getElementById('m-new-shop-name');

    if (dInput && dInput.value.trim()) {
        name = dInput.value.trim();
        dInput.value = '';
    } else if (mInput && mInput.value.trim()) {
        name = mInput.value.trim();
        mInput.value = '';
    }

    if (!name) return;

    if (!store.settings.shops) store.settings.shops = [];
    if (!store.settings.shops.includes(name)) {
        store.settings.shops.push(name);
        store.save();
        renderShopTags();
        updateShopDropdowns();
        showToast('เพิ่มร้านค้าเรียบร้อย ✅');
    }
}

function removeShop(name) {
    if (!confirm('ต้องการลบร้าน ' + name + ' ใช่ไหม?')) return;
    store.settings.shops = store.settings.shops.filter(s => s !== name);
    store.save();
    renderShopTags();
    updateShopDropdowns();
}

function renderShopTags() {
    const shops = store.settings.shops || [];
    const html = shops.map(s => `
        <div style="background:#fce7f3; color:#db2777; padding:4px 10px; border-radius:15px; display:inline-flex; align-items:center; gap:6px; font-size:0.9rem;">
            ${s} <span onclick="removeShop('${s}')" style="cursor:pointer; font-weight:bold; opacity:0.6;">×</span>
        </div>
    `).join('');

    const dList = document.getElementById('d-shop-list');
    const mList = document.getElementById('m-shop-list');
    if (dList) dList.innerHTML = html;
    if (mList) mList.innerHTML = html;
}

function updateShopDropdowns() {
    const shops = store.settings.shops || [];
    const renderOpts = (currentVal) => {
        return '<option value="">-- ไม่ระบุ --</option>' +
            shops.map(s => `<option value="${s}" ${s === currentVal ? 'selected' : ''}>${s}</option>`).join('');
    };

    // Update all relevant selects but preserve value if possible (though usually called on init/change)
    ['d-shop-select', 'm-shop-select', 'edit-shop'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const current = el.value;
            el.innerHTML = renderOpts(current);
        }
    });
}

// Shipping Management Functions
function addShipping() {
    const nameInput = document.getElementById('new-shipping-name');
    const priceInput = document.getElementById('new-shipping-price');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกชื่อและราคาให้ครบถ้วน ❌', 'error');
        return;
    }

    if (!store.settings.shippingOptions) store.settings.shippingOptions = [];
    store.settings.shippingOptions.push({ name, price });
    store.save();
    renderShippingTags();
    renderTransactionOptions();
    nameInput.value = '';
    priceInput.value = '';
    showToast('เพิ่มขนส่งเรียบร้อย ✅');
}

function removeShipping(index) {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;
    store.settings.shippingOptions.splice(index, 1);
    store.save();
    renderShippingTags();
    renderTransactionOptions();
}

function renderShippingTags() {
    const request = store.settings.shippingOptions || [];
    const html = request.map((item, index) => `
        <div style="background:#dcfce7; color:#166534; padding:6px 14px; border-radius:15px; display:inline-flex; align-items:center; gap:8px; font-size:0.95rem; border:1px solid #bbf7d0;">
            <b>${item.name}</b> <span style="opacity:0.8;">฿${item.price}</span>
            <span onclick="removeShipping(${index})" style="cursor:pointer; font-weight:bold; opacity:0.6; margin-left:4px;">×</span>
        </div>
    `).join('');

    const dList = document.getElementById('d-shipping-list');
    if (dList) dList.innerHTML = html;
    const mList = document.getElementById('m-shipping-list');
    if (mList) mList.innerHTML = html;
}

function addShippingMobile() {
    const nameInput = document.getElementById('m-new-shipping-name');
    const priceInput = document.getElementById('m-new-shipping-price');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกชื่อและราคาให้ครบถ้วน ❌', 'error');
        return;
    }

    if (!store.settings.shippingOptions) store.settings.shippingOptions = [];
    store.settings.shippingOptions.push({ name, price });
    store.save();
    renderShippingTags();
    renderTransactionOptions();
    nameInput.value = '';
    priceInput.value = '';
    showToast('เพิ่มขนส่งเรียบร้อย ✅');
}

// Cost Management Functions
function addCostOption() {
    const nameInput = document.getElementById('new-cost-name');
    const priceInput = document.getElementById('new-cost-price');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกรายการและราคาให้ครบถ้วน ❌', 'error');
        return;
    }

    if (!store.settings.costOptions) store.settings.costOptions = [];
    store.settings.costOptions.push({ name, price });
    store.save();
    renderCostTags();
    renderTransactionOptions();
    nameInput.value = '';
    priceInput.value = '';
    showToast('เพิ่มต้นทุนเรียบร้อย ✅');
}

function removeCostOption(index) {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;
    store.settings.costOptions.splice(index, 1);
    store.save();
    renderCostTags();
    renderTransactionOptions();
}

function renderCostTags() {
    const request = store.settings.costOptions || [];
    const html = request.map((item, index) => `
        <div style="background:#ffedd5; color:#9a3412; padding:6px 14px; border-radius:15px; display:inline-flex; align-items:center; gap:8px; font-size:0.95rem; border:1px solid #fed7aa;">
            <b>${item.name}</b> <span style="opacity:0.8;">฿${item.price}</span>
            <span onclick="removeCostOption(${index})" style="cursor:pointer; font-weight:bold; opacity:0.6; margin-left:4px;">×</span>
        </div>
    `).join('');

    const dList = document.getElementById('d-cost-list');
    if (dList) dList.innerHTML = html;
    const mList = document.getElementById('m-cost-list');
    if (mList) mList.innerHTML = html;
}

function addCostOptionMobile() {
    const nameInput = document.getElementById('m-new-cost-name');
    const priceInput = document.getElementById('m-new-cost-price');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price)) {
        showToast('กรุณากรอกรายการและราคาให้ครบถ้วน ❌', 'error');
        return;
    }

    if (!store.settings.costOptions) store.settings.costOptions = [];
    store.settings.costOptions.push({ name, price });
    store.save();
    renderCostTags();
    renderTransactionOptions();
    nameInput.value = '';
    priceInput.value = '';
    showToast('เพิ่มต้นทุนเรียบร้อย ✅');
}

// Transaction Options Handlers (Auto-fill)
// Transaction Options Handlers (Auto-fill)
function renderTransactionOptions() {
    const shippingOpts = store.settings.shippingOptions || [];
    const costOpts = store.settings.costOptions || [];

    const renderOptionsHTML = (items) => {
        return '<option value="">-- เลือก --</option>' +
            items.map((item, i) => `<option value="${i}">${item.name} (${item.price})</option>`).join('');
    };

    const htmlShipping = renderOptionsHTML(shippingOpts);
    const htmlCost = renderOptionsHTML(costOpts);

    // Desktop
    const dShip = document.getElementById('d-shipping-select');
    if (dShip) dShip.innerHTML = htmlShipping;
    const dCost = document.getElementById('d-cost-select');
    if (dCost) dCost.innerHTML = htmlCost;

    // Mobile
    const mShip = document.getElementById('m-shipping-select');
    if (mShip) mShip.innerHTML = htmlShipping;
    const mCost = document.getElementById('m-cost-select');
    if (mCost) mCost.innerHTML = htmlCost;
}

function applyShippingOption(mode = 'd') {
    const selectId = mode === 'm' ? 'm-shipping-select' : 'd-shipping-select';
    const inputId = mode === 'm' ? 'm-shipping' : 'd-shipping';

    const idx = document.getElementById(selectId).value;
    if (idx !== '') {
        const item = store.settings.shippingOptions[idx];
        if (item) {
            document.getElementById(inputId).value = item.price;
            calculateProfit(mode);
        }
    }
}

function applyCostOption(mode = 'd') {
    const selectId = mode === 'm' ? 'm-cost-select' : 'd-cost-select';
    const inputId = mode === 'm' ? 'm-cost' : 'd-cost';

    const idx = document.getElementById(selectId).value;
    if (idx !== '') {
        const item = store.settings.costOptions[idx];
        if (item) {
            document.getElementById(inputId).value = item.price;
            calculateProfit(mode);
        }
    }
}

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

// Desktop Navigation
function switchTab(tabId) {
    // Desktop
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.desktop-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `d-${tabId}`);
    });
}

document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Mobile Navigation
document.querySelectorAll('.m-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.mtab;
        document.querySelectorAll('.m-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.m-section').forEach(s => s.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// Submenu Toggle
window.toggleSubmenu = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
};

// Update Dashboard
function updateDashboard() {
    const income = store.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = store.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const profit = store.transactions.reduce((s, t) => s + (parseFloat(t.profit) || 0), 0);

    // Desktop stats
    document.getElementById('d-income').textContent = formatCurrency(income);
    document.getElementById('d-expense').textContent = formatCurrency(expense);
    document.getElementById('d-count').textContent = store.transactions.length;
    document.getElementById('d-profit-total').textContent = formatCurrency(profit);

    // Mobile stats
    document.getElementById('m-income').textContent = formatCurrency(income);
    document.getElementById('m-expense').textContent = formatCurrency(expense);
    document.getElementById('m-count').textContent = store.transactions.length;
    document.getElementById('m-profit-total').textContent = formatCurrency(profit);

    // Shop Stats (Income Only)
    const shopSales = {};
    store.transactions.filter(t => t.type === 'income').forEach(t => {
        const s = t.shop || 'ไม่ระบุ';
        if (!shopSales[s]) shopSales[s] = 0;
        shopSales[s] += t.amount;
    });

    const shopHtml = Object.keys(shopSales).map(shop => {
        const total = shopSales[shop];
        return `
            <div style="background:white; border:1px solid #e5e7eb; border-radius:12px; padding:15px; min-width:150px; flex:1; display:flex; flex-direction:column; gap:4px;">
                <div style="font-size:0.9rem; color:#6b7280;">${shop}</div>
                <div style="font-size:1.25rem; font-weight:bold; color:#db2777;">${formatCurrency(total)}</div>
            </div>
        `;
    }).join('') || '<div class="empty-box" style="padding: 1rem; width: 100%;">ยังไม่มีข้อมูลร้านค้า</div>';

    const dShopStats = document.getElementById('d-shop-stats');
    if (dShopStats) dShopStats.innerHTML = shopHtml;

    const mShopStats = document.getElementById('m-shop-stats');
    if (mShopStats) mShopStats.innerHTML = shopHtml;

    // --- CHART.JS RENDERING (NEW) ---
    const ctx = document.getElementById('d-shop-chart');
    if (ctx) {
        // Prepare Data
        const labels = Object.keys(shopSales);
        const dataValues = Object.values(shopSales);

        // Show/Hide "No Data" message
        const noDataMsg = document.getElementById('d-shop-no-data');
        if (labels.length === 0) {
            ctx.style.display = 'none';
            if (noDataMsg) noDataMsg.style.display = 'block';
        } else {
            ctx.style.display = 'block';
            if (noDataMsg) noDataMsg.style.display = 'none';

            // Define Colors (Pink/Pastel Palette)
            const colors = [
                '#ec4899', '#f472b6', '#fbcfe8', '#db2777', '#be185d',
                '#9d174d', '#fda4af', '#fb7185', '#e11d48', '#be123c'
            ];

            // Destroy old chart instance if exists
            if (window.dashboardChart instanceof Chart) {
                window.dashboardChart.destroy();
            }

            // Create New Chart
            window.dashboardChart = new Chart(ctx, {
                type: 'bar', // เปลี่ยนเป็นกราฟแท่ง
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'ยอดขาย (บาท)',
                        data: dataValues,
                        backgroundColor: colors, // ใช้ชุดสีที่เตรียมไว้
                        borderRadius: 8, // มนๆ หน่อย
                        borderWidth: 0,
                        barPercentage: 0.6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // ไม่ต้องโชว์ Legend แล้ว
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return formatCurrency(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f3f4f6'
                            },
                            ticks: {
                                font: { family: "'Noto Sans Thai', sans-serif" }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: { family: "'Noto Sans Thai', sans-serif" }
                            }
                        }
                    }
                }
            });
        }
    }

    // Transaction lists
    const recent = [...store.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const all = [...store.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    const renderList = (items) => {
        if (items.length === 0) {
            return `<div class="empty-box">
                <div class="emoji">💭</div>
                <p>ยังไม่มีรายการค่ะ</p>
                <span>เพิ่มสลิปเพื่อเริ่มต้นนะคะ~</span>
            </div>`;
        }
        return items.map(t => `
            <div class="tx-item" onclick="openTransaction('${t.id}')" style="cursor: pointer;">
                <div class="tx-emoji">${t.type === 'income' ? '🌷' : '🛍️'}</div>
                <div class="tx-info">
                    <div class="tx-name">${t.senderName || t.note || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย')}</div>
                    <div class="tx-meta">
                        <span>${new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                        ${t.bank ? `<span>• ${t.bank}</span>` : ''}
                    </div>
                </div>
                <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
            </div>
        `).join('');
    };

    document.getElementById('d-recent').innerHTML = renderList(recent);
    document.getElementById('d-all-list').innerHTML = renderList(all);
    document.getElementById('m-recent').innerHTML = renderList(recent);
    document.getElementById('m-all').innerHTML = renderList(all);

    // Update Calendar
    if (typeof renderCalendar === 'function') {
        renderCalendar(currentCalendarDate);
    }
}

// Transaction Management (Edit/Delete)
function openTransaction(id) {
    const t = store.transactions.find(x => x.id === id);
    if (!t) return;

    // Populate bank dropdown
    const bankSelect = document.getElementById('edit-bank');
    bankSelect.innerHTML = '<option value="">เลือกธนาคาร</option>';
    appConfig.banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.name;
        option.textContent = `${bank.emoji} ${bank.name}`;
        if (t.bank === bank.name) option.selected = true;
        bankSelect.appendChild(option);
    });

    // Populate fields
    document.getElementById('edit-id').value = t.id;
    document.getElementById('edit-type').value = t.type;
    document.getElementById('edit-date').value = t.date;
    document.getElementById('edit-amount').value = t.amount;
    document.getElementById('edit-sender').value = t.senderName || '';
    document.getElementById('edit-receiver').value = t.receiverName || '';
    document.getElementById('edit-note').value = t.note || '';
    document.getElementById('edit-items').value = t.items || '';
    document.getElementById('edit-shipping').value = t.shipping || 0;
    document.getElementById('edit-items').value = t.items || '';
    document.getElementById('edit-shipping').value = t.shipping || 0;
    document.getElementById('edit-cost').value = t.cost || 0;
    document.getElementById('edit-shop').value = t.shop || '';

    calculateEditProfit();

    // Show modal
    const modal = document.getElementById('tx-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeTxModal() {
    const modal = document.getElementById('tx-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function calculateEditProfit() {
    const amount = parseFloat(document.getElementById('edit-amount').value) || 0;
    const shipping = parseFloat(document.getElementById('edit-shipping').value) || 0;
    const cost = parseFloat(document.getElementById('edit-cost').value) || 0;
    const profit = amount - shipping - cost;
    document.getElementById('edit-profit').value = profit.toFixed(2);
}

function saveEditTransaction() {
    const id = document.getElementById('edit-id').value;
    const index = store.transactions.findIndex(x => x.id === id);
    if (index === -1) return;

    const amount = parseFloat(document.getElementById('edit-amount').value) || 0;
    const shipping = parseFloat(document.getElementById('edit-shipping').value) || 0;
    const cost = parseFloat(document.getElementById('edit-cost').value) || 0;

    store.transactions[index] = {
        ...store.transactions[index],
        type: document.getElementById('edit-type').value,
        date: document.getElementById('edit-date').value,
        amount: amount,
        senderName: document.getElementById('edit-sender').value,
        receiverName: document.getElementById('edit-receiver').value,
        bank: document.getElementById('edit-bank').value,
        note: document.getElementById('edit-note').value,
        items: document.getElementById('edit-items').value,
        shipping: shipping,
        cost: cost,
        items: document.getElementById('edit-items').value,
        shipping: shipping,
        cost: cost,
        profit: amount - shipping - cost,
        shop: document.getElementById('edit-shop').value
    };

    store.save();
    updateDashboard();
    closeTxModal();
    showToast('แก้ไขข้อมูลสำเร็จ! ✅');
}

// Delete logic
function deleteTransaction() {
    if (!confirm('ยืนยันที่จะลบรายการนี้? (จะลบจาก Cloud ด้วยถ้ามี)')) return;

    const id = document.getElementById('edit-id').value;
    const tx = store.transactions.find(t => t.id === id);

    // Delete from Supabase if linked
    if (tx && tx.supabase_id && typeof SupabaseService !== 'undefined') {
        SupabaseService.deleteTransaction(tx.supabase_id).catch(e => console.error(e));
    }

    store.transactions = store.transactions.filter(t => t.id !== id);
    store.save();
    updateDashboard();
    closeTxModal();
    showToast('ลบรายการสำเร็จ! 🗑️');
}


// ... (Skip upload functionality code) ... 


function clearData() {
    if (confirm('ลบข้อมูลทั้งหมด? (จะลบข้อมูลบน Cloud ทั้งหมดด้วย!)')) {
        // Clear Cloud
        if (typeof SupabaseService !== 'undefined') {
            SupabaseService.clearAllTransactions().catch(e => console.error(e));
        }

        store.transactions = [];
        store.save();
        updateDashboard();
        showToast('ล้างข้อมูลแล้ว');
    }
}


// Upload functionality
let currentType = 'income';
let currentImage = null;

// Desktop dropzone
const dDropzone = document.getElementById('d-dropzone');
const dFile = document.getElementById('d-file');
const dPreview = document.getElementById('d-preview');
const dForm = document.getElementById('d-form');

dDropzone.onclick = (e) => {
    if (!e.target.closest('button') && e.target.tagName !== 'INPUT') {
        dFile.click();
    }
};
dDropzone.ondragover = (e) => { e.preventDefault(); dDropzone.style.borderColor = '#ec4899'; };
dDropzone.ondragleave = () => dDropzone.style.borderColor = '#f9a8d4';
dDropzone.ondrop = (e) => {
    e.preventDefault();
    dDropzone.style.borderColor = '#f9a8d4';
    if (e.dataTransfer.files.length > 1) {
        handleBatchFiles(e.dataTransfer.files);
    } else if (e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
};
dFile.onchange = (e) => {
    if (e.target.files.length > 1) {
        handleBatchFiles(e.target.files);
    } else if (e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
};

// Mobile elements
const mDropzone = document.getElementById('m-dropzone');
const mFile = document.getElementById('m-file');
const mPreview = document.getElementById('m-preview');
const mForm = document.getElementById('m-form');

mDropzone.onclick = (e) => {
    if (!e.target.closest('button') && e.target.tagName !== 'INPUT') {
        mFile.click();
    }
};
mFile.onchange = (e) => {
    if (e.target.files.length > 1) {
        handleBatchFiles(e.target.files);
    } else if (e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
};

let isBatchMode = false;

// ============ BATCH UPLOAD LOGIC ============
async function handleBatchFiles(files) {
    isBatchMode = true;
    batchFiles = [];
    const filesArray = Array.from(files);

    // Show Containers
    const dContainer = document.getElementById('d-batch-container');
    const mContainer = document.getElementById('m-batch-container');
    if (dContainer) dContainer.classList.remove('hidden');
    if (mContainer) mContainer.classList.remove('hidden');

    // Hide Single
    dDropzone.classList.add('hidden');
    mDropzone.classList.add('hidden');
    dPreview.classList.remove('show');
    dForm.classList.remove('show');
    mPreview.classList.remove('show');
    mForm.style.display = 'none';

    document.getElementById('d-batch-count').textContent = filesArray.length;
    document.getElementById('m-batch-count').textContent = filesArray.length;

    const dList = document.getElementById('d-batch-list');
    const mList = document.getElementById('m-batch-list');
    dList.innerHTML = '';
    mList.innerHTML = '';

    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const reader = new FileReader();

        const itemPromise = new Promise((resolve) => {
            reader.onload = (e) => {
                const item = {
                    id: 'item-' + i,
                    image: e.target.result,
                    amount: 0,
                    date: today(),
                    senderName: '',
                    shop: '',
                    shipping: 0,
                    cost: 0,
                    bank: '',
                    status: 'reading'
                };
                batchFiles.push(item);
                renderBatchItem(item, 'd');
                renderBatchItem(item, 'm');
                resolve();
            };
        });
        reader.readAsDataURL(file);
        await itemPromise;
    }

    // Process OCR
    for (let i = 0; i < batchFiles.length; i++) {
        await processBatchOCR(i);
    }
}

function renderBatchItem(item, prefix) {
    const list = document.getElementById(prefix + '-batch-list');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'batch-item';
    div.id = `${prefix}-${item.id}`;

    const shopOptions = (store.settings.shops || []).map(s => `<option value="${s}">${s}</option>`).join('');
    const shippingOptions = (store.settings.shippingOptions || []).map(o => `<option value="${o.price}">${o.name} (฿${o.price})</option>`).join('');
    const costOptions = (store.settings.costOptions || []).map(o => `<option value="${o.price}">${o.name} (฿${o.price})</option>`).join('');

    div.innerHTML = `
        <div class="batch-img-wrap" onclick="window.open('${item.image}', '_blank')">
            <img src="${item.image}" alt="Slip">
        </div>
        <div class="batch-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                <div class="batch-index">ใบที่ ${batchFiles.length}</div>
                <div style="display:flex; gap: 10px; align-items: center;">
                    <span class="batch-status" id="${prefix}-status-${item.id}">
                        <span id="${prefix}-read-icon-${item.id}">⏳</span>
                        <span id="${prefix}-read-text-${item.id}">กำลังอ่าน...</span>
                    </span>
                    <button class="btn" style="padding: 4px 12px; font-size: 0.75rem; background: #fee2e2; color: #ef4444; border-radius: 10px; border:none;" onclick="removeBatchItem('${item.id}')">ลบ</button>
                </div>
            </div>
            
            <div class="batch-row">
                <div class="form-group">
                    <label class="form-label">💰 ยอดเงิน</label>
                    <input type="number" class="form-input" value="${item.amount || ''}" onchange="updateBatchData('${item.id}', 'amount', this.value)" id="${prefix}-amt-${item.id}" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label class="form-label">📅 วันที่</label>
                    <input type="date" class="form-input" value="${item.date}" onchange="updateBatchData('${item.id}', 'date', this.value)" id="${prefix}-date-${item.id}">
                </div>
            </div>

            <div class="batch-row">
                <div class="form-group">
                    <label class="form-label">🏪 ร้านค้า</label>
                    <select class="form-input" onchange="updateBatchData('${item.id}', 'shop', this.value)" id="${prefix}-shop-${item.id}">
                        <option value="">-- เลือก --</option>
                        ${shopOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">🚚 ส่ง</label>
                    <select class="form-input" onchange="updateBatchData('${item.id}', 'shipping', this.value)" id="${prefix}-ship-${item.id}">
                        <option value="0">0</option>
                        ${shippingOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">💰 ทุน</label>
                    <select class="form-input" onchange="updateBatchData('${item.id}', 'cost', this.value)" id="${prefix}-cost-${item.id}">
                        <option value="0">0</option>
                        ${costOptions}
                    </select>
                </div>
            </div>
        </div>
    `;
    list.appendChild(div);
    if (window.batchObserver) window.batchObserver.observe(div);
}

function updateBatchData(id, field, value) {
    const item = batchFiles.find(x => x.id === id);
    if (!item) return;

    if (field === 'amount' || field === 'shipping' || field === 'cost') {
        item[field] = parseFloat(value) || 0;
    } else {
        item[field] = value;
    }

    // Sync to other layout (d to m or m to d)
    ['d', 'm'].forEach(p => {
        const el = document.getElementById(`${p}-${field.substring(0, 4)}-${id}`);
        if (el) el.value = value;
    });
}

async function processBatchOCR(index) {
    const item = batchFiles[index];
    try {
        const data = await analyzeSlip(item.image);
        if (data.amount) item.amount = data.amount;
        if (data.date) item.date = data.date;
        if (data.senderName) item.senderName = data.senderName;
        if (data.bank) item.bank = data.bank;

        const updateUI = (p) => {
            const amtEl = document.getElementById(`${p}-amt-${item.id}`);
            const dateEl = document.getElementById(`${p}-date-${item.id}`);
            const statusEl = document.getElementById(`${p}-status-${item.id}`);
            if (amtEl) amtEl.value = item.amount || '';
            if (dateEl) dateEl.value = item.date;
            if (statusEl) {
                statusEl.textContent = '✅ อ่านแล้ว';
                statusEl.style.color = '#22c55e';
            }
        };
        updateUI('d');
        updateUI('m');

    } catch (e) {
        ['d', 'm'].forEach(p => {
            const statusEl = document.getElementById(`${p}-status-${item.id}`);
            if (statusEl) {
                statusEl.textContent = '⚠️ อ่านพลาด (กรอกเอง)';
                statusEl.style.color = '#f59e0b';
            }
        });
    }
}

async function saveAllBatch() {
    const validItems = batchFiles.filter(item => item.amount > 0);
    if (validItems.length === 0) {
        showToast('ไม่มีรายการที่มีจำนวนเงิน', 'error');
        return;
    }

    const saveBtnD = document.getElementById('d-batch-save-btn');
    const saveBtnM = document.getElementById('m-batch-save-btn');
    [saveBtnD, saveBtnM].forEach(b => { if (b) { b.disabled = true; b.textContent = '⏳ กำลังบันทึก...'; } });

    for (const item of validItems) {
        const transaction = {
            id: genId(),
            type: 'income', // Batch assumes income for slips
            amount: item.amount,
            date: item.date || today(),
            senderName: item.senderName,
            bank: item.bank,
            shop: item.shop,
            shipping: item.shipping,
            cost: item.cost,
            profit: item.amount - item.shipping - item.cost,
            image: item.image,
            createdAt: new Date().toISOString()
        };

        // Sync to Supabase (Batch)
        if (localStorage.getItem('ting_sb_url') && typeof SupabaseService !== 'undefined') {
            try {
                let imgUrl = null;
                if (item.image) imgUrl = await SupabaseService.uploadImage(item.image);
                await SupabaseService.saveTransaction(transaction, imgUrl);
            } catch (e) { console.error('Supabase Batch Error', e); }
        }

        store.transactions.push(transaction);

        // Sync to sheets if connected
        const sheetId = localStorage.getItem('ting_spreadsheet_id');
        if (sheetId) {
            try { await appendToSheet(sheetId, transaction); } catch (e) { console.error('Sheet Sync Error', e); }
        }
    }

    store.save();
    updateDashboard();
    showToast(`บันทึก ${validItems.length} รายการสำเร็จ! ✨`, 'success');
    resetUpload();
}

function removeBatchItem(id) {
    batchFiles = batchFiles.filter(x => x.id !== id);
    document.getElementById(`d-${id}`)?.remove();
    document.getElementById(`m-${id}`)?.remove();
    document.getElementById('d-batch-count').textContent = batchFiles.length;
    document.getElementById('m-batch-count').textContent = batchFiles.length;

    // Update index labels
    ['d', 'm'].forEach(p => {
        const list = document.getElementById(p + '-batch-list');
        if (list) {
            const labels = list.querySelectorAll('.batch-index');
            labels.forEach((label, idx) => {
                label.textContent = `ใบที่ ${idx + 1}`;
            });
        }
    });

    if (batchFiles.length === 0) resetUpload();
}

function applyBatchAll(field) {
    if (batchFiles.length < 2) return;
    const firstValue = batchFiles[0][field];

    batchFiles.forEach((item, index) => {
        if (index === 0) return;
        updateBatchData(item.id, field, firstValue);
    });
    showToast('ใช้ข้อมูลใบแรกกับทั้งหมดแล้ว ✨');
}

async function handleFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        currentImage = e.target.result;

        // Desktop
        document.getElementById('d-preview-img').src = currentImage;
        dDropzone.classList.add('hidden');
        dPreview.classList.add('show');
        dForm.classList.add('show');
        document.getElementById('d-date').value = today();

        // Mobile
        document.getElementById('m-preview-img').src = currentImage;
        mDropzone.classList.add('hidden');
        mPreview.classList.add('show');
        mForm.style.display = 'block';
        document.getElementById('m-date').value = today();

        // 🧹 Reset Shipping & Cost Dropdowns/Inputs
        const resetIds = [
            'd-shipping-select', 'd-cost-select', 'd-shipping', 'd-cost',
            'm-shipping-select', 'm-cost-select', 'm-shipping', 'm-cost'
        ];
        resetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Recalculate profit (to clear profit field)
        calculateProfit('d');
        calculateProfit('m');

        // OCR
        if (store.settings.enableOcr) {
            const ocrStatus = document.getElementById('d-ocr-status');
            const mOcrStatus = document.getElementById('m-ocr-status');

            const setStatus = (msg, color) => {
                if (ocrStatus) { ocrStatus.textContent = msg; ocrStatus.style.display = 'block'; ocrStatus.style.color = color; }
                if (mOcrStatus) { mOcrStatus.textContent = msg; mOcrStatus.style.display = 'block'; mOcrStatus.style.color = color; }
            };

            setStatus('⏳ กำลังอ่านสลิป...', '#eab308');

            try {
                const data = await analyzeSlip(currentImage);

                console.log('🎯 Final Data:', data);

                // Update fields logic
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val !== null ? val : '';
                }

                if (data.amount !== null && !isNaN(data.amount)) {
                    setVal('d-amount', data.amount);
                    setVal('m-amount', data.amount);
                }
                if (data.date) {
                    setVal('d-date', data.date);
                    setVal('m-date', data.date);
                }
                if (data.senderName) {
                    setVal('d-sender', data.senderName);
                    setVal('m-sender', data.senderName);
                }
                if (data.receiverName) {
                    setVal('d-receiver', data.receiverName);
                    setVal('m-receiver', data.receiverName);
                }

                // Bank Logic
                if (data.bank) {
                    const setBank = (selectId) => {
                        const bankSelect = document.getElementById(selectId);
                        if (!bankSelect) return;

                        let hasTrueMoney = false;
                        for (const opt of bankSelect.options) {
                            if (opt.value === 'TrueMoney Wallet') hasTrueMoney = true;
                        }
                        if (!hasTrueMoney && data.bank === 'TrueMoney Wallet') {
                            const opt = document.createElement('option');
                            opt.value = 'TrueMoney Wallet';
                            opt.textContent = '🟠 TrueMoney Wallet';
                            bankSelect.appendChild(opt);
                        }

                        // Try to select
                        const bankName = data.bank.toLowerCase();
                        for (const option of bankSelect.options) {
                            const optVal = option.value.toLowerCase();
                            if (bankName.includes('truemoney') || bankName.includes('wallet')) {
                                if (optVal.includes('truemoney') || optVal.includes('wallet')) bankSelect.value = option.value;
                            }
                            else if (bankName.includes('กสิกร') || bankName.includes('kbank')) bankSelect.value = 'กสิกรไทย';
                            else if (bankName.includes('scb') || bankName.includes('ไทยพาณิชย์')) bankSelect.value = 'ไทยพาณิชย์';
                            else if (bankName.includes('กรุงไทย') || bankName.includes('ktb')) bankSelect.value = 'กรุงไทย';
                            else if (bankName.includes('กรุงเทพ') || bankName.includes('bbl')) bankSelect.value = 'กรุงเทพ';
                            else if (bankName.includes('พร้อมเพย์') || bankName.includes('promptpay')) bankSelect.value = 'พร้อมเพย์';
                        }
                    };
                    setBank('d-bank');
                    setBank('m-bank');
                }

                // Check for TrueMoney Special Case first
                if (data.bank === 'TrueMoney Wallet') {
                    setStatus('⚠️ สลิป TrueMoney กรุณากรอกเอง', '#f59e0b');
                    showToast('สลิป TrueMoney กรุณากรอกข้อมูลเอง', 'warning');
                } else {
                    // Normal Success Check
                    const hasData = (data.amount !== null && !isNaN(data.amount)) ||
                        data.date ||
                        data.senderName ||
                        data.bank;

                    if (hasData) {
                        setStatus('✅ อ่านสลิปสำเร็จ!', '#22c55e');
                        showToast('อ่านข้อมูลเรียบร้อย ✨', 'success');
                    } else {
                        setStatus('❌ อ่านข้อมูลไม่ได้', '#ef4444');
                        showToast('ไม่พบข้อมูลในรูปภาพ', 'error');
                    }
                }

            } catch (err) {
                console.error('OCR Error:', err);
                setStatus('⚠️ กรอกข้อมูลเองค่ะ', '#f59e0b');
            }
        }
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    currentImage = null;
    batchFiles = [];
    isBatchMode = false;
    dFile.value = '';
    mFile.value = '';

    // Desktop Reset
    dDropzone.classList.remove('hidden');
    dPreview.classList.remove('show');
    dForm.classList.remove('show');
    document.getElementById('d-batch-container')?.classList.add('hidden');

    // Mobile Reset
    mDropzone.classList.remove('hidden');
    mPreview.classList.remove('show');
    mForm.style.display = 'none';
    document.getElementById('m-batch-container')?.classList.add('hidden');
}

function updateBatchData(id, field, value) {
    const item = batchFiles.find(x => x.id === id);
    if (!item) return;

    if (field === 'amount' || field === 'shipping' || field === 'cost') {
        item[field] = parseFloat(value) || 0;
    } else {
        item[field] = value;
    }

    const map = { amount: 'amt', date: 'date', shop: 'shop', shipping: 'ship', cost: 'cost' };
    const prefixId = map[field];

    // Sync to other layout (d to m or m to d)
    ['d', 'm'].forEach(p => {
        const el = document.getElementById(`${p}-${prefixId}-${id}`);
        if (el && el.value !== value) el.value = value;
    });
}

// Type selectors
document.querySelectorAll('[data-type]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
    };
});

// Save transaction
// Save transaction
// Lock flag to prevent double submission
let isSavingTransaction = false;

async function saveTransaction() {
    if (isSavingTransaction) return;

    // Select ALL save buttons (Desktop & Mobile)
    const saveBtns = document.querySelectorAll('button[onclick="saveTransaction()"]');

    // 1. Gather Data
    const dAmount = parseFloat(document.getElementById('d-amount').value);
    const mAmount = parseFloat(document.getElementById('m-amount').value);
    const amount = dAmount || mAmount;

    if (!amount || amount <= 0) {
        showToast('กรุณากรอกจำนวนเงิน', 'error');
        return;
    }

    // Lock UI immediately
    isSavingTransaction = true;
    saveBtns.forEach(btn => {
        btn.disabled = true;
        btn.dataset.orgText = btn.innerHTML;
        btn.innerHTML = '⏳ กำลังบันทึก...';
    });

    try {
        const date = document.getElementById('d-date').value || document.getElementById('m-date').value || today();
        const sender = document.getElementById('d-sender').value || document.getElementById('m-sender').value;
        const receiver = document.getElementById('d-receiver').value || document.getElementById('m-receiver').value;
        const bank = document.getElementById('d-bank').value || document.getElementById('m-bank').value;
        const note = document.getElementById('d-note').value || document.getElementById('m-note').value;
        const shop = document.getElementById('d-shop-select').value || document.getElementById('m-shop-select').value;
        const items = document.getElementById('d-items').value || document.getElementById('m-items').value;
        const shipping = parseFloat(document.getElementById('d-shipping').value || document.getElementById('m-shipping').value) || 0;
        const cost = parseFloat(document.getElementById('d-cost').value || document.getElementById('m-cost').value) || 0;
        const profit = amount - shipping - cost;

        const transaction = {
            id: genId(),
            type: currentType,
            amount: amount,
            date: date,
            senderName: sender,
            receiverName: receiver,
            bank: bank,
            shop: shop,
            note: note,
            items: items,
            shipping: shipping,
            cost: cost,
            profit: profit,
            image: currentImage,
            createdAt: new Date().toISOString()
        };

        // 2. Sync to Supabase
        if (typeof SupabaseService !== 'undefined') {
            try {
                let imgUrl = null;
                if (currentImage) {
                    imgUrl = await SupabaseService.uploadImage(currentImage);
                }
                const sbId = await SupabaseService.saveTransaction(transaction, imgUrl);
                if (sbId) {
                    transaction.supabase_id = sbId;
                }
            } catch (sbError) {
                console.error('Supabase Error', sbError);
                showToast('บันทึก Cloud ไม่สำเร็จ (แต่ในเครื่องบันทึกแล้ว)', 'error');
            }
        }

        // 3. Save Locally
        store.transactions.push(transaction);
        store.save();

        // 4. Sync to Sheets
        const sheetUrl = localStorage.getItem('ting_sheet_url');
        if (sheetUrl) {
            try {
                // Use SheetsService if available, fallback to old method
                if (typeof SheetsService !== 'undefined' && SheetsService.appendTransaction) {
                    await SheetsService.appendTransaction(transaction);
                } else {
                    await appendToSheet(null, transaction);
                }
                showToast('บันทึกสำเร็จ! 🎉');
            } catch (e) {
                console.error('Sheet Sync Error (Ignored):', e);
                // User requested to remove the error toast
                showToast('บันทึกสำเร็จ! 🎉');
            }
        } else {
            showToast('บันทึกสำเร็จ! 🎉');
        }

        resetUpload();
        updateDashboard();

    } catch (err) {
        console.error('Save Error:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
        // Unlock UI
        isSavingTransaction = false;
        saveBtns.forEach(btn => {
            btn.disabled = false;
            // Restore original text or default
            btn.innerHTML = btn.dataset.orgText || '💾 บันทึก';
        });
    }
}

// Slip OCR Analysis using Tesseract.js + Slip Verification API
const SLIP_API_URL = 'https://slip-c.oiioioiiioooioio.download';

async function analyzeSlip(imageBase64) {
    const result = {
        amount: null,
        date: null,
        senderName: null,
        receiverName: null,
        bank: null,
        receiverBank: null,
        transactionId: null
    };

    let apiSuccess = false;

    // 1. Slip API
    try {
        console.log('📡 Calling Slip API...');
        const apiResponse = await fetch(`${SLIP_API_URL}/api/slip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                img: imageBase64,
                tos: true,
                privacy: true,
                eula: true
            })
        }).then(res => res.json());

        console.log('📋 Slip API Response:', apiResponse);

        if (apiResponse && apiResponse.data) {
            if (apiResponse.data.error) throw new Error(apiResponse.data.error);

            const data = apiResponse.data;
            if (data.amount) result.amount = parseFloat(data.amount);
            if (data.date) {
                const d = new Date(data.date);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const da = String(d.getDate()).padStart(2, '0');
                    result.date = `${y}-${m}-${da}`;
                }
            }
            if (data.sender_name) result.senderName = data.sender_name;
            if (data.receiver_name) result.receiverName = data.receiver_name;
            if (data.ref) result.transactionId = data.ref;

            // Bank Mapping
            const bankCodeMap = {
                '002': 'กรุงเทพ', '004': 'กสิกรไทย', '006': 'กรุงไทย',
                '011': 'ทหารไทยธนชาต', '014': 'ไทยพาณิชย์', '025': 'กรุงศรี',
                '030': 'ออมสิน', '034': 'ธ.ก.ส.', '065': 'ธนชาต', '067': 'ทิสโก้',
                '066': 'อิสลามแห่งประเทศไทย'
            };
            let apiBankCode = data.sender_bank || (data.sender_bank_details ? data.sender_bank_details.code : null);
            if (apiBankCode && bankCodeMap[apiBankCode]) {
                result.bank = bankCodeMap[apiBankCode];
            } else if (data.sender_bank_details && data.sender_bank_details.official_name) {
                const bn = data.sender_bank_details.official_name.toUpperCase();
                if (bn.includes('KASIKORN')) result.bank = 'กสิกรไทย';
                else if (bn.includes('SCB')) result.bank = 'ไทยพาณิชย์';
                else if (bn.includes('BANGKOK')) result.bank = 'กรุงเทพ';
                else if (bn.includes('KRUNG THAI')) result.bank = 'กรุงไทย';
                else if (bn.includes('AYUDHYA')) result.bank = 'กรุงศรี';
                else if (bn.includes('GSB')) result.bank = 'ออมสิน';
            }

            apiSuccess = true;
        }
    } catch (apiError) {
        console.error('❌ Slip API Error:', apiError);
    }

    if (apiSuccess) {
        console.log('✅ Used API Data');
        return result;
    }

    // 2. Fallback: OCR
    console.log('⚠️ API Failed/No Data -> Switching to Local OCR...');
    try {
        const { data: { text } } = await Tesseract.recognize(imageBase64, 'tha+eng', {
            logger: m => console.log(m)
        });

        console.log('📝 OCR Text:', text);

        const isTrueMoney = /TrueMoney|Wallet|ทรูมันนี่|วอลเล็ท/i.test(text);

        if (isTrueMoney) {
            result.bank = 'TrueMoney Wallet';
            console.log('🏦 Detected Bank: TrueMoney Wallet - Manual Entry Requested');
            return result; // Stop trying to read invalid amount/name
        }

        // Generic Fallback (Existing)
        let amountMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:บาท|THB|฿)/i);
        if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        // Date (Keep existing)
        const dateMatch = text.match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})/);
        if (dateMatch) {
            const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthIdx = thaiMonths.indexOf(dateMatch[2]);
            let year = parseInt(dateMatch[3]);
            if (year < 100) year += 2500;
            if (year > 2500) year -= 543;
            const d = new Date(year, monthIdx, parseInt(dateMatch[1]));
            if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                result.date = `${y}-${m}-${da}`;
            }
        }

    } catch (ocrError) {
        console.error('❌ OCR Failed:', ocrError);
    }

    console.log('📝 Final Result (Fallback):', result);
    return result;
}

// ตรวจสอบสลิปพร้อมระบุจำนวนเงิน
async function verifySlipWithAmount(imageBase64, amount) {
    const response = await fetch(`${SLIP_API_URL}/api/slip/${amount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            img: imageBase64,
            tos: true,
            privacy: true,
            eula: true
        })
    });

    if (!response.ok) throw new Error('Slip verification failed');
    return response.json();
}

// ตรวจสอบผ่าน QR Code
async function verifyQRCode(qrcodeData, amount) {
    const response = await fetch(`${SLIP_API_URL}/api/slip/${amount}/no_slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qrcode_data: qrcodeData,
            tos: true,
            privacy: true,
            eula: true
        })
    });

    if (!response.ok) throw new Error('QR verification failed');
    return response.json();
}

// Google Sheets
// Google Sheets (via Apps Script Web App)
async function appendToSheet(unusedId, transaction) {
    const sheetUrl = localStorage.getItem('ting_sheet_url') || appConfig.sheetUrl;
    if (!sheetUrl) {
        console.warn('⚠️ No Sheet URL found');
        return;
    }

    console.log('📡 Sending to Sheets URL:', sheetUrl);

    // Prepare payload matching Apps Script expectation
    const payload = {
        date: transaction.date,
        type: transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        amount: transaction.amount,
        sender_name: transaction.senderName || '',
        receiver_name: transaction.receiverName || '',
        bank: transaction.bank || '',
        shop: transaction.shop || '',
        note: transaction.note || '',
        items: transaction.items || '',
        shipping: transaction.shipping || 0,
        cost: transaction.cost || 0,
        profit: transaction.profit || 0,
        image_url: transaction.supabase_id ?
            `https://gvxgqkqvtlgkehceyidi.supabase.co/storage/v1/object/public/slips/${transaction.image_url ? transaction.image_url.split('/').pop() : ''}`
            : ''
        // Note: Image URL handling is tricky as Supabase logic generates it separately. 
        // If we want the stored link, we need to pass it in. Main loop passes 'transaction' object.
        // Let's just send empty for now or fix if critical.
    };

    // Use GET request (via URL Param) to avoid CORS/Network issues
    // encodeURIComponent handles special chars
    const jsonString = JSON.stringify(payload);
    const targetUrl = `${sheetUrl}?data=${encodeURIComponent(jsonString)}`;

    console.log('📡 Sending to Sheets (GET Mode)...');

    // Default fetch with no-cors (GET)
    await fetch(targetUrl, {
        method: 'GET',
        mode: 'no-cors'
    });

    // With no-cors, we assume success if no network error.
    console.log('✅ Sent to Sheets (GET success)');
    return { status: 'success' };
}

// Settings functions
function toggleOCR() {
    const toggle = document.getElementById('d-ocr-toggle');
    toggle.classList.toggle('active');
    store.settings.enableOcr = toggle.classList.contains('active');
    store.save();
    showToast(store.settings.enableOcr ? 'เปิด OCR แล้ว' : 'ปิด OCR แล้ว');
}

const GOOGLE_API_KEY = ''; // Not used for Apps Script method

async function connectSheets() {
    let inputVal = document.getElementById('d-sheet-id')?.value.trim() ||
        document.getElementById('m-sheet-id')?.value.trim();

    if (!inputVal) {
        showToast('กรุณากรอก Web App URL', 'error');
        return;
    }

    // Basic validation
    if (!inputVal.includes('script.google.com')) {
        showToast('URL ไม่ถูกต้อง (ต้องเป็น script.google.com...)', 'error');
        return;
    }

    try {
        showToast('กำลังตรวจสอบ...');
        // Test GET request
        const res = await fetch(inputVal);
        const text = await res.text();

        if (res.ok) {
            localStorage.setItem('ting_spreadsheet_id', inputVal); // Store URL as ID
            const status = document.getElementById('d-conn-status');
            if (status) {
                status.className = 'status-badge connected';
                status.textContent = '✅ เชื่อมต่อแล้ว';
            }
            showToast('เชื่อมต่อสำเร็จ! 🎉');
        } else {
            throw new Error();
        }
    } catch (e) {
        console.error(e);
        showToast('ไม่สามารถเชื่อมต่อได้ (ตรวจสอบ Permission: Anyone)', 'error');
    }
}

window.saveSheetUrl = function (prefix) {
    const url = document.getElementById(prefix + '-sheet-url').value.trim();
    localStorage.setItem('ting_sheet_url', url);
};

window.openGoogleSheet = function () {
    const url = localStorage.getItem('ting_sheet_url');
    if (url && url.startsWith('http')) {
        window.open(url, '_blank');
    } else {
        showToast('กรุณากรอกลิงก์ Google Sheet ก่อน', 'error');
    }
};

// Updated Sheets Service to use Web App
const SheetsService = {
    getSpreadsheetId() {
        return localStorage.getItem('ting_spreadsheet_id');
    },

    async appendTransaction(transaction) {
        const url = this.getSpreadsheetId();
        if (!url) return;

        // Use no-cors mode if needed, but standard POST usually works with Apps Script simple trigger
        // However, standard fetch to Apps Script from browser might have CORS issues.
        // We use 'no-cors' mode as a fallback, or rely on the script setting permissive CORS (which Apps Script handles for simple requests)
        // Standard TextOutput from doGet/doPost handles CORS automatically in most cases.

        // Prepare simplified data payload
        const payload = {
            date: transaction.date,
            type: transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            amount: transaction.amount,
            sender_name: transaction.senderName || '',
            receiver_name: transaction.receiverName || '',
            bank: transaction.bank || '',
            shop: transaction.shop || '',
            note: transaction.note || '',
            items: transaction.items || '',
            shipping: transaction.shipping || 0,
            cost: transaction.cost || 0,
            profit: transaction.profit || 0,
            image_url: imageUrl || '' // Send image link from Supabase
        };

        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors', // Important for client-side Apps Script calls
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // With no-cors, we can't read response, so we assume success if no network error
            return { success: true };
        } catch (error) {
            console.error('Sheets Error:', error);
            throw error;
        }
    }
};

// Replace standalone appendToSheet function to use the Service
async function appendToSheet(sheetId, transaction) {
    return SheetsService.appendTransaction(transaction);
}

function exportCSV() {
    if (!store.transactions.length) {
        showToast('ไม่มีข้อมูล', 'error');
        return;
    }

    const headers = ['วันที่', 'ประเภท', 'จำนวนเงิน', 'ผู้โอน', 'ผู้รับ', 'ธนาคาร', 'หมายเหตุ', 'รายการสินค้า', 'ค่าส่ง', 'ต้นทุน', 'กำไร'];
    const rows = store.transactions.map(t => [
        t.date, t.type === 'income' ? 'รายรับ' : 'รายจ่าย', t.amount,
        t.senderName || '', t.receiverName || '',
        t.bank || '', t.note || '',
        t.items || '', t.shipping || 0, t.cost || 0, t.profit || 0
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TING_${today()}.csv`;
    a.click();
    showToast('ส่งออกสำเร็จ!');
}

/* Old clearData removed - Moved to near deleteTransaction */

// --- Calendar Logic ---
let currentCalendarDate = new Date();

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Update Header
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const monthEl = document.getElementById('current-month-display');
    if (monthEl) monthEl.textContent = `${thaiMonths[month]} ${year + 543}`;

    // Update Header for Mobile
    const mMonthEl = document.getElementById('m-current-month-display');
    if (mMonthEl) mMonthEl.textContent = `${thaiMonths[month]} ${year + 543}`;


    // Get First Day & Total Days
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Data Aggregation
    const monthlyData = {};
    let monthlyTotal = 0;

    store.transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year && d.getMonth() === month && t.type === 'income') {
            const dayKey = d.getDate();
            if (!monthlyData[dayKey]) monthlyData[dayKey] = 0;
            monthlyData[dayKey] += t.amount;
            monthlyTotal += t.amount;
        }
    });

    const sumEl = document.getElementById('calendar-summary');
    if (sumEl) sumEl.textContent = `รายรับทั้งเดือน: ${formatCurrency(monthlyTotal)}`;

    const mSumEl = document.getElementById('m-calendar-summary');
    if (mSumEl) mSumEl.textContent = `รายรับ: ${formatCurrency(monthlyTotal)}`;

    // List of grids to update
    const gridIds = ['calendar-grid', 'm-calendar-grid'];

    gridIds.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        // Clear old days (keep headers - first 7 children)
        while (grid.children.length > 7) {
            grid.removeChild(grid.lastChild);
        }

        // Pad empty days
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }

        // Days
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';

            // Highlight today
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayEl.classList.add('today');
            }

            const dateEl = document.createElement('div');
            dateEl.className = 'calendar-date';
            dateEl.textContent = i;
            dayEl.appendChild(dateEl);

            // Show Income
            if (monthlyData[i]) {
                const incomeEl = document.createElement('div');
                incomeEl.className = 'calendar-income';
                if (monthlyData[i] > 1000) incomeEl.classList.add('high');
                incomeEl.innerText = `+${formatCurrency(monthlyData[i]).replace('฿', '')}`;
                dayEl.appendChild(incomeEl);
            }

            grid.appendChild(dayEl);
        }
    });
}

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar(currentCalendarDate);
}

// Initialize
// Initialize Google Sheets Inputs & Status
const sheetId = localStorage.getItem('ting_spreadsheet_id') || appConfig.sheetId || '';
const sheetUrl = localStorage.getItem('ting_sheet_url') || appConfig.sheetUrl || '';

document.getElementById('d-sheet-id').value = sheetId;
document.getElementById('m-sheet-id').value = sheetId;
document.getElementById('d-sheet-url').value = sheetUrl;
document.getElementById('m-sheet-url').value = sheetUrl;

if (sheetId) {
    const status = document.getElementById('d-conn-status');
    if (status) {
        status.className = 'status-badge connected';
        status.textContent = '✅ เชื่อมต่อแล้ว';
    }
    // Also auto-save to local storage if coming from config but not in local
    if (!localStorage.getItem('ting_spreadsheet_id')) {
        localStorage.setItem('ting_spreadsheet_id', sheetId);
        localStorage.setItem('ting_sheet_url', sheetUrl);
    }
}

if (!store.settings.enableOcr) {
    document.getElementById('d-ocr-toggle')?.classList.remove('active');
}

// Highlight current batch item on scroll
window.batchObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            const indexEl = entry.target.querySelector('.batch-index');
            if (indexEl) {
                const num = indexEl.textContent.replace('ใบที่ ', '');
                const countD = document.getElementById('d-batch-count');
                const countM = document.getElementById('m-batch-count');
                if (countD) countD.textContent = `${num} จาก ${batchFiles.length}`;
                if (countM) countM.textContent = `${num} จาก ${batchFiles.length}`;
            }
        } else {
            entry.target.classList.remove('active');
        }
    });
}, { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' });

// โหลด config และ update dashboard
loadConfig().then(() => {
    renderShopTags();
    updateShopDropdowns();
    renderShippingTags();
    renderCostTags();
    renderTransactionOptions();
    updateDashboard();
    console.log('🎀 TING App Ready!');

    // --- Supabase Service ---
    window.sbClient = null;

    window.SupabaseService = {
        async init() {
            if (!window.supabase) return;

            // Priority: LocalStorage -> AppConfig
            let url = localStorage.getItem('ting_sb_url') || appConfig.supabaseUrl;
            let key = localStorage.getItem('ting_sb_key') || appConfig.supabaseKey;

            if (url && key) {
                // Force fill inputs if they are empty
                const ids = ['d-sb-url', 'd-sb-key', 'm-sb-url', 'm-sb-key'];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        // If empty, fill with current active credentials
                        if (!el.value) {
                            const k = id.includes('url') ? url : key;
                            el.value = k;
                        }
                    }
                });

                // Auto-save to local storage if using hardcoded config for first time
                if (!localStorage.getItem('ting_sb_url')) {
                    localStorage.setItem('ting_sb_url', url);
                    localStorage.setItem('ting_sb_key', key);
                }

                try {
                    window.sbClient = window.supabase.createClient(url, key);
                    console.log('⚡ Supabase Client Initialized');
                    const status = document.getElementById('d-sb-status');
                    if (status) {
                        status.className = 'status-badge connected';
                        status.textContent = '✅ เชื่อมต่อแล้ว';
                    }
                    // Fix: Provide feedback on mobile/load as well
                    const mStatus = document.getElementById('m-sb-status');
                    if (mStatus) {
                        mStatus.className = 'status-badge connected';
                        mStatus.textContent = '✅ เชื่อมต่อแล้ว';
                    }
                    console.log('✅ Supabase Connected Successfully');
                } catch (e) {
                    console.error('Supabase Init Error:', e);
                }
            }
        },

        async uploadImage(base64Image) {
            if (!window.sbClient) return null;
            try {
                const res = await fetch(base64Image);
                const blob = await res.blob();
                const fileName = `slip-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const { data, error } = await window.sbClient.storage.from('slips').upload(fileName, blob);
                if (error) throw error;
                const { data: { publicUrl } } = window.sbClient.storage.from('slips').getPublicUrl(fileName);
                return publicUrl;
            } catch (e) {
                console.error('Supabase Upload Error:', e);
                return null;
            }
        },

        async saveTransaction(transaction, imageUrl) {
            // Check connection first
            if (!window.sbClient) {
                await this.init(); // Try to init if missing
            }
            if (!window.sbClient) {
                alert("❌ Supabase ยังไม่เชื่อมต่อ! กรุณาไปที่หน้าตั้งค่าและกดเชื่อมต่อ Supabase ก่อนครับ");
                return null;
            }

            const payload = {
                // id: transaction.id, // Let Supabase gen UUID
                date: transaction.date,
                type: transaction.type,
                amount: transaction.amount,
                sender_name: transaction.senderName,
                receiver_name: transaction.receiverName,
                bank: transaction.bank,
                shop: transaction.shop,
                note: transaction.note,
                items: transaction.items,
                shipping: transaction.shipping,
                cost: transaction.cost,
                profit: transaction.profit,
                image_url: imageUrl,
                created_at: transaction.createdAt
            };

            const { data, error } = await window.sbClient.from('transactions').insert([payload]).select();
            if (error) {
                console.error('Supabase Error:', error);

                // Alert with detailed error message
                let errorMsg = error.message || JSON.stringify(error, null, 2);
                alert('⚠️ บันทึกไม่สำเร็จ (Supabase Error):\n' + errorMsg);
                return null;
            } else {
                console.log('✅ Saved to Supabase');
                return data && data.length > 0 ? data[0].id : null;
            }
        },

        async deleteTransaction(supabaseId) {
            if (!window.sbClient) await this.init();
            if (!window.sbClient || !supabaseId) return;

            const { error } = await window.sbClient.from('transactions').delete().eq('id', supabaseId);
            if (error) {
                console.error('Supabase Delete Error:', error);
                alert('⚠️ ลบข้อมูลใน Supabase ไม่สำเร็จ: ' + error.message);
            } else {
                console.log('✅ Deleted from Supabase');
            }
        },

        async clearAllTransactions() {
            if (!window.sbClient) await this.init();
            if (!window.sbClient) return;

            // Delete all logic (requires proper RLS or specific logic)
            const { error } = await window.sbClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
            if (error) {
                console.error('Supabase Clear Error:', error);
                alert('⚠️ ล้างข้อมูล Supabase ไม่สำเร็จ: ' + error.message);
            } else {
                console.log('✅ All Data Cleared from Supabase');
            }
        },

        async fetchTransactions() {
            if (!this.client) await this.init();
            if (!this.client) return;

            console.log('🔄 Fetching from Supabase... (Attempt)');

            // Try Subscribe to Realtime (Auto Update)
            try {
                this.subscribeToChanges();
            } catch (e) {
                console.warn('Realtime Error:', e);
            }

            console.log('🔄 Fetching from Supabase...');
            // ALERT DEBUG
            // alert('กำลังเริ่มดึงข้อมูล... (Debug)');

            const { data, error } = await this.client
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase Fetch Error:', error);
                alert('เกิดข้อผิดพลาด (Error): ' + JSON.stringify(error)); // Show Error Popup
                showToast('ดึงข้อมูลจาก Cloud ไม่สำเร็จ', 'error');
                return;
            }

            // Alert Result Count
            // alert('ดึงข้อมูลสำเร็จ! ได้มาทั้งหมด: ' + (data ? data.length : 0) + ' รายการ');

            if (data && data.length > 0) {
                const mapped = data.map(dbT => ({
                    id: dbT.id || genId(),
                    date: dbT.date,
                    type: dbT.type,
                    amount: dbT.amount,
                    senderName: dbT.sender_name,
                    receiverName: dbT.receiver_name,
                    bank: dbT.bank,
                    shop: dbT.shop,
                    note: dbT.note,
                    items: dbT.items,
                    shipping: dbT.shipping,
                    cost: dbT.cost,
                    profit: dbT.profit,
                    image_url: dbT.image_url,
                    supabase_id: dbT.id,
                    createdAt: dbT.created_at
                }));

                store.transactions = mapped;
                store.save();
                updateDashboard();
                // showToast(`☁️ อัพเดทข้อมูลอัตโนมัติ (${data.length} รายการ)`);
            } else {
                console.log('☁️ Database is empty.');
            }
        },

        // Realtime Listener
        subscribeToChanges() {
            if (!this.client || this.subscription) return;

            console.log('🔌 Connecting to Realtime...');
            this.subscription = this.client
                .channel('public:transactions')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                    console.log('🔔 Realtime Update:', payload);
                    this.fetchTransactions();
                    showToast('🔔 มีข้อมูลใหม่มา! กำลังอัพเดท...', 'success');
                })
                .subscribe();
        }
    };

    // UI Connect Function
    // UI Connect Function
    window.initSupabase = async function () {
        let url = document.getElementById('d-sb-url').value.trim() || document.getElementById('m-sb-url').value.trim();
        let key = document.getElementById('d-sb-key').value.trim() || document.getElementById('m-sb-key').value.trim();

        // Fallback: Use hardcoded config if inputs are empty
        if (!url && typeof appConfig !== 'undefined') url = appConfig.supabaseUrl;
        if (!key && typeof appConfig !== 'undefined') key = appConfig.supabaseKey;

        if (!url || !key) {
            showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
            return;
        }

        localStorage.setItem('ting_sb_url', url);
        localStorage.setItem('ting_sb_key', key);

        await SupabaseService.init();
        showToast('บันทึกการตั้งค่าแล้ว (โปรดรีเฟรชถ้ายังไม่เชื่อมต่อ)', 'success');
    }; // <--- Added vital semicolon

    // Auto Init & Fetch
    ; (async () => { // <--- Added safety semicolon
        // Wait for window load slightly to ensure Supabase lib is ready
        if (document.readyState === 'complete') {
            await SupabaseService.init();
            await SupabaseService.fetchTransactions();
        } else {
            window.addEventListener('load', async () => {
                await SupabaseService.init();
                await SupabaseService.fetchTransactions();
            });
        }
    })();

});

// --- 🔐 Lock Screen Logic ---

let currentPin = '';
let isSettingPin = false;
let tempPin = '';

// Check Lock on Startup
// Check Lock on Startup
document.addEventListener('DOMContentLoaded', () => {
    // Always lock screen on startup
    showLockScreen();
    // Hide PIN settings since it's hardcoded
    /*
    const savedPin = localStorage.getItem('ting_lock_pin');
    if (savedPin) {
        showLockScreen();
    }
    updatePinButtonUI();
    */
    // Update UI to show locked status
    const dBtn = document.getElementById('d-pin-btn');
    if (dBtn) { dBtn.disabled = true; dBtn.textContent = '🔒 ล็อคถาวร (0990)'; }
});

function showLockScreen() {
    const lock = document.getElementById('lock-screen');
    if (lock) {
        lock.classList.remove('hidden');
        // Force reflow
        void lock.offsetWidth;
        lock.classList.add('active');
        currentPin = '';
        updatePinDots();

        // Disable scrolling on body
        document.body.style.overflow = 'hidden';
    }
}

function hideLockScreen() {
    const lock = document.getElementById('lock-screen');
    if (lock) {
        lock.classList.remove('active');
        setTimeout(() => {
            lock.classList.add('hidden');
            document.body.style.overflow = '';
        }, 400);
    }
}

function enterPin(num) {
    if (currentPin.length < 4) {
        currentPin += num;
        updatePinDots();

        if (currentPin.length === 4) {
            setTimeout(processPin, 100);
        }
    }
}

function deletePin() {
    if (currentPin.length > 0) {
        currentPin = currentPin.slice(0, -1);
        updatePinDots();
    }
}

function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
        if (idx < currentPin.length) dot.classList.add('filled');
        else dot.classList.remove('filled');
    });
}

function processPin() {
    // Check against Hardcoded PIN
    const systemPin = appConfig.defaultPin || '0990';

    if (currentPin === systemPin) {
        hideLockScreen();
        // showToast('ยินดีต้อนรับกลับ! 💖', 'success'); 
    } else {
        // Wrong PIN
        showToast('รหัสผ่านไม่ถูกต้อง ❌', 'error');

        // Shake animation
        const dots = document.querySelector('.pin-display');
        dots.classList.add('shake');
        setTimeout(() => dots.classList.remove('shake'), 400);

        // Reset
        currentPin = '';
        setTimeout(updatePinDots, 200);
    }
}
/*
function processPin_Old() {
    const savedPin = localStorage.getItem('ting_lock_pin');

    if (isSettingPin) {
        if (!tempPin) {
            // First entry of new PIN
            tempPin = currentPin;
            document.querySelector('.lock-content p').textContent = 'ยืนยันรหัสผ่านอีกครั้ง';
            currentPin = '';
            updatePinDots();
        } else {
            // Confirm PIN
            if (currentPin === tempPin) {
                localStorage.setItem('ting_lock_pin', currentPin);
                isSettingPin = false;
                tempPin = '';
                hideLockScreen();
                updatePinButtonUI();
                showToast('ตั้งรหัสผ่านเรียบร้อย ✅');
            } else {
                showToast('รหัสผ่านไม่ตรงกัน กรุณาลองใหม่ ❌', 'error');
                tempPin = '';
                currentPin = '';
                isSettingPin = false; // Reset to start
                document.querySelector('.lock-content p').textContent = 'ตั้งรหัสผ่านใหม่ 4 หลัก';
                updatePinDots();
            }
        }
    } else {
        // Unlock
        if (currentPin === savedPin) {
            hideLockScreen();
    }
    }
}
*/

function togglePinSetup() {
    const savedPin = localStorage.getItem('ting_lock_pin');

    if (savedPin) {
        // Remove PIN
        if (confirm('คุณต้องการลกรหัสผ่านใช่ไหม?')) {
            localStorage.removeItem('ting_lock_pin');
            updatePinButtonUI();
            showToast('ยกเลิกรหัสผ่านแล้ว 🔓');
        }
    } else {
        // Set PIN
        isSettingPin = true;
        showLockScreen();
        document.querySelector('.lock-content p').textContent = 'ตั้งรหัสผ่านใหม่ 4 หลัก';
    }
}

function updatePinButtonUI() {
    const hasPin = !!localStorage.getItem('ting_lock_pin');
    const text = hasPin ? 'ยกเลิกรหัส' : 'ตั้งรหัส';
    const dBtn = document.getElementById('d-pin-btn');
    const mBtn = document.getElementById('m-pin-btn');

    if (dBtn) {
        dBtn.textContent = text;
        dBtn.style.background = hasPin ? '#fee2e2' : '#dbeafe';
        dBtn.style.color = hasPin ? '#ef4444' : '#2563eb';
    }
    if (mBtn) {
        mBtn.textContent = text;
        mBtn.style.background = hasPin ? '#fee2e2' : '#dbeafe';
        mBtn.style.color = hasPin ? '#ef4444' : '#2563eb';
    }
}

function forgotPin() {
    if (confirm('ลืมรหัสผ่าน? \n\nการรีเซ็ตรหัสผ่านจำเป็นต้องยืนยันตัวตน (ในที่นี้เราจะสมมติว่ายืนยันแล้ว หรือเตือนให้ระวัง) \n\nคลิก OK เพื่อลกรหัสผ่าน (ในระบบจริงควรมี OTP)')) {
        localStorage.removeItem('ting_lock_pin');
        hideLockScreen();
        updatePinButtonUI();
        showToast('รีเซ็ตรหัสผ่านแล้ว ⚠️');
    }
}

/* ================= EXPORT CSV SYSTEM ================= */
function exportToCSV() {
    if (!store.transactions || store.transactions.length === 0) {
        showToast('ไม่มีข้อมูลให้ส่งออก', 'error');
        return;
    }

    if (!confirm('ต้องการดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ Excel (CSV) หรือไม่?')) return;

    // 1. สร้างหัวตาราง (Headers) - เน้นละเอียด
    const headers = [
        "วันที่ (Date)",
        "เวลาที่บันทึก (Timestamp)",
        "ประเภท (Type)",
        "จำนวนเงิน (Amount)",
        "ร้านค้า (Shop)",
        "สินค้า (Items)",
        "หมายเหตุ (Note)",
        "ชื่อผู้โอน (Sender)",
        "ชื่อผู้รับ (Receiver)",
        "ธนาคาร (Bank)",
        "ค่าส่ง (Shipping)",
        "ต้นทุน (Cost)",
        "กำไร (Profit)",
        "Link รูปสลิป (Image URL)",
        "รหัสอ้างอิง (ID)",
        "Supabase ID"
    ];

    // 2. แปลงข้อมูล
    const rows = store.transactions.map(t => {
        // จัดการวันที่ (ถ้ามี)
        let dateStr = t.date || '-';

        // จัดการ Image URL
        let imgLink = '-';
        if (t.image_url) {
            // ถ้าเป็นลิงก์เต็มอยู่แล้วให้ใช้เลย
            if (t.image_url.startsWith('http')) {
                imgLink = t.image_url;
            } else {
                // กรณีเก็บเป็น Path (สำรอง)
                imgLink = `https://gvxgqkqvtlgkehceyidi.supabase.co/storage/v1/object/public/slips/${t.image_url}`;
            }
        }

        // จัดการ Timestamp (กรณีไม่มีข้อมูลเวลาจริง ให้ใช้วันที่แทน หรือปล่อยว่าง)
        // เพื่อความแม่นยำ ถ้าเราไม่ได้เก็บ time ไว้ใน object transaction เราก็ไม่ควรเมคขึ้นมามั่วๆ
        // แต่ User อยากได้ละเอียด ใส่เป็น - ไว้บอกว่าไม่มีเวลาดีกว่า
        let timeStr = '-';

        return [
            dateStr,
            timeStr,
            t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            t.amount,
            t.shop || '-',
            t.items || '-',
            t.note || '-',
            t.senderName || '-',
            t.receiverName || '-',
            t.bank || '-',
            t.shipping || 0,
            t.cost || 0,
            t.profit || 0,
            imgLink,
            t.id,
            t.supabase_id || '-'
        ];
    });

    // 2.5 คำนวณยอดรวม (Summary Calculation)
    const totalIncome = store.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalExpense = store.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalProfit = store.transactions.reduce((sum, t) => sum + (parseFloat(t.profit) || 0), 0);

    // เพิ่มแถวว่างคั่น
    rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);

    // เพิ่มแถวสรุป
    rows.push([
        "สรุปยอดรวม (TOTAL)",
        "",
        `รายรับ: ${totalIncome.toFixed(2)}`,
        `รายจ่าย: ${totalExpense.toFixed(2)}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "กำไรสุทธิรวม:",
        `${totalProfit.toFixed(2)}`, // ช่อง Profit (Column 13)
        "",
        "",
        ""
    ]);

    // 3. รวมเป็น CSV String
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // Escape double quotes (") เป็น ("") และครอบด้วย "..."
            const cellStr = String(cell).replace(/"/g, '""');
            return `"${cellStr}"`;
        }).join(','))
    ].join('\n');

    // 4. สร้างไฟล์ดาวน์โหลด (เพิ่ม \uFEFF เพื่อให้ Excel อ่านภาษาไทยออก)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `TING_DATA_${today}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('ดาวน์โหลด CSV เรียบร้อย! 📂');
}
