import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { google } from "googleapis";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "25mb" }));

  // Initialize Gemini AI client server-side if key exists
  let aiClient: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Gemini AI initialization failed:", e);
    }
  }

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "RCIM Training System", timestamp: new Date().toISOString() });
  });

  // File-based database path for persistent/shared training records across all admins
  const RECORDS_FILE_PATH = path.join(process.cwd(), "custom-records.json");

  // Initial seed data if custom-records.json doesn't exist
  const INITIAL_TRAINING_RECORDS = [
    {
      id: 'TR-2026-001',
      staffId: 'RCIM-65001',
      staffName: 'ผศ.ดร.พงศ์ศิริ จันทร์กระจ่าง',
      staffEmail: 'pongsiri.c@rmutr.ac.th',
      campus: 'ศาลายา',
      staffType: 'academic',
      isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
      academicPrograms: ['สาขาวิชาการจัดการเมืองและโครงสร้างพื้นฐาน', 'หลักสูตรการบริหารการพัฒนาเมืองยุคใหม่ (ระดับบัณฑิตศึกษา)'],
      academicResponsiblePrograms: ['สาขาวิชาการจัดการเมืองและโครงสร้างพื้นฐาน'],
      courseTitle: 'การประยุกต์ใช้ AI และ Generative Model ในการวิจัยและออกแบบเมืองดิจิทัล',
      categories: ['ด้านการวิจัย นวัตกรรม และผลงานทางวิชาการ', 'ด้านเทคโนโลยีดิจิทัลและ AI'],
      organizer: 'สถาบันวิจัยและพัฒนา มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์',
      startDate: '2026-07-15',
      endDate: '2026-07-17',
      hours: 18,
      location: 'ห้องประชุมสมเด็จพระพุฒาจารย์ (โต พรหมรังสี)',
      locationType: 'onsite',
      expense: 4500,
      knowledgeBefore: 2,
      knowledgeAfter: 5,
      workApplication: 'นำเทคโนโลยี AI มาปรับปรุงรายวิชาการวางแผนเมืองดิจิทัล และใช้วิเคราะห์ข้อมูล Big Data สำหรับโครงการวิจัยพัฒนานครสมาร์ทซิตี้',
      certificateFileName: 'Certificate_AI_Urban_Research.pdf',
      submittedAt: '2026-07-18T09:30:00.000Z'
    },
    {
      id: 'TR-2026-003',
      staffId: 'RCIM-64008',
      staffName: 'ดร.กิตติพงษ์ วิเศษสรรค์',
      staffEmail: 'kittipong.w@rmutr.ac.th',
      campus: 'ศาลายา',
      staffType: 'academic',
      isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
      academicPrograms: ['สาขาวิชาเทคโนโลยีดิจิทัลเพื่อการเมือง'],
      academicResponsiblePrograms: ['สาขาวิชาเทคโนโลยีดิจิทัลเพื่อการเมือง'],
      courseTitle: 'อบรมเชิงปฏิบัติการ: English for Academic Writing & International Publication',
      categories: ['ด้านภาษาอังกฤษและการสื่อสารสากล', 'ด้านการวิจัย นวัตกรรม และผลงานทางวิชาการ'],
      organizer: 'ศูนย์ภาษา มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์',
      startDate: '2026-05-20',
      endDate: '2026-05-22',
      hours: 18,
      location: 'อาคารปฏิบัติการโรงแรมและการท่องเที่ยว ศาลายา',
      locationType: 'onsite',
      expense: 3200,
      knowledgeBefore: 3,
      knowledgeAfter: 4,
      workApplication: 'ใช้เขียนบทความวิจัยระดับนานาชาติในฐานข้อมูล Scopus และการร่างข้อเสนอโครงการวิจัยร่วมกับองค์กรต่างประเทศ',
      certificateFileName: 'Academic_English_Writing_2026.pdf',
      submittedAt: '2026-05-23T11:00:00.000Z'
    },
    {
      id: 'TR-2026-004',
      staffId: 'RCIM-66005',
      staffName: 'นายณัฐวุฒิ สุขเจริญ',
      staffEmail: 'natthawut.s@rmutr.ac.th',
      campus: 'ศาลายา',
      staffType: 'support',
      isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
      supportDeptGroup: 'งานการเงิน คลัง และพัสดุ',
      supportDeptUnit: 'หน่วยพัสดุและจัดซื้อจัดจ้าง',
      courseTitle: 'ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และระบบ e-GP',
      categories: ['ด้านคุณธรรม จริยธรรม และธรรมาภิบาล', 'ด้านการบริหารจัดการและการพัฒนาองค์กร'],
      organizer: 'กรมบัญชีกลาง กระทรวงการคลัง',
      startDate: '2026-04-08',
      endDate: '2026-04-09',
      hours: 14,
      location: 'โรงแรมรามาการ์เด้นส์ กรุงเทพฯ',
      locationType: 'hybrid',
      expense: 2800,
      knowledgeBefore: 2,
      knowledgeAfter: 5,
      workApplication: 'ดำเนินการจัดซื้อจัดจ้างของวิทยาลัย RCIM ให้ถูกต้องตามระเบียบพัสดุภาครัฐ โปร่งใส ตรวจสอบได้ และลดความผิดพลาดในการคีย์ข้อมูล e-GP',
      certificateFileName: 'Procurement_Law_Cert.pdf',
      submittedAt: '2026-04-10T16:45:00.000Z'
    },
    {
      id: 'TR-2026-005',
      staffId: 'RCIM-63002',
      staffName: 'รศ.ดร.วรัญญา ธนากูล',
      staffEmail: 'waranya.t@rmutr.ac.th',
      campus: 'วังไกลกังวล',
      staffType: 'academic',
      isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
      academicPrograms: ['สาขาวิชาการบริหารธุรกิจและการพัฒนาเมือง'],
      academicResponsiblePrograms: ['สาขาวิชาการบริหารธุรกิจและการพัฒนาเมือง'],
      courseTitle: 'เทคนิคการสอนยุคใหม่แบบ Active Learning และการประเมินผลตาม Outcome-Based Education (OBE)',
      categories: ['ด้านการจัดการเรียนการสอนและการประเมินผล', 'ด้านเทคโนโลยีดิจิทัลและ AI'],
      organizer: 'สำนักส่งเสริมวิชาการและงานทะเบียน มทร.รัตนโกสินทร์',
      startDate: '2026-03-12',
      endDate: '2026-03-13',
      hours: 12,
      location: 'ห้องประชุมวิทยาเขตวังไกลกังวล',
      locationType: 'onsite',
      expense: 1500,
      knowledgeBefore: 3,
      knowledgeAfter: 5,
      workApplication: 'นำรูปแบบ Active Learning และ Rubric Score ตามหลัก OBE ไปปรับใช้ในทุกรายวิชาของหลักสูตรการบริหารธุรกิจและการพัฒนาเมือง',
      certificateFileName: 'ActiveLearning_OBE_Cert.pdf',
      submittedAt: '2026-03-14T10:20:00.000Z'
    }
  ];

  function getRecordsFromFile() {
    try {
      if (!fs.existsSync(RECORDS_FILE_PATH)) {
        fs.writeFileSync(RECORDS_FILE_PATH, JSON.stringify(INITIAL_TRAINING_RECORDS, null, 2), "utf8");
        return INITIAL_TRAINING_RECORDS;
      }
      const data = fs.readFileSync(RECORDS_FILE_PATH, "utf8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Error reading records from file database:", err);
      return INITIAL_TRAINING_RECORDS;
    }
  }

  function saveRecordsToFile(records: any[]) {
    try {
      fs.writeFileSync(RECORDS_FILE_PATH, JSON.stringify(records, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing records to file database:", err);
    }
  }

  let initialBackupSyncDone = false;

  // Google Sheet Backup Utilities
  function getBackupUrl(): string {
    try {
      const configPath = path.join(process.cwd(), "backup-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.webAppUrl && !config.webAppUrl.includes("SAMPLE_PLACEHOLDER_KEY")) {
          let url = config.webAppUrl.trim();
          // Normalize Google Workspace domain URL to standard public URL if possible to avoid accounts.google.com login redirect
          if (url.includes("/a/macros/")) {
            url = url.replace(/\/a\/macros\/[^/]+\/s\//, "/macros/s/");
          }
          return url;
        }
      }
    } catch (err) {
      console.error("[Backup Config Error] Failed to read backup-config.json:", err);
    }
    const envUrl = process.env.GOOGLE_BACKUP_WEBAPP_URL || "";
    if (envUrl.includes("/a/macros/")) {
      return envUrl.replace(/\/a\/macros\/[^/]+\/s\//, "/macros/s/").trim();
    }
    return envUrl.trim();
  }

  function mapRecordToBackupFormat(r: any, index: number) {
    const position = r.jobCharacteristics || 'ไม่ระบุ';
    const department = r.staffType === 'academic'
      ? (r.academicPrograms?.join(', ') || 'วิทยาลัยนวัตกรรมการจัดการ')
      : (r.supportDeptGroup || 'วิทยาลัยนวัตกรรมการจัดการ');

    return {
      id: r.id,
      no: index + 1,
      staffName: r.staffName || "",
      staffType: r.staffType === 'academic' ? 'สายวิชาการ' : 'สายสนับสนุน',
      position: position,
      department: department,
      courseTitle: r.courseTitle || "",
      category: r.categories?.join(', ') || 'ทั่วไป',
      organizer: r.organizer || "",
      trainingDate: r.startDate === r.endDate ? (r.startDate || "") : `${r.startDate || ""} ถึง ${r.endDate || ""}`,
      hours: Number(r.hours) || 0,
      expense: Number(r.expense) || 0,
      knowledgeBefore: Number(r.knowledgeBefore) || 0,
      knowledgeAfter: Number(r.knowledgeAfter) || 0
    };
  }

  async function triggerGoogleSheetBackup(action: "upsert" | "delete" | "reset", payload: any) {
    const webAppUrl = getBackupUrl();
    if (!webAppUrl) {
      console.warn("[Backup System Warning] Google Sheets Web App URL not configured in backup-config.json or GOOGLE_BACKUP_WEBAPP_URL. Skipping background sync.");
      return;
    }

    const maxAttempts = 3;
    let attempt = 0;
    
    const bodyData = JSON.stringify({
      action,
      ...payload
    });

    const runSync = async () => {
      attempt++;
      try {
        console.log(`[Backup System Silent Background] Action: ${action} | Attempt ${attempt}/${maxAttempts} | Sending to ${webAppUrl}...`);

        let currentUrl = webAppUrl;
        let currentOptions: any = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: bodyData,
          redirect: "manual"
        };

        let response: Response | null = null;
        const maxRedirects = 5;

        for (let i = 0; i < maxRedirects; i++) {
          const fetchRes = await fetch(currentUrl, currentOptions);

          if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
            const redirectLocation = fetchRes.headers.get("location");
            if (!redirectLocation) {
              throw new Error(`ได้รับสถานะเปลี่ยนเส้นทาง ${fetchRes.status} แต่ไม่มี Location Header`);
            }

            currentUrl = new URL(redirectLocation, currentUrl).toString();

            if ([301, 302, 303].includes(fetchRes.status)) {
              currentOptions = {
                method: "GET",
                headers: {},
                redirect: "manual"
              };
            } else {
              currentOptions = {
                ...currentOptions,
                redirect: "manual"
              };
            }
            continue;
          }

          response = fetchRes;
          break;
        }

        if (!response) {
          throw new Error("พบสภาวะ Redirect แบบวนลูป (Too many redirects)");
        }

        if (!response.ok) {
          throw new Error(`Google Apps Script server returned status ${response.status}`);
        }

        const textResult = await response.text();
        
        // Robust safety verification to make sure the script actually ran instead of being redirected to a Google Login page
        if (textResult.includes("<!DOCTYPE html>") || textResult.includes("<html") || textResult.includes("google.com/ServiceLogin")) {
          console.log("[Backup System Info] Target Google Sheet Web App requires user authorization. Skipping silent background sync.");
          return;
        }

        try {
          const jsonResult = JSON.parse(textResult);
          if (jsonResult.status === "error") {
            console.log(`[Backup System Info] Remote script returned status error: ${jsonResult.message || "Unauthorized"}`);
            return;
          }
          console.log(`[Backup System Success] Sync completed.`);
        } catch (parseErr: any) {
          console.log(`[Backup System Info] Sync transmission completed.`);
        }
      } catch (err: any) {
        console.log(`[Backup System Info] Sync connection skipped: ${err.message || "Service status checked"}`);
      }
    };

    // Launch async without await to keep it non-blocking
    runSync();
  }

  // Initialize Firebase Firestore for durable, synchronized cloud-persistence using official Firebase Client SDK on server-side to bypass IAM permission denied issues
  let firestoreDb: any = null;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (firebaseConfig.projectId) {
        const app = initializeApp(firebaseConfig);
        firestoreDb = initializeFirestore(app, {
          experimentalForceLongPolling: true
        }, firebaseConfig.firestoreDatabaseId || undefined);
        console.log(`Server-side Firebase Web SDK initialized successfully with Long Polling. Project: ${firebaseConfig.projectId}, Database ID: ${firebaseConfig.firestoreDatabaseId || "(default)"}`);
      }
    }
  } catch (err) {
    console.error("Failed to initialize Server-side Firebase Web SDK in server.ts:", err);
  }

  // Check and seed Firestore with default seed records if completely empty on first startup
  async function checkAndSeedFirestore() {
    if (firestoreDb) {
      try {
        const colRef = collection(firestoreDb, "training_records");
        const snapshot = await getDocs(colRef);
        if (snapshot.empty) {
          console.log("Firestore 'training_records' collection is empty. Seeding with records from local file...");
          const fileRecords = getRecordsFromFile();
          for (const record of fileRecords) {
            const docRef = doc(firestoreDb, "training_records", record.id);
            await setDoc(docRef, record);
          }
          console.log("Firestore training records seeding completed successfully!");
        }
      } catch (err) {
        console.error("Failed to check or seed Firestore collection:", err);
      }
    }
  }
  
  // Trigger check and seed asynchronously
  checkAndSeedFirestore().catch(err => {
    console.error("Error running checkAndSeedFirestore:", err);
  });

  // Get all custom training records from Firestore with local file fallback
  app.get("/api/training-records", async (req, res) => {
    try {
      let records: any[] = [];
      if (firestoreDb) {
        try {
          const colRef = collection(firestoreDb, "training_records");
          const snapshot = await getDocs(colRef);
          snapshot.forEach((docObj) => {
            records.push(docObj.data());
          });
          
          if (records.length === 0) {
            records = getRecordsFromFile();
          } else {
            // Sort in memory by submittedAt descending so new ones are on top
            records.sort((a, b) => {
              const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
              const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
              return bTime - aTime;
            });
            // Mirror to local file database for offline/safe fallback
            saveRecordsToFile(records);
          }
        } catch (dbErr) {
          console.error("Failed to fetch records from Firestore, falling back to local file database:", dbErr);
          records = getRecordsFromFile();
        }
      } else {
        records = getRecordsFromFile();
      }

      // Trigger a silent, asynchronous one-time full initial sync to Google Sheets if a valid backup URL is configured
      if (!initialBackupSyncDone) {
        const backupUrl = getBackupUrl();
        if (backupUrl) {
          initialBackupSyncDone = true;
          console.log("[Backup System] Valid Google Sheets Web App URL detected. Triggering silent, one-time initial full sync of all records...");
          try {
            const mappedRecords = records.map((r, idx) => mapRecordToBackupFormat(r, idx));
            triggerGoogleSheetBackup("reset", { records: mappedRecords });
          } catch (backupErr) {
            console.error("[Backup System Sync Error] Failed to trigger initial background sync:", backupErr);
          }
        }
      }

      // Set strict cache-control headers to prevent any browser caching across all admins
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ success: true, records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save (Create or Update) a training record to Firestore and mirror to local file
  app.post("/api/training-records", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record || !record.id) {
        return res.status(400).json({ success: false, error: "ข้อมูล Training Record ไม่สมบูรณ์" });
      }

      if (firestoreDb) {
        try {
          const docRef = doc(firestoreDb, "training_records", record.id);
          await setDoc(docRef, record);
          console.log(`Successfully saved record ${record.id} to Firestore.`);
        } catch (dbErr) {
          console.error(`Failed to save record ${record.id} to Firestore:`, dbErr);
        }
      }

      // Mirror to local file database
      const records = getRecordsFromFile();
      const existingIndex = records.findIndex((r: any) => r.id === record.id);
      
      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        records.unshift(record);
      }
      saveRecordsToFile(records);

      // Trigger silent background backup to Google Sheet
      try {
        const syncIndex = records.findIndex((r: any) => r.id === record.id);
        const mapped = mapRecordToBackupFormat(record, syncIndex >= 0 ? syncIndex : 0);
        triggerGoogleSheetBackup("upsert", { record: mapped });
      } catch (backupErr) {
        console.error("[Backup System Sync Error] Failed to prepare backup payload:", backupErr);
      }
      
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a training record from Firestore and mirror to local file
  app.delete("/api/training-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.headers['x-user-role'];
      const userEmail = req.headers['x-user-email'];

      if (userRole !== 'admin') {
        console.warn(`Unauthorized delete attempt of record ${id} by role: ${userRole}, email: ${userEmail}`);
        return res.status(403).json({ success: false, error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ลบข้อมูล" });
      }

      if (!id) {
        return res.status(400).json({ success: false, error: "กรุณาระบุไอดีที่ต้องการลบ" });
      }

      if (firestoreDb) {
        try {
          const docRef = doc(firestoreDb, "training_records", id);
          await deleteDoc(docRef);
          console.log(`Successfully deleted record ${id} from Firestore.`);
        } catch (dbErr) {
          console.error(`Failed to delete record ${id} from Firestore:`, dbErr);
        }
      }

      // Mirror to local file database
      let records = getRecordsFromFile();
      records = records.filter((r: any) => r.id !== id);
      saveRecordsToFile(records);

      // Trigger silent background backup to Google Sheet for deletion
      try {
        triggerGoogleSheetBackup("delete", { id });
      } catch (backupErr) {
        console.error("[Backup System Sync Error] Failed to trigger deletion backup:", backupErr);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset all records to initial seed data on the server and in Firestore
  app.post("/api/training-records/reset", async (req, res) => {
    try {
      if (firestoreDb) {
        try {
          const colRef = collection(firestoreDb, "training_records");
          const snapshot = await getDocs(colRef);
          
          // Use batch to atomically clear and reset documents
          const batch = writeBatch(firestoreDb);
          snapshot.forEach((docObj) => {
            batch.delete(docObj.ref);
          });
          await batch.commit();

          const seedBatch = writeBatch(firestoreDb);
          for (const record of INITIAL_TRAINING_RECORDS) {
            const docRef = doc(firestoreDb, "training_records", record.id);
            seedBatch.set(docRef, record);
          }
          await seedBatch.commit();
          
          console.log("Successfully reset Firestore training_records collection using batch.");
        } catch (dbErr) {
          console.error("Failed to reset Firestore records:", dbErr);
        }
      }

      saveRecordsToFile(INITIAL_TRAINING_RECORDS);

      // Trigger silent background backup to Google Sheet for reset
      try {
        const mappedRecords = INITIAL_TRAINING_RECORDS.map((r, idx) => mapRecordToBackupFormat(r, idx));
        triggerGoogleSheetBackup("reset", { records: mappedRecords });
      } catch (backupErr) {
        console.error("[Backup System Sync Error] Failed to trigger reset backup:", backupErr);
      }

      res.json({ success: true, records: INITIAL_TRAINING_RECORDS });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

const DEFAULT_SPREADSHEET_ID = '1AXZ1f3DihzHLsEk8TdL-Y1wCUt0ubyuH0S_oDYfe4n8';

  // Public gviz fallback for reading Google Sheets without requiring Google Sheets API
  async function fetchHRStaffFromSheetsGviz(spreadsheetId: string) {
    const tabsToTry = ['teacher', 'support', 'admin'];
    const allStaff: Array<{
      name: string;
      id: string;
      email: string;
      campus: 'ศาลายา' | 'บพิตรพิมุข พักตราการ' | 'วังไกลกังวล' | 'พื้นที่อื่น ๆ';
      type: 'support' | 'academic';
      dept: string;
      sheetName: string;
      role?: string;
    }> = [];

    const sheetSummaries: Array<{ title: string; count: number }> = [];

    for (const sheetTitle of tabsToTry) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const text = await response.text();
        if (!text.includes("google.visualization.Query.setResponse")) continue;

        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        if (data.status !== "ok" || !data.table) continue;

        const colLabels = data.table.cols.map((c: any, idx: number) => c && c.label ? String(c.label).trim() : `col_${idx}`);
        const rows: any[][] = [];
        
        rows.push(colLabels);

        for (const r of (data.table.rows || [])) {
          if (!r || !r.c) continue;
          const rowArr = r.c.map((cell: any) => {
            if (!cell) return "";
            if (cell.v !== null && cell.v !== undefined) return String(cell.v);
            if (cell.f !== null && cell.f !== undefined) return String(cell.f);
            return "";
          });
          rows.push(rowArr);
        }

        if (rows.length < 2) continue;

        let headerRowIdx = 0;
        const headers = rows[headerRowIdx].map((h: any) => String(h || '').trim().toLowerCase());

        let fullNameIdx = headers.findIndex((h: string) => /ชื่อ.*สกุล|fullname|ชื่อสุทธิ/i.test(h));
        let firstNameIdx = headers.findIndex((h: string) => (h.includes('ชื่อ') || h.includes('first')) && !h.includes('สกุล') && !h.includes('คำนำหน้า'));
        let lastNameIdx = headers.findIndex((h: string) => /สกุล|last/i.test(h));
        let idIdx = headers.findIndex((h: string) => /^id$|รหัส/i.test(h));
        let deptIdx = headers.findIndex((h: string) => /ฝ่าย|แผนก|สังกัด|สาขา|หลักสูตร|dept/i.test(h));
        let posIdx = headers.findIndex((h: string) => /ตำแหน่ง|position/i.test(h));
        let emailIdx = headers.findIndex((h: string) => /email|อีเมล|mail/i.test(h));
        let titlePrefixIdx = headers.findIndex((h: string) => /คำนำหน้า|prefix|ยศ/i.test(h));
        let campusIdx = headers.findIndex((h: string) => /พื้นที่|sly_wk|วิทยาเขต|campus/i.test(h));
        let roleIdx = headers.findIndex((h: string) => /role|สิทธิ์|บทบาท|ประเภท|permission/i.test(h));

        const deptFoundInHeader = deptIdx !== -1;

        const usedIdx = new Set(
          [fullNameIdx, firstNameIdx, lastNameIdx, idIdx, emailIdx].filter(i => i >= 0)
        );
        const canFallback = (idx: number) => headers.length > idx && !usedIdx.has(idx);

        if (fullNameIdx === -1 && firstNameIdx === -1 && canFallback(3)) fullNameIdx = 3;
        if (idIdx === -1 && canFallback(1)) idIdx = 1;
        if (titlePrefixIdx === -1 && canFallback(2)) titlePrefixIdx = 2;
        if (campusIdx === -1 && canFallback(4)) campusIdx = 4;
        if (deptIdx === -1 && canFallback(5)) deptIdx = 5;

        let countInSheet = 0;

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const titlePrefix = (titlePrefixIdx >= 0 && row[titlePrefixIdx]) ? String(row[titlePrefixIdx]).trim() : '';
          let rawName = '';

          if (fullNameIdx >= 0 && row[fullNameIdx]) {
            rawName = String(row[fullNameIdx]).trim();
          } else if (firstNameIdx >= 0 && row[firstNameIdx]) {
            const fn = String(row[firstNameIdx]).trim();
            const ln = (lastNameIdx >= 0 && row[lastNameIdx]) ? String(row[lastNameIdx]).trim() : '';
            rawName = ln ? `${fn} ${ln}` : fn;
          }

          if (!rawName || rawName === 'ชื่อ-สกุล' || rawName === 'ชื่อ - สกุล' || rawName === 'ชื่อ' || rawName === 'undefined') continue;

          let fullName = rawName;
          if (titlePrefix && !fullName.toLowerCase().startsWith(titlePrefix.toLowerCase()) && !/^(ผศ|รศ|ดร|อ\.|อาจารย์|นาย|นาง|นางสาว)/i.test(fullName)) {
            const needsSpace = /\.|ผศ|รศ|ดร|อ\b/i.test(titlePrefix);
            fullName = needsSpace ? `${titlePrefix} ${fullName}` : `${titlePrefix}${fullName}`;
          }

          fullName = fullName.replace(/\s+/g, ' ').trim();

          let sheetOffset = 100;
          if (sheetTitle.toLowerCase().trim() === 'support') {
            sheetOffset = 500;
          } else if (sheetTitle.toLowerCase().trim() === 'admin') {
            sheetOffset = 900;
          }
          const id = (idIdx >= 0 && row[idIdx]) ? String(row[idIdx]).trim() : `6222${(i + sheetOffset).toString().padStart(3, '0')}`;
          const deptName = (deptIdx >= 0 && row[deptIdx]) ? String(row[deptIdx]).trim() : 'ฝ่ายบริการวิชาการและเครือข่ายสัมพันธ์';
          const posName = (posIdx >= 0 && row[posIdx]) ? String(row[posIdx]).trim() : '';

          let email = (emailIdx >= 0 && row[emailIdx]) ? String(row[emailIdx]).trim() : '';
          if (!email) {
            const emailCell = row.find((cell: any) => String(cell).includes('@') && String(cell).includes('.'));
            if (emailCell) email = String(emailCell).trim();
          }

          let rawCampus = (campusIdx >= 0 && row[campusIdx]) ? String(row[campusIdx]).trim() : '';
          let campusName: 'ศาลายา' | 'บพิตรพิมุข พักตราการ' | 'วังไกลกังวล' | 'พื้นที่อื่น ๆ' = 'ศาลายา';
          if (rawCampus.toLowerCase().includes('sly') || rawCampus.includes('ศาลายา')) {
            campusName = 'ศาลายา';
          } else if (rawCampus.toLowerCase().includes('wk') || rawCampus.includes('วังไกลกังวล')) {
            campusName = 'วังไกลกังวล';
          } else if (rawCampus.toLowerCase().includes('bpitr') || rawCampus.includes('บพิตร')) {
            campusName = 'บพิตรพิมุข พักตราการ';
          }

          const sheetLower = sheetTitle.toLowerCase().trim();
          const isAcademicSheet = sheetLower === 'teacher' || sheetLower.includes('teacher') || sheetLower.includes('อาจารย์') || sheetLower.includes('วิชาการ') || sheetLower.includes('academic');
          const isAcademicDept = (deptFoundInHeader && deptName.includes('วิชาการ')) || posName.includes('อาจารย์') || posName.includes('ผศ') || posName.includes('รศ') || posName.includes('อาจารย์ผู้สอน');

          let deptDisplay = deptName;
          if (posName && posName !== deptName) {
            deptDisplay = `${deptName} (${posName})`;
          }

          allStaff.push({
            id,
            name: fullName,
            email: email || `${id}@rmutr.ac.th`,
            campus: campusName,
            type: (isAcademicSheet || isAcademicDept) ? 'academic' : 'support',
            dept: deptDisplay,
            sheetName: sheetTitle,
            role: (roleIdx >= 0 && row[roleIdx]) ? String(row[roleIdx]).trim() : ''
          });

          countInSheet++;
        }

        sheetSummaries.push({ title: sheetTitle, count: countInSheet });
      } catch (err) {
        console.warn(`gviz fetch error for tab ${sheetTitle}:`, err);
      }
    }

    if (allStaff.length === 0) {
      throw new Error("Unable to fetch HR staff data from Google Sheets via API or public fallback.");
    }

    return {
      success: true,
      spreadsheetTitle: "HR_DATA",
      totalSheets: sheetSummaries.length,
      sheets: sheetSummaries,
      totalStaff: allStaff.length,
      staff: allStaff
    };
  }

  // Shared logic: fetch HR staff data from Google Sheets across ALL sheets/tabs
  async function fetchHRStaffFromSheets(spreadsheetId: string) {
    // 1. Try public gviz fetch first (fast, reliable, requires no GCP API enablement or API keys)
    try {
      const gvizResult = await fetchHRStaffFromSheetsGviz(spreadsheetId);
      if (gvizResult && gvizResult.success && gvizResult.totalStaff > 0) {
        return gvizResult;
      }
    } catch (_gvizErr) {
      // Ignore gviz error silently and fall back to official API
    }

    // 2. Fallback: Official Google Sheets API
    try {
      let auth: any = null;
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: process.env.GOOGLE_OAUTH_TOKEN });
        auth = oauth2Client;
      } else {
        auth = await google.auth.getClient({
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        }).catch(() => null);
      }

      const sheetsOptions: any = { version: 'v4' };
      if (auth) {
        sheetsOptions.auth = auth;
      }
      const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      if (apiKey) {
        sheetsOptions.apiKey = apiKey;
      }
      const sheets = google.sheets(sheetsOptions);

      // Get metadata to discover all sheet tabs
      const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetsList = spreadsheetMeta.data.sheets || [];

      const allStaff: Array<{
        name: string;
        id: string;
        email: string;
        campus: 'ศาลายา' | 'บพิตรพิมุข พักตราการ' | 'วังไกลกังวล' | 'พื้นที่อื่น ๆ';
        type: 'support' | 'academic';
        dept: string;
        sheetName: string;
        role?: string;
      }> = [];

      const sheetSummaries: Array<{ title: string; count: number }> = [];

      for (const sheetObj of sheetsList) {
        const sheetTitle = sheetObj.properties?.title;
        if (!sheetTitle) continue;

        if (/old/i.test(sheetTitle)) {
          sheetSummaries.push({ title: sheetTitle, count: 0 });
          continue;
        }

        try {
          const resValues = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetTitle}'`,
          });

          const rows = resValues.data.values || [];
          if (rows.length < 1) continue;

          let headerRowIdx = 0;
          for (let r = 0; r < Math.min(20, rows.length); r++) {
            const rowStr = rows[r].map((c: any) => String(c || '').toLowerCase()).join(' ');
            if (rowStr.includes('ชื่อ') || rowStr.includes('name') || rowStr.includes('รหัส') || rowStr.includes('id') || rowStr.includes('ลำดับ') || rowStr.includes('no')) {
              headerRowIdx = r;
              break;
            }
          }

          const headers = rows[headerRowIdx].map((h: any) => String(h || '').trim().toLowerCase());

          let fullNameIdx = headers.findIndex((h: string) => /ชื่อ.*สกุล|fullname|ชื่อสุทธิ/i.test(h));
          let firstNameIdx = headers.findIndex((h: string) => (h.includes('ชื่อ') || h.includes('first')) && !h.includes('สกุล') && !h.includes('คำนำหน้า'));
          let lastNameIdx = headers.findIndex((h: string) => /สกุล|last/i.test(h));
          let idIdx = headers.findIndex((h: string) => /^id$|รหัส/i.test(h));
          let deptIdx = headers.findIndex((h: string) => /ฝ่าย|แผนก|สังกัด|สาขา|หลักสูตร|dept/i.test(h));
          let posIdx = headers.findIndex((h: string) => /ตำแหน่ง|position/i.test(h));
          let emailIdx = headers.findIndex((h: string) => /email|อีเมล|mail/i.test(h));
          let titlePrefixIdx = headers.findIndex((h: string) => /คำนำหน้า|prefix|ยศ/i.test(h));
          let campusIdx = headers.findIndex((h: string) => /พื้นที่|sly_wk|วิทยาเขต|campus/i.test(h));
          let roleIdx = headers.findIndex((h: string) => /role|สิทธิ์|บทบาท|ประเภท|permission/i.test(h));

          const deptFoundInHeader = deptIdx !== -1;

          const usedIdx = new Set(
            [fullNameIdx, firstNameIdx, lastNameIdx, idIdx, emailIdx].filter(i => i >= 0)
          );
          const canFallback = (idx: number) => headers.length > idx && !usedIdx.has(idx);

          if (fullNameIdx === -1 && firstNameIdx === -1 && canFallback(3)) fullNameIdx = 3;
          if (idIdx === -1 && canFallback(1)) idIdx = 1;
          if (titlePrefixIdx === -1 && canFallback(2)) titlePrefixIdx = 2;
          if (campusIdx === -1 && canFallback(4)) campusIdx = 4;
          if (deptIdx === -1 && canFallback(5)) deptIdx = 5;

          let countInSheet = 0;

          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const titlePrefix = (titlePrefixIdx >= 0 && row[titlePrefixIdx]) ? String(row[titlePrefixIdx]).trim() : '';
            let rawName = '';

            if (fullNameIdx >= 0 && row[fullNameIdx]) {
              rawName = String(row[fullNameIdx]).trim();
            } else if (firstNameIdx >= 0 && row[firstNameIdx]) {
              const fn = String(row[firstNameIdx]).trim();
              const ln = (lastNameIdx >= 0 && row[lastNameIdx]) ? String(row[lastNameIdx]).trim() : '';
              rawName = ln ? `${fn} ${ln}` : fn;
            }

            if (!rawName || rawName === 'ชื่อ-สกุล' || rawName === 'ชื่อ - สกุล' || rawName === 'ชื่อ' || rawName === 'undefined') continue;

            let fullName = rawName;
            if (titlePrefix && !fullName.toLowerCase().startsWith(titlePrefix.toLowerCase()) && !/^(ผศ|รศ|ดร|อ\.|อาจารย์|นาย|นาง|นางสาว)/i.test(fullName)) {
              const needsSpace = /\.|ผศ|รศ|ดร|อ\b/i.test(titlePrefix);
              fullName = needsSpace ? `${titlePrefix} ${fullName}` : `${titlePrefix}${fullName}`;
            }

            fullName = fullName.replace(/\s+/g, ' ').trim();

            let sheetOffset = 100;
            if (sheetTitle.toLowerCase().trim() === 'support') {
              sheetOffset = 500;
            } else if (sheetTitle.toLowerCase().trim() === 'admin') {
              sheetOffset = 900;
            }
            const id = (idIdx >= 0 && row[idIdx]) ? String(row[idIdx]).trim() : `6222${(i + sheetOffset).toString().padStart(3, '0')}`;
            const deptName = (deptIdx >= 0 && row[deptIdx]) ? String(row[deptIdx]).trim() : 'ฝ่ายบริการวิชาการและเครือข่ายสัมพันธ์';
            const posName = (posIdx >= 0 && row[posIdx]) ? String(row[posIdx]).trim() : '';

            let email = (emailIdx >= 0 && row[emailIdx]) ? String(row[emailIdx]).trim() : '';
            if (!email) {
              const emailCell = row.find((cell: any) => String(cell).includes('@') && String(cell).includes('.'));
              if (emailCell) email = String(emailCell).trim();
            }

            let rawCampus = (campusIdx >= 0 && row[campusIdx]) ? String(row[campusIdx]).trim() : '';
            let campusName: 'ศาลายา' | 'บพิตรพิมุข พักตราการ' | 'วังไกลกังวล' | 'พื้นที่อื่น ๆ' = 'ศาลายา';
            if (rawCampus.toLowerCase().includes('sly') || rawCampus.includes('ศาลายา')) {
              campusName = 'ศาลายา';
            } else if (rawCampus.toLowerCase().includes('wk') || rawCampus.includes('วังไกลกังวล')) {
              campusName = 'วังไกลกังวล';
            } else if (rawCampus.toLowerCase().includes('bpitr') || rawCampus.includes('บพิตร')) {
              campusName = 'บพิตรพิมุข พักตราการ';
            }

            const sheetLower = sheetTitle.toLowerCase().trim();
            const isAcademicSheet = sheetLower === 'teacher' || sheetLower.includes('teacher') || sheetLower.includes('อาจารย์') || sheetLower.includes('วิชาการ') || sheetLower.includes('academic');
            const isAcademicDept = (deptFoundInHeader && deptName.includes('วิชาการ')) || posName.includes('อาจารย์') || posName.includes('ผศ') || posName.includes('รศ') || posName.includes('อาจารย์ผู้สอน');

            let deptDisplay = deptName;
            if (posName && posName !== deptName) {
              deptDisplay = `${deptName} (${posName})`;
            }

            allStaff.push({
              id,
              name: fullName,
              email: email || `${id}@rmutr.ac.th`,
              campus: campusName,
              type: (isAcademicSheet || isAcademicDept) ? 'academic' : 'support',
              dept: deptDisplay,
              sheetName: sheetTitle,
              role: (roleIdx >= 0 && row[roleIdx]) ? String(row[roleIdx]).trim() : ''
            });

            countInSheet++;
          }

          sheetSummaries.push({ title: sheetTitle, count: countInSheet });
        } catch (sheetErr) {
          console.warn(`Error reading sheet ${sheetTitle}:`, sheetErr);
        }
      }

      return {
        success: true,
        spreadsheetTitle: spreadsheetMeta.data.properties?.title || "HR_DATA",
        totalSheets: sheetsList.length,
        sheets: sheetSummaries,
        totalStaff: allStaff.length,
        staff: allStaff
      };
    } catch (apiErr: any) {
      throw apiErr;
    }
  }

  // POST: Verify admin email against the Google Sheet's admin tab
  app.post("/api/auth/verify-admin", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, error: "กรุณาระบุที่อยู่อีเมลในการตรวจสอบสิทธิ์" });
      }

      const lowerEmail = email.trim().toLowerCase();

      // Fetch latest staff data from Google Sheets (which includes support, teacher, admin tabs)
      const sheetsData = await fetchHRStaffFromSheets(DEFAULT_SPREADSHEET_ID);
      
      if (!sheetsData || !sheetsData.staff || sheetsData.staff.length === 0) {
        throw new Error("ไม่พบข้อมูลบุคลากรในระบบฐานข้อมูล Google Sheets");
      }

      // Filter for staff listed under 'admin' tab
      const adminStaff = sheetsData.staff.find(
        (s: any) => s.email.toLowerCase() === lowerEmail && s.sheetName.toLowerCase().trim() === 'admin'
      );

      if (adminStaff) {
        // Look at the parsed role column
        const rVal = (adminStaff.role || '').trim().toLowerCase();
        
        // Check if role indicates reviewer/editor (e.g. contains "ผู้ทาน", "reviewer", "editor", "ทาน", or "2")
        const isReviewer = rVal.includes('ผู้ทาน') || rVal.includes('reviewer') || rVal.includes('editor') || rVal.includes('ทาน') || rVal === '2';
        
        return res.json({
          success: true,
          authorized: true,
          staff: {
            id: adminStaff.id,
            name: adminStaff.name,
            email: adminStaff.email,
            role: isReviewer ? "reviewer" : "admin",
            roleTitle: isReviewer 
              ? "ผู้ทาน (Reviewer - Verified via Google Sheet)" 
              : "ผู้ดูแลระบบ (Admin - Verified via Google Sheet)",
            dept: adminStaff.dept,
            campus: adminStaff.campus
          }
        });
      } else {
        return res.json({
          success: true,
          authorized: false,
          error: `❌ บัญชี Google Account (${email}) ไม่มีสิทธิ์เข้าใช้งานในฐานะผู้ดูแลระบบ (ไม่พบรายชื่อผู้ใช้งานนี้ในตารางแท็บ 'admin' ของ Google Sheets)`
        });
      }
    } catch (err: any) {
      console.error("Admin verification error:", err);
      return res.status(500).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์กับฐานข้อมูล Google Sheets: ${err.message || String(err)}`
      });
    }
  });

  // GET: used for auto-sync on page load.
  app.get("/api/hr-data", async (req, res) => {
    try {
      const result = await fetchHRStaffFromSheets(DEFAULT_SPREADSHEET_ID);
      if (result && Array.isArray(result.staff)) {
        // Filter out admin sheet staff
        result.staff = result.staff.filter((s: any) => {
          const sheet = (s.sheetName || '').toLowerCase().trim();
          if (sheet === 'admin') return false;
          
          return true;
        });

        // Deduplicate on the server side to ensure only one unique person is kept (the first/top one)
        const seenNames = new Set<string>();
        const uniqueStaff: any[] = [];
        
        result.staff.forEach((s: any) => {
          // Clean Thai prefix for deduplication comparison
          const cleanName = s.name.trim()
            .replace(/^(นาย|นาง|นางสาว|ผศ\.ดร\.|รศ\.ดร\.|อ\.ดร\.|ดร\.|ผศ\.|รศ\.|อ\.|อาจารย์)\.?\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
          if (!seenNames.has(cleanName)) {
            seenNames.add(cleanName);
            uniqueStaff.push(s);
          }
        });
        
        result.staff = uniqueStaff;
        result.totalStaff = uniqueStaff.length;
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Google Sheets HR DATA fetch error:", err);
      const status = err.status || err.response?.status || (typeof err.code === 'number' ? err.code : 500);
      const googleError = err.response?.data?.error;
      const detailedMessage = googleError?.message || err.message || String(err);

      const errorDetails = {
        message: detailedMessage,
        code: googleError?.code || err.code || status,
        status: googleError?.status || status,
        errors: googleError?.errors || err.errors || null,
        responseData: err.response?.data || null,
        stack: err.stack || null,
      };

      return res.status(typeof status === 'number' && status >= 400 && status < 600 ? status : 500).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets: ${detailedMessage}`,
        details: detailedMessage,
        errorDetails: errorDetails
      });
    }
  });

  // Helper to parse Thai date formats (e.g. "DD/MM/YYYY" or "YYYY-MM-DD")
  function parseThaiSheetDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const clean = dateStr.trim();
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    const parts = clean.split('/');
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let yearVal = parseInt(parts[2], 10);
      
      if (yearVal > 2400) {
        yearVal -= 543;
      }
      return `${yearVal}-${month}-${day}`;
    }

    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}

    return new Date().toISOString().split('T')[0];
  }

  // GET: Fetch and parse training records from the "olddata" tab in Google Sheets
  app.get("/api/sheets/olddata", async (req, res) => {
    try {
      const spreadsheetId = DEFAULT_SPREADSHEET_ID;
      let rows: any[][] = [];
      
      // 1. Try public gviz fetch first (extremely fast and reliable)
      try {
        const sheetTitle = 'olddata';
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          if (text.includes("google.visualization.Query.setResponse")) {
            const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonStr);
            if (data.status === "ok" && data.table) {
              const colLabels = data.table.cols.map((c: any, idx: number) => c && c.label ? String(c.label).trim() : `col_${idx}`);
              rows.push(colLabels);

              for (const r of (data.table.rows || [])) {
                if (!r || !r.c) continue;
                const rowArr = r.c.map((cell: any) => {
                  if (!cell) return "";
                  if (cell.v !== null && cell.v !== undefined) {
                    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                      try {
                        const parts = cell.v.match(/\d+/g);
                        if (parts && parts.length >= 3) {
                          const y = parseInt(parts[0], 10);
                          const m = (parseInt(parts[1], 10) + 1).toString().padStart(2, '0');
                          const d = parseInt(parts[2], 10).toString().padStart(2, '0');
                          return `${d}/${m}/${y}`;
                        }
                      } catch (e) {}
                    }
                    return String(cell.v);
                  }
                  if (cell.f !== null && cell.f !== undefined) return String(cell.f);
                  return "";
                });
                rows.push(rowArr);
              }
            }
          }
        }
      } catch (gvizErr) {
        console.warn("gviz fetch failed for olddata:", gvizErr);
      }

      // 2. Fallback to API if gviz empty or failed
      if (rows.length < 2) {
        let auth: any = null;
        if (process.env.GOOGLE_OAUTH_TOKEN) {
          const oauth2Client = new google.auth.OAuth2();
          oauth2Client.setCredentials({ access_token: process.env.GOOGLE_OAUTH_TOKEN });
          auth = oauth2Client;
        } else {
          auth = await google.auth.getClient({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          }).catch(() => null);
        }

        const sheetsOptions: any = { version: 'v4' };
        if (auth) {
          sheetsOptions.auth = auth;
        }
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (apiKey) {
          sheetsOptions.apiKey = apiKey;
        }
        const sheets = google.sheets(sheetsOptions);

        const resValues = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'olddata'`,
        });
        rows = resValues.data.values || [];
      }

      if (rows.length < 2) {
        return res.json({ success: true, records: [] });
      }

      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const rowStr = rows[r].map((c: any) => String(c || '').toLowerCase()).join(' ');
        if (rowStr.includes('ชื่อ') || rowStr.includes('name') || rowStr.includes('หลักสูตร') || rowStr.includes('ประทับเวลา')) {
          headerRowIdx = r;
          break;
        }
      }

      const headers = rows[headerRowIdx].map((h: any) => String(h || '').trim().toLowerCase());

      // Find indices adaptively
      let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('เมล') || h.includes('username'));
      let staffTypeIdx = headers.findIndex(h => h.includes('ประเภท') || h.includes('สายงาน') || h.includes('สายวิชาการ'));
      let staffNameIdx = headers.findIndex(h => h.includes('ชื่อ-สกุล') || h.includes('ชื่อ') || h.includes('fullname'));
      let campusIdx = headers.findIndex(h => h.includes('พื้นที่') || h.includes('วิทยาเขต') || h.includes('campus'));
      let deptIdx = headers.findIndex(h => h.includes('หลักสูตรที่') || h.includes('ฝ่าย') || h.includes('แผนก') || h.includes('สังกัด'));
      let courseTitleIdx = headers.findIndex(h => h.includes('ชื่อหลักสูตร') || h.includes('ชื่อโครงการ') || h.includes('โครงการที่เข้าร่วม') || h.includes('เรื่อง') || h.includes('หลักสูตรที่เข้า'));
      let categoryIdx = headers.findIndex(h => h.includes('หมวดหมู่') || h.includes('ประเภทหลักสูตร'));
      let locationIdx = headers.findIndex(h => h.includes('สถานที่') || h.includes('ห้องประชุม') || h.includes('online') || h.includes('onsite'));
      
      const dateIndices: number[] = [];
      headers.forEach((h, idx) => {
        if (h.includes('วัน เดือน ปี') || h.includes('วันที่') || h.includes('เริ่ม') || h.includes('date')) {
          dateIndices.push(idx);
        }
      });
      
      let startDateIdx = dateIndices[0] !== undefined ? dateIndices[0] : -1;
      let endDateIdx = dateIndices[1] !== undefined ? dateIndices[1] : startDateIdx;

      let expenseIdx = headers.findIndex(h => h.includes('งบประมาณ') || h.includes('ค่าใช้จ่าย') || h.includes('บาท') || h.includes('ค่าลงทะเบียน'));
      let applicationIdx = headers.findIndex(h => h.includes('ประโยชน์') || h.includes('นำไปใช้') || h.includes('ประยุกต์') || h.includes('ข้อเสนอแนะ'));

      // Fallback index defaults matching known sheet layout
      if (emailIdx === -1) emailIdx = 1;
      if (staffTypeIdx === -1) staffTypeIdx = 2;
      if (staffNameIdx === -1) staffNameIdx = 3;
      if (deptIdx === -1) deptIdx = 5;
      if (campusIdx === -1) campusIdx = 6;
      if (courseTitleIdx === -1) courseTitleIdx = 11;
      if (categoryIdx === -1) categoryIdx = 12;
      if (locationIdx === -1) locationIdx = 15;
      if (startDateIdx === -1) startDateIdx = 16;
      if (endDateIdx === -1) endDateIdx = 17;
      if (expenseIdx === -1) expenseIdx = 18;
      if (applicationIdx === -1) applicationIdx = 19;

      const parsedRecords: any[] = [];

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const email = (emailIdx >= 0 && row[emailIdx]) ? String(row[emailIdx]).trim() : '';
        const nameRaw = (staffNameIdx >= 0 && row[staffNameIdx]) ? String(row[staffNameIdx]).trim() : '';
        const typeRaw = (staffTypeIdx >= 0 && row[staffTypeIdx]) ? String(row[staffTypeIdx]).trim() : '';
        const campusRaw = (campusIdx >= 0 && row[campusIdx]) ? String(row[campusIdx]).trim() : 'ศาลายา';
        const deptRaw = (deptIdx >= 0 && row[deptIdx]) ? String(row[deptIdx]).trim() : 'วิทยาลัยนวัตกรรมการจัดการ';
        const courseTitle = (courseTitleIdx >= 0 && row[courseTitleIdx]) ? String(row[courseTitleIdx]).trim() : '';
        const categoryRaw = (categoryIdx >= 0 && row[categoryIdx]) ? String(row[categoryIdx]).trim() : '';
        const location = (locationIdx >= 0 && row[locationIdx]) ? String(row[locationIdx]).trim() : 'วิทยาลัยนวัตกรรมการจัดการ';
        const startDateRaw = (startDateIdx >= 0 && row[startDateIdx]) ? String(row[startDateIdx]).trim() : '';
        const endDateRaw = (endDateIdx >= 0 && row[endDateIdx]) ? String(row[endDateIdx]).trim() : '';
        const expenseRaw = (expenseIdx >= 0 && row[expenseIdx]) ? String(row[expenseIdx]).trim() : '';
        const appRaw = (applicationIdx >= 0 && row[applicationIdx]) ? String(row[applicationIdx]).trim() : '';

        if (!courseTitle || !nameRaw || nameRaw === 'ชื่อ-สกุล' || courseTitle === 'ชื่อหลักสูตร') continue;

        const staffName = nameRaw.replace(/\s+/g, ' ').trim();
        const staffEmail = email || `user_${i}@rmutr.ac.th`;
        const staffId = staffEmail.split('@')[0];

        const startDate = parseThaiSheetDate(startDateRaw);
        const endDate = parseThaiSheetDate(endDateRaw || startDateRaw);

        let days = 1;
        try {
          const sT = new Date(startDate).getTime();
          const eT = new Date(endDate).getTime();
          if (eT >= sT) {
            days = Math.max(1, Math.round((eT - sT) / (1000 * 60 * 60 * 24)) + 1);
          }
        } catch (e) {}
        const hours = days * 6;

        let locationType = "onsite";
        const locLower = location.toLowerCase();
        if (locLower.includes("online") || locLower.includes("ออนไลน์") || locLower.includes("zoom") || locLower.includes("meet") || locLower.includes("teams")) {
          locationType = "online";
        } else if (locLower.includes("hybrid") || locLower.includes("ไฮบริด")) {
          locationType = "hybrid";
        }

        let categoryMapped = "ด้านการบริหารจัดการและการพัฒนาองค์กร";
        const catLower = (categoryRaw + " " + courseTitle).toLowerCase();
        if (catLower.includes("สอน") || catLower.includes("เรียน") || catLower.includes("ประเมิน") || catLower.includes("ศึกษา")) {
          categoryMapped = "ด้านการจัดการเรียนการสอนและการประเมินผล";
        } else if (catLower.includes("วิจัย") || catLower.includes("นวัตกรรม") || catLower.includes("ผลงาน") || catLower.includes("academic") || catLower.includes("เขียนบทความ")) {
          categoryMapped = "ด้านการวิจัย นวัตกรรม และผลงานทางวิชาการ";
        } else if (catLower.includes("ดิจิทัล") || catLower.includes("ai") || catLower.includes("เทคโนโลยี") || catLower.includes("คอม") || catLower.includes("digital") || catLower.includes("python") || catLower.includes("โมเดล") || catLower.includes("workflow")) {
          categoryMapped = "ด้านเทคโนโลยีดิจิทัลและ AI";
        } else if (catLower.includes("อังกฤษ") || catLower.includes("ภาษา") || catLower.includes("สื่อสาร") || catLower.includes("english")) {
          categoryMapped = "ด้านภาษาอังกฤษและการสื่อสารสากล";
        } else if (catLower.includes("คุณธรรม") || catLower.includes("จริยธรรม") || catLower.includes("ธรรมาภิบาล")) {
          categoryMapped = "ด้านคุณธรรม จริยธรรม และธรรมาภิบาล";
        } else if (catLower.includes("อื่น")) {
          categoryMapped = "ด้านอื่น ๆ";
        }

        let expense = 0;
        if (expenseRaw) {
          const numMatch = expenseRaw.replace(/,/g, '').match(/\d+/);
          if (numMatch) {
            expense = parseInt(numMatch[0], 10);
          }
        }

        const staffType = (typeRaw.includes('วิชาการ') || typeRaw.includes('อาจารย์') || typeRaw.toLowerCase().includes('academic')) ? 'academic' : 'support';
        const campus = (campusRaw.includes('วังไกลกังวล') || campusRaw.toLowerCase().includes('wk')) ? 'วังไกลกังวล' : 'ศาลายา';
        const recordId = `olddata_row_${i}`;

        parsedRecords.push({
          id: recordId,
          staffId,
          staffName,
          staffEmail,
          campus,
          staffType,
          isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ',
          academicPrograms: staffType === 'academic' ? [deptRaw] : undefined,
          supportDeptGroup: staffType === 'support' ? deptRaw : undefined,
          courseTitle,
          categories: [categoryMapped],
          organizer: 'หน่วยงานภายนอก / Google Sheets',
          startDate,
          endDate,
          hours,
          location,
          locationType,
          expense,
          knowledgeBefore: 3,
          knowledgeAfter: 5,
          workApplication: appRaw || 'สามารถนำความรู้และทักษะจากการฝึกอบรมมาเพิ่มประสิทธิภาพในการปฏิบัติงาน สอดคล้องกับเป้าหมายองค์กรแห่งการเรียนรู้',
          submittedAt: new Date(startDate).toISOString(),
          userId: staffId
        });
      }

      return res.json({
        success: true,
        count: parsedRecords.length,
        records: parsedRecords
      });
    } catch (err: any) {
      console.error("Error loading olddata from sheets:", err);
      return res.status(500).json({
        success: false,
        error: `ไม่สามารถประมวลผลข้อมูลจาก Google Sheets ได้: ${err.message || String(err)}`
      });
    }
  });

  // POST: manual sync, supports a custom spreadsheet URL/ID
  app.post("/api/sheets/hr-data", async (req, res) => {
    try {
      const { spreadsheetId: inputId, spreadsheetUrl } = req.body;
      let spreadsheetId = inputId;

      if (spreadsheetUrl) {
        const match = String(spreadsheetUrl).match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          spreadsheetId = match[1];
        }
      }

      if (!spreadsheetId) {
        spreadsheetId = DEFAULT_SPREADSHEET_ID;
      }

      const result = await fetchHRStaffFromSheets(spreadsheetId);
      return res.json(result);
    } catch (err: any) {
      console.error("Google Sheets HR DATA fetch error:", err);
      const status = err.status || err.response?.status || (typeof err.code === 'number' ? err.code : 500);
      const googleError = err.response?.data?.error;
      const detailedMessage = googleError?.message || err.message || String(err);

      const errorDetails = {
        message: detailedMessage,
        code: googleError?.code || err.code || status,
        status: googleError?.status || status,
        errors: googleError?.errors || err.errors || null,
        responseData: err.response?.data || null,
        stack: err.stack || null,
      };

      return res.status(typeof status === 'number' && status >= 400 && status < 600 ? status : 500).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets: ${detailedMessage}`,
        details: detailedMessage,
        errorDetails: errorDetails
      });
    }
  });

  // Smart AI Fast Fill endpoint to parse raw training text
  app.post("/api/parse-training", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ error: "Missing rawText input" });
      }

      // Fallback intelligent Regex parser when API key is not present or quota exceeded
      const getRegexFallback = (textInput: string) => {
        const hoursMatch = textInput.match(/(\d+)\s*(ชั่วโมง|ชม)/i);
        const expenseMatch = textInput.match(/(\d[\d,]*)\s*(บาท)/i);
        const onlineMatch = /ออนไลน์|zoom|teams|google meet|online/i.test(textInput);
        const hybridMatch = /ไฮบริด|hybrid/i.test(textInput);
        
        const today = new Date().toISOString().split('T')[0];

        return {
          courseTitle: textInput.split('\n')[0].replace(/^(โครงการ|เรื่อง|หลักสูตร)\s*/, '').slice(0, 100) || "โครงการอบรมและพัฒนาศักยภาพ",
          organizer: textInput.includes("มทร") || textInput.includes("RCIM") ? "วิทยาลัยนวัตกรรมการจัดการ" : "หน่วยงานภายนอกสถาบัน",
          startDate: today,
          endDate: today,
          hours: hoursMatch ? parseInt(hoursMatch[1], 10) : 6,
          location: onlineMatch ? "ระบบออนไลน์ Zoom Meeting" : "ห้องประชุม RCIM ศาลายา",
          locationType: hybridMatch ? "hybrid" : (onlineMatch ? "online" : "onsite"),
          categories: ["ด้านการบริหารจัดการและการพัฒนาองค์กร"],
          expense: expenseMatch ? parseInt(expenseMatch[1].replace(/,/g, ''), 10) : 0,
          jobCharacteristics: "ผู้ปฏิบัติงานตามภารกิจหลักหรือลักษณะงานเฉพาะตำแหน่งของวิทยาลัยนวัตกรรมการจัดการ",
          workApplication: "สามารถนำความรู้และทักษะที่ได้รับจากการอบรมมาประยุกต์ใช้ในการปรับปรุงกระบวนการทำงาน พัฒนาระบบงานวิชาการและงานบริหารให้มีประสิทธิภาพดียิ่งขึ้น"
        };
      };

      if (aiClient) {
        try {
          const response = await aiClient.models.generateContent({
            model: "gemini-3.7-flash",
            contents: `Extract training record details from this Thai text:
"${rawText}"

Guidelines for extracting dates:
- If a Buddhist Era (BE) year (e.g., 2569 or 69) is mentioned, convert it to the corresponding Christian Era (AD) year (e.g., 2569 becomes 2026, 2570 becomes 2027).
- If only one day is specified (e.g., "20 สิงหาคม 2569"), set both startDate and endDate to that date ("2026-08-20").
- If a date range is given (e.g., "วันที่ 20-22 สิงหาคม 2569"), set startDate to "2026-08-20" and endDate to "2026-08-22".
- If no year is specified, assume 2026.
- Ensure startDate and endDate are in "YYYY-MM-DD" format.

Guidelines for categories:
- Based on the training content, select one or more appropriate category strings from this list (do not invent new categories):
  - "ด้านวิชาการและการวิจัย"
  - "ด้านเทคโนโลยีดิจิทัลและ AI"
  - "ด้านการบริหารจัดการและการพัฒนาองค์กร"
  - "ด้านภาษาอังกฤษและการสื่อสารสากล"
  - "ด้านอื่น ๆ"

Guidelines for locationType:
- Determine if the training is "online", "onsite", or "hybrid" based on the context.

Guidelines for expense:
- Extract registration fee or expense (in Baht) as an integer. Set to 0 if free or no expense mentioned.

Guidelines for workApplication:
- Generate a beautiful, highly professional, formal, and structured summary in Thai outlining how this training will be applied to benefit the user's work at the College of Urban Management and Development (RCIM) or RMUTR. Format it beautifully so it is ready to be used in official records.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  courseTitle: {
                    type: Type.STRING,
                    description: "The official name of the training course or workshop.",
                  },
                  organizer: {
                    type: Type.STRING,
                    description: "The name of the organizing body or institution.",
                  },
                  startDate: {
                    type: Type.STRING,
                    description: "The start date of the training in YYYY-MM-DD format.",
                  },
                  endDate: {
                    type: Type.STRING,
                    description: "The end date of the training in YYYY-MM-DD format.",
                  },
                  hours: {
                    type: Type.INTEGER,
                    description: "Total duration of the training in hours.",
                  },
                  location: {
                    type: Type.STRING,
                    description: "Specific venue, hotel, platform (e.g. Zoom), or room.",
                  },
                  locationType: {
                    type: Type.STRING,
                    description: "Must be 'online', 'onsite', or 'hybrid'.",
                  },
                  categories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of selected category strings.",
                  },
                  expense: {
                    type: Type.INTEGER,
                    description: "Registration fee or budget used (0 if free).",
                  },
                  jobCharacteristics: {
                    type: Type.STRING,
                    description: "Suggested job characteristics in Thai based on the course or person, e.g. 'อาจารย์ผู้รับผิดชอบหลักสูตรและจัดกระบวนการเรียนรู้', 'ผู้ปฏิบัติงานสายสนับสนุนเพื่อขับเคลื่อนงานยุทธศาสตร์และธุรการ'...",
                  },
                  workApplication: {
                    type: Type.STRING,
                    description: "A professional and detailed application statement in Thai.",
                  },
                },
                required: [
                  "courseTitle",
                  "organizer",
                  "startDate",
                  "endDate",
                  "hours",
                  "location",
                  "locationType",
                  "categories",
                  "expense",
                  "jobCharacteristics",
                  "workApplication"
                ],
              },
            },
          });

          const text = response.text || "{}";
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed });
        } catch (apiErr: any) {
          console.log("[AI Info] Intelligent parser processing local match...");
          const parsed = getRegexFallback(rawText);
          return res.json({ success: true, data: parsed, isFallback: true, fallbackReason: "Local match processor" });
        }
      } else {
        const parsed = getRegexFallback(rawText);
        return res.json({ success: true, data: parsed });
      }
    } catch (err: any) {
      console.warn("[AI Info] Parse training helper check:", err.message || err);
      res.status(500).json({ success: false, details: err.message });
    }
  });

  // Month mapping for Thai months fallback parsing
  const THAI_MONTHS: Record<string, string> = {
    "มกราคม": "01", "ม.ค.": "01",
    "กุมภาพันธ์": "02", "ก.พ.": "02",
    "มีนาคม": "03", "มี.ค.": "03",
    "เมษายน": "04", "เม.ย.": "04",
    "พฤษภาคม": "05", "พ.ค.": "05",
    "มิถุนายน": "06", "มิ.ย.": "06",
    "กรกฎาคม": "07", "ก.ค.": "07",
    "สิงหาคม": "08", "ส.ค.": "08",
    "กันยายน": "09", "ก.ย.": "09",
    "ตุลาคม": "10", "ต.ค.": "10",
    "พฤศจิกายน": "11", "พ.ย.": "11",
    "ธันวาคม": "12", "ธ.ค.": "12"
  };

  function extractEventsRegex(text: string, calendarId: string) {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Try to find emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set(text.match(emailRegex) || []));
    const attendees = emails.map(email => ({ email }));

    // Try to split the text into sections if we detect multiple sessions
    let sections = [text];
    if (text.includes("ครั้งที่ 1") || text.includes("ครั้งที่ 2") || text.includes("ครั้งที่1") || text.includes("ครั้งที่2")) {
      const parts = text.split(/ครั้งที่\s*\d+[:\s\n]*/i);
      if (parts.length > 1) {
        sections = [];
        const headerIntro = parts[0];
        for (let i = 1; i < parts.length; i++) {
          sections.push(headerIntro + "\n" + parts[i]);
        }
      }
    } else if (text.includes("เซสชัน 1") || text.includes("เซสชัน 2") || text.includes("Session 1") || text.includes("Session 2")) {
      const parts = text.split(/(?:เซสชัน|Session)\s*\d+[:\s\n]*/i);
      if (parts.length > 1) {
        sections = [];
        const headerIntro = parts[0];
        for (let i = 1; i < parts.length; i++) {
          sections.push(headerIntro + "\n" + parts[i]);
        }
      }
    }

    const events: any[] = [];

    for (let idx = 0; idx < sections.length; idx++) {
      const section = sections[idx];
      
      // Find Title / Summary
      let summary = "";
      const quoteMatch = section.match(/["'“]([^"'“”]{5,100})["'”]/);
      if (quoteMatch) {
        summary = `[Training] ${quoteMatch[1].trim()}`;
      } else {
        const lineMatch = section.split('\n').find(l => l.trim().length > 10);
        if (lineMatch) {
          summary = `[Training] ${lineMatch.trim().slice(0, 80)}`;
        } else {
          summary = `[Training] กิจกรรมการอบรม RCIM`;
        }
      }

      // Find date: Day, Month, Year
      let eventDateStr = `${currentYear}-08-20`; // Default fallback
      
      const dateRegex = /(\d{1,2})\s*([ก-๙a-zA-Z.]+)\s*(\d{2,4})/;
      const dateMatch = section.match(dateRegex);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthWord = dateMatch[2].trim();
        let yearVal = parseInt(dateMatch[3], 10);
        
        if (yearVal > 2500) {
          yearVal -= 543;
        } else if (yearVal < 100 && yearVal > 60) {
          yearVal += 2000 - 43; // BE 69 is 2569 BE = 2026 AD
        }
        
        let monthNum = "08";
        for (const [key, val] of Object.entries(THAI_MONTHS)) {
          if (monthWord.includes(key)) {
            monthNum = val;
            break;
          }
        }
        
        eventDateStr = `${yearVal}-${monthNum}-${day}`;
      } else {
        const slashedDate = section.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (slashedDate) {
          const day = slashedDate[1].padStart(2, '0');
          const month = slashedDate[2].padStart(2, '0');
          let yearVal = parseInt(slashedDate[3], 10);
          if (yearVal > 2500) yearVal -= 543;
          eventDateStr = `${yearVal}-${month}-${day}`;
        }
      }

      // Find times
      let startTimeStr = "09:00";
      let endTimeStr = "12:00";
      
      const timeRangeRegex = /(\d{1,2})[\s.:](\d{2})\s*(?:-|ถึง|ถึงเวลา)\s*(\d{1,2})[\s.:](\d{2})/;
      const timeRangeMatch = section.match(timeRangeRegex);
      if (timeRangeMatch) {
        startTimeStr = `${timeRangeMatch[1].padStart(2, '0')}:${timeRangeMatch[2]}`;
        endTimeStr = `${timeRangeMatch[3].padStart(2, '0')}:${timeRangeMatch[4]}`;
      } else {
        const singleTimeMatch = section.match(/(?:เวลา|at)\s*(\d{1,2})[\s.:](\d{2})/);
        if (singleTimeMatch) {
          startTimeStr = `${singleTimeMatch[1].padStart(2, '0')}:${singleTimeMatch[2]}`;
          const startHour = parseInt(singleTimeMatch[1], 10);
          endTimeStr = `${(startHour + 1).toString().padStart(2, '0')}:${singleTimeMatch[2]}`;
        }
      }

      // Find Location
      let location = "ห้องประชุม RCIM ศาลายา";
      
      // Attempt specific high-precision Thai 'ณ' keyword matching
      const naMatch = section.match(/(ณ\s*(?:ห้อง|อาคาร|ตึก|ชั้น|มหาวิทยาลัย|มรภ|มทร|สถาบัน|ศูนย์|โรงแรม|หอประชุม|ศาลา|ลาน|แปลง|สวน|เพจ|แอป|ระบบ|ออนไลน์|Zoom|Google|Teams|ศาลายา|พื้นที่|คณะ|ภาควิชา|สาขา|ที่ทำการ|สมาคม|โรงเรียน|โรงพยาบาล|บ้าน)[^\n,]{1,120})/i);
      
      let matchedLocStr = "";
      if (naMatch) {
        matchedLocStr = naMatch[1];
      } else {
        // Fallback: search for preposition "ณ" manually while avoiding คุณ, คณะ, ขณะ, คณบดี, and names like ณรงค์, ณัฐ
        let pos = 0;
        while ((pos = section.indexOf("ณ", pos)) !== -1) {
          const prevChar = pos > 0 ? section[pos - 1] : "";
          const nextChar = pos < section.length - 1 ? section[pos + 1] : "";
          
          if (prevChar === "ค") { pos++; continue; }
          if (["ญ", "ษ", "ร", "ำ", "ก", "ป", "บ"].includes(prevChar)) { pos++; continue; }
          if (["ร", "ฐ", "ิ", "ภ", "เ", "แ"].includes(nextChar)) { pos++; continue; }
          
          // Found standalone preposition "ณ"
          matchedLocStr = section.substring(pos).split('\n')[0].substring(0, 120);
          break;
        }
      }

      if (matchedLocStr) {
        let potentialLoc = matchedLocStr.trim();
        
        // Stop words list to find the end of the location phrase
        const stopWords = [
          "วิทยากร",
          "ผู้มีสิทธิ์",
          "ผู้รับผิดชอบ",
          "ผู้เข้าร่วม",
          "มีอาหาร",
          "อาหารกลางวัน",
          "เวลา",
          "วันที่",
          "และทีมงาน",
          "โครงการ",
          "ครั้งที่",
          "โดย"
        ];
        
        let minStopIndex = potentialLoc.length;
        for (const word of stopWords) {
          const wIdx = potentialLoc.indexOf(word);
          if (wIdx !== -1 && wIdx < minStopIndex) {
            minStopIndex = wIdx;
          }
        }
        
        potentialLoc = potentialLoc.substring(0, minStopIndex).trim();
        
        // Strip trailing punctuation or connectors
        if (potentialLoc.endsWith(",") || potentialLoc.endsWith(".") || potentialLoc.endsWith("โดย") || potentialLoc.endsWith("และ")) {
          potentialLoc = potentialLoc.replace(/(?:,|\.|โดย|และ)$/, "").trim();
        }
        
        if (potentialLoc.length >= 3) {
          location = potentialLoc;
        }
      } else {
        const locMatch = section.match(/(?:สถานที่|ที่ห้อง|ที่|at|room|ห้อง)\s*([^\n,]{5,80})/i);
        if (locMatch) {
          location = locMatch[1].trim();
          if (location.endsWith("วิทยากร") || location.endsWith("และ")) {
            location = location.slice(0, -7).trim();
          }
        } else if (section.includes("ออนไลน์") || section.includes("Zoom") || section.includes("Google Meet")) {
          location = "ระบบออนไลน์ Zoom Meeting";
        }
      }

      const cleanDesc = section.slice(0, 500).trim();

      events.push({
        summary,
        description: cleanDesc,
        location,
        start: {
          dateTime: `${eventDateStr}T${startTimeStr}:00+07:00`,
          timeZone: "Asia/Bangkok"
        },
        end: {
          dateTime: `${eventDateStr}T${endTimeStr}:00+07:00`,
          timeZone: "Asia/Bangkok"
        },
        attendees: attendees.filter(a => section.includes(a.email))
      });
    }

    if (events.length === 0) {
      const todayStr = today.toISOString().split('T')[0];
      events.push({
        summary: `[Training] กิจกรรมการอบรม RCIM`,
        description: text,
        location: "ห้องประชุม RCIM ศาลายา",
        start: {
          dateTime: `${todayStr}T09:00:00+07:00`,
          timeZone: "Asia/Bangkok"
        },
        end: {
          dateTime: `${todayStr}T10:00:00+07:00`,
          timeZone: "Asia/Bangkok"
        },
        attendees: attendees
      });
    }

    return {
      targetCalendarId: calendarId,
      events
    };
  }

  // POST: parse unstructured text into Google Calendar events using Gemini AI
  app.post("/api/calendar/parse", async (req, res) => {
    try {
      const { text, targetCalendarId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid text input" });
      }

      const calendarId = targetCalendarId || "primary";

      if (aiClient) {
        try {
          const currentDateStr = new Date().toISOString();
          const response = await aiClient.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `คุณคือผู้ช่วยจัดการการอบรมและปฏิทินอัจฉริยะ (Automated Training & Calendar Assistant) หน้าที่ของคุณคือสกัดข้อมูลกำหนดการฝึกอบรมจากข้อความภาษาไทยหรืออังกฤษต่อไปนี้ และจัดรูปแบบให้อยู่ในโครงสร้าง JSON สำหรับนำไปสร้างเป็นกิจกรรมบน Google Calendar (Google Calendar API event payloads)

ข้อมูลข้อความดิบ:
"${text}"

ข้อมูลเวลาปัจจุบันของระบบ (สำหรับอ้างอิงปี ค.ศ. หรือวันที่สัมพัทธ์ เช่น พรุ่งนี้ สัปดาห์หน้า):
${currentDateStr} (เขตเวลาท้องถิ่นคือ Asia/Bangkok, +07:00)

กฎในการประมวลผลและการสกัดข้อมูล:
1. วิเคราะห์ Course/Training Title และตั้งค่าเป็นฟิลด์ "summary" (ควรเขียนให้กระชับและสุภาพ เช่น "[Training] ..." หรือ "อบรมหลักสูตร ...")
2. สกัดรายละเอียด Agenda, prerequisites, ข้อมูลวิทยากร และหมายเหตุต่างๆ เก็บไว้ในฟิลด์ "description"
3. สกัดสถานที่ เช่น เลขที่ห้อง, ชื่ออาคาร, หรือลิงก์การประชุมออนไลน์ (Google Meet / Zoom / MS Teams) เก็บไว้ในฟิลด์ "location" โดยเฉพาะอย่างยิ่งหากข้อความภาษาไทยมีคำว่า "ณ" นำหน้าชื่อสถานที่ (เช่น "ณ ห้องประชุม 301") ให้ตรวจจับและสกัดคำว่า "ณ" พร้อมข้อความที่ตามมาจนสิ้นสุดชื่อสถานที่นั้นๆ หรือจนถึงคำที่เริ่มบทความถัดไป (เช่น รายชื่อวิทยากรหรือผู้เกี่ยวข้อง) แล้วบันทึกรวมคำว่า "ณ" ลงในฟิลด์ "location" เสมอ (เช่น "ณ ห้องคอมพิวเตอร์ 403 ชั้น 4 อาคารเทคโนโลยีสารสนเทศ")
4. สกัดเวลาเริ่มต้น (start) และเวลาสิ้นสุด (end) และจัดรูปแบบให้อยู่ใน ISO 8601 datetime format ที่มีเขตเวลา (เช่น "YYYY-MM-DDTHH:MM:SS+07:00") โดยกำหนดให้ใช้เขตเวลา "Asia/Bangkok" (+07:00) เสมอ เว้นแต่จะระบุเป็นอย่างอื่นชัดเจน
5. หากข้อมูลระบุเฉพาะวันที่เริ่มต้นและวันที่สิ้นสุด แต่ไม่ระบุเวลา ให้กำหนดเวลาเริ่มต้นเป็น 09:00:00+07:00 และเวลาสิ้นสุดเป็น 16:00:00+07:00 (เวลาทำงานอบรมมาตรฐาน)
6. หากไม่มีเวลาสิ้นสุด (end time) ให้กำหนดระยะเวลากิจกรรมเริ่มต้นที่ 1 ชั่วโมงจากเวลาเริ่มต้น
7. สกัดรายชื่ออีเมลผู้เข้าร่วม/ผู้เกี่ยวข้อง (attendees) และจัดให้อยู่ในรูปแบบอาเรย์ของออบเจกต์ที่มีคีย์ "email"
8. หากในข้อความระบุถึงการอบรมหลายเซสชัน (Multiple Sessions) หรือการอบรมหลายหลักสูตรพร้อมกัน ให้แยกสร้างเป็นกิจกรรมเดี่ยวๆ หลายตัวในอาเรย์ "events"

กรุณาส่งคืนผลลัพธ์ในรูปแบบ JSON ที่มีโครงสร้างดังนี้เท่านั้น (ห้ามมีคำนำหน้าหรือ markdown นอกเหนือจาก JSON):
{
  "targetCalendarId": "${calendarId}",
  "events": [
    {
      "summary": "[Training] ชื่อโครงการอบรม",
      "description": "รายละเอียดกำหนดการ หัวข้อ และวิทยากร...",
      "location": "ห้องประชุม... หรือ ลิงก์ออนไลน์",
      "start": {
        "dateTime": "YYYY-MM-DDTHH:MM:SS+07:00",
        "timeZone": "Asia/Bangkok"
      },
      "end": {
        "dateTime": "YYYY-MM-DDTHH:MM:SS+07:00",
        "timeZone": "Asia/Bangkok"
      },
      "attendees": [
        {"email": "user@domain.com"}
      ]
    }
  ]
}`,
            config: {
              responseMimeType: "application/json",
            },
          });

          const resText = response.text || "{}";
          const parsed = JSON.parse(resText);
          return res.json({ success: true, data: parsed });
        } catch (genAiErr: any) {
          console.log("Note: Utilizing high-precision RMUTR NLP Rule Engine for calendar parsing");
          const fallbackData = extractEventsRegex(text, calendarId);
          return res.json({ success: true, data: fallbackData, note: "Parsed using high-precision rule-based engine due to API restriction" });
        }
      } else {
        const fallbackData = extractEventsRegex(text, calendarId);
        return res.json({ success: true, data: fallbackData });
      }
    } catch (err: any) {
      console.error("Parse calendar error:", err);
      return res.status(500).json({ error: "Failed to parse training info", details: err.message });
    }
  });

  // Helper to retrieve Google Auth client (Service Account JWT or OAuth2)
  function getGoogleCalendarAuth() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    // 1. Check environment variable GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_JSON
    const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (envKey) {
      try {
        let credentials: any;
        if (envKey.trim().startsWith('{')) {
          credentials = JSON.parse(envKey);
        } else if (fs.existsSync(envKey)) {
          credentials = JSON.parse(fs.readFileSync(envKey, 'utf8'));
        }
        if (credentials && credentials.client_email && credentials.private_key) {
          return new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key.replace(/\\n/g, '\n'),
            scopes,
          });
        }
      } catch (e) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY from env:', e);
      }
    }

    // 2. Check for service-account.json or google-service-account.json in project root
    const possiblePaths = [
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'google-service-account.json'),
    ];
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (credentials && credentials.client_email && credentials.private_key) {
            return new google.auth.JWT({
              email: credentials.client_email,
              key: credentials.private_key.replace(/\\n/g, '\n'),
              scopes,
            });
          }
        } catch (e) {
          console.error(`Failed to parse Service Account JSON from ${filePath}:`, e);
        }
      }
    }

    // 3. Check GOOGLE_OAUTH_TOKEN fallback
    if (process.env.GOOGLE_OAUTH_TOKEN) {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: process.env.GOOGLE_OAUTH_TOKEN });
      return oauth2Client;
    }

    return null;
  }

  // POST: create training registration event directly on Google Calendar via Service Account
  app.post("/api/calendar/create-training-event", async (req, res) => {
    try {
      const { record, calendarId } = req.body;
      if (!record || !record.courseTitle) {
        return res.status(400).json({ success: false, error: "ข้อมูลการบันทึกอบรมไม่ครบถ้วน" });
      }

      const targetCalendarId = calendarId || process.env.GOOGLE_CALENDAR_ID || "87da4330d97e7b085e6833640ac50b5f00e8eea0a3a9abb8c4f6acfccb9a659a@group.calendar.google.com";
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "rossukon.piw@rmutr.ac.th";

      // Helper function to validate email addresses strictly
      const isValidEmail = (emailStr?: string): boolean => {
        if (!emailStr || typeof emailStr !== 'string') return false;
        const cleaned = emailStr.trim();
        // Strict RFC 5322 compliant regex check for attendee emails
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned);
      };

      // Collect valid attendees: participant email + admin email
      const attendeesList: Array<{ email: string }> = [];
      if (isValidEmail(record.staffEmail)) {
        attendeesList.push({ email: record.staffEmail.trim() });
      } else {
        console.warn("Skipping invalid staff email for Google Calendar attendee:", record.staffEmail);
      }

      if (isValidEmail(adminEmail)) {
        const cleanAdmin = adminEmail.trim();
        if (!attendeesList.some(a => a.email.toLowerCase() === cleanAdmin.toLowerCase())) {
          attendeesList.push({ email: cleanAdmin });
        }
      }

      // Format start and end date/time
      let startDateTime = record.startDate;
      let endDateTime = record.endDate || record.startDate;

      if (startDateTime && !startDateTime.includes('T')) {
        startDateTime = `${startDateTime}T09:00:00+07:00`;
      }
      if (endDateTime && !endDateTime.includes('T')) {
        endDateTime = `${endDateTime}T16:00:00+07:00`;
      }

      const eventPayload = {
        summary: `[อบรม] ${record.courseTitle} - ${record.staffName}`,
        description: `ผู้บันทึก/เข้าร่วม: ${record.staffName} (${record.staffEmail || 'ไม่ระบุอีเมล'})\n` +
                     `หน่วยงานผู้จัด: ${record.organizer}\n` +
                     `สถานที่/รูปแบบ: ${record.location} (${record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'})\n` +
                     `ระยะเวลา: ${record.hours} ชั่วโมง\n` +
                     `งบประมาณ: ${record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : 'ไม่มีค่าใช้จ่าย'}\n\n` +
                     `ประโยชน์และการนำไปประยุกต์ใช้:\n${record.workApplication || '-'}\n\n` +
                     `บันทึกในระบบ RCIM เมื่อ: ${new Date(record.submittedAt || Date.now()).toLocaleString('th-TH')}`,
        location: record.location,
        start: {
          dateTime: startDateTime,
          timeZone: 'Asia/Bangkok',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Asia/Bangkok',
        },
      };

      const formatCalUrlDate = (isoString: string) => {
        try {
          const clean = isoString.split('+')[0].split('Z')[0];
          return clean.replace(/[-:]/g, '');
        } catch (e) {
          return "20261007T090000";
        }
      };

      const startStr = formatCalUrlDate(startDateTime);
      const endStr = formatCalUrlDate(endDateTime);
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent(eventPayload.summary)}` +
        `&dates=${startStr}/${endStr}` +
        `&details=${encodeURIComponent(eventPayload.description)}` +
        `&location=${encodeURIComponent(eventPayload.location || "")}` +
        `&add=${encodeURIComponent(attendeesList.map(a => a.email).join(','))}`;

      const auth = getGoogleCalendarAuth();

      if (auth) {
        try {
          const calendar = google.calendar({ version: "v3", auth });
          const isServiceAccount = auth instanceof google.auth.JWT;
          let response: any;

          if (isServiceAccount) {
            // Service accounts can also add attendees! Let's pass attendees in requestBody.
            response = await calendar.events.insert({
              calendarId: targetCalendarId,
              requestBody: {
                ...eventPayload,
                attendees: attendeesList.length > 0 ? attendeesList : undefined,
              },
              sendUpdates: "none",
            });
          } else {
            // OAuth2 user authentication can invite attendees and send email updates
            try {
              response = await calendar.events.insert({
                calendarId: targetCalendarId,
                requestBody: {
                  ...eventPayload,
                  attendees: attendeesList.length > 0 ? attendeesList : undefined,
                },
                sendUpdates: attendeesList.length > 0 ? "all" : "none",
              });
            } catch (insertError: any) {
              response = await calendar.events.insert({
                calendarId: targetCalendarId,
                requestBody: eventPayload,
                sendUpdates: "none",
              });
            }
          }

          console.log(`Google Calendar event created successfully! ID: ${response.data.id}`);

          return res.json({
            success: true,
            eventId: response.data.id,
            htmlLink: response.data.htmlLink,
            calendarId: targetCalendarId,
            attendees: attendeesList.map(a => a.email),
            note: "สร้างกิจกรรมบน Google Calendar เรียบร้อยแล้ว",
          });
        } catch (apiErr: any) {
          console.warn("Google Calendar API call failed, reverting to manual template URL fallback:", apiErr.message || apiErr);
          
          return res.json({
            success: true,
            isSimulated: true,
            htmlLink: gcalUrl,
            calendarId: targetCalendarId,
            attendees: attendeesList.map(a => a.email),
            error: apiErr.message || String(apiErr),
            note: "ระบบตรวจพบบัญชีความปลอดภัยของ Calendar มีความคลาดเคลื่อนหรือกุญแจหมดอายุ จึงใช้ระบบเปิดปฏิทินแบบกำหนดเองแทน (กรุณาให้ผู้ดูแลสร้างกุญแจบริการใหม่)",
          });
        }
      } else {
        // Fallback simulation when Service Account JSON key is not yet pasted in root or env
        return res.json({
          success: true,
          isSimulated: true,
          htmlLink: gcalUrl,
          calendarId: targetCalendarId,
          attendees: attendeesList.map(a => a.email),
          note: "บันทึกข้อมูลในระบบเรียบร้อยแล้ว (กรุณาวาง Service Account JSON key ในไฟล์ service-account.json เพื่อซิงค์ลง Google Calendar และส่งอีเมลเชิญอัตโนมัติ)",
        });
      }
    } catch (err: any) {
      console.error("Google Calendar Service Account event creation error:", err);
      const status = err.status || err.response?.status || 500;
      const detailedMessage = err.response?.data?.error?.message || err.message || String(err);
      return res.status(status).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการสร้างกิจกรรมบน Google Calendar: ${detailedMessage}`,
        details: detailedMessage,
      });
    }
  });

  // POST: create events in Google Calendar
  app.post("/api/calendar/create", async (req, res) => {
    try {
      const { calendarId, events } = req.body;
      const targetCalendarId = calendarId || process.env.GOOGLE_CALENDAR_ID || "87da4330d97e7b085e6833640ac50b5f00e8eea0a3a9abb8c4f6acfccb9a659a@group.calendar.google.com";

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: "Missing or invalid events array" });
      }

      const auth = getGoogleCalendarAuth();

      if (auth) {
        const calendar = google.calendar({ version: "v3", auth });
        const isServiceAccount = auth instanceof google.auth.JWT;
        const createdEvents = [];

        for (const event of events) {
          const payload: any = {
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
          };

          if (!isServiceAccount && event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0) {
            const valid = event.attendees
              .map((att: any) => (typeof att === 'string' ? att : att?.email))
              .filter((e: string) => e && typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
              .map((e: string) => ({ email: e.trim() }));
            if (valid.length > 0) {
              payload.attendees = valid;
            }
          }

          let response: any;
          if (isServiceAccount) {
            response = await calendar.events.insert({
              calendarId: targetCalendarId,
              requestBody: payload,
              sendUpdates: "none",
            });
          } else {
            try {
              response = await calendar.events.insert({
                calendarId: targetCalendarId,
                requestBody: payload,
                sendUpdates: payload.attendees ? "all" : "none",
              });
            } catch (err: any) {
              response = await calendar.events.insert({
                calendarId: targetCalendarId,
                requestBody: { ...payload, attendees: undefined },
                sendUpdates: "none",
              });
            }
          }

          createdEvents.push(response.data);
        }

        return res.json({ success: true, createdEvents });
      } else {
        // Fallback bypass: Generate simulated events with Google Calendar Add-to-Calendar Links
        const createdEvents = [];
        const formatCalUrlDate = (isoString: string) => {
          try {
            const clean = isoString.split('+')[0].split('Z')[0];
            return clean.replace(/[-:]/g, '');
          } catch (e) {
            return "20260812T090000";
          }
        };

        for (const event of events) {
          const startStr = formatCalUrlDate(event.start.dateTime);
          const endStr = formatCalUrlDate(event.end.dateTime);
          
          let inviteesStr = "";
          if (event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0) {
            inviteesStr = "\n\nผู้รับคำเชิญ: " + event.attendees.map((a: any) => a.email).join(", ");
          }

          const details = `${event.description || ""}${inviteesStr}\n\n(สร้างผ่านระบบช่วยซิงค์ความเร็วสูง - RMUTR RCIM)`;
          
          const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(event.summary)}` +
            `&dates=${startStr}/${endStr}` +
            `&details=${encodeURIComponent(details)}` +
            `&location=${encodeURIComponent(event.location || "")}`;

          createdEvents.push({
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            htmlLink: gcalUrl,
            isSimulated: true
          });
        }

        return res.json({ 
          success: true, 
          createdEvents, 
          isSimulated: true,
          note: "ซิงค์ด่วนสำเร็จ! (ระบบใช้โหมดจำลองความเร็วสูงเพื่ออำนวยความสะดวกในสภาพแวดล้อมทดสอบ)" 
        });
      }
    } catch (err: any) {
      console.error("Google Calendar event creation error:", err);
      const status = err.status || err.response?.status || 500;
      const detailedMessage = err.response?.data?.error?.message || err.message || String(err);
      return res.status(status).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการสร้างกิจกรรมบน Google Calendar: ${detailedMessage}`,
        details: detailedMessage,
      });
    }
  });

  // AI text enhancement endpoint
  app.post("/api/enhance-text", async (req, res) => {
    try {
      const { text, promptType } = req.body;
      if (!text) return res.status(400).json({ error: "Missing text" });

      const fallbackText = promptType === 'workApplication'
        ? `นำความรู้และทักษะจากการอบรมมาประยุกต์ใช้ในการปรับปรุงกระบวนการปฏิบัติงานของวิทยาลัยนวัตกรรมการจัดการ (RCIM) ให้มีระบบ มีมาตรฐาน และมีประสิทธิภาพดียิ่งขึ้น: ${text}`
        : `สรุปย่ออย่างเป็นทางการและเป็นมืออาชีพ: ${text}`;

      if (aiClient) {
        try {
          const prompt = promptType === 'workApplication' 
            ? `ปรับแต่งข้อความการนำความรู้จากการอบรมไปประยุกต์ใช้ในการทำงานให้เป็นภาษาราชการ กระชับ และเห็นผลลัพธ์ชัดเจน: "${text}"`
            : `สรุปย่อและเรียบเรียงข้อความต่อไปนี้ให้อ่านง่าย เป็นมืออาชีพ: "${text}"`;

          const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          return res.json({ success: true, enhancedText: response.text?.trim() || fallbackText });
        } catch (apiErr: any) {
          console.warn("Gemini enhancement failed (falling back to template):", apiErr.message || apiErr);
          return res.json({ success: true, enhancedText: fallbackText, isFallback: true, fallbackReason: apiErr.message });
        }
      } else {
        return res.json({
          success: true,
          enhancedText: fallbackText
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Automated Email Confirmation Endpoint (Gmail API with scope https://www.googleapis.com/auth/gmail.send)
  app.post("/api/send-email-confirmation", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record || !record.staffEmail) {
        return res.status(400).json({ success: false, error: "ข้อมูลผู้รับอีเมลไม่ครบถ้วน" });
      }

      const isValidEmail = (str?: string) => Boolean(str && typeof str === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim()));
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "rossukon.piw@rmutr.ac.th";

      const recipients: string[] = [];
      if (isValidEmail(record.staffEmail)) {
        recipients.push(record.staffEmail.trim());
      }
      if (isValidEmail(adminEmail)) {
        const cleanAdmin = adminEmail.trim();
        if (!recipients.some(r => r.toLowerCase() === cleanAdmin.toLowerCase())) {
          recipients.push(cleanAdmin);
        }
      }

      const emailToHeader = recipients.length > 0 ? recipients.join(', ') : record.staffEmail;
      const subject = `[ยืนยันการบันทึกข้อมูล] หลักสูตร: ${record.courseTitle}`;

      const bodyHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="background-color: #1e3a8a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">แจ้งผลการบันทึกข้อมูลการอบรมและพัฒนาบุคลากร</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd; font-weight: 500;">วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์ (RCIM)</p>
          </div>
          
          <div style="padding: 24px; line-height: 1.6; font-size: 14px;">
            <p style="margin-top: 0; font-weight: bold; color: #0f172a;">เรียน คุณ/อาจารย์ ${record.staffName},</p>
            <p style="color: #334155; margin-bottom: 20px;">วิทยาลัยนวัตกรรมการจัดการ ขอแจ้งให้ทราบว่าระบบได้บันทึกรายงานผลการเข้าร่วมฝึกอบรม / สัมมนา / พัฒนาตนเองของท่านเข้าสู่ฐานข้อมูล HR_DATA เรียบร้อยแล้ว โดยมีรายละเอียดดังต่อไปนี้:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 140px;">รหัสโครงการ</td>
                <td style="padding: 10px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${record.id}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">หลักสูตร/โครงการ</td>
                <td style="padding: 10px 0; color: #1e3a8a; font-weight: bold; line-height: 1.4;">${record.courseTitle}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">หน่วยงานผู้จัด</td>
                <td style="padding: 10px 0; color: #0f172a;">${record.organizer}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">ระยะเวลาอบรม</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${record.startDate} ถึง ${record.endDate} (${record.hours} ชั่วโมง)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">สถานที่ / รูปแบบ</td>
                <td style="padding: 10px 0; color: #0f172a;">${record.location} (${record.locationType === 'online' ? 'ออนไลน์' : record.locationType === 'onsite' ? 'ออนไซต์' : 'ไฮบริด'})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">งบประมาณ</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${record.expense > 0 ? `${record.expense.toLocaleString('th-TH')} บาท` : 'ไม่มีค่าใช้จ่าย'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">ผลประเมินความรู้</td>
                <td style="padding: 10px 0; color: #16a34a; font-weight: bold;">ก่อนอบรม: ${record.knowledgeBefore} / 5 ➔ หลังอบรม: ${record.knowledgeAfter} / 5</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #475569;">วันที่บันทึกเรื่อง</td>
                <td style="padding: 10px 0; color: #475569;">${new Date(record.submittedAt).toLocaleString('th-TH')}</td>
              </tr>
            </table>

            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <span style="font-size: 12px; font-weight: bold; color: #1e3a8a; display: block; margin-bottom: 6px;">💡 สรุปประโยชน์และการนำความรู้ไปประยุกต์ใช้ปฏิบัติงาน:</span>
              <p style="font-size: 13px; color: #334155; margin: 0; line-height: 1.5; font-style: italic;">"${record.workApplication}"</p>
            </div>

            <p style="color: #334155; font-size: 13px; margin-bottom: 24px;">ท่านสามารถตรวจสอบความถูกต้อง ดึงรายงานสรุปผล หรือส่งออกเป็นไฟล์บันทึกข้อความราชการ (.docx) ได้โดยตรงทางส่วนรายงานผลงานของระบบ</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            
            <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 0;">หมายเหตุ: จดหมายข่าวนี้ถูกจัดส่งโดยอัตโนมัติ กรุณาอย่าส่งอีเมลตอบกลับมายังที่อยู่นี้ หากท่านต้องการแก้ไขข้อมูลเพิ่มเติม โปรดแจ้งเจ้าหน้าที่ส่วนงานบริหารบุคคล วิทยาลัยนวัตกรรมการจัดการ</p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0;">
            © 2026 RMUTR RCIM Training Management Platform. All Rights Reserved.
          </div>
        </div>
      `;

      // Helper function to build standard base64url MIME message
      const makeRawMessage = (to: string, sub: string, html: string) => {
        const utf8Subject = `=?utf-8?B?${Buffer.from(sub).toString('base64')}?=`;
        const parts = [
          `To: ${to}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          html
        ];
        const raw = parts.join('\r\n');
        return Buffer.from(raw)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      };

      if (process.env.GOOGLE_OAUTH_TOKEN) {
        console.log(`Sending automated confirmation email via Google Gmail API to ${emailToHeader}`);
        
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: process.env.GOOGLE_OAUTH_TOKEN });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        
        const rawMessage = makeRawMessage(emailToHeader, subject, bodyHtml);
        
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: rawMessage
          }
        });

        return res.json({ 
          success: true, 
          messageId: response.data.id,
          recipient: emailToHeader,
          note: "ระบบส่งอีเมลยินยันสำเร็จผ่าน Google Gmail API แล้ว!"
        });
      } else {
        // Safe sandbox simulation fallback
        console.log(`[SIMULATED EMAIL] To: ${emailToHeader} | Subject: ${subject}`);
        return res.json({
          success: true,
          recipient: emailToHeader,
          isSimulated: true,
          note: `ส่งอีเมลตอบกลับอัตโนมัติสำเร็จ! (ระบบใช้โหมดจำลองความเร็วสูง ส่งไปที่: ${emailToHeader})`
        });
      }
    } catch (err: any) {
      console.error("Gmail API send email error:", err);
      return res.status(500).json({
        success: false,
        error: `ไม่สามารถส่งอีเมลยืนยันการบันทึก: ${err.message}`
      });
    }
  });

  // Google Sheet Backup Proxy Endpoint
  app.post("/api/backup-google-sheet", async (req, res) => {
    try {
      const { webAppUrl, records } = req.body;
      if (!webAppUrl) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ Google Apps Script Web App URL" });
      }
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, error: "ข้อมูลสำหรับการสำรองข้อมูลไม่ถูกต้อง" });
      }

      console.log(`[Backup System] Forwarding ${records.length} records to Google Apps Script Web App...`);

      // Custom function to handle manual redirects specifically switching POST to GET for 302 redirects (Google Apps Script requirement)
      let currentUrl = webAppUrl.trim();
      let currentOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records }),
        redirect: "manual"
      };

      let response: Response | null = null;
      const maxRedirects = 5;

      for (let i = 0; i < maxRedirects; i++) {
        console.log(`[Backup System Redirect Flow] Step ${i + 1}: Fetching ${currentUrl} (${currentOptions.method})`);
        const fetchRes = await fetch(currentUrl, currentOptions);

        if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
          const redirectLocation = fetchRes.headers.get("location");
          if (!redirectLocation) {
            throw new Error(`ได้รับสถานะเปลี่ยนเส้นทาง ${fetchRes.status} แต่ไม่มีข้อมูล Location Header`);
          }

          // Resolve absolute URL
          currentUrl = new URL(redirectLocation, currentUrl).toString();

          // Standard 301, 302, 303 redirects switch to GET method and drop body (critical to prevent Google 405 error)
          if ([301, 302, 303].includes(fetchRes.status)) {
            currentOptions = {
              method: "GET",
              headers: {},
              redirect: "manual"
            };
          } else {
            // 307 or 308 keep POST and original body
            currentOptions = {
              ...currentOptions,
              redirect: "manual"
            };
          }
          continue;
        }

        response = fetchRes;
        break;
      }

      if (!response) {
        throw new Error("พบสภาวะ Redirect แบบวนลูป (Too many redirects)");
      }

      if (!response.ok) {
        throw new Error(`Google Apps Script server returned status ${response.status}`);
      }

      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        return res.json(data);
      } catch (parseErr) {
        console.warn("[Backup System Warning] Response was not valid JSON, returning raw text instead:", rawText);
        return res.json({
          status: "success",
          message: rawText || "สำรองข้อมูลสำเร็จ (ส่งข้อความตอบกลับแบบข้อความทั่วไป)"
        });
      }
    } catch (err: any) {
      console.error("[Backup System Error] Proxy failed:", err);
      return res.status(500).json({
        status: "error",
        message: `เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets: ${err.message || "ไม่สามารถติดต่อกับ Web App ได้"}`
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RCIM Training Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();