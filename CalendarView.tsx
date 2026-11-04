import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Building, 
  FileText, 
  Award,
  Download,
  CheckCircle,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { TrainingRecord } from '../types';
import { exportIndividualDocx } from '../utils/docxExporter';

interface CalendarViewProps {
  records: TrainingRecord[];
  onSelectRecord: (record: TrainingRecord) => void;
  onOpenForm: () => void;
  currentUser?: any;
  sharedFilter?: any;
  setSharedFilter?: (filter: any) => void;
  categoryFilter?: string;
  setCategoryFilter?: (category: string) => void;
  totalRecordsCount?: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  records,
  onSelectRecord,
  onOpenForm,
  currentUser,
  sharedFilter,
  setSharedFilter,
  categoryFilter,
  setCategoryFilter,
  totalRecordsCount = 0
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const isFilterActive = !!(
    sharedFilter && (
      sharedFilter.search ||
      sharedFilter.staffType !== 'all' ||
      sharedFilter.campus !== 'all' ||
      sharedFilter.category !== 'all' ||
      (categoryFilter && categoryFilter !== 'all')
    )
  );

  const [selectedEvent, setSelectedEvent] = useState<TrainingRecord | null>(null);

  const [listFilter, setListFilter] = useState<'month' | 'all'>(() => {
    const now = new Date();
    // Check if there are any events in the current calendar month
    const hasEventsThisMonth = records.some(r => {
      if (!r.startDate) return false;
      const [rYear, rMonth] = r.startDate.split('-').map(Number);
      return rYear === now.getFullYear() && (rMonth - 1) === now.getMonth();
    });
    return hasEventsThisMonth ? 'month' : 'all';
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const thaiYear = year + 543;

  // Days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to match records with a specific day
  const getRecordsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.filter((r) => {
      // Check if start date <= dateStr <= end date
      const start = r.startDate;
      const end = r.endDate || r.startDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Filter records to only those within the current displayed month and year
  const currentMonthRecordsSorted = [...records]
    .filter((r) => {
      if (!r.startDate) return false;
      const [rYear, rMonth] = r.startDate.split('-').map(Number);
      return rYear === year && (rMonth - 1) === month;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const allRecordsSorted = [...records]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const displayedRecords = listFilter === 'month' ? currentMonthRecordsSorted : allRecordsSorted;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">ปฏิทินการอบรมและพัฒนาบุคลากร (Training Calendar)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงกำหนดการโครงการฝึกอบรม สัมมนา และการพัฒนาตนเองตามช่วงเวลา
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          <button
            onClick={handleToday}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            style={{ 
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
              border: '2px solid #e0f2fe'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-100 animate-pulse animate-duration-1000" />
            <span>★ เดือนปัจจุบัน ★</span>
          </button>

          <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl border-2 border-blue-300 shadow-3xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg transition-all active:scale-90 cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
            <span className="px-3 text-xs font-black text-blue-950 min-w-[135px] text-center tracking-wide bg-white py-1 rounded-lg border border-blue-100 shadow-inner">
              {monthNamesThai[month]} {thaiYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg transition-all active:scale-90 cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {isFilterActive && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="p-1.5 bg-amber-200/60 rounded-lg text-amber-800">
              <CalendarIcon className="w-5 h-5 text-amber-700" />
            </span>
            <div className="text-xs">
              <span className="font-extrabold block text-[13px] text-amber-950">🔍 กำลังเชื่อมโยงและกรองข้อมูลตามหน้ารายงาน</span>
              <span className="text-amber-800 font-medium">
                ปฏิทินแสดงผลเฉพาะ <strong>{records.length}</strong> จาก <strong>{totalRecordsCount}</strong> รายการตามเงื่อนไขตัวกรองที่คุณระบุไว้ในหน้ารายงาน
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (setSharedFilter) {
                setSharedFilter({
                  search: '',
                  staffType: 'all',
                  campus: 'all',
                  category: 'all',
                  startDate: '',
                  endDate: ''
                });
              }
              if (setCategoryFilter) {
                setCategoryFilter('all');
              }
            }}
            className="self-start sm:self-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด (แสดงทั้งหมด)
          </button>
        </div>
      )}

      {/* Main Grid: Calendar + Event Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid (2 Cols on LG) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 py-2 border-b border-slate-100">
            <span className="text-red-500">อา.</span>
            <span>จ.</span>
            <span>อ.</span>
            <span>พ.</span>
            <span>พฤ.</span>
            <span>ศ.</span>
            <span className="text-blue-600">ส.</span>
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 bg-slate-50/40 rounded-xl border border-transparent" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayRecords = getRecordsForDay(day);
              const isToday = 
                day === new Date().getDate() && 
                month === new Date().getMonth() && 
                year === new Date().getFullYear();

              return (
                <div
                  key={`day-${day}`}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isToday 
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/30' 
                      : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-700 text-white' : 'text-slate-800'
                    }`}>
                      {day}
                    </span>
                    {dayRecords.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        {dayRecords.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges */}
                  <div className="space-y-1 overflow-y-auto max-h-[50px] scrollbar-none">
                    {dayRecords.map((r) => {
                      const isOnline = r.locationType === 'online';
                      const isHybrid = r.locationType === 'hybrid';
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedEvent(r);
                            onSelectRecord(r);
                          }}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold truncate block transition-transform active:scale-95 ${
                            isOnline
                              ? 'bg-blue-600 text-white'
                              : isHybrid
                              ? 'bg-teal-700 text-white'
                              : 'bg-indigo-700 text-white'
                          }`}
                          title={`${r.staffName}: ${r.courseTitle}`}
                        >
                          {r.courseTitle}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend Footer */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-600">สัญลักษณ์ประเภทการอบรม:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-700" />
              <span className="text-slate-700">ออนไซต์ (On-site)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-slate-700">ออนไลน์ (Online)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-700" />
              <span className="text-slate-700">ไฮบริด (Hybrid)</span>
            </div>
          </div>

        </div>

        {/* Selected Event Detail / Upcoming List */}
        <div className="flex flex-col gap-4 lg:h-[635px] lg:max-h-[635px] lg:overflow-hidden">
          
          {selectedEvent ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4 animate-in fade-in shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  รายละเอียดการอบรมที่เลือก
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  ปิดรายละเอียด
                </button>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold block">หลักสูตร:</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">{selectedEvent.courseTitle}</h4>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <User className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>ผู้เข้าอบรม: <strong className="text-slate-900">{selectedEvent.staffName}</strong> ({selectedEvent.staffId})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Building className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>ผู้จัด: <strong>{selectedEvent.organizer}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>วันที่: <strong>{selectedEvent.startDate} ถึง {selectedEvent.endDate}</strong> ({selectedEvent.hours} ชั่วโมง)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>สถานที่: <strong>{selectedEvent.location}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectRecord(selectedEvent)}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span>ดูรายงานฉบับเต็ม</span>
                </button>

                {(currentUser?.role === 'admin' || currentUser?.role === 'reviewer') && (
                  <button
                    onClick={() => exportIndividualDocx(selectedEvent)}
                    className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export DOCX</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3 shrink-0">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>คำแนะนำการใช้งานปฏิทิน</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {(currentUser?.role === 'admin' || currentUser?.role === 'reviewer')
                  ? 'คลิกที่ชื่อโครงการฝึกอบรมบนช่องวันที่ในปฏิทินเพื่อดูรายละเอียดการเข้าร่วมอบรม และส่งออกไฟล์บันทึกข้อความ Word (.docx) ได้ทันที'
                  : 'คลิกที่ชื่อโครงการฝึกอบรมบนช่องวันที่ในปฏิทินเพื่อดูรายละเอียดข้อมูลการเข้าร่วมโครงการพัฒนาบุคลากร'}
              </p>
            </div>
          )}

          {/* Upcoming Training List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>
                  {listFilter === 'month' ? `อบรมเดือนนี้ (${displayedRecords.length})` : `อบรมทั้งหมด (${displayedRecords.length})`}
                </span>
              </h3>
              
              {/* Filter pills */}
              <div className="bg-amber-50 p-1 rounded-xl flex items-center border-2 border-amber-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => setListFilter('month')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    listFilter === 'month'
                      ? 'bg-amber-600 text-white shadow-md font-extrabold'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50'
                  }`}
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    listFilter === 'all'
                      ? 'bg-amber-600 text-white shadow-md font-extrabold'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-[200px]">
              {displayedRecords.length > 0 ? (
                displayedRecords.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all space-y-1.5 group hover:shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-950 group-hover:text-blue-700 flex items-center gap-1.5">
                        <span>{r.staffName}</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                        {r.startDate}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1 flex items-center gap-1">
                      <span>{r.courseTitle}</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>{r.campus}</span>
                      <span className="font-semibold text-slate-700">{r.hours} ชั่วโมง</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {listFilter === 'month' 
                    ? `ไม่มีรายการอบรมในเดือน ${monthNamesThai[month]} ${thaiYear}`
                    : 'ไม่มีรายการอบรมในระบบ'}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
