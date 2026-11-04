import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageOrientation
} from 'docx';
import { saveAs } from 'file-saver';
import { TrainingRecord } from '../types';

export async function exportIndividualDocx(record: TrainingRecord) {
  const isAcademic = record.staffType === 'academic';
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: 11906,
              height: 16838,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์ (RCIM)",
                    size: 18,
                    color: "666666",
                    font: "TH Sarabun PSK"
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "หน้าที่ ",
                    size: 18,
                    font: "TH Sarabun PSK"
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: "TH Sarabun PSK"
                  })
                ]
              })
            ]
          })
        },
        children: [
          // Header Logo / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "แบบรายงานผลการเข้าร่วมการฝึกอบรม / สัมมนา / พัฒนาตนเอง",
                bold: true,
                size: 32,
                color: "0F2C59",
                font: "TH Sarabun PSK"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "วิทยาลัยนวัตกรรมการจัดการ มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์",
                bold: true,
                size: 28,
                color: "333333",
                font: "TH Sarabun PSK"
              })
            ]
          }),

          // Staff Info Box / Table
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "1. ข้อมูลบุคลากรผู้เข้ารับการอบรม",
                bold: true,
                size: 24,
                color: "0F2C59",
                font: "TH Sarabun PSK"
              })
            ]
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell("ชื่อ-นามสกุล:", true, 25),
                  createCell(record.staffName, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("รหัสบุคลากร:", true, 25),
                  createCell(record.staffId || "-", false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("อีเมลประจำตัว:", true, 25),
                  createCell(record.staffEmail || "-", false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("พื้นที่สังกัด:", true, 25),
                  createCell(record.campus, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("ประเภทบุคลากร:", true, 25),
                  createCell(isAcademic ? "สายวิชาการ (อาจารย์ประจำ)" : "สายสนับสนุน", false, 75)
                ]
              }),
              ...(isAcademic ? [
                new TableRow({
                  children: [
                    createCell("หลักสูตรวิชาการที่สังกัด:", true, 25),
                    createCell(record.academicPrograms?.join(", ") || "-", false, 75)
                  ]
                }),
                new TableRow({
                  children: [
                    createCell("หลักสูตรที่รับผิดชอบ:", true, 25),
                    createCell(record.academicResponsiblePrograms?.join(", ") || "-", false, 75)
                  ]
                })
              ] : [
                new TableRow({
                  children: [
                    createCell("กลุ่มงานสายสนับสนุน:", true, 25),
                    createCell(record.supportDeptGroup || "-", false, 75)
                  ]
                }),
                new TableRow({
                  children: [
                    createCell("หน่วยงานย่อย:", true, 25),
                    createCell(record.supportDeptUnit || "-", false, 75)
                  ]
                })
              ])
            ]
          }),

          // Course Info Section
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: "2. รายละเอียดหลักสูตรและโครงการพัฒนาตนเอง",
                bold: true,
                size: 24,
                color: "0F2C59",
                font: "TH Sarabun PSK"
              })
            ]
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell("ชื่อหลักสูตร/โครงการ:", true, 25),
                  createCell(record.courseTitle, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("หมวดหมู่การพัฒนา:", true, 25),
                  createCell(record.categories?.join(", ") || "-", false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("หน่วยงานผู้จัด:", true, 25),
                  createCell(record.organizer, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("ระยะเวลาอบรม:", true, 25),
                  createCell(`${record.startDate} ถึง ${record.endDate} (${record.hours} ชั่วโมง)`, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("สถานที่/รูปแบบ:", true, 25),
                  createCell(`${record.location} (${record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'})`, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("งบประมาณ/ค่าใช้จ่าย:", true, 25),
                  createCell(record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : "ไม่มีค่าใช้จ่าย", false, 75)
                ]
              })
            ]
          }),

          // Assessment & Application
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: "3. การประเมินตนเองและการนำความรู้ไปประยุกต์ใช้",
                bold: true,
                size: 24,
                color: "0F2C59",
                font: "TH Sarabun PSK"
              })
            ]
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell("ระดับความรู้ก่อนอบรม:", true, 25),
                  createCell(`${record.knowledgeBefore} / 5  (${getScoreText(record.knowledgeBefore)})`, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("ระดับความรู้หลังอบรม:", true, 25),
                  createCell(`${record.knowledgeAfter} / 5  (${getScoreText(record.knowledgeAfter)})`, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("ระดับการพัฒนาเพิ่มขึ้น:", true, 25),
                  createCell(`+${record.knowledgeAfter - record.knowledgeBefore} ระดับ (${Math.round(((record.knowledgeAfter - record.knowledgeBefore) / 5) * 100)}%)`, false, 75)
                ]
              }),
              new TableRow({
                children: [
                  createCell("แนวทางการประยุกต์ใช้:", true, 25),
                  createCell(record.workApplication || "-", false, 75)
                ]
              })
            ]
          }),

          // Signatures Section
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new TextRun({
                text: "4. การรับรองรายงานผล",
                bold: true,
                size: 24,
                color: "0F2C59",
                font: "TH Sarabun PSK"
              })
            ]
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200 },
                        children: [
                          new TextRun({ text: "ลงชื่อ..........................................................", font: "TH Sarabun PSK", size: 22 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `(${record.staffName})`, font: "TH Sarabun PSK", size: 22 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "ผู้รายงานผลการอบรม", font: "TH Sarabun PSK", size: 20, color: "555555" }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `วันที่ ...... / ...... / ..........`, font: "TH Sarabun PSK", size: 20 }),
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200 },
                        children: [
                          new TextRun({ text: "ลงชื่อ..........................................................", font: "TH Sarabun PSK", size: 22 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "(รองคณบดี / หัวหน้าหน่วยงาน)", font: "TH Sarabun PSK", size: 22 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "ผู้บังคับบัญชาตามลำดับชั้น", font: "TH Sarabun PSK", size: 20, color: "555555" }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `วันที่ ...... / ...... / ..........`, font: "TH Sarabun PSK", size: 20 }),
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = record.courseTitle.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 30);
  saveAs(blob, `รายงานอบรม_${record.staffName}_${cleanTitle}.docx`);
}

function createCell(text: string, isHeader: boolean = false, widthPct: number = 50): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: isHeader ? { fill: "F0F4F9" } : undefined,
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" }
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: 22,
            font: "TH Sarabun PSK",
            color: isHeader ? "0F2C59" : "333333"
          })
        ]
      })
    ]
  });
}

function getScoreText(score: number): string {
  switch (score) {
    case 5: return 'ระดับดีมาก / เชี่ยวชาญ';
    case 4: return 'ระดับดี / ทำได้ด้วยตนเอง';
    case 3: return 'ระดับปานกลาง / พอทำได้';
    case 2: return 'ระดับน้อย / ต้องเรียนรู้เพิ่ม';
    default: return 'ระดับเริ่มต้น / มีความรู้น้อยมาก';
  }
}

export async function exportIndividualHrDocx(record: TrainingRecord) {
  const isAcademic = record.staffType === 'academic';
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formattedStartDate = formatDate(record.startDate);
  const formattedEndDate = formatDate(dateFormatISO(record.endDate) || record.endDate);
  const dateRangeText = formattedStartDate === formattedEndDate 
    ? formattedStartDate 
    : `${formattedStartDate} - ${formattedEndDate}`;

  const derivedPosition = isAcademic 
    ? `อาจารย์ประจำสาขาวิชา ${record.academicPrograms?.join(", ") || "วิทยาลัยนวัตกรรมการจัดการ"}`
    : `เจ้าหน้าที่งาน ${record.supportDeptGroup || record.supportDeptUnit || "สายสนับสนุน"}`;

  const staffTypeText = isAcademic ? "สายวิชาการ" : "สายสนับสนุน";

  const expenseText = record.expense > 0 
    ? `${record.expense.toLocaleString('th-TH')} บาท` 
    : 'ไม่มีค่าใช้จ่าย';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 11906,
              height: 16838,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Training 1",
                    size: 14,
                    color: "555555",
                    font: "TH Sarabun PSK"
                  })
                ]
              })
            ]
          })
        },
        children: [
          // Header Logo / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "แบบสำรวจคุณลักษณะงานและหลักสูตรที่ผ่านการฝึกอบรม / สัมมนาของบุคลกรรรายบุคคล",
                bold: true,
                size: 28,
                font: "TH Sarabun PSK"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์",
                bold: true,
                size: 24,
                font: "TH Sarabun PSK"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "หน่วยงาน วิทยาลัยนวัตกรรมการจัดการ",
                bold: true,
                size: 22,
                font: "TH Sarabun PSK"
              })
            ]
          }),

          // Metadata row
          new Paragraph({
            spacing: { after: 300 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "ชื่อ - สกุล ", bold: true, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: `${record.staffName} `, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: "............................................ ", color: "888888", size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: "ตำแหน่ง ", bold: true, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: `${derivedPosition} `, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: "............................................ ", color: "888888", size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: "ประเภท ", bold: true, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: `${staffTypeText} `, size: 22, font: "TH Sarabun PSK" }),
              new TextRun({ text: "............................................", color: "888888", size: 22, font: "TH Sarabun PSK" })
            ]
          }),

          // The Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Row 1 Header
              new TableRow({
                children: [
                  createHrCell("คุณลักษณะงานเฉพาะตำแหน่ง", true, 20, AlignmentType.CENTER, 1, 2),
                  createHrCell("ชื่อหลักสูตรที่เข้ารับการอบรม/สัมมนา", true, 25, AlignmentType.CENTER, 1, 2),
                  createHrCell("สถานที่ / ระยะเวลา / งบประมาณ", true, 22, AlignmentType.CENTER, 1, 2),
                  createHrCell("ผลที่ได้รับหลังจากเข้ารับการอบรม/สัมมนา", true, 23, AlignmentType.CENTER, 1, 2),
                  createHrCell("ระดับความเห็นของหัวหน้างาน ในการนำความรู้มาใช้ของบุคลากร", true, 10, AlignmentType.CENTER, 5, 1)
                ]
              }),
              // Row 2 Header sub-ratings
              new TableRow({
                children: [
                  createHrCell("1", true, 2, AlignmentType.CENTER, 1, 1),
                  createHrCell("2", true, 2, AlignmentType.CENTER, 1, 1),
                  createHrCell("3", true, 2, AlignmentType.CENTER, 1, 1),
                  createHrCell("4", true, 2, AlignmentType.CENTER, 1, 1),
                  createHrCell("5", true, 2, AlignmentType.CENTER, 1, 1)
                ]
              }),
              // Row 3 Data
              new TableRow({
                children: [
                  createHrCell(record.jobCharacteristics || record.categories?.join(", ") || "-", false, 20, AlignmentType.LEFT),
                  createHrCell(record.courseTitle, false, 25, AlignmentType.LEFT),
                  createMultiLineCell([
                    `สถานที่: ${record.location || "-"}`,
                    `ประเภท: ${record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'}`,
                    `ระยะเวลา: ${record.hours} ชม.`,
                    `ช่วงวันที่: ${dateRangeText}`,
                    `งบประมาณ: ${expenseText}`
                  ], 22),
                  createHrCell(record.workApplication || "-", false, 23, AlignmentType.LEFT),
                  createHrCell(record.knowledgeAfter === 1 ? "✓" : "", false, 2, AlignmentType.CENTER),
                  createHrCell(record.knowledgeAfter === 2 ? "✓" : "", false, 2, AlignmentType.CENTER),
                  createHrCell(record.knowledgeAfter === 3 ? "✓" : "", false, 2, AlignmentType.CENTER),
                  createHrCell(record.knowledgeAfter === 4 ? "✓" : "", false, 2, AlignmentType.CENTER),
                  createHrCell(record.knowledgeAfter === 5 ? "✓" : "", false, 2, AlignmentType.CENTER)
                ]
              })
            ]
          }),

          // Explanation / Description
          new Paragraph({ spacing: { before: 400, after: 100 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "***คำอธิบาย", bold: true, size: 20, font: "TH Sarabun PSK" })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "คะแนนในระดับ 5 หมายถึง สามารถนำความรู้ที่ได้รับมาใช้พัฒนาระบบงานใหม่ และมีระดับความสำเร็จในการปฏิบัติงานที่ปฏิบัติอยู่เกินกว่าเป้าหมาย", size: 18, font: "TH Sarabun PSK" })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "คะแนนในระดับ 4 หมายถึง สามารถนำความรู้ที่ได้รับมาปรับเปลี่ยนวิธีการปฏิบัติงานของตนเองได้อย่างเหมาะสม และสามารถสร้างผลงานได้อย่างเป็นรูปธรรม", size: 18, font: "TH Sarabun PSK" })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "คะแนนในระดับ 3 หมายถึง สามารถนำความรู้ที่ได้รับมาใช้ในการทำงานได้ดีขึ้นและสามารถสอนและถ่ายทอดความรู้และประสบการณ์ให้ผู้อื่นได้", size: 18, font: "TH Sarabun PSK" })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "คะแนนในระดับ 2 หมายถึง สามารถนำความรู้ที่ได้รับมาใช้ในการปฏิบัติงานได้บ้าง", size: 18, font: "TH Sarabun PSK" })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "คะแนนในระดับ 1 หมายถึง ไม่สามารถนำความรู้ที่ได้รับมาใช้ปฏิบัติงานได้ตามเป้าหมายที่หน่วยงานกำหนด", size: 18, font: "TH Sarabun PSK" })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = record.courseTitle.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 30);
  saveAs(blob, `รายงานอบรม_HR_${record.staffName}_${cleanTitle}.docx`);
}

function dateFormatISO(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr;
}

function createHrCell(
  text: string, 
  isHeader: boolean = false, 
  widthPct: number = 10, 
  align: any = AlignmentType.LEFT, 
  colSpan: number = 1, 
  rowSpan: number = 1
): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: isHeader ? { fill: "F2F2F2" } : undefined,
    columnSpan: colSpan > 1 ? colSpan : undefined,
    rowSpan: rowSpan > 1 ? rowSpan : undefined,
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
    },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: 20,
            font: "TH Sarabun PSK",
            color: "000000"
          })
        ]
      })
    ]
  });
}

function createMultiLineCell(
  lines: string[], 
  widthPct: number = 20, 
  align: any = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
    },
    children: lines.map(line => new Paragraph({
      alignment: align,
      children: [
        new TextRun({
          text: line,
          size: 20,
          font: "TH Sarabun PSK",
          color: "000000"
        })
      ]
    }))
  });
}

