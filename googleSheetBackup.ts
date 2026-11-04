import { TrainingRecord } from '../types';
import { getReportData } from './reportDataHelper';

/**
 * ==========================================
 * ระบบสำรองข้อมูลไปยัง Google Sheet ภายนอก (Fail-Safe)
 * ==========================================
 * 
 * วิธีการสร้าง Google OAuth Client ID สำหรับระบบสำรองข้อมูล:
 * 1. เปิด Google Cloud Console (https://console.cloud.google.com)
 * 2. ไปที่ APIs & Services > Credentials
 * 3. กด "+ Create Credentials" > เลือก "OAuth client ID"
 * 4. เลือก Application type เป็น "Web application"
 * 5. ตั้งชื่อ Client ID
 * 6. ในช่อง "Authorized JavaScript origins" ให้เพิ่ม URL ของแอปพลิเคชันนี้ 
 *    เช่น https://ais-dev-t3lfzpaztpcrxhyjma54iz-790808747139.asia-southeast1.run.app
 * 7. กด Create แล้วนำ Client ID มาใส่ในตัวแปร GOOGLE_CLIENT_ID ด้านล่างนี้
 */

export const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "8440401112-jt4vda95fq8he97o06f4drmitd7nf6u3.apps.googleusercontent.com";

// คีย์สำหรับเก็บใน localStorage (ขึ้นต้นด้วย gsheetBackup_ เสมอ)
const STORAGE_KEYS = {
  SPREADSHEET_ID: 'gsheetBackup_spreadsheetId',
  SHEET_NAME: 'gsheetBackup_sheetName',
  AUTO_BACKUP: 'gsheetBackup_autoBackup',
  LAST_SYNC_TIME: 'gsheetBackup_lastSyncTime',
  LAST_SYNC_ROWS: 'gsheetBackup_lastSyncRows',
  LAST_SYNC_STATUS: 'gsheetBackup_lastSyncStatus',
  LAST_SYNC_MATCH: 'gsheetBackup_lastSyncMatch'
};

// ตัวแปรในหน่วยความจำ (In-Memory Only) และเก็บใน sessionStorage เพื่อความคงทนภายในเซสชันปัจจุบัน (แถวแท็บเดียว)
let accessToken: string | null = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gs_backup_token') : null);
let tokenExpiryTime: number | null = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gs_backup_token_expiry') ? Number(sessionStorage.getItem('gs_backup_token_expiry')) : null);
let gisTokenClient: any = null;

// สำหรับจัดการ Queue และ Debounce สำรองข้อมูลอัตโนมัติ
let backupTimeoutId: any = null;
let isBackupCurrentlyRunning = false;
let hasPendingBackupRequest = false;
let pendingBackupRecords: TrainingRecord[] = [];

/**
 * ดึงข้อมูลการตั้งค่าจาก localStorage
 */
export function getBackupSettings() {
  try {
    return {
      spreadsheetId: localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || '1K6Hmp5JwNpgxDJwO-azcq-N_QoCz1PX4A-zNKltH7G8',
      sheetName: localStorage.getItem(STORAGE_KEYS.SHEET_NAME) || 'Backup',
      autoBackup: true, // ทำงานสำรองอัตโนมัติเป็นค่าเริ่มต้นเสมอโดยไม่มีสวิตช์ปิดเปิด
      lastSyncTime: localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || '',
      lastSyncRows: Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC_ROWS)) || 0,
      lastSyncStatus: localStorage.getItem(STORAGE_KEYS.LAST_SYNC_STATUS) || 'idle', // 'idle' | 'running' | 'success' | 'failed'
      lastSyncMatch: localStorage.getItem(STORAGE_KEYS.LAST_SYNC_MATCH) !== 'false' // default true
    };
  } catch (e) {
    return {
      spreadsheetId: '1K6Hmp5JwNpgxDJwO-azcq-N_QoCz1PX4A-zNKltH7G8',
      sheetName: 'Backup',
      autoBackup: true,
      lastSyncTime: '',
      lastSyncRows: 0,
      lastSyncStatus: 'idle',
      lastSyncMatch: true
    };
  }
}

/**
 * บันทึกการตั้งค่าลง localStorage
 */
export function saveBackupSettings(settings: { spreadsheetId: string; sheetName: string; autoBackup: boolean }) {
  try {
    // แยกแยะและสกัด Spreadsheet ID ออกจาก URL เต็มโดยอัตโนมัติ
    let extractedId = settings.spreadsheetId.trim();
    if (extractedId.includes('/d/')) {
      const match = extractedId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        extractedId = match[1];
      }
    } else if (extractedId.includes('id=')) {
      const match = extractedId.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        extractedId = match[1];
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, extractedId);
    localStorage.setItem(STORAGE_KEYS.SHEET_NAME, settings.sheetName.trim() || 'Backup');
    localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, settings.autoBackup ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save backup settings', e);
  }
}

/**
 * อัปเดตสถานะการสำรองข้อมูลล่าสุด
 */
function updateSyncStatus(status: 'idle' | 'running' | 'success' | 'failed', rowsCount: number, timeStr: string, matched: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, status);
    if (status === 'success') {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, timeStr);
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_ROWS, String(rowsCount));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC_MATCH, matched ? 'true' : 'false');
    }
  } catch (e) {}
}

/**
 * ตรวจสอบความถูกต้องของ Token ปัจจุบัน
 */
export function isGoogleAuthorized(): boolean {
  if (!accessToken || !tokenExpiryTime) return false;
  return Date.now() < tokenExpiryTime - 60000; // ปลอดภัยล่วงหน้า 1 นาที
}

/**
 * ล็อกเอาต์ Google สำหรับส่วนสำรองข้อมูล
 */
export function logoutGoogleBackup() {
  accessToken = null;
  tokenExpiryTime = null;
  try {
    sessionStorage.removeItem('gs_backup_token');
    sessionStorage.removeItem('gs_backup_token_expiry');
  } catch (e) {}
}

/**
 * ตั้งค่า Google Access Token จากภายนอก (เมื่อผู้ดูแลเข้าสู่ระบบด้วย Google ครั้งแรก)
 */
export function setGoogleBackupToken(token: string, expiresInSeconds: number) {
  accessToken = token;
  tokenExpiryTime = Date.now() + (expiresInSeconds * 1000);
  try {
    sessionStorage.setItem('gs_backup_token', token);
    sessionStorage.setItem('gs_backup_token_expiry', String(tokenExpiryTime));
  } catch (e) {}
}

/**
 * ขอ Token ใหม่โดยเริ่มการล็อกอินผ่าน Google Identity Services (token model)
 */
export function authorizeGoogleBackup(onSuccess: (token: string) => void, onFailure: (err: string) => void) {
  try {
    const gWindow = window as any;
    if (!gWindow.google?.accounts?.oauth2) {
      // โหลด SDK ถ้ายังไม่มี
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeTokenClient(onSuccess, onFailure);
      };
      document.body.appendChild(script);
    } else {
      initializeTokenClient(onSuccess, onFailure);
    }
  } catch (err: any) {
    onFailure(err.message || String(err));
  }
}

function initializeTokenClient(onSuccess: (token: string) => void, onFailure: (err: string) => void) {
  try {
    const gWindow = window as any;
    if (!GOOGLE_CLIENT_ID) {
      onFailure("ยังไม่ได้ตั้งค่า Client ID");
      return;
    }

    gisTokenClient = gWindow.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          onFailure(tokenResponse.error_description || tokenResponse.error);
          return;
        }
        if (tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          // คำนวณเวลาหมดอายุ (ปกติ 1 ชั่วโมง = 3600 วินาที)
          const expiresIn = Number(tokenResponse.expires_in) || 3600;
          tokenExpiryTime = Date.now() + (expiresIn * 1000);
          onSuccess(accessToken!);
        } else {
          onFailure("ไม่ได้รับ Access Token");
        }
      }
    });

    gisTokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (err: any) {
    onFailure(err.message || String(err));
  }
}

/**
 * เรียก API ของ Google Sheets (ฟังก์ชันอเนกประสงค์แบบประหยัดแรง)
 */
async function fetchSheetsApi(endpoint: string, options: RequestInit = {}) {
  if (!accessToken) {
    throw new Error('ยังไม่ได้เข้าสู่ระบบ Google หรือ Token หมดอายุ');
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData.error?.message || `Google Sheets API Error (Status: ${response.status})`;
    const code = errData.error?.code || response.status;
    
    // ห่อหุ้มวัตถุ Error เพื่อส่งรหัสข้อผิดพลาดเฉพาะเจาะจง
    const error: any = new Error(message);
    error.status = code;
    throw error;
  }

  return response.json();
}

/**
 * ทดสอบการเชื่อมต่อ Google Sheets และเตรียมความพร้อมของ Sheet Tabs
 */
export async function testBackupConnection(spreadsheetId: string, sheetName: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!spreadsheetId) {
      return { success: false, message: 'ยังไม่ได้ระบุ Spreadsheet ID หรือวาง URL' };
    }
    if (!isGoogleAuthorized()) {
      return { success: false, message: 'ยังไม่ได้เชื่อมต่อ Google Account (ต้องการเข้าสู่ระบบใหม่)' };
    }

    // 1. ดึงโครงสร้าง Spreadsheet เพื่อยืนยัน ID และสิทธิ์การเข้าถึง
    const meta = await fetchSheetsApi(spreadsheetId);
    const sheetsList = meta.sheets || [];
    
    // 2. ตรวจหาชีตรายงานเป้าหมาย
    const hasReportSheet = sheetsList.some((s: any) => s.properties?.title === sheetName);
    
    let resultMessage = `เชื่อมต่อสำเร็จ! ตารางชื่อ "${meta.properties?.title || 'ไม่มีชื่อ'}"`;
    
    if (!hasReportSheet) {
      resultMessage += ` (ยังไม่มีแท็บ "${sheetName}" ระบบจะสร้างให้ตอนเริ่มสำรองครั้งแรก)`;
    } else {
      resultMessage += ` (พบแท็บ "${sheetName}" เรียบร้อยแล้ว)`;
    }

    return { success: true, message: resultMessage };
  } catch (err: any) {
    console.error('Test connection error:', err);
    if (err.status === 403) {
      return { success: false, message: 'ไม่มีสิทธิ์แก้ไข (กรุณาใช้ชีตที่เป็นเจ้าของหรือได้รับสิทธิ์เขียน)' };
    }
    if (err.status === 404) {
      return { success: false, message: 'ไม่พบ Spreadsheet ID (กรุณาตรวจความถูกต้องของ ID)' };
    }
    if (err.status === 429) {
      return { success: false, message: 'เรียกใช้งานบ่อยเกินไป (เกินโควตาข้อกำหนด Google Sheets API)' };
    }
    return { success: false, message: err.message || 'การทดสอบเชื่อมต่อล้มเหลว' };
  }
}

/**
 * ดำเนินการสำรองข้อมูลไป Google Sheet
 */
export async function performBackupToGoogleSheet(records: TrainingRecord[]): Promise<{ success: boolean; message: string; rowsSynced?: number }> {
  const settings = getBackupSettings();
  const spreadsheetId = settings.spreadsheetId;
  const sheetName = settings.sheetName;

  if (!spreadsheetId) {
    return { success: false, message: 'กรุณาระบุ Spreadsheet ID ก่อนทำการสำรองข้อมูล' };
  }
  if (!isGoogleAuthorized()) {
    return { success: false, message: 'ต้องเข้าสู่ระบบ Google ใหม่' };
  }

  try {
    // 1. ตรวจสอบและสร้างชีตเป้าหมายหลัก (sheetName) และชีต BackupInfo หากไม่มี
    const meta = await fetchSheetsApi(spreadsheetId);
    const sheetsList = meta.sheets || [];
    const hasReportSheet = sheetsList.some((s: any) => s.properties?.title === sheetName);
    const hasInfoSheet = sheetsList.some((s: any) => s.properties?.title === 'BackupInfo');

    const requestsToBatch: any[] = [];
    if (!hasReportSheet) {
      requestsToBatch.push({ addSheet: { properties: { title: sheetName } } });
    }
    if (!hasInfoSheet) {
      requestsToBatch.push({ addSheet: { properties: { title: 'BackupInfo' } } });
    }

    if (requestsToBatch.length > 0) {
      await fetchSheetsApi(`${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: requestsToBatch })
      });
    }

    // 2. ดึงข้อมูลรายงานแบบ Single Source of Truth
    const { headers, rows, totalsRow } = getReportData(records);
    const fullSheetMatrix = [headers, ...rows, totalsRow];

    // 3. เขียนข้อมูลทับที่เซลล์ A1 (RAW Mode)
    const rangeName = `${sheetName}!A1`;
    await fetchSheetsApi(`${spreadsheetId}/values/${encodeURIComponent(rangeName)}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({
        range: rangeName,
        majorDimension: 'ROWS',
        values: fullSheetMatrix
      })
    });

    // 4. ล้างแถว/คอลัมน์ที่เกิน (ล้างเพื่อป้องกันข้อมูลเก่าตกค้างกรณีข้อมูลหลักลดลง)
    const activeRowsCount = fullSheetMatrix.length;
    const activeColsCount = headers.length;

    // แปลงจำนวนคอลัมน์เป็นตัวอักษร เช่น 22 = V
    const getColumnLetter = (colIdx: number): string => {
      let letter = '';
      let temp = colIdx;
      while (temp > 0) {
        const modulo = (temp - 1) % 26;
        letter = String.fromCharCode(65 + modulo) + letter;
        temp = Math.floor((temp - modulo) / 26);
      }
      return letter || 'A';
    };

    const maxColLetter = getColumnLetter(activeColsCount);
    const trailingRowsRange = `${sheetName}!A${activeRowsCount + 1}:${maxColLetter}2000`;
    
    // เรียกล้างแถวส่วนที่เกิน
    await fetchSheetsApi(`${spreadsheetId}/values/${encodeURIComponent(trailingRowsRange)}:clear`, {
      method: 'POST'
    }).catch(e => console.warn('Failed to clear trailing rows:', e));

    // 5. อ่านกลับ (values.get) ตรวจสอบความถูกต้องสมบูรณ์
    const verifiedRange = `${sheetName}!A1:${maxColLetter}${activeRowsCount}`;
    const readResponse = await fetchSheetsApi(`${spreadsheetId}/values/${encodeURIComponent(verifiedRange)}`);
    const verifiedValues = readResponse.values || [];

    const expectedRows = fullSheetMatrix.length;
    const actualRows = verifiedValues.length;
    const isDataMatching = expectedRows === actualRows;

    const lastSyncTimeStr = new Date().toLocaleString('th-TH');
    
    // 6. บันทึกข้อมูลประวัติลงในชีต BackupInfo แยกเฉพาะตัว (BackupInfo!A1)
    const infoMatrix = [
      ['ข้อมูลระบบสำรอง (RCIM HR-Backup Info)'],
      ['วันที่-เวลาสำรองล่าสุด', lastSyncTimeStr],
      ['จำนวนแถวข้อมูลสำรอง (Rows)', rows.length],
      ['สถานะผลสัมฤทธิ์', isDataMatching ? 'สมบูรณ์ตรงกัน (SUCCESS)' : 'พบข้อผิดพลาดไม่ตรงกัน (MISMATCH)'],
      ['ยอดรวมงบประมาณ', totalsRow[15] || 0],
      ['ยอดรวมชั่วโมงอบรม', totalsRow[13] || 0]
    ];

    await fetchSheetsApi(`${spreadsheetId}/values/BackupInfo!A1?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({
        range: 'BackupInfo!A1',
        majorDimension: 'ROWS',
        values: infoMatrix
      })
    }).catch(e => console.warn('Failed to update BackupInfo sheet:', e));

    // อัปเดตสถานะลงใน localStorage หน้าแอป
    updateSyncStatus('success', rows.length, lastSyncTimeStr, isDataMatching);

    if (!isDataMatching) {
      return { 
        success: false, 
        message: `สำรองสำเร็จแต่ไม่ตรงกัน! ส่งไป ${expectedRows} แถว แต่ยืนยันกลับได้เพียง ${actualRows} แถว`,
        rowsSynced: rows.length 
      };
    }

    return { success: true, message: 'สำรองข้อมูลสำเร็จเสร็จสมบูรณ์เรียบร้อย!', rowsSynced: rows.length };
  } catch (err: any) {
    console.error('Perform backup failed:', err);
    updateSyncStatus('failed', 0, '', false);
    
    let errMsg = err.message || 'การเชื่อมต่อขัดข้อง';
    if (err.status === 403) {
      errMsg = 'ไม่มีสิทธิ์แก้ไขไฟล์นี้';
    } else if (err.status === 404) {
      errMsg = 'ไม่พบ Google Sheet ID';
    } else if (err.status === 429) {
      errMsg = 'เรียกใช้งานถี่เกินโควตา (429)';
    }

    return { success: false, message: `สำรองไม่สำเร็จ: ${errMsg}` };
  }
}

/**
 * กระตุ้นระบบสำรองอัตโนมัติ (Debounce 3 วินาทีตามข้อกำหนด)
 * ทำงานในคิวเดียว ไม่บล็อก UI ป้องกันการรันซ้อน
 */
export function triggerAutoBackupToGoogleSheet(records: TrainingRecord[]) {
  const settings = getBackupSettings();
  if (!settings.autoBackup || !settings.spreadsheetId) return;

  // ตั้งค่าอัปเดตข้อมูลรอไว้
  pendingBackupRecords = [...records];
  
  if (backupTimeoutId) {
    clearTimeout(backupTimeoutId);
  }

  backupTimeoutId = setTimeout(() => {
    backupTimeoutId = null;
    processBackupQueue();
  }, 3000); // ดีเลย์ 3 วินาทีถ้วน
}

async function processBackupQueue() {
  if (isBackupCurrentlyRunning) {
    // หากกำลังรันอยู่ ให้รับปากว่าจะรันอีกเพียงรอบเดียวหลังจากรอบนี้จบ
    hasPendingBackupRequest = true;
    return;
  }

  isBackupCurrentlyRunning = true;
  hasPendingBackupRequest = false;

  try {
    console.log('[ระบบสำรอง Google Sheet] เริ่มสำรองข้อมูลเบื้องหลังอัตโนมัติ...');
    await performBackupToGoogleSheet(pendingBackupRecords);
  } catch (err) {
    console.error('[ระบบสำรอง Google Sheet Error] การสำรองข้อมูลอัตโนมัติเบื้องหลังผิดพลาด:', err);
  } finally {
    isBackupCurrentlyRunning = false;
    
    // หากมีการเปลี่ยนแปลงเพิ่มเติมระหว่างการสำรองข้อมูล ให้สำรองต่ออีกรอบเดียวก่อนยุติ
    if (hasPendingBackupRequest) {
      processBackupQueue();
    }
  }
}
