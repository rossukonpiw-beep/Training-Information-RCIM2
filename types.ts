export type StaffType = 'academic' | 'support';

export type Campus = 
  | 'ศาลายา'
  | 'วังไกลกังวล';

export type LocationType = 'online' | 'onsite' | 'hybrid';

export const TRAINING_CATEGORIES = [
  'ด้านการจัดการเรียนการสอนและการประเมินผล',
  'ด้านการวิจัย นวัตกรรม และผลงานทางวิชาการ',
  'ด้านการบริหารจัดการและการพัฒนาองค์กร',
  'ด้านเทคโนโลยีดิจิทัลและ AI',
  'ด้านภาษาอังกฤษและการสื่อสารสากล',
  'ด้านคุณธรรม จริยธรรม และธรรมาภิบาล',
  'ด้านอื่น ๆ'
] as const;

export type TrainingCategory = typeof TRAINING_CATEGORIES[number];

export const ACADEMIC_PROGRAMS = [
  'สาขาวิชาการจัดการเมืองและโครงสร้างพื้นฐาน',
  'สาขาวิชาการบริหารธุรกิจและการพัฒนาเมือง',
  'สาขาวิชาเทคโนโลยีดิจิทัลเพื่อการเมือง',
  'หลักสูตรการบริหารการพัฒนาเมืองยุคใหม่ (ระดับบัณฑิตศึกษา)',
  'หลักสูตรรัฐประศาสนศาสตรมหาบัณฑิต'
] as const;

export const SUPPORT_GROUPS = [
  'งานบริหารทั่วไปและธุรการ',
  'งานนโยบาย แผน และประกันคุณภาพ',
  'งานการเงิน คลัง และพัสดุ',
  'งานบริการการศึกษาและวิชาการ',
  'งานวิจัยและนวัตกรรม',
  'งานเทคโนโลยีสารสนเทศและสื่อสาร'
] as const;

export interface TrainingRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  campus: Campus;
  staffType: StaffType;
  isCollegeFaculty: 'วิทยาลัยนวัตกรรมการจัดการ' | 'สมทบ/ช่วยราชการ';
  
  // Specific to Academic staff
  academicPrograms?: string[];
  academicResponsiblePrograms?: string[];
  
  // Specific to Support staff
  supportDeptGroup?: string;
  supportDeptUnit?: string;
  
  // Job characteristics specific to position
  jobCharacteristics?: string;
  
  // Course details
  courseTitle: string;
  categories: string[];
  otherCategoryDetail?: string;
  organizer: string;
  startDate: string;
  endDate: string;
  hours: number;
  location: string;
  locationType: LocationType;
  expense: number;
  
  // Knowledge assessment & outcomes
  knowledgeBefore: number; // 1 to 5
  knowledgeAfter: number;  // 1 to 5
  workApplication: string;
  
  // Certificate attachment
  certificateFile?: string; // base64 or URL
  certificateFileName?: string;
  
  submittedAt: string;
  userId?: string;
}

export interface FilterOptions {
  search: string;
  staffType: 'all' | StaffType;
  campus: 'all' | Campus;
  category: string;
  startDate: string;
  endDate: string;
}

export interface SystemStats {
  totalRecords: number;
  totalHours: number;
  totalExpense: number;
  avgKnowledgeGain: number; // percentage
  academicCount: number;
  supportCount: number;
}
