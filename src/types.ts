export type Role = 'Teacher' | 'Leader' | 'Student';
export type JobTitleType = '老師' | '導師' | '服務股長' | '內掃股長' | '外掃股長' | '學生';

export interface User {
  UserID: string;
  Name: string;
  Role: Role;
  Username: string;
  Password?: string;
  JobTitle: JobTitleType;
  Class: string;
  Status: 'Active' | 'Inactive';
}

export interface Zone {
  ZoneID: string;
  ZoneName: string;
  AssignedStudents: string[]; // UserIDs
  ManagerID: string; // Leader's UserID
  Type?: 'Indoor' | 'Outdoor';
}

export interface RecordItem {
  RecordID: string;
  Date: string;
  ZoneID: string;
  StudentID: string;
  Photo1_URL: string;
  Photo2_URL: string;
  Photo3_URL: string;
  Status: '待審核' | '合格' | '不合格';
  CheckBy: string; // Teacher or Leader Name
  CheckTime: string;
  UploadTime: string;
  ReviewPhoto1_URL: string;
}

export interface AppState {
  users: User[];
  zones: Zone[];
  records: RecordItem[];
}
