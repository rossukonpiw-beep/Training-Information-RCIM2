import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User, 
  Building, 
  Award, 
  FileCheck, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  DollarSign, 
  Upload, 
  Check, 
  Wand2, 
  Send, 
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Edit3,
  BookOpen,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ExternalLink
} from 'lucide-react';
import { 
  TrainingRecord, 
  Campus, 
  StaffType, 
  LocationType, 
  TRAINING_CATEGORIES, 
  ACADEMIC_PROGRAMS, 
  SUPPORT_GROUPS 
} from '../types';
import { getStoredStaff, saveStoredStaff, HRStaffItem } from '../utils/storage';

import { UserProfile } from './LoginModal';

interface TrainingFormViewProps {
  onSave: (record: TrainingRecord) => void;
  initialRecord?: TrainingRecord | null;
  onCancelEdit?: () => void;
  currentUser?: UserProfile | null;
}

export function cleanThaiName(name: string): string {
  if (!name) return "";
  let clean = name.trim();
  // Safe list of formal prefixes in priority order (strictly with trailing dots/spaces)
  const prefixes = [
    "อ.ดร.", "ผศ.ดร.", "รศ.ดร.", "ดร.", "ผศ.", "รศ.", "อ.", "อาจารย์", "นาย", "นางสาว", "นาง", "น.ส."
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of prefixes) {
      if (clean.startsWith(p)) {
        clean = clean.substring(p.length).trim();
        changed = true;
      }
    }
  }
  return clean.replace(/\s+/g, ' ');
}

export const HR_DATA_STAFF: HRStaffItem[] = [];

export const TrainingFormView: React.FC<TrainingFormViewProps> = ({
  onSave,
  initialRecord,
  onCancelEdit,
  currentUser
}) => {
  // Staff list state (syncable from Google Sheets)
  const [staffList, setStaffList] = useState<HRStaffItem[]>(() => getStoredStaff(HR_DATA_STAFF));
  const [activeSheetTabFilter, setActiveSheetTabFilter] = useState<string>('all');
  
  // Google Sheets Sync State
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: any } | null>(null);

  // AI Fast Fill state
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  // Form Field States
  const [searchQuery, setSearchQuery] = useState(initialRecord?.staffName || '');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  const [staffName, setStaffName] = useState(initialRecord?.staffName || '');
  const [staffId, setStaffId] = useState(initialRecord?.staffId || '');
  const [staffEmail, setStaffEmail] = useState(initialRecord?.staffEmail || '');
  const [campus, setCampus] = useState<Campus>(initialRecord?.campus || 'ศาลายา');
  const [staffType, setStaffType] = useState<StaffType>(initialRecord?.staffType || 'support');

  // Auto pre-fill staff data if currentUser logged in and no initialRecord specified
  useEffect(() => {
    if (!initialRecord && currentUser && currentUser.role === 'staff') {
      const match = staffList.find(s => 
        s.email.toLowerCase() === currentUser.email.toLowerCase() ||
        s.name.includes(currentUser.name) ||
        currentUser.name.includes(s.name)
      );
      if (match) {
        setStaffName(match.name);
        setSearchQuery(match.name);
        setStaffId(match.id);
        setStaffEmail(match.email);
        setCampus(match.campus);
        setStaffType(match.type);
        if (match.type === 'academic') {
          setAcademicPrograms([match.dept]);
        } else {
          setSupportDeptGroup(match.dept);
        }
      } else if (currentUser.name && currentUser.name !== 'ผู้ดูแลระบบ HR (Admin)') {
        setStaffName(currentUser.name);
        setSearchQuery(currentUser.name);
        setStaffId(currentUser.id || '6222001');
        setStaffEmail(currentUser.email);
      }
    }
  }, [currentUser, initialRecord, staffList]);
  const [isCollegeFaculty, setIsCollegeFaculty] = useState<'วิทยาลัยนวัตกรรมการจัดการ' | 'สมทบ/ช่วยราชการ'>(
    initialRecord?.isCollegeFaculty || 'วิทยาลัยนวัตกรรมการจัดการ'
  );
  const [academicPrograms, setAcademicPrograms] = useState<string[]>(
    initialRecord?.academicPrograms || ['สาขาวิชาการจัดการเมืองและโครงสร้างพื้นฐาน']
  );
  const [supportDeptGroup, setSupportDeptGroup] = useState<string>(
    initialRecord?.supportDeptGroup || 'งานนโยบาย แผน และประกันคุณภาพ'
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Auto-sync fresh HR staff list from Google Sheets server route if available
    fetch('/api/hr-data')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.staff) && data.staff.length > 0) {
          // Strictly overwrite with the real database records from Google Sheet ID 1AXZ1f3DihzHLsEk8TdL-Y1wCUt0ubyuH0S_oDYfe4n8
          setStaffList(data.staff);
          saveStoredStaff(data.staff);
        }
      })
      .catch(err => console.warn('Auto fetch HR data notice:', err));
  }, []);
  
  // Course details
  const [courseTitle, setCourseTitle] = useState(initialRecord?.courseTitle || '');
  const [categories, setCategories] = useState<string[]>(
    initialRecord?.categories || ['ด้านเทคโนโลยีดิจิทัลและ AI']
  );
  const [organizerType, setOrganizerType] = useState<'internal' | 'external'>('internal');
  const [organizer, setOrganizer] = useState(initialRecord?.organizer || 'วิทยาลัยนวัตกรรมการจัดการ (RCIM)');
  const [startDate, setStartDate] = useState(initialRecord?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialRecord?.endDate || new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(initialRecord?.hours || 6);
  const [location, setLocation] = useState(initialRecord?.location || 'ห้องประชุมวิทยาลัยนวัตกรรมการจัดการ ชั้น 4');
  const [locationType, setLocationType] = useState<LocationType>(initialRecord?.locationType || 'onsite');
  const [hasExpense, setHasExpense] = useState<boolean>((initialRecord?.expense || 0) > 0);
  const [expense, setExpense] = useState<number>(initialRecord?.expense || 0);

  // Assessment
  const [knowledgeBefore, setKnowledgeBefore] = useState<number>(initialRecord?.knowledgeBefore || 3);
  const [knowledgeAfter, setKnowledgeAfter] = useState<number>(initialRecord?.knowledgeAfter || 4);
  const [workApplication, setWorkApplication] = useState(initialRecord?.workApplication || '');

  const [jobCharacteristics, setJobCharacteristics] = useState(initialRecord?.jobCharacteristics || '');

  // Certificate
  const [certificateFileName, setCertificateFileName] = useState(initialRecord?.certificateFileName || '');
  const [certificateFile, setCertificateFile] = useState(initialRecord?.certificateFile || '');

  // Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialRecord) {
      setStaffName(initialRecord.staffName);
      setSearchQuery(initialRecord.staffName);
      setStaffId(initialRecord.staffId);
      setStaffEmail(initialRecord.staffEmail);
      setCampus(initialRecord.campus);
      setStaffType(initialRecord.staffType);
      setCourseTitle(initialRecord.courseTitle);
      setJobCharacteristics(initialRecord.jobCharacteristics || '');
      setCategories(initialRecord.categories || []);
      setOrganizer(initialRecord.organizer);
      setStartDate(initialRecord.startDate);
      setEndDate(initialRecord.endDate);
      setHours(initialRecord.hours);
      setLocation(initialRecord.location);
      setLocationType(initialRecord.locationType);
      setExpense(initialRecord.expense || 0);
      setHasExpense((initialRecord.expense || 0) > 0);
      setKnowledgeBefore(initialRecord.knowledgeBefore);
      setKnowledgeAfter(initialRecord.knowledgeAfter);
      setWorkApplication(initialRecord.workApplication);
      setCertificateFileName(initialRecord.certificateFileName || '');
      setCertificateFile(initialRecord.certificateFile || '');
    }
  }, [initialRecord]);

  // AI Fast Fill handler
  const handleAiFastFill = async (textToParse?: string) => {
    const queryText = textToParse || rawText;
    if (!queryText.trim()) return;

    setIsParsing(true);
    setAiStatusMessage('กำลังวิเคราะห์ข้อความด้วยระบบปัญญาประดิษฐ์...');

    try {
      const response = await fetch('/api/parse-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: queryText }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const d = resData.data;
        if (d.courseTitle) setCourseTitle(d.courseTitle);
        if (d.organizer) setOrganizer(d.organizer);
        if (d.startDate) setStartDate(d.startDate);
        if (d.endDate) setEndDate(d.endDate);
        if (d.hours) setHours(d.hours);
        if (d.location) setLocation(d.location);
        if (d.locationType) setLocationType(d.locationType);
        if (d.categories && d.categories.length) setCategories(d.categories);
        if (d.expense !== undefined) {
          setExpense(d.expense);
          setHasExpense(d.expense > 0);
        }
        if (d.jobCharacteristics) setJobCharacteristics(d.jobCharacteristics);
        if (d.workApplication) setWorkApplication(d.workApplication);

        setAiStatusMessage('✨ สกัดข้อมูลและกรอกแบบฟอร์มอัตโนมัติเรียบร้อยแล้ว!');
      } else {
        setAiStatusMessage('ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณากรอกแบบฟอร์มด้วยตนเอง');
      }
    } catch (e) {
      setAiStatusMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ AI');
    } finally {
      setIsParsing(false);
      setTimeout(() => setAiStatusMessage(null), 4000);
    }
  };

  const handleEnhanceWorkAppText = async () => {
    if (!workApplication.trim() && !courseTitle.trim()) {
      alert('กรุณากรอกชื่อหลักสูตร หรือพิมพ์รายละเอียดเบื้องต้นก่อนใช้ AI ช่วยเขียน');
      return;
    }
    setIsParsing(true);
    try {
      const response = await fetch('/api/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: workApplication || `เข้าร่วมการอบรมหลักสูตร ${courseTitle}`,
          promptType: 'workApplication' 
        }),
      });
      const data = await response.json();
      if (data.enhancedText) {
        setWorkApplication(data.enhancedText);
      }
    } catch (e) {
      // Fallback text
      setWorkApplication(`นำความรู้เรื่อง ${courseTitle || 'เทคโนโลยีดิจิทัล'} ไปประยุกต์ใช้ในการปรับปรุงขั้นตอนการปฏิบัติงาน การเรียนการสอน และยกระดับประสิทธิภาพองค์กร RCIM`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectStaffPreset = (s: HRStaffItem) => {
    setStaffName(s.name);
    setSearchQuery(s.name);
    setStaffId(s.id);
    setStaffEmail(s.email);
    setCampus(s.campus);
    setStaffType(s.type);
    if (s.type === 'academic') {
      setAcademicPrograms([s.dept]);
    } else {
      setSupportDeptGroup(s.dept);
    }
    setShowStaffDropdown(false);
  };

  const handleSyncGoogleSheets = async (customUrl?: string) => {
    setIsSyncingSheets(true);
    setSheetsSyncMsg({ type: 'info', text: 'กำลังเชื่อมต่อและอ่านข้อมูลทุก Sheet Tabs จาก Google Sheets HR_DATA...' });

    try {
      const response = await fetch('/api/sheets/hr-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetUrl: customUrl || sheetUrlInput || undefined,
        })
      });

      const resData = await response.json();
      if (resData.success && Array.isArray(resData.staff) && resData.staff.length > 0) {
        setStaffList(resData.staff);
        saveStoredStaff(resData.staff);
        setSheetsSyncMsg({
          type: 'success',
          text: `ดึงข้อมูลสำเร็จ! พบบุคลากรรวม ${resData.totalStaff} รายการ จาก ${resData.sheets?.length || 1} Sheet Tabs (${resData.spreadsheetTitle || 'HR_DATA'})`,
          details: resData.sheets
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: resData.error || 'ไม่พบข้อมูลแถวใน Google Sheets กรุณาตรวจสอบ URL หรือสิทธิ์การเข้าถึง'
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ หรือกรุณาระบุ Link Google Sheets HR_DATA'
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificateFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!jobCharacteristics.trim()) newErrors.jobCharacteristics = 'กรุณาระบุคุณลักษณะงานเฉพาะตำแหน่ง';
    if (!courseTitle.trim()) newErrors.courseTitle = 'กรุณาระบุชื่อหลักสูตร/โครงการ';
    if (!organizer.trim()) newErrors.organizer = 'กรุณาระบุหน่วยงานผู้จัด';
    if (categories.length === 0) newErrors.categories = 'กรุณาเลือกอย่างน้อย 1 หมวดหมู่';
    if (!workApplication.trim()) newErrors.workApplication = 'กรุณาระบุประโยชน์และการนำไปใช้ปฏิบัติงาน';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const recordData: TrainingRecord = {
      id: initialRecord?.id || `RCIM-${Date.now()}`,
      staffId,
      staffName,
      staffEmail,
      campus,
      staffType,
      isCollegeFaculty,
      academicPrograms: staffType === 'academic' ? academicPrograms : undefined,
      supportDeptGroup: staffType === 'support' ? supportDeptGroup : undefined,
      jobCharacteristics,
      courseTitle,
      categories,
      organizer,
      startDate,
      endDate,
      hours: Number(hours) || 6,
      location,
      locationType,
      expense: hasExpense ? Number(expense) : 0,
      knowledgeBefore,
      knowledgeAfter,
      workApplication,
      certificateFile,
      certificateFileName,
      submittedAt: initialRecord?.submittedAt || new Date().toISOString()
    };

    onSave(recordData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-700" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200 uppercase tracking-wider">
                RCIM Training Form
              </span>
              {initialRecord && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                  กำลังแก้ไขรายการ #{initialRecord.id.slice(-6)}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              แบบฟอร์มบันทึกข้อมูลการฝึกอบรมบุคลากร
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์ (RCIM) กรุณากรอกข้อมูลเพื่อสร้างรายงานผลและส่งออกเอกสารราชการ
            </p>
          </div>

          <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 shrink-0">
            อ้างอิง: HR-2569-RCIM
          </div>
        </div>
      </div>

      {/* AI Fast Fill Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 border border-indigo-800 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Fast Fill — วางข้อความเพื่อกรอกแบบฟอร์มอัตโนมัติ</h3>
                <span className="px-2 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-md shadow-xs">
                  SMART AI
                </span>
              </div>
              <p className="text-xs text-slate-300">
                วางข้อความจากหนังสือเชิญอบรม กำหนดการ หรืออีเมล ระบบจะเติมชื่อหลักสูตร วันที่ ชั่วโมง และงบประมาณให้อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Input Textarea for AI parsing */}
        <div className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="วางข้อความที่นี่... (เช่น โครงการพัฒนาทักษะ AI การจัดการเมือง ณ ศาลายา วันที่ 20-22 สิงหาคม 2569 รวม 18 ชั่วโมง ค่าลงทะเบียน 2,500 บาท...)"
            rows={3}
            className="w-full bg-slate-900/90 text-slate-100 text-xs rounded-xl p-3 border border-indigo-700/60 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all placeholder:text-slate-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px]">ทดสอบข้อความตัวอย่าง:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = "โครงการอบรมเชิงปฏิบัติการ การประยุกต์ใช้ AI ในการพัฒนาองค์กร จัดโดย วิทยาลัยนวัตกรรมการจัดการ ระหว่างวันที่ 15-16 พฤษภาคม 2569 รวม 12 ชั่วโมง ณ ศาลายา ค่าลงทะเบียน 3,500 บาท";
                  setRawText(sample);
                  handleAiFastFill(sample);
                }}
                className="px-2.5 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 rounded-lg text-[11px] transition-colors"
              >
                อบรม AI สถาบัน (ใช้บ่อย)
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = "การสัมมนาวิชาการมุมมองอนาคตการพัฒนาเมืองยุคดิจิทัล โดย สมาคมวิจัยและพัฒนาวิชาการ จัดแบบออนไลน์ Zoom Meeting วันที่ 10 มิถุนายน 2569 ระยะเวลา 6 ชั่วโมง ฟรีไม่มีค่าใช้จ่าย";
                  setRawText(sample);
                  handleAiFastFill(sample);
                }}
                className="px-2.5 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 rounded-lg text-[11px] transition-colors"
              >
                สัมมนามุมมองอนาคต (ฟรี)
              </button>
            </div>

            <button
              type="button"
              disabled={isParsing || !rawText.trim()}
              onClick={() => handleAiFastFill()}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isParsing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์และกรอกแบบฟอร์ม'}</span>
            </button>
          </div>

          {aiStatusMessage && (
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{aiStatusMessage}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 1: Staff Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#EEF2FF] text-[#5B46F6] rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">1. ข้อมูลผู้เข้าร่วมฝึกอบรม</h3>
                  <p className="text-xs text-slate-500 font-medium">ค้นหาชื่อบุคลากรจากฐานข้อมูล hr_data RCIM</p>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-800 text-[11px] font-medium flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ไม่ต้องล็อกอิน — กรอกข้อมูลได้ทันที</span>
              </div>
            </div>
          </div>

          {/* Smart Search Field with Autocomplete & Manual Self-Fill */}
          <div className="space-y-2 relative" ref={staffDropdownRef}>
            <label className="text-xs font-bold text-slate-800 block">
              ชื่อ–สกุล * <span className="text-slate-400 font-normal">(ค้นหา Smart Search จาก hr_data)</span>
            </label>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setStaffName(val);
                  setShowStaffDropdown(val.trim().length > 0);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setShowStaffDropdown(true);
                }}
                placeholder="ค้นหาชื่อบุคลากร (พิมพ์ชื่อได้เลยไม่ต้องใส่คำนำหน้า เช่น กอบกูล, กัณฑ์ศิชา)..."
                required
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#5B46F6] rounded-2xl text-xs text-slate-900 focus:ring-2 focus:ring-[#5B46F6]/20 outline-none transition-all placeholder:text-slate-400 font-medium shadow-xs"
              />
            </div>

            {/* Smart Search Autocomplete Dropdown - Only show when typing */}
            {showStaffDropdown && searchQuery.trim().length > 0 && (() => {
              // Filter to include only teacher and support sheet names, and exclude olddata items
              const matchingStaff = staffList.filter(s => {
                if (!s) return false;
                
                // Keep only teacher and support, exclude admin
                const sheet = (s.sheetName || '').toLowerCase().trim();
                if (sheet !== 'teacher' && sheet !== 'support') {
                  return false;
                }
                
                // Exclude olddata or simulated ID rows
                if (s.id && (s.id.startsWith('olddata_') || s.id.includes('olddata'))) {
                  return false;
                }

                const q = searchQuery.toLowerCase().trim();
                const qClean = cleanThaiName(q).toLowerCase();
                const nameLower = (s.name || '').toLowerCase();
                const nameClean = cleanThaiName(nameLower).toLowerCase();
                
                return nameLower.includes(q) || 
                       nameClean.includes(qClean) || 
                       (s.id || '').toLowerCase().includes(q) || 
                       (s.email || '').toLowerCase().includes(q) || 
                       (s.dept || '').toLowerCase().includes(q);
              });

              // Deduplicate matching staff by clean name (removing titles and extra spacing)
              const uniqueStaffMap = new Map<string, HRStaffItem>();
              matchingStaff.forEach(s => {
                const cleanName = cleanThaiName(s.name);
                
                const existing = uniqueStaffMap.get(cleanName);
                if (!existing) {
                  uniqueStaffMap.set(cleanName, s);
                } else {
                  const sHasPrefix = /^(ผศ|รศ|ดร|อ|อาจารย์|นาย|นาง|นางสาว)/.test(s.name);
                  const extHasPrefix = /^(ผศ|รศ|ดร|อ|อาจารย์|นาย|นาง|นางสาว)/.test(existing.name);
                  const sHasStandardId = /^\d+$/.test(s.id || '');
                  const extHasStandardId = /^\d+$/.test(existing.id || '');

                  // Keep the one with a standard ID or formal academic/support prefixes
                  if ((sHasStandardId && !extHasStandardId) || (sHasPrefix && !extHasPrefix)) {
                    uniqueStaffMap.set(cleanName, s);
                  }
                }
              });

              const deduplicatedStaff = Array.from(uniqueStaffMap.values());

              return (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                  {deduplicatedStaff.length > 0 ? (
                    deduplicatedStaff.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectStaffPreset(s)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50/90 transition-colors flex items-center justify-between group cursor-pointer border-b border-slate-100 last:border-b-0"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-[#5B46F6]">
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {s.email || `${s.id}@rmutr.ac.th`} | พื้นที่{s.campus || 'ศาลายา'}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-xs text-[#5B46F6] shrink-0 ml-4">
                          {s.id}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-500">
                      ไม่พบชื่อตรงตามการค้นหา — สามารถพิมพ์ชื่อแล้วกรอกข้อมูลด้านล่างได้ทันที
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* คุณลักษณะงานเฉพาะตำแหน่ง - อยู่ใต้ ชื่อ-สกุล ในส่วนที่ 1 เดียวกัน */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">คุณลักษณะงานเฉพาะตำแหน่ง *</label>
              <input
                type="text"
                value={jobCharacteristics}
                onChange={(e) => {
                  setJobCharacteristics(e.target.value);
                  if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                }}
                placeholder="เช่น อาจารย์ผู้รับผิดชอบหลักสูตร, เจ้าหน้าที่ธุรการบริการทั่วไป..."
                className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-400 ${
                  errors.jobCharacteristics ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              />
              {errors.jobCharacteristics && <p className="text-[11px] text-red-600 mt-1">{errors.jobCharacteristics}</p>}
            </div>

            {/* Quick Suggestions based on staffType */}
            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-medium block">คำแนะนำ / ข้อความแนะนำเพื่อกรอกด่วน:</span>
              <div className="flex flex-wrap gap-2">
                {staffType === 'academic' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('อาจารย์ผู้รับผิดชอบหลักสูตรและจัดกระบวนการเรียนรู้');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs transition-all border border-indigo-100 font-medium cursor-pointer"
                    >
                      อาจารย์ผู้รับผิดชอบหลักสูตร
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('อาจารย์ผู้สอนหลักสูตรระดับบัณฑิตศึกษาและวิจัยนวัตกรรม');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs transition-all border border-indigo-100 font-medium cursor-pointer"
                    >
                      อาจารย์ระดับบัณฑิตศึกษา & วิจัย
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('อาจารย์ผู้สอนและพัฒนานักศึกษาตามมาตรฐานวิชาชีพ');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs transition-all border border-indigo-100 font-medium cursor-pointer"
                    >
                      อาจารย์ผู้สอนตามมาตรฐานวิชาชีพ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('ผู้ปฏิบัติงานสายสนับสนุนเพื่อขับเคลื่อนงานยุทธศาสตร์และธุรการ');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs transition-all border border-amber-100 font-medium cursor-pointer"
                    >
                      ฝ่ายสนับสนุนยุทธศาสตร์ & ธุรการ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('นักวิชาการศึกษาผู้ประสานงานบริการการเรียนการสอนและประกันคุณภาพ');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs transition-all border border-amber-100 font-medium cursor-pointer"
                    >
                      นักวิชาการศึกษา & ประกันคุณภาพ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJobCharacteristics('ผู้บริหารจัดการและประสานงานบริการทั่วไปและเครือข่ายสัมพันธ์');
                        if (errors.jobCharacteristics) setErrors({ ...errors, jobCharacteristics: '' });
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs transition-all border border-amber-100 font-medium cursor-pointer"
                    >
                      ฝ่ายบริการทั่วไป & ประชาสัมพันธ์
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Course Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">2. ข้อมูลการเข้าร่วมฝึกอบรม/สัมมนาและโครงการ</h3>
              <p className="text-xs text-slate-500 font-medium">รายละเอียดหลักสูตร หมวดหมู่ และหน่วยงานที่จัด</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">ชื่อหลักสูตรที่เข้าร่วม *</label>
            <textarea
              value={courseTitle}
              onChange={(e) => {
                setCourseTitle(e.target.value);
                if (errors.courseTitle) setErrors({ ...errors, courseTitle: '' });
              }}
              rows={3}
              placeholder="ระบุชื่อหลักสูตรเต็ม..."
              className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-400 ${
                errors.courseTitle ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
              }`}
            />
            {errors.courseTitle && <p className="text-[11px] text-red-600 mt-1">{errors.courseTitle}</p>}
          </div>

          {/* Location Type */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-2">ประเภทการอบรม *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'online' as LocationType, label: '💻 ออนไลน์ (Online)' },
                { type: 'onsite' as LocationType, label: '📗 ออนไซต์ (On-site)' },
                { type: 'hybrid' as LocationType, label: '↗️ ผสมผสาน (Hybrid)' },
              ].map((loc) => (
                <button
                  key={loc.type}
                  type="button"
                  onClick={() => setLocationType(loc.type)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    locationType === loc.type
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Checkboxes */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-xs font-bold text-slate-800">หมวดหมู่ *</label>
              <span className="text-[11px] text-slate-400 font-normal">(เลือกได้มากกว่า 1 หมวดหมู่)</span>
            </div>
            
            <div className="space-y-2.5">
              {[
                {
                  title: 'ด้านวิชาการและการวิจัย (Academic & Research Skills)',
                  subtitle: 'ครอบคลุม: นวัตกรรมการสอน, การพัฒนาหลักสูตรระดับบัณฑิตศึกษา, ระเบียบวิธีวิจัย, และการให้คำปรึกษาวิทยานิพนธ์',
                  catValue: 'ด้านวิชาการและการวิจัย'
                },
                {
                  title: 'ด้านเทคโนโลยี ปัญญาประดิษฐ์ และระบบอัตโนมัติ (Digital, AI & Automation)',
                  subtitle: 'ครอบคลุม: การประยุกต์ใช้ AI เพื่อการวิจัย, วิทยาการข้อมูล, และการใช้สคริปต์หรือระบบอัตโนมัติเพื่อลดภาระงานบริหารและธุรการ',
                  catValue: 'ด้านเทคโนโลยีดิจิทัลและ AI'
                },
                {
                  title: 'ด้านยุทธศาสตร์ นวัตกรรม และความยั่งยืน (Strategy, Innovation & ESG)',
                  subtitle: 'ครอบคลุม: การบริหารองค์กร, แนวคิดด้านสิ่งแวดล้อมและความยั่งยืน (ESG / Biodiversity), และการบริหารโครงการ',
                  catValue: 'ด้านการบริหารจัดการและการพัฒนาองค์กร'
                },
                {
                  title: 'ด้านทักษะกระบวนการคิดและการสื่อสาร (Cognitive & Soft Skills)',
                  subtitle: 'ครอบคลุม: การคิดเชิงวิเคราะห์, การคิดเชิงออกแบบ (Design Thinking), การแก้ปัญหาที่ซับซ้อน, และทักษะการนำเสนอ',
                  catValue: 'ด้านภาษาอังกฤษและการสื่อสารสากล'
                },
                {
                  title: 'อื่น ๆ',
                  subtitle: 'หลักสูตรฝึกอบรม หรือสัมมนาในหัวข้ออื่น ๆ นอกเหนือจาก 4 ด้านข้างต้น',
                  catValue: 'ด้านอื่น ๆ'
                }
              ].map((item, idx) => {
                const isSelected = categories.includes(item.catValue) || categories.includes(item.title);
                return (
                  <label
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setCategories(categories.filter(c => c !== item.catValue && c !== item.title));
                      } else {
                        setCategories([...categories, item.catValue]);
                      }
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-300 text-slate-900 font-medium shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 border-slate-300"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">{item.subtitle}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.categories && <p className="text-[11px] text-red-600 mt-1">{errors.categories}</p>}
          </div>

          {/* Organizer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">ประเภทหน่วยงานที่จัด *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrganizerType('internal');
                    setOrganizer('วิทยาลัยนวัตกรรมการจัดการ (RCIM)');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                    organizerType === 'internal'
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ภายใน (RMUTR / RCIM)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrganizerType('external');
                    setOrganizer('สถาบันภายนอก');
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                    organizerType === 'external'
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ภายนอกสถาบัน
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">ชื่อหน่วยงานที่จัด *</label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="เช่น มทร.รัตนโกสินทร์, สวทช..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Dates & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">เริ่มต้น *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">สิ้นสุด *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Location & Expense */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">งบประมาณ *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setHasExpense(false);
                  setExpense(0);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  !hasExpense
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ไม่ใช้งบประมาณ
              </button>
              <button
                type="button"
                onClick={() => setHasExpense(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  hasExpense
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ใช้งบประมาณ
              </button>
            </div>

            {hasExpense && (
              <div className="mt-2.5 flex items-center gap-1.5 bg-white border border-indigo-300 rounded-xl p-2">
                <span className="text-xs font-bold text-indigo-800 px-2">฿</span>
                <input
                  type="number"
                  min="0"
                  value={expense}
                  onChange={(e) => setExpense(Number(e.target.value))}
                  placeholder="ระบุจำนวนเงิน (บาท)"
                  className="w-full text-xs font-bold text-slate-900 outline-none"
                />
                <span className="text-xs text-slate-500 pr-2">บาท</span>
              </div>
            )}
          </div>

        </div>

        {/* SECTION 3: Knowledge Assessment & Work Application */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">3. ประโยชน์ที่ได้รับจากการเข้าร่วม</h3>
              <p className="text-xs text-slate-500 font-medium">ประเมินระดับความรู้ความเข้าใจ (1-5) และการนำไปประยุกต์ใช้ในการปฏิบัติงาน</p>
            </div>
          </div>

          {/* Rating Matrix */}
          <div className="bg-[#FAFBFD] p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-xs font-bold text-slate-800">ระดับความรู้ความเข้าใจ (1-5)</span>
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-4">
                <span><strong className="text-indigo-600 font-extrabold">1</strong> – น้อยที่สุด</span>
                <span><strong className="text-indigo-600 font-extrabold">5</strong> – มากที่สุด</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-700">ก่อนการอบรม *</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setKnowledgeBefore(val)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                      knowledgeBefore === val
                        ? 'bg-[#4F46E5] text-white shadow-xs border border-indigo-600'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs font-bold text-slate-700">หลังการอบรม *</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setKnowledgeAfter(val)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                      knowledgeAfter === val
                        ? 'bg-[#4F46E5] text-white shadow-xs border border-indigo-600'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">ความรู้ที่นำไปประยุกต์ใช้ในการปฏิบัติงาน *</label>
              <button
                type="button"
                onClick={handleEnhanceWorkAppText}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI ช่วยเขียน / แนะนำข้อความ</span>
              </button>
            </div>

            <textarea
              value={workApplication}
              onChange={(e) => {
                setWorkApplication(e.target.value);
                if (errors.workApplication) setErrors({ ...errors, workApplication: '' });
              }}
              rows={3}
              placeholder="บรรยายสรุปสั้นๆ ถึงประโยชน์ที่ได้รับและการนำไปใช้งาน หรือกดปุ่ม '✨ AI ช่วยเขียน / แนะนำข้อความ' ด้านบน..."
              className={`w-full bg-slate-50 border rounded-xl p-3 text-xs text-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-400 ${
                errors.workApplication ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
              }`}
            />
            {errors.workApplication && <p className="text-[11px] text-red-600 mt-1">{errors.workApplication}</p>}
          </div>

          {/* Certificate File Attachment */}
          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>แนบไฟล์วุฒิบัตร / ใบประกาศนียบัตร (ถ้ามี)</span>
            </span>

            <div className="flex items-center gap-3">
              <input
                type="file"
                id="cert-upload-input"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="cert-upload-input"
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                {certificateFileName ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์ภาพ/PDF'}
              </label>

              {certificateFileName ? (
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{certificateFileName}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400">ยังไม่ได้เลือกไฟล์</span>
              )}
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {initialRecord && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              ยกเลิกการแก้ไข
            </button>
          )}

          <button
            type="submit"
            className="px-6 py-3 bg-[#4F46E5] hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>บันทึกข้อมูลและซิงค์ฐานข้อมูล</span>
          </button>
        </div>

      </form>

      {/* Google Sheets Sync Modal */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">ดึงข้อมูล HR_DATA จาก Google Sheets</h3>
                  <p className="text-xs text-slate-500 font-medium">ครอบคลุมทุก Sheet: teacher, admin, support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 block">
                Link หรือ ID ของ Google Sheets HR_DATA
              </label>
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="วาง Link Google Sheets เช่น https://docs.google.com/spreadsheets/d/1BxiMVs..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
              />

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200/70">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>ระบบจะอ่านข้อมูลบุคลากรจากทุก Sheet Tabs:</span>
                </div>
                <ul className="list-disc list-inside pl-2 text-[11px] text-slate-500 space-y-0.5">
                  <li><strong className="text-slate-700">teacher</strong>: อาจารย์ผู้สอน / อาจารย์สายวิชาการ</li>
                  <li><strong className="text-slate-700">admin</strong>: ฝ่ายบริหารและแผนงาน / เจ้าหน้าที่บริหาร</li>
                  <li><strong className="text-slate-700">support</strong>: สายสนับสนุน / ประชาสัมพันธ์ / วิชาการศึกษา</li>
                </ul>
              </div>

              {sheetsSyncMsg && (
                <div className={`p-3 rounded-xl text-xs space-y-1 font-medium ${
                  sheetsSyncMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : sheetsSyncMsg.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {sheetsSyncMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{sheetsSyncMsg.text}</span>
                  </div>

                  {sheetsSyncMsg.details && Array.isArray(sheetsSyncMsg.details) && (
                    <div className="pt-2 mt-1 border-t border-emerald-200/60 flex flex-wrap gap-1.5">
                      {sheetsSyncMsg.details.map((sh: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white rounded border border-emerald-200 text-[10px] text-emerald-900 font-semibold">
                          Sheet "{sh.title}": {sh.count} รายการ
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={isSyncingSheets}
                onClick={() => handleSyncGoogleSheets()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheets ? 'กำลังดึงข้อมูลทุก Sheet...' : 'เริ่มดึง/ซิงค์ข้อมูล Google Sheets'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
