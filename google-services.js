// TING - Google Services Integration
// OCR & Google Sheets API

const GOOGLE_API_KEY = 'AIzaSyCJwK-IxopDH2EkQpsRQg8tKbM8xPpYfVA';

// ============ OCR Service (Google Cloud Vision) ============
const OCRService = {
    async analyzeSlip(imageBase64) {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const requestBody = {
            requests: [{
                image: { content: base64Data },
                features: [
                    { type: 'TEXT_DETECTION', maxResults: 50 },
                    { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ]
            }]
        };

        try {
            const response = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OCR failed');
            }

            const data = await response.json();
            return this.parseSlipData(data);
        } catch (error) {
            console.error('OCR Error:', error);
            throw error;
        }
    },

    parseSlipData(ocrResult) {
        const result = {
            amount: null,
            date: null,
            time: null,
            senderName: null,
            receiverName: null,
            bank: null,
            refNumber: null,
            rawText: ''
        };

        if (!ocrResult.responses || !ocrResult.responses[0]) {
            return result;
        }

        const fullText = ocrResult.responses[0].fullTextAnnotation?.text || '';
        result.rawText = fullText;

        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);

        // Extract amount (look for Thai Baht patterns)
        const amountPatterns = [
            /฿?\s*([\d,]+\.?\d*)\s*(?:บาท|THB|Baht)/i,
            /จำนวน[เงิน]?\s*[:：]?\s*([\d,]+\.?\d*)/i,
            /Amount\s*[:：]?\s*([\d,]+\.?\d*)/i,
            /([\d,]+\.?\d{2})\s*(?:บาท|THB)/i,
            /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/m
        ];

        for (const pattern of amountPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 10000000) { // Reasonable amount check
                    result.amount = amount;
                    break;
                }
            }
        }

        // Extract date
        const datePatterns = [
            /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/,
            /(\d{1,2})\s+(?:ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?)\s+(\d{2,4})/i,
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/i
        ];

        for (const pattern of datePatterns) {
            const match = fullText.match(pattern);
            if (match) {
                let day = parseInt(match[1]);
                let month = match[2];
                let year = parseInt(match[3]);

                // Convert Thai month abbreviations
                const thaiMonths = {
                    'ม.ค': 1, 'มค': 1, 'ก.พ': 2, 'กพ': 2, 'มี.ค': 3, 'มีค': 3,
                    'เม.ย': 4, 'เมย': 4, 'พ.ค': 5, 'พค': 5, 'มิ.ย': 6, 'มิย': 6,
                    'ก.ค': 7, 'กค': 7, 'ส.ค': 8, 'สค': 8, 'ก.ย': 9, 'กย': 9,
                    'ต.ค': 10, 'ตค': 10, 'พ.ย': 11, 'พย': 11, 'ธ.ค': 12, 'ธค': 12
                };

                const engMonths = {
                    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                };

                if (typeof month === 'string') {
                    const monthLower = month.toLowerCase().replace(/\./g, '');
                    month = thaiMonths[monthLower] || engMonths[monthLower] || parseInt(month);
                }

                // Handle Thai Buddhist year
                if (year > 2500) year -= 543;
                if (year < 100) year += 2000;

                if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    result.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    break;
                }
            }
        }

        // Extract bank names
        const bankPatterns = {
            'กสิกรไทย': /กสิกร|KBank|KBANK/i,
            'ไทยพาณิชย์': /ไทยพาณิชย์|SCB|Siam Commercial/i,
            'กรุงไทย': /กรุงไทย|KTB|Krungthai/i,
            'กรุงเทพ': /กรุงเทพ|BBL|Bangkok Bank/i,
            'ทหารไทยธนชาต': /ทหารไทย|TTB|TMB|ธนชาต/i,
            'กรุงศรี': /กรุงศรี|BAY|Krungsri/i,
            'ออมสิน': /ออมสิน|GSB/i,
            'พร้อมเพย์': /พร้อมเพย์|PromptPay/i,
            'TrueMoney': /TrueMoney|True Money|ทรูมันนี่/i
        };

        for (const [bankName, pattern] of Object.entries(bankPatterns)) {
            if (pattern.test(fullText)) {
                result.bank = bankName;
                break;
            }
        }

        // Extract names (look for patterns like "จาก:", "ถึง:", "From:", "To:")
        const fromPatterns = [
            /(?:จาก|From|ผู้โอน)\s*[:：]?\s*([ก-๙a-zA-Z\s\.]+)/i,
            /(?:ชื่อบัญชี|Account Name)\s*[:：]?\s*([ก-๙a-zA-Z\s\.]+)/i
        ];

        const toPatterns = [
            /(?:ถึง|To|ผู้รับ)\s*[:：]?\s*([ก-๙a-zA-Z\s\.]+)/i,
            /(?:โอนเงินให้|Transfer to)\s*[:：]?\s*([ก-๙a-zA-Z\s\.]+)/i
        ];

        for (const pattern of fromPatterns) {
            const match = fullText.match(pattern);
            if (match && match[1].length > 2 && match[1].length < 50) {
                result.senderName = match[1].trim();
                break;
            }
        }

        for (const pattern of toPatterns) {
            const match = fullText.match(pattern);
            if (match && match[1].length > 2 && match[1].length < 50) {
                result.receiverName = match[1].trim();
                break;
            }
        }

        // Extract reference number
        const refPatterns = [
            /(?:เลขที่อ้างอิง|Ref\.?\s*(?:No\.?)?|Reference)\s*[:：]?\s*([A-Za-z0-9]+)/i,
            /([A-Z]{2,3}\d{10,20})/
        ];

        for (const pattern of refPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                result.refNumber = match[1];
                break;
            }
        }

        return result;
    }
};

// ============ Google Sheets Service ============
const SheetsService = {
    spreadsheetId: null,

    setSpreadsheetId(id) {
        this.spreadsheetId = id;
        localStorage.setItem('ting_spreadsheet_id', id);
    },

    getSpreadsheetId() {
        if (!this.spreadsheetId) {
            this.spreadsheetId = localStorage.getItem('ting_spreadsheet_id');
        }
        return this.spreadsheetId;
    },

    async appendTransaction(transaction) {
        const spreadsheetId = this.getSpreadsheetId();
        if (!spreadsheetId) {
            throw new Error('กรุณาตั้งค่า Spreadsheet ID ก่อน');
        }

        const values = [[
            transaction.date,
            transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย',
            transaction.amount,
            transaction.source === 'ig' ? 'Instagram' : 'LINE',
            transaction.senderName || '',
            transaction.receiverName || '',
            transaction.bank || '',
            transaction.category || '',
            transaction.note || '',
            new Date().toISOString()
        ]];

        const range = 'Sheet1!A:J';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to append to sheet');
            }

            return await response.json();
        } catch (error) {
            console.error('Sheets Error:', error);
            throw error;
        }
    },

    async testConnection() {
        const spreadsheetId = this.getSpreadsheetId();
        if (!spreadsheetId) {
            return { success: false, message: 'ไม่ได้ตั้งค่า Spreadsheet ID' };
        }

        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                return { success: true, message: `เชื่อมต่อ "${data.properties.title}" สำเร็จ!` };
            } else {
                const error = await response.json();
                return { success: false, message: error.error?.message || 'ไม่สามารถเชื่อมต่อได้' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    async createHeaders() {
        const spreadsheetId = this.getSpreadsheetId();
        if (!spreadsheetId) return;

        const headers = [[
            'วันที่', 'ประเภท', 'จำนวนเงิน', 'แหล่งที่มา',
            'ผู้โอน', 'ผู้รับ', 'ธนาคาร', 'หมวดหมู่', 'หมายเหตุ', 'บันทึกเมื่อ'
        ]];

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:J1?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;

        try {
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: headers })
            });
        } catch (error) {
            console.error('Error creating headers:', error);
        }
    }
};

// Export services
export { OCRService, SheetsService, GOOGLE_API_KEY };
