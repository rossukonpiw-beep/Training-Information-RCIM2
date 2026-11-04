import React, { useState, useEffect } from 'react';
import { 
  X, Check, Upload, Star, User, BookOpen, Award, Building, Sparkles, AlertCircle
} from 'lucide-react';
import { 
  TrainingRecord, StaffType, Campus, LocationType, 
  TRAINING_CATEGORIES, ACADEMIC_PROGRAMS, SUPPORT_GROUPS 
} from '../types';

interface TrainingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: TrainingRecord) => void;
  initialRecord?: TrainingRecord | null;
}

export const TrainingFormModal: React.FC<TrainingFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord
}) => {
  const [formData, setFormData] = useState<Partial<TrainingRecord>>({
    staffId: '',
    staffName: '',
    staffEmail: '',
    campus: 'ศาลายา',
    staffType: 'academic',
    isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
    academicPrograms: [],
    academicResponsiblePrograms: [],
    supportDeptGroup: SUPPORT_GROUPS[0],
    supportDeptUnit: '',
    jobCharacteristics: '',
    courseTitle: '',
    categories: [TRAINING_CATEGORIES[0]],
    otherCategoryDetail: '',
    organizer: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    hours: 6,
    location: '',
    locationType: 'onsite',
    expense: 0,
    knowledgeBefore: 3,
    knowledgeAfter: 5,
    workApplication: '',
    certificateFile: '',
    certificateFileName: ''
  });

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialRecord) {
      setFormData(initialRecord);
    } else {
      setFormData({
        staffId: 'RCIM-' + Math.floor(10000 + Math.random() * 90000),
        staffName: '',
        staffEmail: '',
        campus: 'ศาลายา',
        staffType: 'academic',
        isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
        academicPrograms: [ACADEMIC_PROGRAMS[0]],
        academicResponsiblePrograms: [ACADEMIC_PROGRAMS[0]],
        supportDeptGroup: SUPPORT_GROUPS[0],
        supportDeptUnit: 'หน่วยงานส่วนกลาง',
        jobCharacteristics: '',
        courseTitle: '',
        categories: [TRAINING_CATEGORIES[0]],
        otherCategoryDetail: '',
        organizer: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        hours: 6,
        location: 'วิทยาลัยนวัตกรรมการจัดการ',
        locationType: 'onsite',
        expense: 0,
        knowledgeBefore: 3,
        knowledgeAfter: 5,
        workApplication: '',
        certificateFile: '',
        certificateFileName: ''
      });
    }
    setErrorMsg('');
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const handleCategoryToggle = (cat: string) => {
    const current = formData.categories || [];
    if (current.includes(cat)) {
      setFormData({ ...formData, categories: current.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, categories: [...current, cat] });
    }
  };

  const handleAcademicProgramToggle = (prog: string) => {
    const current = formData.academicPrograms || [];
    if (current.includes(prog)) {
      setFormData({ ...formData, academicPrograms: current.filter(p => p !== prog) });
    } else {
      setFormData({ ...formData, academicPrograms: [...current, prog] });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          certificateFile: reader.result as string,
          certificateFileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffName?.trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุลบุคลากร');
      return;
    }
    if (!formData.jobCharacteristics?.trim()) {
      setErrorMsg('กรุณากรอกคุณลักษณะงานเฉพาะตำแหน่ง');
      return;
    }
    if (!formData.courseTitle?.trim()) {
      setErrorMsg('กรุณากรอกชื่อหลักสูตร/โครงการอบรม');
      return;
    }
    if (!formData.categories || formData.categories.length === 0) {
      setErrorMsg('กรุณาเลือกหมวดหมู่การพัฒนาอย่างน้อย 1 หมวด');
      return;
    }

    const recordToSave: TrainingRecord = {
      id: formData.id || 'TR-' + Date.now(),
      staffId: formData.staffId || 'RCIM-0000',
      staffName: formData.staffName.trim(),
      staffEmail: formData.staffEmail?.trim() || 'staff@rmutr.ac.th',
      campus: (formData.campus as Campus) || 'ศาลายา',
      staffType: (formData.staffType as StaffType) || 'academic',
      isCollegeFaculty: formData.isCollegeFaculty || 'วิทยาลัยนวัตกรรมการจัดการ',
      academicPrograms: formData.staffType === 'academic' ? formData.academicPrograms : [],
      academicResponsiblePrograms: formData.staffType === 'academic' ? formData.academicResponsiblePrograms : [],
      supportDeptGroup: formData.staffType === 'support' ? formData.supportDeptGroup : '',
      supportDeptUnit: formData.staffType === 'support' ? formData.supportDeptUnit : '',
      jobCharacteristics: formData.jobCharacteristics.trim(),
      courseTitle: formData.courseTitle.trim(),
      categories: formData.categories,
      otherCategoryDetail: formData.otherCategoryDetail || '',
      organizer: formData.organizer?.trim() || 'วิทยาลัยนวัตกรรมการจัดการ',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || new Date().toISOString().split('T')[0],
      hours: Number(formData.hours) || 0,
      location: formData.location?.trim() || 'มทร.รัตนโกสินทร์',
      locationType: (formData.locationType as LocationType) || 'onsite',
      expense: Number(formData.expense) || 0,
      knowledgeBefore: Number(formData.knowledgeBefore) || 3,
      knowledgeAfter: Number(formData.knowledgeAfter) || 5,
      workApplication: formData.workApplication?.trim() || 'นำไปประยุกต์ใช้ในการปฏิบัติงานตามภารกิจ',
      certificateFile: formData.certificateFile || '',
      certificateFileName: formData.certificateFileName || '',
      submittedAt: formData.submittedAt || new Date().toISOString()
    };

    onSave(recordToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialRecord ? 'แก้ไขข้อมูลการฝึกอบรม' : 'แบบฟอร์มบันทึกข้อมูลการฝึกอบรมใหม่'}
              </h2>
              <p className="text-xs text-slate-300">
                วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์ (RCIM)
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

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-slate-800">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Staff Profile */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-700" />
              <span>1. ข้อมูลบุคลากรผู้ฝึกอบรม</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสบุคลากร</label>
                <input
                  type="text"
                  value={formData.staffId || ''}
                  onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                  placeholder="เช่น RCIM-65001"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.staffName || ''}
                  onChange={e => setFormData({ ...formData, staffName: e.target.value })}
                  placeholder="เช่น ผศ.ดร.สมชาย ใจดี"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลสถาบัน</label>
                <input
                  type="email"
                  value={formData.staffEmail || ''}
                  onChange={e => setFormData({ ...formData, staffEmail: e.target.value })}
                  placeholder="example@rmutr.ac.th"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">พื้นที่สังกัด (Campus)</label>
                <select
                  value={formData.campus}
                  onChange={e => setFormData({ ...formData, campus: e.target.value as Campus })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ศาลายา">ศาลายา</option>
                  <option value="วังไกลกังวล">วังไกลกังวล</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทบุคลากร</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, staffType: 'academic' })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      formData.staffType === 'academic' 
                        ? 'bg-blue-900 text-white font-bold shadow' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    สายวิชาการ (อาจารย์)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, staffType: 'support' })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      formData.staffType === 'support' 
                        ? 'bg-amber-600 text-white font-bold shadow' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    สายสนับสนุน
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะสังกัดวิทยาลัย</label>
                <select
                  value={formData.isCollegeFaculty}
                  onChange={e => setFormData({ ...formData, isCollegeFaculty: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="วิทยาลัยนวัตกรรมการจัดการ">วิทยาลัยนวัตกรรมการจัดการ</option>
                  <option value="สมทบ/ช่วยราชการ">อาจารย์สมทบ / ช่วยราชการ</option>
                </select>
              </div>
            </div>

            {/* Sub-fields for Academic */}
            {formData.staffType === 'academic' ? (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">หลักสูตรวิชาการที่สังกัด</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACADEMIC_PROGRAMS.map((prog, idx) => (
                    <label key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 hover:bg-blue-50/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.academicPrograms || []).includes(prog)}
                        onChange={() => handleAcademicProgramToggle(prog)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{prog}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* Sub-fields for Support */
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">กลุ่มงานสายสนับสนุน</label>
                  <select
                    value={formData.supportDeptGroup}
                    onChange={e => setFormData({ ...formData, supportDeptGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {SUPPORT_GROUPS.map((grp, i) => (
                      <option key={i} value={grp}>{grp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หน่วยงานย่อย / ฝ่าย</label>
                  <input
                    type="text"
                    value={formData.supportDeptUnit || ''}
                    onChange={e => setFormData({ ...formData, supportDeptUnit: e.target.value })}
                    placeholder="เช่น หน่วยประกันคุณภาพ / งานธุรการส่วนกลาง"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* คุณลักษณะงานเฉพาะตำแหน่ง - ย้ายมาอยู่ในส่วนข้อมูลผู้ร่วมฝึกอบรม */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">คุณลักษณะงานเฉพาะตำแหน่ง <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.jobCharacteristics || ''}
                  onChange={e => setFormData({ ...formData, jobCharacteristics: e.target.value })}
                  placeholder="เช่น อาจารย์ผู้รับผิดชอบหลักสูตร, เจ้าหน้าที่ธุรการบริการทั่วไป..."
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-medium block">คำแนะนำเพื่อกรอกด่วน:</span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.staffType === 'academic' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'อาจารย์ผู้รับผิดชอบหลักสูตรและจัดกระบวนการเรียนรู้' })}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-md text-[10px] border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        อาจารย์ผู้รับผิดชอบหลักสูตร
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'อาจารย์ผู้สอนหลักสูตรระดับบัณฑิตศึกษาและวิจัยนวัตกรรม' })}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-md text-[10px] border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        อาจารย์บัณฑิตศึกษา & วิจัย
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'อาจารย์ผู้สอนและพัฒนานักศึกษาตามมาตรฐานวิชาชีพ' })}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-md text-[10px] border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        อาจารย์ตามมาตรฐานวิชาชีพ
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'ผู้ปฏิบัติงานสายสนับสนุนเพื่อขับเคลื่อนงานยุทธศาสตร์และธุรการ' })}
                        className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 rounded-md text-[10px] border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        สายสนับสนุนยุทธศาสตร์ & ธุรการ
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'นักวิชาการศึกษาผู้ประสานงานบริการการเรียนการสอนและประกันคุณภาพ' })}
                        className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 rounded-md text-[10px] border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        นักวิชาการศึกษา & ประกันคุณภาพ
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, jobCharacteristics: 'ผู้บริหารจัดการและประสานงานบริการทั่วไปและเครือข่ายสัมพันธ์' })}
                        className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 rounded-md text-[10px] border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        ฝ่ายบริการทั่วไป & ประชาสัมพันธ์
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Course Information */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>2. รายละเอียดหลักสูตรและโครงการพัฒนาตนเอง</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อหลักสูตร / โครงการฝึกอบรม / สัมมนา / ดูงาน <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.courseTitle || ''}
                onChange={e => setFormData({ ...formData, courseTitle: e.target.value })}
                placeholder="เช่น โครงการอบรมเชิงปฏิบัติการ การประยุกต์ใช้ Generative AI สำหรับการบริหารงานเมือง"
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Categories multi-select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่การพัฒนาตนเอง (เลือกได้หลายข้อ) <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRAINING_CATEGORIES.map((cat, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.categories || []).includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
              {(formData.categories || []).includes('ด้านอื่น ๆ') && (
                <input
                  type="text"
                  value={formData.otherCategoryDetail || ''}
                  onChange={e => setFormData({ ...formData, otherCategoryDetail: e.target.value })}
                  placeholder="ระบุหมวดหมู่อื่น ๆ..."
                  className="mt-2 w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หน่วยงานผู้จัด</label>
                <input
                  type="text"
                  value={formData.organizer || ''}
                  onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  placeholder="เช่น สถาบันวิจัย มทร.รัตนโกสินทร์"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่เริ่มอบรม</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่สิ้นสุด</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนชั่วโมงอบรม</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={formData.hours || 0}
                  onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่จัดอบรม</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="เช่น ห้องประชุมวิทยาลัย / ระบบออนไลน์ Zoom"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รูปแบบการเข้าร่วม</label>
                <select
                  value={formData.locationType}
                  onChange={e => setFormData({ ...formData, locationType: e.target.value as LocationType })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="onsite">ออนไซต์ (On-site)</option>
                  <option value="online">ออนไลน์ (Online)</option>
                  <option value="hybrid">ไฮบริด (Hybrid)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ค่าใช้จ่าย / งบประมาณที่เบิกจ่าย (บาท)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.expense || 0}
                onChange={e => setFormData({ ...formData, expense: Number(e.target.value) })}
                placeholder="0 หากไม่มีค่าใช้จ่าย"
                className="w-full sm:w-1/2 px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Knowledge Evaluation & Application */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>3. การประเมินตนเองและการนำความรู้ไปประยุกต์ใช้</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Score Before */}
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  ระดับความรู้ความเข้าใจ <span className="text-slate-500 font-normal">(ก่อนการอบรม)</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, knowledgeBefore: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (formData.knowledgeBefore || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {formData.knowledgeBefore} / 5
                  </span>
                </div>
              </div>

              {/* Score After */}
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  ระดับความรู้ความเข้าใจ <span className="text-emerald-600 font-bold">(หลังการอบรม)</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, knowledgeAfter: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (formData.knowledgeAfter || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-emerald-700 ml-2">
                    {formData.knowledgeAfter} / 5
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                การนำความรู้ ความเข้าใจ หรือทักษะไปประยุกต์ใช้ในการปฏิบัติงาน
              </label>
              <textarea
                rows={3}
                value={formData.workApplication || ''}
                onChange={e => setFormData({ ...formData, workApplication: e.target.value })}
                placeholder="ระบุรายละเอียด เช่น นำเทคโนโลยี AI มาพัฒนาการเรียนการสอน หรือปรับปรุงขั้นตอนการทำงานประกันคุณภาพ..."
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 4: Certificate Attachment */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-700" />
              <span>4. แนบเอกสารหลักฐาน / วุฒิบัตร (Certificate)</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="cursor-pointer px-4 py-2.5 bg-white border border-slate-300 hover:border-blue-500 rounded-xl text-xs font-medium text-slate-700 hover:text-blue-600 flex items-center gap-2 transition-all shadow-sm">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>อัปโหลดไฟล์ใบประกาศ (PDF / รูปภาพ)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {formData.certificateFileName && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs font-medium">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>แนบไฟล์เรียบร้อย: {formData.certificateFileName}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, certificateFile: '', certificateFileName: '' })}
                    className="ml-2 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{initialRecord ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลการอบรม'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
