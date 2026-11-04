/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTabType } from './components/Navbar';
import { TrainingFormView } from './components/TrainingFormView';
import { CalendarView } from './components/CalendarView';
import { Dashboard } from './components/Dashboard';
import { TrainingTable } from './components/TrainingTable';
import { TrainingDetailModal } from './components/TrainingDetailModal';
import { TrainingRecord, FilterOptions } from './types';
import { 
  getStoredRecords, 
  saveStoredRecord, 
  deleteStoredRecord, 
  resetToInitialRecords 
} from './utils/storage';
import { exportToExcel } from './utils/excelExporter';
import { exportIndividualDocx, exportIndividualHrDocx } from './utils/docxExporter';
import { CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { LoginModal, UserProfile } from './components/LoginModal';
import { getStoredStaff, HRStaffItem } from './utils/storage';
import { HR_DATA_STAFF } from './components/TrainingFormView';
import { GoogleSheetBackupSettings } from './components/GoogleSheetBackupSettings';
import { triggerAutoBackupToGoogleSheet, performBackupToGoogleSheet } from './utils/googleSheetBackup';

export default function App() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  // Tabs in order: แบบฟอร์มบันทึกข้อมูล (form), ปฏิทินการอบรม (calendar), แดชบอร์ด (dashboard), รายงาน / Export DOCX (reports)
  const [activeTab, setActiveTab] = useState<ActiveTabType>('form');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sharedFilter, setSharedFilter] = useState<FilterOptions>({
    search: '',
    staffType: 'all',
    campus: 'all',
    category: 'all',
    startDate: '',
    endDate: ''
  });
  
  // Compute filtered records for the calendar view to always keep them synchronized with the report page filters
  const filteredRecordsForCalendar = records.filter(r => {
    // Search filter
    if (sharedFilter.search) {
      const query = sharedFilter.search.toLowerCase();
      const matchName = r.staffName?.toLowerCase().includes(query) || false;
      const matchCourse = r.courseTitle?.toLowerCase().includes(query) || false;
      const matchId = r.staffId?.toLowerCase().includes(query) || false;
      const matchOrganizer = r.organizer?.toLowerCase().includes(query) || false;
      if (!matchName && !matchCourse && !matchId && !matchOrganizer) return false;
    }

    // Staff Type Filter
    if (sharedFilter.staffType !== 'all' && r.staffType !== sharedFilter.staffType) {
      return false;
    }

    // Campus Filter
    if (sharedFilter.campus !== 'all' && r.campus !== sharedFilter.campus) {
      return false;
    }

    // Category Filter
    const activeCategory = categoryFilter !== 'all' ? categoryFilter : sharedFilter.category;
    if (activeCategory !== 'all' && activeCategory !== '') {
      const shortCat = activeCategory.replace('ด้าน', '').trim();
      const matchCat = (r.categories || []).some(c => c.includes(shortCat) || c === activeCategory);
      if (!matchCat) return false;
    }

    return true;
  });

  const [formKey, setFormKey] = useState<number>(0);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('rcim_auth_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email === 'admin@rmutr.ac.th') {
          localStorage.removeItem('rcim_auth_user_v1');
          return null;
        }
        return parsed;
      }
    } catch (e) {}
    return null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [staffList, setStaffList] = useState<HRStaffItem[]>(() => getStoredStaff(HR_DATA_STAFF));
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Modals / Selection state
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TrainingRecord | null>(null);
  const [savedRecordSuccess, setSavedRecordSuccess] = useState<TrainingRecord | null>(null);

  // Central function to fetch server records and keep all views completely synchronized
  const refreshAllRecords = async (isSilent = false): Promise<TrainingRecord[]> => {
    try {
      // Append cache-busting parameter to bypass any browser or proxy caching
      const response = await fetch(`/api/training-records?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.records)) {
          // Identify any local-only or modified records that exist in browser localStorage but are missing or outdated on the server,
          // and automatically upload them so they are not wiped out or lost across admins.
          const localRecords = getStoredRecords();
          
          let deletedRecordIds: string[] = [];
          try {
            deletedRecordIds = JSON.parse(localStorage.getItem('rcim_deleted_record_ids') || '[]');
          } catch (e) {}

          const localOnly = localRecords.filter(lr => {
            if (deletedRecordIds.includes(lr.id)) {
              return false; // Crucial: never auto-upload records that have been deleted!
            }
            const isSeed = lr.id.startsWith('seed_') || lr.id.startsWith('TR-2026-') || lr.id === 'TR-001' || lr.id === 'TR-002';
            
            const serverRecord = data.records.find((sr: any) => sr.id === lr.id);
            if (!serverRecord) {
              return !isSeed;
            }
            
            // If the record exists on the server, check if the local record was edited/modified
            const isDifferent = 
              serverRecord.staffName !== lr.staffName ||
              serverRecord.courseTitle !== lr.courseTitle ||
              serverRecord.hours !== lr.hours ||
              serverRecord.location !== lr.location ||
              serverRecord.startDate !== lr.startDate ||
              serverRecord.endDate !== lr.endDate;
              
            return isDifferent;
          });

          if (localOnly.length > 0) {
            console.log(`Auto-uploading ${localOnly.length} local-only records to server...`);
            for (const rec of localOnly) {
              try {
                await fetch('/api/training-records', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ record: rec })
                });
              } catch (e) {
                console.error("Failed to auto-upload local record:", e);
              }
            }

            // Fetch the updated, merged list of records from the server
            const reResponse = await fetch(`/api/training-records?t=${Date.now()}`);
            if (reResponse.ok) {
              const reData = await reResponse.json();
              if (reData.success && Array.isArray(reData.records)) {
                setRecords(reData.records);
                localStorage.setItem('rcim_training_records_v1', JSON.stringify(reData.records));
                return reData.records;
              }
            }
          }

          setRecords(prev => {
            // Avoid triggering unnecessary re-renders if the list has not changed structurally
            if (JSON.stringify(prev) !== JSON.stringify(data.records)) {
              localStorage.setItem('rcim_training_records_v1', JSON.stringify(data.records));
              return data.records;
            }
            return prev;
          });
          return data.records;
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.error("Failed to load records from server, falling back to localStorage", err);
      }
    }
    const loaded = getStoredRecords();
    setRecords(loaded);
    return loaded;
  };

  // 1. Initial on-mount sync and silent olddata Google Sheets import
  useEffect(() => {
    const initialLoad = async () => {
      // One-time migration to remove deleted records from local storage
      try {
        const deletedMigratedKey = 'rcim_deleted_migrated_v1';
        if (!localStorage.getItem(deletedMigratedKey)) {
          const targetDeleteIds = [
            'olddata_row_105',
            'RCIM-1789716870686',
            'olddata_row_106',
            'olddata_row_107',
            'olddata_row_108',
            'RCIM-1787019132990',
            'RCIM-1787018766421',
            'olddata_row_4',
            'olddata_row_8',
            'olddata_row_10',
            'olddata_row_111',
            'olddata_row_9',
            'olddata_row_113',
            'olddata_row_5',
            'olddata_row_3',
            'olddata_row_2',
            'olddata_row_116'
          ];
          
          // Add to globally deleted list
          const existingDeleted = JSON.parse(localStorage.getItem('rcim_deleted_record_ids') || '[]');
          const newDeleted = Array.from(new Set([...existingDeleted, ...targetDeleteIds]));
          localStorage.setItem('rcim_deleted_record_ids', JSON.stringify(newDeleted));
          
          // Filter current local storage records
          const localRecords = JSON.parse(localStorage.getItem('rcim_training_records_v1') || '[]');
          const filteredLocal = localRecords.filter((r: any) => !targetDeleteIds.includes(r.id));
          localStorage.setItem('rcim_training_records_v1', JSON.stringify(filteredLocal));
          
          localStorage.setItem(deletedMigratedKey, 'true');
          console.log("One-time deletion migration applied successfully.");
        }
      } catch (e) {
        console.error("Failed running one-time deletion migration:", e);
      }

      // Get the true records from the server first
      const serverRecords = await refreshAllRecords();
      
      // Perform silent initial sync for Google Sheets olddata tab once at boot
      try {
        const sheetsResponse = await fetch(`/api/sheets/olddata?t=${Date.now()}`);
        if (sheetsResponse.ok) {
          const sheetsData = await sheetsResponse.json();
          if (sheetsData.success && Array.isArray(sheetsData.records)) {
            const deletedIds: string[] = JSON.parse(localStorage.getItem('rcim_deleted_olddata_ids') || '[]');
            const deletedRecordIds: string[] = JSON.parse(localStorage.getItem('rcim_deleted_record_ids') || '[]');
            const newRecords = sheetsData.records.filter((sr: any) => {
              if (deletedIds.includes(sr.id) || deletedRecordIds.includes(sr.id)) return false;
              return !serverRecords.some(cr => cr.id === sr.id);
            });
            if (newRecords.length > 0) {
              // Save these synced records back to the server so they are visible to ALL admins!
              for (const rec of newRecords) {
                await fetch('/api/training-records', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ record: rec })
                });
              }
              await refreshAllRecords();
            }
          }
        }
      } catch (err) {
        console.error("Silent sync error:", err);
      }
    };
    initialLoad();
  }, []);

  // 2. Automatically sync every 8 seconds in the background so all admins see identical views in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAllRecords(true);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // 3. Immediately refresh database when switching tabs to avoid stale screens
  useEffect(() => {
    refreshAllRecords(true);
  }, [activeTab]);

  const handleSyncOlddata = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sheets/olddata');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (data.success && Array.isArray(data.records)) {
        const sheetRecords: TrainingRecord[] = data.records;
        
        // Fetch current records from server
        const currentRes = await fetch('/api/training-records');
        const currentData = await currentRes.json();
        const currentRecords = currentData.success && Array.isArray(currentData.records) ? currentData.records : getStoredRecords();
        const deletedIds: string[] = JSON.parse(localStorage.getItem('rcim_deleted_olddata_ids') || '[]');

        const newRecords = sheetRecords.filter(sr => {
          if (deletedIds.includes(sr.id)) return false;
          return !currentRecords.some(cr => cr.id === sr.id);
        });

        if (newRecords.length > 0) {
          // Save synced records to the server database
          for (const rec of newRecords) {
            await fetch('/api/training-records', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ record: rec })
            });
          }
          
          // Fetch updated list from the server
          const updatedRes = await fetch('/api/training-records');
          const updatedData = await updatedRes.json();
          if (updatedData.success && Array.isArray(updatedData.records)) {
            setRecords(updatedData.records);
          }
          showToast(`ซิงค์ข้อมูลจาก Google Sheets สำเร็จ! บันทึกลงเซิร์ฟเวอร์ส่วนกลางแล้ว เพิ่มใหม่ได้ ${newRecords.length} รายการ`, 'success');
        } else {
          showToast('ข้อมูลในระบบทั้งหมดได้รับการซิงค์จากตาราง "olddata" เป็นปัจจุบันแล้ว', 'info');
        }
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      console.error('Failed to sync olddata:', err);
      showToast(`เกิดข้อผิดพลาดในการซิงค์: ${err.message || String(err)}`, 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshWithSheetsSync = async (): Promise<TrainingRecord[]> => {
    try {
      const response = await fetch(`/api/sheets/olddata?t=${Date.now()}`);
      if (response.ok) {
        const sheetsData = await response.json();
        if (sheetsData.success && Array.isArray(sheetsData.records)) {
          const currentRecords = records.length > 0 ? records : getStoredRecords();
          const deletedIds: string[] = JSON.parse(localStorage.getItem('rcim_deleted_olddata_ids') || '[]');
          const deletedRecordIds: string[] = JSON.parse(localStorage.getItem('rcim_deleted_record_ids') || '[]');
          
          const newRecords = sheetsData.records.filter((sr: any) => {
            if (deletedIds.includes(sr.id) || deletedRecordIds.includes(sr.id)) return false;
            return !currentRecords.some(cr => cr.id === sr.id);
          });
          
          if (newRecords.length > 0) {
            console.log(`[Manual Refresh] Auto-syncing ${newRecords.length} new sheet records to server...`);
            for (const rec of newRecords) {
              await fetch('/api/training-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record: rec })
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error during manual refresh sheet sync:", err);
    }

    const updated = await refreshAllRecords();
    showToast('รีเฟรชและซิงค์ข้อมูลกับระบบส่วนกลาง สำเร็จเรียบร้อยแล้ว', 'success');
    return updated;
  };

  // Secure navigation guard: if not admin or reviewer, redirect away from dashboard and reports
  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'reviewer' && (activeTab === 'dashboard' || activeTab === 'reports')) {
      setActiveTab('form');
    }
  }, [currentUser, activeTab]);
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('rcim_auth_user_v1', JSON.stringify(user));
    showToast(`เข้าสู่ระบบในชื่อ ${user.name || user.email} เรียบร้อยแล้ว`);

    // Automatically trigger backup when admin/reviewer logs in for the first time
    if (user.role === 'admin' || user.role === 'reviewer') {
      setTimeout(async () => {
        try {
          console.log('[Auto-Backup on First Login] Starting automatic backup...');
          const currentRecords = getStoredRecords();
          const result = await performBackupToGoogleSheet(currentRecords);
          console.log('[Auto-Backup on First Login] Result:', result);
        } catch (e) {
          console.error('[Auto-Backup on First Login] Error:', e);
        }
      }, 2500); // 2.5 second delay to let login finalize and Toast render nicely
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rcim_auth_user_v1');
    setActiveTab('form');
    try {
      const gWindow = window as any;
      if (gWindow.google?.accounts?.id) {
        gWindow.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.error("Error disabling Google autoselect on logout:", e);
    }
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  const handleSaveRecord = async (record: TrainingRecord) => {
    let serverSaved = false;
    try {
      const response = await fetch('/api/training-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          serverSaved = true;
          await refreshAllRecords();
        } else {
          showToast(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${data.error || 'ไม่สามารถบันทึกข้อมูลได้'}`, 'info');
        }
      } else {
        showToast('เซิร์ฟเวอร์ปฏิเสธการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง', 'info');
      }
    } catch (err) {
      console.error("Failed to sync record to server:", err);
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ ระบบจะเก็บบันทึกในบราวเซอร์ของคุณชั่วคราว', 'info');
    }

    // Still persist to localStorage so they don't lose progress on network drops
    const updated = saveStoredRecord(record);
    setRecords(updated);

    if (serverSaved) {
      setEditingRecord(null);
      setSavedRecordSuccess(record);

      // Trigger Auto-Backup to external Google Sheet (Fail-Safe)
      try {
        triggerAutoBackupToGoogleSheet(updated);
      } catch (backupErr) {
        console.error("Auto backup trigger error:", backupErr);
      }

      // 1. Trigger Google Calendar Event creation via Service Account (with invites to participant & admin)
      fetch('/api/calendar/create-training-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (!data.isSimulated) {
            showToast(`ซิงค์ลง Google Calendar และส่งคำเชิญไปยัง ${record.staffEmail} และแอดมินเรียบร้อยแล้ว`, 'success');
          } else {
            console.log('Calendar event note:', data.note);
          }
        } else {
          console.warn('Google Calendar creation warning:', data.error);
        }
      })
      .catch(err => {
        console.error('Error creating Google Calendar event:', err);
      });

      // 2. Automatically trigger automated email confirmation to the submitter using Gmail API
      if (record.staffEmail) {
        fetch('/api/send-email-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast(`ส่งอีเมลยืนยันไปยัง ${record.staffEmail} เรียบร้อยแล้ว`, 'success');
          } else {
            console.warn('Google Gmail API send failed:', data.error);
          }
        })
        .catch(err => {
          console.error('Error sending email confirmation:', err);
        });
      }
      
      // Switch to reports view after successful save ONLY if user is admin or reviewer
      if (currentUser?.role === 'admin' || currentUser?.role === 'reviewer') {
        setActiveTab('reports');
      } else {
        setActiveTab('form');
        setFormKey(prev => prev + 1); // Reset the form completely so non-admins can record another item cleanly
      }
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (currentUser?.role !== 'admin') {
      showToast('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบข้อมูลการอบรมได้', 'info');
      return;
    }
    const record = records.find(r => r.id === id);
    if (record) {
      setRecordToDelete(record);
    }
  };

  const handleResetData = async () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดข้อมูลตัวอย่างเริ่มต้นของ RCIM ใช่หรือไม่?')) {
      try {
        const response = await fetch('/api/training-records/reset', { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.records)) {
            setRecords(data.records);
            localStorage.setItem('rcim_training_records_v1', JSON.stringify(data.records));
            showToast('รีเซ็ตข้อมูลตัวอย่างเริ่มต้นบนเซิร์ฟเวอร์เรียบร้อยแล้ว', 'success');
            return;
          }
        }
      } catch (err) {
        console.error("Failed to reset server records:", err);
      }

      const reset = resetToInitialRecords();
      setRecords(reset);
      showToast('รีเซ็ตข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  const handleExportExcel = () => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'reviewer') {
      setShowLoginModal(true);
      showToast('เฉพาะผู้ดูแลระบบและผู้ตรวจทานเท่านั้นที่สามารถส่งออกข้อมูล Excel ได้ กรุณาเข้าสู่ระบบที่มีสิทธิ์', 'info');
      return;
    }
    exportToExcel(records);
    showToast('ส่งออกรายงาน Excel เรียบร้อยแล้ว');

    // Auto-backup to external Google Sheet when Admin exports Excel (Fail-Safe)
    try {
      performBackupToGoogleSheet(records).then((res) => {
        if (res && res.success) {
          showToast('ระบบได้ทำการสำรองข้อมูลไปยัง Google Sheet ภายนอกสำเร็จแล้ว!', 'success');
        } else if (res && !res.success) {
          console.warn('Silent backup on export excel notice:', res.message);
        }
      }).catch((e) => {
        console.warn('Silent backup on export excel skipped:', e);
      });
    } catch (backupErr) {
      console.error("Auto backup on Excel export error:", backupErr);
    }
  };

  const handleExportDocx = (record: TrainingRecord) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'reviewer') {
      setShowLoginModal(true);
      showToast('เฉพาะผู้ดูแลระบบและผู้ตรวจทานเท่านั้นที่สามารถส่งออกบันทึกข้อความ Word ได้ กรุณาเข้าสู่ระบบที่มีสิทธิ์', 'info');
      return;
    }
    exportIndividualDocx(record);
    showToast('ส่งออกบันทึกข้อความ Word เรียบร้อยแล้ว');
  };

  const handleExportHrDocx = (record: TrainingRecord) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'reviewer') {
      setShowLoginModal(true);
      showToast('เฉพาะผู้ดูแลระบบและผู้ตรวจทานเท่านั้นที่สามารถส่งออกใบสำรวจคุณลักษณะงาน HR ได้ กรุณาเข้าสู่ระบบที่มีสิทธิ์', 'info');
      return;
    }
    exportIndividualHrDocx(record);
    showToast('ส่งออกรายงานสำรวจคุณลักษณะงาน Word (DOCX-HR) เรียบร้อยแล้ว');
  };

  const handleSelectCategoryFromDashboard = (category: string) => {
    setCategoryFilter(category);
    setActiveTab('reports');
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans flex flex-col selection:bg-amber-400 selection:text-slate-950">
      
      {/* Header Navigation with 4 Main Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportExcel={handleExportExcel}
        onResetData={handleResetData}
        recordCount={records.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'form' && (
          <TrainingFormView
            key={`${editingRecord ? editingRecord.id : 'new-form'}-${formKey}`}
            onSave={handleSaveRecord}
            initialRecord={editingRecord}
            onCancelEdit={() => setEditingRecord(null)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            records={filteredRecordsForCalendar}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onOpenForm={() => {
              setEditingRecord(null);
              setActiveTab('form');
            }}
            currentUser={currentUser}
            sharedFilter={sharedFilter}
            setSharedFilter={setSharedFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            totalRecordsCount={records.length}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            records={records}
            onOpenForm={() => {
              setEditingRecord(null);
              setActiveTab('form');
            }}
            onSelectCategoryFilter={handleSelectCategoryFromDashboard}
          />
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {(currentUser?.role === 'admin' || currentUser?.role === 'reviewer') && (
              <GoogleSheetBackupSettings records={records} currentUser={currentUser} />
            )}
            <TrainingTable
              records={records}
              onSelectRecord={(r) => setSelectedRecord(r)}
              onEditRecord={(r) => {
                setEditingRecord(r);
                setActiveTab('form');
              }}
              onDeleteRecord={handleDeleteRecord}
              onOpenForm={() => {
                setEditingRecord(null);
                setActiveTab('form');
              }}
              onExportExcel={handleExportExcel}
              onExportDocx={handleExportDocx}
              onExportHrDocx={handleExportHrDocx}
              currentUser={currentUser}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              onRefresh={handleRefreshWithSheetsSync}
              sharedFilter={sharedFilter}
              setSharedFilter={setSharedFilter}
            />
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 วิทยาลัยนวัตกรรมการจัดการ (RCIM) มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์
          </span>
          <span className="text-slate-400">
            ระบบบริหารและจัดการข้อมูลการพัฒนาบุคลากร (HR Data Management)
          </span>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        staffList={staffList}
        currentUser={currentUser}
      />

      {/* Individual Report Detail Modal */}
      <TrainingDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onEdit={(r) => {
          setSelectedRecord(null);
          setEditingRecord(r);
          setActiveTab('form');
        }}
        onExportDocx={handleExportDocx}
        onExportHrDocx={handleExportHrDocx}
        currentUser={currentUser}
        onDelete={handleDeleteRecord}
      />

      {/* Custom Deletion Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  คุณแน่ใจหรือไม่ที่จะลบข้อมูลการอบรมนี้?
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  (การลบข้อมูลนี้จะไม่สามารถกู้คืนได้)
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-semibold">
                <span>ชื่อผู้เข้าอบรม:</span>
                <span className="text-slate-700 font-bold">{recordToDelete.staffName}</span>
              </div>
              <div className="border-t border-slate-200/50 my-1"></div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">หลักสูตร / โครงการ:</span>
                <span className="text-slate-800 font-extrabold block leading-snug">{recordToDelete.courseTitle}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = recordToDelete.id;

                  // 1. Instantly delete from local storage first to prevent race condition/auto-upload resurrection
                  const updated = deleteStoredRecord(id);
                  setRecords(updated);

                  // 2. Add to global deleted record IDs in localStorage to prevent auto-upload resurrecting this record later
                  try {
                    const deletedRecordIds = JSON.parse(localStorage.getItem('rcim_deleted_record_ids') || '[]');
                    if (!deletedRecordIds.includes(id)) {
                      deletedRecordIds.push(id);
                      localStorage.setItem('rcim_deleted_record_ids', JSON.stringify(deletedRecordIds));
                    }
                  } catch (e) {
                    console.error("Error saving global deleted record ID:", e);
                  }

                  if (id.startsWith('olddata_')) {
                    try {
                      const deletedIds = JSON.parse(localStorage.getItem('rcim_deleted_olddata_ids') || '[]');
                      if (!deletedIds.includes(id)) {
                        deletedIds.push(id);
                        localStorage.setItem('rcim_deleted_olddata_ids', JSON.stringify(deletedIds));
                      }
                    } catch (e) {
                      console.error("Error saving deleted olddata ID:", e);
                    }
                  }

                  if (selectedRecord?.id === id) {
                    setSelectedRecord(null);
                  }
                  setRecordToDelete(null);

                  // 3. Make the API call to delete from Firestore and server file
                  try {
                    const res = await fetch(`/api/training-records/${id}`, {
                      method: 'DELETE',
                      headers: {
                        'X-User-Role': currentUser?.role || '',
                        'X-User-Email': currentUser?.email || ''
                      }
                    });
                    if (res.ok) {
                      const updatedRecords = await refreshAllRecords();
                      showToast('ลบข้อมูลการอบรมเรียบร้อยแล้ว', 'success');

                      // Trigger Auto-Backup to external Google Sheet (Fail-Safe)
                      try {
                        triggerAutoBackupToGoogleSheet(updatedRecords);
                      } catch (backupErr) {
                        console.error("Auto backup trigger error on delete:", backupErr);
                      }
                    } else {
                      const errData = await res.json().catch(() => ({}));
                      showToast(errData.error || 'เกิดข้อผิดพลาดในการลบข้อมูลจากเซิร์ฟเวอร์', 'info');
                    }
                  } catch (err) {
                    console.error("Failed to delete record on server:", err);
                    showToast('ลบข้อมูลในเบราว์เซอร์สำเร็จ แต่ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อลบข้อมูลส่วนกลางได้', 'info');
                  }
                }}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{ boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Centered Modal for Form Submission */}
      {savedRecordSuccess && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 mt-2 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              บันทึกข้อมูลเรียบร้อยแล้ว!
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              ระบบได้ทำการบันทึกข้อมูลการฝึกอบรมเรียบร้อยและอัปเดตลงเซิร์ฟเวอร์ส่วนกลางแล้ว
            </p>

            {/* Details Card */}
            <div className="w-full bg-slate-50 rounded-xl p-4 md:p-5 text-left border border-slate-100 text-xs text-slate-700 space-y-3 mb-6">
              <div className="border-b border-slate-200/60 pb-2">
                <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[10px] mb-0.5">ผู้เข้ารับการอบรม</span>
                <span className="font-black text-slate-900 text-sm md:text-base">{savedRecordSuccess.staffName}</span>
                <span className="text-slate-500 block text-[11px] mt-0.5">{savedRecordSuccess.staffEmail} ({savedRecordSuccess.campus})</span>
              </div>
              <div className="border-b border-slate-200/60 pb-2">
                <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[10px] mb-0.5">หลักสูตร / โครงการ</span>
                <span className="font-bold text-slate-900 text-sm">{savedRecordSuccess.courseTitle}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[10px] mb-0.5">ระยะเวลาอบรม</span>
                  <span className="font-bold text-slate-900 text-sm">{savedRecordSuccess.hours} ชั่วโมง</span>
                </div>
                <div>
                  <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[10px] mb-0.5">สถานที่ / รูปแบบ</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {savedRecordSuccess.location} ({savedRecordSuccess.locationType === 'online' ? 'ออนไลน์' : 'ออนไซต์'})
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSavedRecordSuccess(null);
                // Redirect back to Calendar tab so they can see it instantly
                setActiveTab('calendar');
              }}
              className="w-full py-3 md:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 text-center"
            >
              ตกลง (ปิดหน้าต่างและดูปฎิทิน)
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 text-xs font-medium animate-in slide-in-from-bottom-5 fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg.text}</span>
        </div>
      )}

    </div>
  );
}
