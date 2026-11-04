import { TrainingRecord, Campus } from '../types';
import { INITIAL_TRAINING_RECORDS } from '../data/initialData';

const STORAGE_KEY = 'rcim_training_records_v1';
const HR_STAFF_STORAGE_KEY = 'rcim_hr_staff_data_v4';

export interface HRStaffItem {
  id: string;
  name: string;
  email: string;
  campus: Campus;
  type: 'support' | 'academic';
  dept: string;
  sheetName?: string;
}

export function getStoredStaff(defaultStaff: HRStaffItem[] = []): HRStaffItem[] {
  try {
    const data = localStorage.getItem(HR_STAFF_STORAGE_KEY);
    const map = new Map<string, HRStaffItem>();
    
    // Always start with fresh defaultStaff
    defaultStaff.forEach(s => {
      if (!s) return;
      
      if (s.sheetName && s.sheetName.toLowerCase().trim() === 'admin') return;

      const keySource = s.id || s.name || '';
      if (!keySource) return;
      const cleanKey = keySource.toLowerCase().replace(/^(นาย|นาง|นางสาว|ผศ|รศ|ดร|อ|อาจารย์)\.?\s*/g, '');
      map.set(cleanKey, s);
    });

    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((s: HRStaffItem) => {
          if (!s) return;

          if (s.sheetName && s.sheetName.toLowerCase().trim() === 'admin') return;

          const keySource = s.id || s.name || '';
          if (!keySource) return;
          const cleanKey = keySource.toLowerCase().replace(/^(นาย|นาง|นางสาว|ผศ|รศ|ดร|อ|อาจารย์)\.?\s*/g, '');
          const existing = map.get(cleanKey);
          if (existing) {
            // Merge with existing defaultStaff, preferring corrected emails and updated props
            map.set(cleanKey, {
              ...s,
              name: s.name || existing.name,
              email: s.email && s.email.includes('@rmutr.ac.th') ? s.email : existing.email,
              dept: s.dept || existing.dept,
              campus: s.campus || existing.campus,
            });
          } else {
            map.set(cleanKey, s);
          }
        });
      }
    }
    return Array.from(map.values());
  } catch (err) {
    console.error('Failed to load HR staff from localStorage', err);
    return defaultStaff;
  }
}

export function saveStoredStaff(staff: HRStaffItem[]): void {
  try {
    localStorage.setItem(HR_STAFF_STORAGE_KEY, JSON.stringify(staff));
  } catch (err) {
    console.error('Failed to save HR staff to localStorage', err);
  }
}

export function getStoredRecords(): TrainingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const filteredInitial = INITIAL_TRAINING_RECORDS.filter(r => r.id !== 'olddata_row_2');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredInitial));
      return filteredInitial;
    }
    const parsed = JSON.parse(data);
    const loaded = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TRAINING_RECORDS;
    return loaded.filter((r: TrainingRecord) => r.id !== 'olddata_row_2');
  } catch (err) {
    console.error('Failed to load records from localStorage', err);
    return INITIAL_TRAINING_RECORDS.filter(r => r.id !== 'olddata_row_2');
  }
}

export function saveStoredRecord(record: TrainingRecord): TrainingRecord[] {
  const records = getStoredRecords();
  const existingIndex = records.findIndex(r => r.id === record.id);
  
  let updated: TrainingRecord[];
  if (existingIndex >= 0) {
    updated = [...records];
    updated[existingIndex] = record;
  } else {
    updated = [record, ...records];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
  return updated;
}

export function deleteStoredRecord(id: string): TrainingRecord[] {
  const records = getStoredRecords();
  const updated = records.filter(r => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete from localStorage', err);
  }
  return updated;
}

export function resetToInitialRecords(): TrainingRecord[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRAINING_RECORDS));
  } catch (err) {
    console.error('Failed to reset localStorage', err);
  }
  return INITIAL_TRAINING_RECORDS;
}
