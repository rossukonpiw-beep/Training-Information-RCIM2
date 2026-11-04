import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { TrainingRecord } from '../types';
import { getReportData } from './reportDataHelper';

export function exportToExcel(records: TrainingRecord[], filenamePrefix: string = 'รายงานสรุปข้อมูลการฝึกอบรม_RCIM') {
  const { headers, rows, totalsRow } = getReportData(records);
  
  // Create an array of arrays representing the worksheet rows
  const sheetData = [headers, ...rows, totalsRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Set column widths
  const colWidths = [
    { wch: 8 },  // ลำดับ
    { wch: 15 }, // รหัส
    { wch: 25 }, // ชื่อ
    { wch: 25 }, // อีเมล
    { wch: 20 }, // พื้นที่
    { wch: 15 }, // ประเภท
    { wch: 30 }, // สังกัด
    { wch: 35 }, // หลักสูตรสังกัด
    { wch: 45 }, // ชื่อหลักสูตร
    { wch: 35 }, // หมวดหมู่
    { wch: 30 }, // ผู้จัด
    { wch: 15 }, // วันเริ่ม
    { wch: 15 }, // วันสิ้นสุด
    { wch: 12 }, // ชั่วโมง
    { wch: 30 }, // สถานที่
    { wch: 15 }, // ค่าใช้จ่าย
    { wch: 18 }, // ก่อน
    { wch: 18 }, // หลัง
    { wch: 18 }, // พัฒนาการ
    { wch: 50 }, // ประยุกต์ใช้
    { wch: 15 }, // วุฒิบัตร
    { wch: 15 }  // วันที่บันทึก
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานการอบรม');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  
  const todayStr = new Date().toISOString().split('T')[0];
  saveAs(data, `${filenamePrefix}_${todayStr}.xlsx`);
}
