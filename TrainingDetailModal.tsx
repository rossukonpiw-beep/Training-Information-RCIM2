import React from 'react';
import { 
  X, FileText, Printer, Edit3, Award, User, Building, Clock, 
  Calendar, CheckCircle, ExternalLink, Download, Lock, Trash2
} from 'lucide-react';
import { TrainingRecord } from '../types';
import { exportIndividualDocx } from '../utils/docxExporter';
import { UserProfile } from './LoginModal';

interface TrainingDetailModalProps {
  record: TrainingRecord | null;
  onClose: () => void;
  onEdit: (record: TrainingRecord) => void;
  onExportDocx: (record: TrainingRecord) => void;
  onExportHrDocx: (record: TrainingRecord) => void;
  currentUser: UserProfile | null;
  onDelete?: (id: string) => void;
}

export const TrainingDetailModal: React.FC<TrainingDetailModalProps> = ({
  record,
  onClose,
  onEdit,
  onExportDocx,
  onExportHrDocx,
  currentUser,
  onDelete
}) => {
  if (!record) return null;

  const isAcademic = record.staffType === 'academic';
  const knowledgeGain = record.knowledgeAfter - record.knowledgeBefore;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'reviewer';
  const canDelete = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">รายละเอียดรายงานผลการฝึกอบรม (รายบุคคล)</h2>
              <p className="text-xs text-slate-300">
                วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-slate-800 printable-area">
          
          {/* Banner Title */}
          <div className="border-b border-slate-200 pb-4 text-center">
            <h1 className="text-lg font-bold text-slate-900">
              แบบรายงานผลการเข้าร่วมการฝึกอบรม / สัมมนา / พัฒนาตนเอง
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              วิทยาลัยนวัตกรรมการจัดการ มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์
            </p>
          </div>

          {/* Section 1: Staff Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-700" />
              <span>1. ข้อมูลบุคลากร</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500">ชื่อ-นามสกุล: </span>
                <span className="font-bold text-slate-900">{record.staffName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">รหัสบุคลากร: </span>
                <span className="text-slate-800">{record.staffId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">อีเมลสถาบัน: </span>
                <span className="text-slate-800">{record.staffEmail}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">พื้นที่สังกัด: </span>
                <span className="text-slate-800">{record.campus}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">ประเภทบุคลากร: </span>
                <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                  isAcademic ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {isAcademic ? 'สายวิชาการ (อาจารย์ประจำ)' : 'สายสนับสนุน'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">สังกัดวิทยาลัย: </span>
                <span className="text-slate-800">{record.isCollegeFaculty}</span>
              </div>
              {isAcademic ? (
                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-500">หลักสูตรวิชาการที่สังกัด: </span>
                  <span className="text-slate-800">{record.academicPrograms?.join(', ') || '-'}</span>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-500">กลุ่มงาน/หน่วยงาน: </span>
                  <span className="text-slate-800">{record.supportDeptGroup} ({record.supportDeptUnit || '-'})</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Course Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-700" />
              <span>2. รายละเอียดหลักสูตรและโครงการพัฒนา</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">ชื่อหลักสูตร/โครงการ:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{record.courseTitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-semibold text-slate-500">หมวดหมู่การพัฒนา:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(record.categories || []).map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100/70 text-blue-900 rounded text-[11px] font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">หน่วยงานผู้จัด:</span>
                  <p className="text-slate-800 font-medium">{record.organizer}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">ระยะเวลาอบรม:</span>
                  <p className="text-slate-800 font-medium">
                    {record.startDate} ถึง {record.endDate} ({record.hours} ชั่วโมง)
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">สถานที่ / รูปแบบ:</span>
                  <p className="text-slate-800 font-medium">
                    {record.location} ({record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'})
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500">งบประมาณ/ค่าใช้จ่าย:</span>
                  <p className="text-slate-800 font-bold">
                    {record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : 'ไม่มีค่าใช้จ่าย'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Assessment & Application */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              3. ผลการประเมินและการนำไปใช้ประโยชน์
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold block">ระดับความรู้ก่อนอบรม</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">{record.knowledgeBefore} / 5</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold block">ระดับความรู้หลังอบรม</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {record.knowledgeAfter} / 5 <span className="text-xs text-emerald-700 font-normal">(+{knowledgeGain} ระดับ)</span>
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block text-xs">รายละเอียดการนำความรู้ไปประยุกต์ใช้:</span>
              <div className="mt-1 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {record.workApplication || 'นำความรู้มาพัฒนากระบวนการเรียนการสอนและงานวิจัยของวิทยาลัย'}
              </div>
            </div>
          </div>

          {/* Certificate Attachment Preview */}
          {record.certificateFileName && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>เอกสารแนบ / วุฒิบัตร</span>
              </h3>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="font-medium text-slate-800">{record.certificateFileName}</span>
                {record.certificateFile && (
                  <a
                    href={record.certificateFile}
                    download={record.certificateFileName}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Print-Only Signature & Review Section */}
          <div className="hidden print:block mt-12 pt-8 border-t border-dashed border-slate-300">
            <div className="grid grid-cols-2 gap-12 text-xs text-slate-800 leading-relaxed">
              <div className="space-y-10 text-center">
                <p>ลงชื่อ................................................................. ผู้รายงาน<br/>
                  ( {record.staffName} )<br/>
                  ตำแหน่ง {record.staffType === 'academic' ? 'อาจารย์ประจำ / สายวิชาการ' : 'บุคลากรสายสนับสนุน'}
                </p>
                <p>วันที่ .......... / .......... / ..........</p>
              </div>
              <div className="space-y-10 text-center">
                <p>ลงชื่อ................................................................. ผู้อนุมัติ / คณบดี<br/>
                  ( ................................................................. )<br/>
                  ตำแหน่ง .................................................................
                </p>
                <p>วันที่ .......... / .......... / ..........</p>
              </div>
            </div>
            <div className="mt-10 text-[10px] text-slate-400 text-center">
              รายงานนี้พิมพ์จากระบบบันทึกและรายงานข้อมูลการฝึกอบรม วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => onEdit(record)}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขข้อมูล</span>
              </button>
            )}

            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(record.id)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="ลบข้อมูลการอบรมนี้"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบข้อมูล</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์รายงาน</span>
              </button>
            )}

            <button
              onClick={() => onExportDocx(record)}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title={isAdmin ? "ส่งออกเป็นไฟล์ Word (.docx)" : "จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ"}
            >
              {isAdmin ? (
                <FileText className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-blue-300" />
              )}
              <span>ส่งออกเป็นไฟล์ Word (.docx)</span>
              {!isAdmin && (
                <span className="bg-blue-950 px-1.5 py-0.5 rounded text-[10px] text-blue-300 font-normal">
                  Admin Only
                </span>
              )}
            </button>

            <button
              onClick={() => onExportHrDocx(record)}
              className="px-5 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              title={isAdmin ? "ส่งออกแบบสำรวจคุณลักษณะงาน HR (.docx)" : "จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ"}
            >
              {isAdmin ? (
                <FileText className="w-4 h-4 text-pink-300" />
              ) : (
                <Lock className="w-4 h-4 text-purple-300" />
              )}
              <span>ส่งออก DOCX-HR</span>
              {!isAdmin && (
                <span className="bg-purple-950 px-1.5 py-0.5 rounded text-[10px] text-purple-300 font-normal">
                  Admin Only
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
