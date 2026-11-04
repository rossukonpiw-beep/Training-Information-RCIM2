import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, FileText, Download, Edit3, Trash2, Eye, 
  Building, Calendar, Clock, Star, ArrowRight, ShieldCheck, CheckCircle2,
  FileSpreadsheet, Sparkles, Printer, Lock, RefreshCw,
  Database, HelpCircle, Check, Copy, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { TrainingRecord, FilterOptions, TRAINING_CATEGORIES } from '../types';
import { exportIndividualDocx } from '../utils/docxExporter';
import { UserProfile } from './LoginModal';

interface TrainingTableProps {
  records: TrainingRecord[];
  onSelectRecord: (record: TrainingRecord) => void;
  onEditRecord: (record: TrainingRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenForm: () => void;
  onExportExcel: () => void;
  onExportDocx: (record: TrainingRecord) => void;
  onExportHrDocx: (record: TrainingRecord) => void;
  currentUser: UserProfile | null;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  onRefresh?: () => Promise<void>;
  sharedFilter: FilterOptions;
  setSharedFilter: React.Dispatch<React.SetStateAction<FilterOptions>>;
}

export const TrainingTable: React.FC<TrainingTableProps> = ({
  records,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  onOpenForm,
  onExportExcel,
  onExportDocx,
  onExportHrDocx,
  currentUser,
  categoryFilter,
  setCategoryFilter,
  onRefresh,
  sharedFilter,
  setSharedFilter
}) => {
  const filter = sharedFilter;
  const setFilter = setSharedFilter;

  const activeCategory = categoryFilter || filter.category;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'reviewer';
  const canDelete = currentUser?.role === 'admin';

  const [isSyncingLocal, setIsSyncingLocal] = useState(false);



  // Function to fetch the absolute latest records from the server database
  const fetchLatestRecords = async () => {
    setIsSyncingLocal(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to fetch latest records:", err);
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // 1. Fetch on component mount to make sure the Report database is perfectly up-to-date
  useEffect(() => {
    fetchLatestRecords();
  }, []);

  // Filter and Sort records based on active filters (sorted by training date descending)
  const filteredRecords = records
    .filter(r => {
      // Search filter
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchName = (r.staffName || '').toLowerCase().includes(query);
        const matchCourse = (r.courseTitle || '').toLowerCase().includes(query);
        const matchId = (r.staffId || '').toLowerCase().includes(query);
        const matchOrganizer = (r.organizer || '').toLowerCase().includes(query);
        if (!matchName && !matchCourse && !matchId && !matchOrganizer) return false;
      }

      // Staff Type Filter
      if (filter.staffType !== 'all' && r.staffType !== filter.staffType) {
        return false;
      }

      // Campus Filter
      if (filter.campus !== 'all' && r.campus !== filter.campus) {
        return false;
      }

      // Category Filter
      if (activeCategory !== 'all' && activeCategory !== '') {
        const shortCat = activeCategory.replace('ด้าน', '').trim();
        const matchCat = (r.categories || []).some(c => c.includes(shortCat) || c === activeCategory);
        if (!matchCat) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.startDate || '';
      const dateB = b.startDate || '';
      return dateB.localeCompare(dateA);
    });

  const handlePrintClick = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุมัติสิทธิ์ป๊อปอัป (Allow Popups) สำหรับเว็บไซต์นี้แล้วลองอีกครั้งครับ");
        return;
      }

      const totalHours = filteredRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
      const totalExpense = filteredRecords.reduce((sum, r) => sum + (r.expense || 0), 0).toLocaleString('th-TH');
      const uniqueStaff = new Set(filteredRecords.map(r => r.staffName)).size;
      const todayString = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

      const rowsHTML = filteredRecords.map((record, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-weight: bold; color: #0f172a;">
            <div>${record.staffName}</div>
            <div style="font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px;">
              ${record.campus} | ${record.staffType === 'academic' ? 'สายวิชาการ' : 'สายสนับสนุน'}
            </div>
          </td>
          <td style="color: #1e293b;">
            <div style="font-weight: 600;">${record.courseTitle}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">ผู้จัด: ${record.organizer}</div>
          </td>
          <td style="text-align: center;">
            <div style="font-size: 10px;">${record.startDate}</div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 11px; margin-top: 2px;">${record.hours} ชม.</div>
          </td>
          <td style="text-align: right; font-weight: bold; color: #0f172a;">
            ${record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : 'ไม่มีค่าใช้จ่าย'}
          </td>
          <td style="text-align: center; font-weight: 800; color: #1d4ed8;">
            ${record.knowledgeBefore} ➔ ${record.knowledgeAfter}
          </td>
        </tr>
      `).join('');

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>รายงานสรุปการอบรมและพัฒนาบุคลากร - วิทยาลัยนวัตกรรมการจัดการ</title>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                padding: 0 !important;
                margin: 0 !important;
              }
              @page {
                size: A4 portrait;
                margin: 1.5cm 1cm 1.5cm 1cm;
              }
            }
            body {
              font-family: 'Sarabun', sans-serif;
              color: #1e293b;
              padding: 20px;
              margin: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .toolbar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 12px 20px;
              border-radius: 12px;
              margin-bottom: 30px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .toolbar-title {
              font-size: 13px;
              font-weight: 600;
              color: #334155;
            }
            .toolbar-actions {
              display: flex;
              gap: 10px;
            }
            .btn {
              padding: 8px 16px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 8px;
              cursor: pointer;
              border: none;
              transition: all 0.15s ease;
            }
            .btn-primary {
              background-color: #4f46e5;
              color: white;
            }
            .btn-primary:hover {
              background-color: #4338ca;
            }
            .btn-secondary {
              background-color: #e2e8f0;
              color: #334155;
            }
            .btn-secondary:hover {
              background-color: #cbd5e1;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
            }
            .header h2 {
              margin: 6px 0 0 0;
              font-size: 15px;
              font-weight: 700;
              color: #334155;
            }
            .header p {
              margin: 6px 0 0 0;
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
            }
            .filters {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              font-size: 11.5px;
              background-color: #f8fafc;
              padding: 12px 16px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .filter-item {
              font-weight: 700;
              color: #1e293b;
            }
            .filter-item span {
              font-weight: 500;
              color: #475569;
              margin-left: 4px;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .metric-card {
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 10px;
              border-radius: 8px;
              text-align: center;
            }
            .metric-title {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .metric-value {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 35px;
            }
            th, td {
              border: 1px solid #475569;
              padding: 8px 10px;
              vertical-align: top;
              line-height: 1.5;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #0f172a;
              text-align: left;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 11.5px;
              page-break-inside: avoid;
            }
            .signature-block {
              text-align: center;
              width: 250px;
            }
            .signature-space {
              margin-bottom: 60px;
            }
          </style>
        </head>
        <body>
          <div class="toolbar no-print">
            <div class="toolbar-title">📄 หน้าต่างสั่งพิมพ์รายงานสรุป (วิทยาลัยนวัตกรรมการจัดการ)</div>
            <div class="toolbar-actions">
              <button class="btn btn-primary" onclick="window.print()">🖨️ กดปุ่มสั่งพิมพ์ (Print)</button>
              <button class="btn btn-secondary" onclick="window.close()">ปิดหน้าต่างนี้ (Close)</button>
            </div>
          </div>

          <div class="header">
            <h1>รายงานสรุปการอบรมและพัฒนาบุคลากร</h1>
            <h2>วิทยาลัยนวัตกรรมการจัดการ มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์ (RCIM)</h2>
            <p>ข้อมูล ณ วันที่: ${todayString}</p>
          </div>

          <div class="filters">
            <div class="filter-item">แผนงานพัฒนา:<span>${filter.staffType === 'all' ? 'ทุกประเภทบุคลากร' : filter.staffType === 'academic' ? 'สายวิชาการ (อาจารย์)' : 'สายสนับสนุน'}</span></div>
            <div class="filter-item">วิทยาเขตสังกัด:<span>${filter.campus === 'all' ? 'ทุกพื้นที่สังกัด' : filter.campus}</span></div>
            <div class="filter-item">หมวดหมู่เป้าหมาย:<span>${activeCategory === 'all' || !activeCategory ? 'ทุกหมวดหมู่การพัฒนา' : activeCategory}</span></div>
          </div>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-title">จำนวนหลักสูตร/โครงการ</div>
              <div class="metric-value">${filteredRecords.length} รายการ</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">รวมชั่วโมงฝึกอบรม</div>
              <div class="metric-value">${totalHours} ชั่วโมง</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">รวมงบประมาณที่ใช้</div>
              <div class="metric-value">${totalExpense} บาท</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">จำนวนบุคลากรผู้เข้าอบรม</div>
              <div class="metric-value">${uniqueStaff} คน</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">ลำดับ</th>
                <th style="width: 180px;">ข้อมูลบุคลากร</th>
                <th>รายละเอียดหลักสูตร / โครงการ</th>
                <th style="text-align: center; width: 100px;">วันที่ / ชม.</th>
                <th style="text-align: right; width: 110px;">งบประมาณ</th>
                <th style="text-align: center; width: 70px;">ก่อน➔หลัง</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-block">
              <p class="signature-space">ลงชื่อ..............................................................</p>
              <p class="font-bold">(..............................................................)</p>
              <p style="color: #475569; margin: 4px 0 0 0;">ผู้รายงานผล / เจ้าหน้าที่ฝ่ายพัฒนาบุคลากร</p>
            </div>
            <div class="signature-block">
              <p class="signature-space">ลงชื่อ..............................................................</p>
              <p class="font-bold">(..............................................................)</p>
              <p style="color: #475569; margin: 4px 0 0 0;">ผู้อำนวยการวิทยาลัยนวัตกรรมการจัดการ</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();
    } catch (err) {
      console.error("Print window error:", err);
      alert("เกิดข้อผิดพลาดในการเปิดหน้าสั่งพิมพ์ กรุณาตรวจสอบสิทธิ์ป๊อปอัปของเบราว์เซอร์");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Style element for immaculate print output */}
      <style>{`
        @media print {
          body, #root, #root > div {
            background: white !important;
            background-color: white !important;
            color: black !important;
          }
          .print\\:hidden, header, nav, footer, #toast-container, button, select, input {
            display: none !important;
          }
          #printable-report {
            display: block !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 8px !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}</style>

      <div className="print:hidden space-y-4">
        {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">รายงานข้อมูลและส่งออกเอกสารราชการ (Reports & DOCX Export)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ทะเบียนข้อมูลการเข้าร่วมอบรม สามารถส่งออกเป็นไฟล์บันทึกข้อความ Word (.docx) หรือ Excel (.xlsx) ได้ทันที
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLatestRecords}
            disabled={isSyncingLocal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
            title="ซิงค์และรีเฟรชเพื่อดึงข้อมูลล่าสุดจากระบบส่วนกลาง"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingLocal ? 'animate-spin' : ''}`} />
            <span>{isSyncingLocal ? 'กำลังดึงข้อมูล...' : 'รีเฟรชฐานข้อมูล'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handlePrintClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
              title="พิมพ์รายงานสรุปทั้งหมดตามตัวกรองปัจจุบัน"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงานสรุป</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกสรุปเป็น Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export สรุปเป็น Excel</span>
            </button>
          )}
        </div>
      </div>



      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              placeholder="ค้นหาชื่อบุคลากร, ชื่อหลักสูตร, ผู้จัด..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Staff Type Filter */}
            <select
              value={filter.staffType}
              onChange={e => setFilter({ ...filter, staffType: e.target.value as any })}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">ทุกประเภทบุคลากร</option>
              <option value="academic">สายวิชาการ (อาจารย์)</option>
              <option value="support">สายสนับสนุน</option>
            </select>

            {/* Campus Filter */}
            <select
              value={filter.campus}
              onChange={e => setFilter({ ...filter, campus: e.target.value as any })}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">ทุกพื้นที่สังกัด</option>
              <option value="ศาลายา">ศาลายา</option>
              <option value="วังไกลกังวล">วังไกลกังวล</option>
            </select>

            {/* Category Filter */}
            <select
              value={activeCategory}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setFilter({ ...filter, category: e.target.value });
              }}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-[200px]"
            >
              <option value="all">ทุกหมวดหมู่การพัฒนา</option>
              {TRAINING_CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Reset Filter button */}
            {(filter.search || filter.staffType !== 'all' || filter.campus !== 'all' || activeCategory !== 'all') && (
              <button
                onClick={() => {
                  setFilter({ search: '', staffType: 'all', campus: 'all', category: 'all', startDate: '', endDate: '' });
                  setCategoryFilter('all');
                }}
                className="px-2.5 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            แสดง <span className="font-bold text-slate-900">{filteredRecords.length}</span> จากทั้งหมด <span className="font-bold text-slate-900">{records.length}</span> รายการ
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ลองปรับเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มบันทึกการอบรม" เพื่อสร้างรายการใหม่
            </p>
            <button
              onClick={onOpenForm}
              className="px-4 py-2 bg-blue-900 text-white font-medium text-xs rounded-xl hover:bg-blue-800 transition-all inline-block mt-2"
            >
              + บันทึกการอบรมใหม่
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700">
              
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">บุคลากรผู้รับการอบรม</th>
                  <th className="py-3.5 px-4">หลักสูตร / โครงการ</th>
                  <th className="py-3.5 px-4">หมวดหมู่ / ผู้จัด</th>
                  <th className="py-3.5 px-4">ระยะเวลา / ชม.</th>
                  <th className="py-3.5 px-4">ค่าใช้จ่าย</th>
                  <th className="py-3.5 px-4 text-center">ความรู้ ก่อน➔หลัง</th>
                  <th className="py-3.5 px-4 text-center">จัดการ / Export DOCX</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => {
                  const isAcademic = record.staffType === 'academic';
                  const knowledgeDiff = record.knowledgeAfter - record.knowledgeBefore;

                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Staff Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{record.staffName}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              isAcademic 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}>
                              {isAcademic ? 'สายวิชาการ' : 'สายสนับสนุน'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {record.campus}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {isAcademic 
                              ? (record.academicPrograms?.[0] || record.isCollegeFaculty)
                              : (record.supportDeptGroup || record.supportDeptUnit || '-')
                            }
                          </div>
                        </div>
                      </td>

                      {/* Course Title */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={() => onSelectRecord(record)}
                              className="font-bold text-slate-900 hover:text-blue-700 text-left line-clamp-2 hover:underline transition-colors"
                            >
                              {record.courseTitle}
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'}
                            </span>
                            {record.certificateFileName && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> วุฒิบัตร
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categories & Organizer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {(record.categories || []).map((cat, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                                {cat.replace('ด้าน', '')}
                              </span>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            ผู้จัด: {record.organizer}
                          </div>
                        </div>
                      </td>

                      {/* Duration & Hours */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{record.hours} ชั่วโมง</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>เริ่ม: {record.startDate}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>สิ้นสุด: {record.endDate || record.startDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Expense */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                        {record.expense > 0 ? (
                          <span className="text-slate-900 font-bold">{record.expense.toLocaleString('th-TH')} ฿</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">ไม่มีค่าใช้จ่าย</span>
                        )}
                      </td>

                      {/* Knowledge Before & After */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-medium">{record.knowledgeBefore}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-700 font-bold">{record.knowledgeAfter}</span>
                          <span className="ml-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">
                            +{knowledgeDiff}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View detail button */}
                          <button
                            onClick={() => onSelectRecord(record)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="ดูรายละเอียดรายงาน"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Export DOCX button */}
                          <button
                            onClick={() => onExportDocx(record)}
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title={isAdmin ? "ส่งออกบันทึกข้อความ Word (.docx)" : "จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ"}
                          >
                            {isAdmin ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4 text-blue-200" />}
                            <span className="text-[10px] font-bold hidden xl:inline">Export DOCX</span>
                            {!isAdmin && <span className="text-[9px] font-normal text-blue-200 bg-blue-900/40 px-1 rounded">Admin</span>}
                          </button>

                          {/* Export DOCX-HR button */}
                          <button
                            onClick={() => onExportHrDocx(record)}
                            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title={isAdmin ? "ส่งออกแบบสำรวจคุณลักษณะงาน HR Word (.docx)" : "จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ"}
                          >
                            {isAdmin ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4 text-purple-200" />}
                            <span className="text-[10px] font-bold hidden xl:inline">Export DOCX-HR</span>
                            {!isAdmin && <span className="text-[9px] font-normal text-purple-200 bg-purple-900/40 px-1 rounded">Admin</span>}
                          </button>

                          {/* Edit button - strictly restricted to Admins */}
                          {isAdmin && (
                            <button
                              onClick={() => onEditRecord(record)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete button - strictly restricted to Admins */}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRecord(record.id);
                              }}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Printable section strictly hidden on screen, visible on print only */}
      <div className="hidden print:block text-black p-8 bg-white w-full max-w-4xl mx-auto font-sans" id="printable-report">
        <div className="text-center space-y-2 mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-extrabold tracking-wide text-slate-900">รายงานสรุปการอบรมและพัฒนาบุคลากร</h1>
          <h2 className="text-base font-bold text-slate-800">วิทยาลัยนวัตกรรมการจัดการ มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์ (RCIM)</h2>
          <p className="text-xs text-slate-600">ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Selected Filter Status */}
        <div className="mb-5 text-xs font-semibold text-slate-800 flex flex-wrap gap-4 bg-slate-50 p-3 rounded-lg border border-slate-300">
          <div><span className="text-slate-600 font-bold">แผนงานพัฒนา:</span> {filter.staffType === 'all' ? 'ทุกประเภทบุคลากร' : filter.staffType === 'academic' ? 'สายวิชาการ (อาจารย์)' : 'สายสนับสนุน'}</div>
          <div><span className="text-slate-600 font-bold">วิทยาเขตสังกัด:</span> {filter.campus === 'all' ? 'ทุกพื้นที่สังกัด' : filter.campus}</div>
          <div><span className="text-slate-600 font-bold">หมวดหมู่เป้าหมาย:</span> {activeCategory === 'all' || !activeCategory ? 'ทุกหมวดหมู่การพัฒนา' : activeCategory}</div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 border border-slate-400 rounded-lg text-center bg-slate-50">
            <div className="text-[10px] uppercase font-bold text-slate-600 mb-1">จำนวนหลักสูตร/โครงการ</div>
            <div className="text-base font-extrabold text-slate-950">{filteredRecords.length} รายการ</div>
          </div>
          <div className="p-3 border border-slate-400 rounded-lg text-center bg-slate-50">
            <div className="text-[10px] uppercase font-bold text-slate-600 mb-1">รวมชั่วโมงฝึกอบรม</div>
            <div className="text-base font-extrabold text-slate-950">
              {filteredRecords.reduce((sum, r) => sum + (r.hours || 0), 0)} ชั่วโมง
            </div>
          </div>
          <div className="p-3 border border-slate-400 rounded-lg text-center bg-slate-50">
            <div className="text-[10px] uppercase font-bold text-slate-600 mb-1">รวมงบประมาณที่ใช้</div>
            <div className="text-base font-extrabold text-slate-950">
              {filteredRecords.reduce((sum, r) => sum + (r.expense || 0), 0).toLocaleString('th-TH')} บาท
            </div>
          </div>
          <div className="p-3 border border-slate-400 rounded-lg text-center bg-slate-50">
            <div className="text-[10px] uppercase font-bold text-slate-600 mb-1">จำนวนบุคลากรผู้เข้าอบรม</div>
            <div className="text-base font-extrabold text-slate-950">
              {new Set(filteredRecords.map(r => r.staffName)).size} คน
            </div>
          </div>
        </div>

        {/* Report Table */}
        <table className="w-full text-left border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-400">
              <th className="py-2.5 px-2 border border-slate-400 text-center w-12">ลำดับ</th>
              <th className="py-2.5 px-2 border border-slate-400 w-44">ข้อมูลบุคลากร</th>
              <th className="py-2.5 px-2 border border-slate-400">รายละเอียดหลักสูตร / โครงการ</th>
              <th className="py-2.5 px-2 border border-slate-400 w-32 text-center">วันที่ / ชม.</th>
              <th className="py-2.5 px-2 border border-slate-400 w-28 text-right">งบประมาณ</th>
              <th className="py-2.5 px-2 border border-slate-400 w-20 text-center">ก่อน➔หลัง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-400">
            {filteredRecords.map((record, idx) => (
              <tr key={record.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-2 border border-slate-400 text-center font-bold">{idx + 1}</td>
                <td className="py-2.5 px-2 border border-slate-400 font-bold text-slate-900">
                  <div>{record.staffName}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{record.campus} | {record.staffType === 'academic' ? 'สายวิชาการ' : 'สายสนับสนุน'}</div>
                </td>
                <td className="py-2.5 px-2 border border-slate-400 text-slate-900 font-medium leading-relaxed">
                  {record.courseTitle}
                  <div className="text-[9px] text-slate-500 font-normal mt-0.5">ผู้จัด: {record.organizer}</div>
                </td>
                <td className="py-2.5 px-2 border border-slate-400 text-center">
                  <div className="text-[10px]">{record.startDate}</div>
                  <div className="font-bold text-[11px] text-indigo-900 mt-0.5">{record.hours} ชม.</div>
                </td>
                <td className="py-2.5 px-2 border border-slate-400 text-right font-bold text-slate-900">
                  {record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : 'ไม่มีค่าใช้จ่าย'}
                </td>
                <td className="py-2.5 px-2 border border-slate-400 text-center font-extrabold text-blue-900">
                  {record.knowledgeBefore} ➔ {record.knowledgeAfter}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Line */}
        <div className="mt-14 flex justify-between text-xs pt-10">
          <div className="text-center w-56">
            <p className="mb-14">ลงชื่อ..............................................................</p>
            <p className="font-bold">(..............................................................)</p>
            <p className="text-slate-500 mt-1">ผู้รายงานผล / เจ้าหน้าที่ฝ่ายพัฒนาบุคลากร</p>
          </div>
          <div className="text-center w-56">
            <p className="mb-14">ลงชื่อ..............................................................</p>
            <p className="font-bold">(..............................................................)</p>
            <p className="text-slate-500 mt-1">ผู้อำนวยการวิทยาลัยนวัตกรรมการจัดการ</p>
          </div>
        </div>
      </div>
    </div>
  );
};
