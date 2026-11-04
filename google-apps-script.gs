// คัดลอกโค้ดนี้ทั้งหมดไปใส่ในส่วนขยาย Apps Script ของ Google Sheet ของท่าน
// Spreadsheet ID: 1K6Hmp5JwNpgxDJwO-azcq-N_QoCz1PX4A-zNKltH7G8
// ชื่อแท็บ (Sheet Name): Training_Records

function doPost(e) {
  try {
    // แยกวิเคราะห์ข้อมูลผู้ส่ง
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action || "upsert"; // default เป็น upsert เพื่อความยืดหยุ่น
    
    // กำหนดรหัสและเปิด Google Sheet ของระบบ
    var SPREADSHEET_ID = "1K6Hmp5JwNpgxDJwO-azcq-N_QoCz1PX4A-zNKltH7G8";
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // ค้นหาหรือสร้างแท็บ Training_Records
    var sheet = ss.getSheetByName("Training_Records");
    if (!sheet) {
      sheet = ss.insertSheet("Training_Records");
    }
    
    // กำหนดหัวคอลัมน์มาตรฐานตามความต้องการของผู้ใช้งาน
    var headers = [
      "รหัสรายการ (Record ID)",
      "ลำดับ",
      "ชื่อผู้เข้าอบรม",
      "สายงาน",
      "ตำแหน่ง",
      "หน่วยงาน",
      "ชื่อหลักสูตร/โครงการ",
      "หมวดหมู่",
      "ผู้จัด",
      "วันที่อบรม",
      "จำนวนชั่วโมง",
      "ค่าใช้จ่าย",
      "คะแนนความรู้ก่อนอบรม",
      "คะแนนความรู้หลังอบรม",
      "วันที่บันทึก/อัปเดตล่าสุด"
    ];
    
    // ถ้าหน้าชีตว่างเปล่า ให้สร้างหัวข้อแรกสุด
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    } else {
      var firstRowValues = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      if (firstRowValues[0] !== "รหัสรายการ (Record ID)") {
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f1f5f9");
      }
    }
    
    var timestamp = new Date().toLocaleString("th-TH");
    
    // ดึงค่าไอดีเดิมทั้งหมดสำหรับการค้นหาแถวเพื่ออัปเดต/ลบ
    var lastRow = sheet.getLastRow();
    var existingIds = [];
    if (lastRow > 1) {
      existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(row) {
        return row[0].toString();
      });
    }
    
    // ประมวลผลตาม Action ของเบื้องหลัง
    if (action === "upsert") {
      var record = requestData.record;
      if (!record || !record.id) {
        throw new Error("ไม่พบข้อมูล Record หรือ ID สำหรับการ Sync");
      }
      
      var rowData = [
        record.id,
        record.no || 1,
        record.staffName || "",
        record.staffType || "",
        record.position || "",
        record.department || "",
        record.courseTitle || "",
        record.category || "",
        record.organizer || "",
        record.trainingDate || "",
        record.hours || 0,
        record.expense || 0,
        record.knowledgeBefore || 0,
        record.knowledgeAfter || 0,
        timestamp
      ];
      
      var existingIndex = existingIds.indexOf(record.id.toString());
      if (existingIndex !== -1) {
        var targetRow = existingIndex + 2; // แถวจริงในชีต (+2 เพราะเริ่มจากดัชนี 0 และมีหัวแถว 1 แถว)
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        return createResponse("success", "อัปเดตรายการ " + record.id + " เรียบร้อยแล้ว", { row: targetRow });
      } else {
        sheet.appendRow(rowData);
        return createResponse("success", "เพิ่มรายการใหม่ " + record.id + " เรียบร้อยแล้ว", { row: sheet.getLastRow() });
      }
      
    } else if (action === "delete") {
      var idToDelete = requestData.id;
      if (!idToDelete) {
        throw new Error("ไม่พบไอดีที่ต้องการลบ");
      }
      
      var deleteIndex = existingIds.indexOf(idToDelete.toString());
      if (deleteIndex !== -1) {
        var rowToDelete = deleteIndex + 2;
        sheet.deleteRow(rowToDelete);
        return createResponse("success", "ลบรายการ " + idToDelete + " เรียบร้อยแล้ว", { deletedRow: rowToDelete });
      }
      return createResponse("success", "ไม่พบรายการ " + idToDelete + " บน Google Sheet (อาจถูกลบไปก่อนแล้ว)");
      
    } else if (action === "reset") {
      var records = requestData.records || [];
      
      // ล้างข้อมูลแถวทั้งหมด ยกเว้นหัวข้อ
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      
      // เพิ่มแถวเริ่มต้นทีละรายการ
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var seedData = [
          rec.id,
          rec.no || (i + 1),
          rec.staffName || "",
          rec.staffType || "",
          rec.position || "",
          rec.department || "",
          rec.courseTitle || "",
          rec.category || "",
          rec.organizer || "",
          rec.trainingDate || "",
          rec.hours || 0,
          rec.expense || 0,
          rec.knowledgeBefore || 0,
          rec.knowledgeAfter || 0,
          timestamp
        ];
        sheet.appendRow(seedData);
      }
      
      return createResponse("success", "รีเซ็ตข้อมูลเริ่มต้น " + records.length + " รายการสำเร็จ");
    } else {
      throw new Error("ไม่สนับสนุนคำสั่ง Action: " + action);
    }
    
  } catch (error) {
    return createResponse("error", "เกิดข้อผิดพลาดในการรัน Apps Script: " + error.toString());
  }
}

function createResponse(status, message, details) {
  var out = { status: status, message: message };
  if (details) {
    for (var key in details) {
      if (details.hasOwnProperty(key)) {
        out[key] = details[key];
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
