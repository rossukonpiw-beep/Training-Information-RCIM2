import React from 'react';
import { 
  FileText, 
  Calendar, 
  BarChart3, 
  FileCheck, 
  PlusCircle, 
  FileSpreadsheet, 
  RotateCcw,
  UserCheck,
  LogOut,
  ShieldCheck,
  Lock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from './LoginModal';

export type ActiveTabType = 'form' | 'calendar' | 'dashboard' | 'reports';

interface NavbarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  onExportExcel: () => void;
  onResetData: () => void;
  recordCount: number;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onExportExcel,
  onResetData,
  recordCount,
  currentUser,
  onLogout,
  onOpenLogin
}) => {
  const tabs = [
    { id: 'form' as ActiveTabType, label: 'แบบฟอร์มบันทึกข้อมูล', icon: FileText },
    { id: 'calendar' as ActiveTabType, label: 'ปฏิทินการอบรม', icon: Calendar },
    ...(currentUser?.role === 'admin' || currentUser?.role === 'reviewer' ? [
      { id: 'dashboard' as ActiveTabType, label: 'แดชบอร์ด', icon: BarChart3 },
      { id: 'reports' as ActiveTabType, label: 'รายงาน / Export DOCX', icon: FileCheck, count: recordCount }
    ] : [])
  ];

  return (
    <header className="bg-white border-b border-slate-200/90 shadow-xs sticky top-0 z-40">
      
      {/* Top Bar: Brand Logo & User Profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
              RC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  RCIM Training Management
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                  HR_DATA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ระบบบันทึกและรายงานข้อมูลการฝึกอบรม วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์
              </p>
            </div>
          </div>

          {/* User Profile / Access Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                  currentUser.role === 'admin' 
                    ? 'bg-amber-500 ring-2 ring-amber-300' 
                    : currentUser.role === 'reviewer'
                    ? 'bg-emerald-600 ring-2 ring-emerald-300'
                    : 'bg-blue-700'
                }`}>
                  {currentUser.avatarInitials || 'RO'}
                </div>
                
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.email}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    {currentUser.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md font-bold text-[9px] border border-amber-300 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                        ผู้ดูแลระบบ (Admin)
                      </span>
                    ) : currentUser.role === 'reviewer' ? (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[9px] border border-emerald-300 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                        ผู้ตรวจทาน (Reviewer)
                      </span>
                    ) : (
                      <span>{currentUser.roleTitle || 'RCIM Staff'}</span>
                    )}
                  </div>
                </div>

                {/* ออกจากระบบ Button matching sample image */}
                <button
                  onClick={onLogout}
                  className="ml-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="เข้าสู่ระบบสำหรับ Admin"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>เข้าสู่ระบบ (Admin)</span>
                </button>
              </div>
            )}

            <button
              onClick={onResetData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
              title="รีเซ็ตข้อมูลเริ่มต้น"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tab Navigation Row */}
        <div className="flex items-center justify-between overflow-x-auto py-2 scrollbar-none gap-2">
          
          {/* Main 4 Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25 ring-2 ring-blue-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            {activeTab !== 'form' && (
              <button
                onClick={() => setActiveTab('form')}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ เพิ่มรายการอบรม</span>
              </button>
            )}


          </div>

        </div>

      </div>
    </header>
  );
};
