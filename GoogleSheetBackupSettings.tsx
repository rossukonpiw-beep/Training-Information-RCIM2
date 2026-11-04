import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, RefreshCw, CheckCircle2, AlertTriangle, 
  HelpCircle, Link, Settings, Database, CloudLightning, 
  UserCheck, LogOut, ArrowRight, ToggleLeft, ToggleRight,
  Calendar
} from 'lucide-react';
import { TrainingRecord } from '../types';
import { 
  getBackupSettings, 
  saveBackupSettings, 
  isGoogleAuthorized, 
  authorizeGoogleBackup, 
  logoutGoogleBackup,
  testBackupConnection, 
  performBackupToGoogleSheet,
  GOOGLE_CLIENT_ID
} from '../utils/googleSheetBackup';
import { UserProfile } from './LoginModal';

interface GoogleSheetBackupSettingsProps {
  records: TrainingRecord[];
  currentUser?: UserProfile | null;
}

export const GoogleSheetBackupSettings: React.FC<GoogleSheetBackupSettingsProps> = ({ records, currentUser }) => {
  const isUserAdmin = currentUser?.role === 'admin';

  // Read saved settings
  const [settings, setSettings] = useState(() => getBackupSettings());
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(settings.spreadsheetId);
  const [sheetNameInput, setSheetNameInput] = useState(settings.sheetName);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Connection states
  const [isAuthorized, setIsAuthorized] = useState(() => isGoogleAuthorized() || !!currentUser);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({ type: null, text: '' });
  
  // Stats
  const reportRowsCount = records.length;
  
  // Sync checks
  const isMatch = settings.lastSyncRows === reportRowsCount && settings.lastSyncMatch;

  useEffect(() => {
    // Check authorization status on load
    setIsAuthorized(isGoogleAuthorized() || !!currentUser);
  }, [currentUser]);

  // Save changes automatically when inputs/switches change
  const handleInputChange = (spreadsheetId: string, sheetName: string, auto: boolean) => {
    saveBackupSettings({ spreadsheetId, sheetName, autoBackup: auto });
    // Reload updated settings
    setSettings(getBackupSettings());
  };

  const handleAuthorize = () => {
    setIsLoading(true);
    setStatus({ type: 'info', text: 'กำลังเริ่มขั้นตอนลงชื่อเข้าใช้ Google...' });
    
    authorizeGoogleBackup(
      (token) => {
        setIsAuthorized(true);
        setIsLoading(false);
        setStatus({ type: 'success', text: 'เชื่อมต่อบัญชี Google สำเร็จ! มีสิทธิ์เข้าใช้งาน Spreadsheets แล้ว' });
      },
      (err) => {
        setIsAuthorized(false);
        setIsLoading(false);
        setStatus({ type: 'error', text: `การยืนยันสิทธิ์ไม่สำเร็จ: ${err}` });
      }
    );
  };

  const handleLogout = () => {
    logoutGoogleBackup();
    setIsAuthorized(false);
    setStatus({ type: 'info', text: 'ยกเลิกการเชื่อมต่อบัญชี Google ของท่านเรียบร้อยแล้ว' });
  };

  const handleTestConnection = async () => {
    if (!spreadsheetIdInput.trim()) {
      setStatus({ type: 'error', text: 'กรุณากรอก Google Sheet ID หรือวาง URL ก่อนทดสอบ' });
      return;
    }
    
    setIsLoading(true);
    setStatus({ type: 'info', text: 'กำลังทดสอบเชื่อมต่อและตรวจสอบสิทธิ์เขียนไฟล์...' });
    
    // Save current state first
    handleInputChange(spreadsheetIdInput, sheetNameInput, true);

    const result = await testBackupConnection(spreadsheetIdInput, sheetNameInput);
    setIsLoading(false);
    
    if (result.success) {
      setStatus({ type: 'success', text: result.message });
    } else {
      setStatus({ type: 'error', text: result.message });
    }
  };

  const handleManualBackup = async () => {
    if (!spreadsheetIdInput.trim()) {
      setStatus({ type: 'error', text: 'กรุณากรอก Google Sheet ID หรือวาง URL ของไฟล์เป้าหมายก่อน' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', text: 'กำลังดำเนินการจัดเตรียมข้อมูลและอัปโหลดไปยัง Google Sheet...' });
    
    // Ensure the latest settings are written before backup
    handleInputChange(spreadsheetIdInput, sheetNameInput, true);

    const result = await performBackupToGoogleSheet(records);
    setIsLoading(false);
    
    if (result.success) {
      setStatus({ type: 'success', text: result.message });
      // Reload states for stats/verification UI
      setSettings(getBackupSettings());
    } else {
      setStatus({ type: 'error', text: result.message });
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-800 space-y-1.5 shadow-xs print:hidden">
        <div className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>ระบบสำรองข้อมูล: ยังไม่ได้ตั้งค่า Client ID ในไฟล์ googleSheetBackup.ts</span>
        </div>
        <p className="text-amber-700">ส่วนสำรองข้อมูลไป Google Sheet นอกจะยังไม่ทำงาน แต่การใช้งานส่วนอื่นๆ ของแอปพลิเคชันยังบันทึกได้ปกติครับ</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/95 shadow-xs overflow-hidden print:hidden transition-all duration-300">
      
      {/* Mini Collapsible Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 bg-slate-50/80 hover:bg-slate-100/50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-200/40 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
              <span>สำรองข้อมูลไป google sheet ภายนอก สำหรับผู้ดูแลระบบเท่านั้น</span>
              {settings.lastSyncTime && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all animate-pulse ${
                  isMatch 
                    ? 'bg-emerald-500 text-white border border-emerald-400 font-black' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isMatch && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  <span>{isMatch ? 'ซิงค์ตรงกัน' : 'ต้องการซิงค์'}</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              เขียนทับสำรองลงแผ่นงาน Google Sheets ส่วนตัวด้วยโครงสร้างแบบอัจฉริยะแบบ "เพิ่มเข้าไป" เท่านั้น
            </p>
          </div>
        </div>
        
        <button 
          type="button" 
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
        >
          <Settings className={`w-4 h-4 transform transition-transform duration-300 ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Settings Form Body - Expandable */}
      {isExpanded && (
        <div className="p-5 md:p-6 space-y-5 animate-in slide-in-from-top-4 fade-in duration-200">
          
          {/* Prominent Sync Status Banner */}
          {settings.lastSyncTime && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isMatch 
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/10' 
                : 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  {isMatch ? (
                    <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-white shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black leading-snug">
                    สถานะการสำรองข้อมูล: {isMatch ? 'ซิงค์ตรงกัน 100%' : 'ยังไม่ได้รับการซิงค์ปัจจุบัน'}
                  </h4>
                  <p className="text-[11px] text-white/90 mt-0.5 font-medium">
                    {isMatch 
                      ? 'ข้อมูลรายงานบนระบบส่วนกลางและบน Google Sheet ตรงกันสมบูรณ์เรียบร้อยแล้ว' 
                      : 'มีรายการข้อมูลใหม่บนระบบที่รอการอัปโหลดไปปรับใช้บน Google Sheet เพื่อซิงค์ข้อมูลให้ตรงกัน'}
                  </p>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black shadow-xs shrink-0 self-start sm:self-auto uppercase tracking-wide border ${
                isMatch ? 'bg-white text-emerald-700 border-white' : 'bg-white text-amber-700 border-white animate-pulse'
              }`}>
                {isMatch ? '★ ซิงค์ตรงกัน ★' : '⚠ ต้องการซิงค์'}
              </div>
            </div>
          )}

          {/* Warning Banner for Non-Admins */}
          {!isUserAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200/60 text-amber-800 rounded-xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถระบุหรือแก้ไขค่า Google Sheet ID หรือชื่อแท็บได้ (ท่านเข้าสู่ระบบในฐานะผู้ตรวจทานเท่านั้น)</span>
            </div>
          )}

          {/* Form Fields: Google Sheet ID & Sheet Name */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-slate-400" />
                  <span>Google Sheet ID*</span>
                </label>
                {isUserAdmin && !!spreadsheetIdInput && (
                  <button
                    type="button"
                    onClick={() => setIsUnlocked(!isUnlocked)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isUnlocked ? "🔒 ล็อกการแก้ไข" : "🔓 ปลดล็อกแก้ไข ID"}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={spreadsheetIdInput}
                disabled={!isUserAdmin || (!!spreadsheetIdInput && !isUnlocked)}
                onChange={(e) => {
                  setSpreadsheetIdInput(e.target.value);
                  handleInputChange(e.target.value, sheetNameInput, true);
                }}
                placeholder="วาง Link หรือ ID ของ Google Sheets เช่น 1AXZ1f3DihzHLsEk8T..."
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium ${(!isUserAdmin || (!!spreadsheetIdInput && !isUnlocked)) ? 'opacity-70 cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                ชื่อแท็บเป้าหมาย (Sheet Name)
              </label>
              <input
                type="text"
                value={sheetNameInput}
                disabled={!isUserAdmin}
                onChange={(e) => {
                  setSheetNameInput(e.target.value);
                  handleInputChange(spreadsheetIdInput, e.target.value, true);
                }}
                placeholder="ค่าเริ่มต้น: Backup"
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-bold ${!isUserAdmin ? 'opacity-70 cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
              />
            </div>
          </div>

          {/* Sync Stats & Live Verification Status */}
          {settings.lastSyncTime && (
            <div className="bg-[#FAFBFD] rounded-xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">บันทึกข้อมูลล่าสุด</span>
                <div className="space-y-1 text-slate-700 font-medium">
                  <div>เวลา: <strong className="text-slate-900">{settings.lastSyncTime}</strong></div>
                  <div>แท็บข้อมูล: <strong className="text-slate-900">"{settings.sheetName}"</strong> และ <strong className="text-slate-900">"BackupInfo"</strong></div>
                </div>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">การตรวจสอบความตรงกัน (Live Check)</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span>สถานะแถว:</span>
                    <span>
                      {isMatch 
                        ? `สำรองแล้ว ${settings.lastSyncRows} แถว / รายงาน ${reportRowsCount} แถว (ตรงกัน)` 
                        : `สำรอง ${settings.lastSyncRows} แถว / รายงาน ${reportRowsCount} แถว (ยังไม่ซิงค์)`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-slate-600">
                    <span>ยอดรวมแถวท้ายตาราง:</span>
                    <span className="text-indigo-700 font-extrabold">สำรองเรียบร้อยแล้ว</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Box / หมายเหตุ */}
          <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-4 text-xs space-y-2">
            <div className="font-extrabold text-blue-900 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>หมายเหตุขั้นตอนการสำรองข้อมูล:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 font-bold text-[11px] text-slate-700">
              <li>กดปุ่ม <span className="text-indigo-700 font-extrabold">"การเชื่อมต่อ"</span> เพื่อตรวจสอบสิทธิ์ความปลอดภัยการเชื่อมต่อไฟล์เป้าหมาย</li>
              <li>กดปุ่ม <span className="text-emerald-700 font-extrabold">"สำรองไป google sheet ตอนนี้"</span> เพื่อสำรองข้อมูลไปยัง sheet ปลายทาง</li>
            </ol>
          </div>

          {/* Action Status bar & retry buttons */}
          {status.type && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border ${
              status.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                : status.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200/60'
            }`}>
              <div className="flex items-center gap-2">
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${status.type === 'error' ? 'text-rose-600 animate-bounce' : 'text-indigo-600 animate-spin'}`} />
                )}
                <span>{status.text}</span>
              </div>

              {status.type === 'error' && (
                <button
                  type="button"
                  onClick={handleManualBackup}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 rounded border border-rose-300 font-bold shrink-0 transition-all cursor-pointer"
                >
                  ลองใหม่ (Retry)
                </button>
              )}
            </div>
          )}

          {/* Form Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading || !isAuthorized}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ตรวจสอบสิทธิ์การเขียนและ ID ไฟล์"
            >
              <span>การเชื่อมต่อ</span>
            </button>
            
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={isLoading || !isAuthorized}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
              style={{ boxShadow: '0 3px 10px rgba(16, 185, 129, 0.15)' }}
            >
              <Database className="w-3.5 h-3.5" />
              <span>สำรองไป Google Sheet ตอนนี้</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
