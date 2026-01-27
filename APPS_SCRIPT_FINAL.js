// โค้ดนี้รองรับทั้ง GET และ POST (แก้ปัญหา Browser Block)
function handleRequest(e, method) {
    try {
        var data;
        // รับข้อมูล
        if (method == "post") {
            var jsonString = e.postData.contents;
            data = JSON.parse(jsonString);
        } else {
            // แบบ GET (รับจาก URL)
            if (!e.parameter.data) return ContentService.createTextOutput("Connection Success!");
            data = JSON.parse(e.parameter.data);
        }

        // ระบุไฟล์ Google Sheet โดยตรง
        var sheetId = "1ukjvu-SGAPhtqk0IydRAa6BIs14Fumq3kpUiHXt2uYY";
        var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];

        var lastRow = sheet.getLastRow();

        // ============ ส่วนสร้างโครงสร้าง ============
        if (lastRow < 2) {
            sheet.clear();
            // Row 1: Dashboard
            sheet.getRange("A1:B1").merge().setValue("🏆 สรุปภาพรวม");
            sheet.getRange("D1").setValue("💰 ยอดขาย:");
            sheet.getRange("F1").setValue("💎 กำไร:");
            sheet.getRange("H1").setValue("📦 ออเดอร์:");

            var row1 = sheet.getRange("A1:I1");
            row1.setBackground("#fdf2f8").setFontWeight("bold").setVerticalAlignment("middle")
                .setBorder(false, false, true, false, false, false, '#db2777', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
            sheet.getRange("A1").setFontSize(12).setFontColor("#db2777").setHorizontalAlignment("center");
            sheet.getRangeList(["D1", "F1", "H1"]).setHorizontalAlignment("right").setFontColor("#666666");

            sheet.getRange("E1").setFormula("=SUMIF(B3:B, \"รายรับ\", C3:C)");
            sheet.getRange("G1").setFormula("=SUM(L3:L)");
            sheet.getRange("I1").setFormula("=COUNT(A3:A)");

            var numList = sheet.getRangeList(["E1", "G1"]);
            numList.setNumberFormat("฿#,##0.00").setFontSize(11).setFontWeight("bold");
            sheet.getRange("E1").setFontColor("#059669");
            sheet.getRange("G1").setFontColor("#db2777");
            sheet.getRange("I1").setNumberFormat("0 รายการ").setFontColor("#2563eb");

            // Row 2: Headers
            var headers = ["วันที่", "ประเภท", "จำนวนเงิน", "ชื่อผู้โอน", "ชื่อผู้รับ", "ธนาคาร", "ร้านค้า/ช่องทาง", "หมายเหตุ", "สินค้า", "ค่าส่ง", "ต้นทุน", "กำไร", "รูปสลิป", "บันทึกเมื่อ"];
            var headerRange = sheet.getRange(2, 1, 1, headers.length);
            headerRange.setValues([headers]);
            headerRange.setFontWeight("bold").setBackground("#db2777").setFontColor("#ffffff")
                .setHorizontalAlignment("center").setVerticalAlignment("middle");
            sheet.setFrozenRows(2);
        }

        // ============ ส่วนบันทึกข้อมูล ============
        var rowData = [
            "'" + data.date,
            data.type,
            data.amount,
            data.sender_name || data.senderName,
            data.receiver_name || data.receiverName,
            data.bank,
            data.shop,
            data.note,
            data.items,
            data.shipping,
            data.cost,
            data.profit,
            data.image_url || "",
            new Date().toLocaleString('th-TH')
        ];

        sheet.appendRow(rowData);

        // จัด Format
        var newRow = sheet.getLastRow();
        var range = sheet.getRange(newRow, 1, 1, rowData.length);
        range.setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
        range.setVerticalAlignment("middle");
        sheet.getRange(newRow, 3).setNumberFormat("#,##0.00");
        sheet.getRange(newRow, 10).setNumberFormat("#,##0.00");
        sheet.getRange(newRow, 11).setNumberFormat("#,##0.00");
        sheet.getRange(newRow, 12).setNumberFormat("#,##0.00");
        if (data.profit > 0) sheet.getRange(newRow, 12).setBackground("#f0fdf4").setFontColor("#15803d").setFontWeight("bold");
        sheet.getRange(newRow, 1).setHorizontalAlignment("center");
        sheet.getRange(newRow, 2).setHorizontalAlignment("center");

        return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) { return handleRequest(e, "post"); }
function doGet(e) { return handleRequest(e, "get"); }
