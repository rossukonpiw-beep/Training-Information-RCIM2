import { TrainingRecord } from '../types';

export interface ReportDataResult {
  headers: string[];
  rows: any[][];
  totalsRow: any[];
}

export function getReportData(records: TrainingRecord[]): ReportDataResult {
  const headers = [
    'ลำดับ',
    'รหัสบุคลากร',
    'ชื่อ-นามสกุล',
    'อีเมล',
    'พื้นที่สังกัด',
    'ประเภทบุคลากร',
    'สถานะสังกัด',
    'หลักสูตร/หน่วยงานสังกัด',
    'ชื่อหลักสูตร/โครงการฝึกอบรม',
    'หมวดหมู่การพัฒนา',
    'หน่วยงานผู้จัด',
    'วันที่เริ่มต้น',
    'วันที่สิ้นสุด',
    'จำนวนชั่วโมง',
    'สถานที่/รูปแบบ',
    'ค่าใช้จ่าย (บาท)',
    'ความรู้ก่อนอบรม (1-5)',
    'ความรู้หลังอบรม (1-5)',
    'ส่วนต่างพัฒนาการ (+)',
    'การนำความรู้ไปประยุกต์ใช้',
    'มีแนบใบประกาศ',
    'วันที่บันทึก'
  ];

  const rows = records.map((r, index) => {
    const formattedDate = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('th-TH') : '-';
    return [
      index + 1,
      r.staffId || '-',
      r.staffName || '-',
      r.staffEmail || '-',
      r.campus || '-',
      r.staffType === 'academic' ? 'สายวิชาการ' : 'สายสนับสนุน',
      r.isCollegeFaculty || '-',
      r.staffType === 'academic' 
        ? (r.academicPrograms?.join(', ') || '-')
        : (r.supportDeptGroup ? `${r.supportDeptGroup} (${r.supportDeptUnit || '-'})` : '-'),
      r.courseTitle || '-',
      r.categories?.join(', ') || '-',
      r.organizer || '-',
      r.startDate || '-',
      r.endDate || r.startDate || '-',
      Number(r.hours) || 0,
      `${r.location || '-'} (${r.locationType || '-'})`,
      Number(r.expense) || 0,
      Number(r.knowledgeBefore) || 0,
      Number(r.knowledgeAfter) || 0,
      (Number(r.knowledgeAfter) || 0) - (Number(r.knowledgeBefore) || 0),
      r.workApplication || '-',
      r.certificateFileName ? 'มีเอกสาร' : 'ไม่มี',
      formattedDate
    ];
  });

  // Calculate totals
  const totalHours = records.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const totalExpense = records.reduce((sum, r) => sum + (Number(r.expense) || 0), 0);

  // Construct totals row matching headers structure
  const totalsRow = headers.map((h, i) => {
    if (i === 0) return 'ยอดรวม';
    if (h === 'จำนวนชั่วโมง') return totalHours;
    if (h === 'ค่าใช้จ่าย (บาท)') return totalExpense;
    return '';
  });

  return { headers, rows, totalsRow };
}
