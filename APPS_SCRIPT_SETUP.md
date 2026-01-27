# วิธีติดตั้งระบบบันทึกลง Google Sheets (Apps Script) - เวอร์ชัน Ultimate Dashboard (FIXED V2) 🏆

## แก้ไขล่าสุด: แก้บั๊กตารางมาไม่ครบ (Fixed `getRangeList` bug)

## ขั้นตอนการอัปเดต
1. ไปที่ Apps Script
2. ลบโค้ดเก่าทิ้งทั้งหมด
3. วางโค้ดใหม่ด้านล่างนี้
4. กด **Deploy** > **Manage deployments**
5. กดรูปดินสอด้านบน > ตรง Version เลือก **New version**
6. กด **Deploy**

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    // ============ ส่วนสร้างโครงสร้าง (ทำแค่ครั้งแรก หรือถ้าตารางยังไม่สมบูรณ์) ============
    // ถ้ายังไม่มีแถวที่ 2 (หัวตาราง) ให้สร้างใหม่หมด
    if (lastRow < 2) {
      sheet.clear(); // ล้างของเก่าที่ค้างอยู่
      
      // --- Row 1: Summary Dashboard ---
      // ผสานเซลล์
      sheet.getRange("A1:B1").merge().setValue("🏆 สรุปภาพรวม");
      sheet.getRange("D1").setValue("💰 ยอดขาย:");
      sheet.getRange("F1").setValue("💎 กำไร:");
      sheet.getRange("H1").setValue("📦 ออเดอร์:");
      
      // จัด Format Row 1
      var row1 = sheet.getRange("A1:I1");
      row1.setBackground("#fdf2f8")
          .setFontWeight("bold")
          .setVerticalAlignment("middle")
          .setBorder(false, false, true, false, false, false, '#db2777', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
          
      sheet.getRange("A1").setFontSize(12).setFontColor("#db2777").setHorizontalAlignment("center");
      
      // แก้ไขจุดที่บั๊ก: ใช้ getRangeList แทนการระบุเซลล์แยกด้วยลูกน้ำ
      sheet.getRangeList(["D1", "F1", "H1"]).setHorizontalAlignment("right").setFontColor("#666666");

      // ใส่สูตรคำนวณ
      sheet.getRange("E1").setFormula("=SUMIF(B3:B, \"รายรับ\", C3:C)"); 
      sheet.getRange("G1").setFormula("=SUM(L3:L)");
      sheet.getRange("I1").setFormula("=COUNT(A3:A)");
      
      // แต่งตัวเลขสรุป
      var numList = sheet.getRangeList(["E1", "G1"]);
      numList.setNumberFormat("฿#,##0.00").setFontSize(11).setFontWeight("bold");
      
      sheet.getRange("E1").setFontColor("#059669"); // ยอดขายสีเขียว
      sheet.getRange("G1").setFontColor("#db2777"); // กำไรสีชมพู
      sheet.getRange("I1").setNumberFormat("0 รายการ").setFontColor("#2563eb"); 

      // --- Row 2: Headers ---
      var headers = [
        "วันที่", "ประเภท", "จำนวนเงิน", "ชื่อผู้โอน", "ชื่อผู้รับ", 
        "ธนาคาร", "ร้านค้า/ช่องทาง", "หมายเหตุ", "สินค้า", 
        "ค่าส่ง", "ต้นทุน", "กำไร", "รูปสลิป", "บันทึกเมื่อ"
      ];
      
      var headerRange = sheet.getRange(2, 1, 1, headers.length);
      headerRange.setValues([headers]);
      
      headerRange.setFontWeight("bold")
                 .setBackground("#db2777")
                 .setFontColor("#ffffff")
                 .setHorizontalAlignment("center")
                 .setVerticalAlignment("middle");

      sheet.setFrozenRows(2);
    }
    
    // ============ ส่วนบันทึกข้อมูล ============
    var rowData = [
      "'" + data.date,          
      data.type,                
      data.amount,              
      data.sender_name || data.senderName, // รองรับทั้งสองแบบ
      data.receiver_name || data.receiverName,        
      data.bank,                
      data.shop,                
      data.note,                
      data.items,               
      data.shipping,            
      data.cost,                
      data.profit,              
      data.image_url || "",    // ลิงก์รูปจาก Supabase
      new Date().toLocaleString('th-TH') 
    ];
    
    sheet.appendRow(rowData);
    
    // ============ ตกแต่งแถวล่าสุด ============
    var newRow = sheet.getLastRow();
    var range = sheet.getRange(newRow, 1, 1, rowData.length);
    
    range.setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
    range.setVerticalAlignment("middle");
    
    sheet.getRange(newRow, 3).setNumberFormat("#,##0.00");  
    sheet.getRange(newRow, 10).setNumberFormat("#,##0.00");
    sheet.getRange(newRow, 11).setNumberFormat("#,##0.00");
    sheet.getRange(newRow, 12).setNumberFormat("#,##0.00");
    
    if (data.profit > 0) {
      sheet.getRange(newRow, 12).setBackground("#f0fdf4").setFontColor("#15803d").setFontWeight("bold");
    }
    
    sheet.getRange(newRow, 1).setHorizontalAlignment("center");
    sheet.getRange(newRow, 2).setHorizontalAlignment("center");
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Connection Success!");
}
```
