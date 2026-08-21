import { AppState, User, RecordItem } from '../types';

export const getGasUrl = () => ((import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbyjvLS4tr80g9TqdVfcdZGGqov9ClbDZjm8JD477I9pE7H_dPcO2qXqCoOUK_q57ltr_A/exec');

export function formatDateTime(isoString: string | undefined | null) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day}  ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
}

function normalizeObjKeys(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    const trimmed = key.trim();
    // Ignore the bad "undefined" array created by old GAS script
    if (trimmed === 'AssignedStudents' && Array.isArray(obj[key]) && obj[key][0] === 'undefined') {
      continue;
    }
    result[trimmed] = obj[key];
  }
  return result;
}

function processZones(zones: any[]) {
  if (!Array.isArray(zones)) return [];
  return zones.map(z => {
    const nz = normalizeObjKeys(z);
    let students = nz.AssignedStudents;
    if (typeof students === 'string' || typeof students === 'number') {
      nz.AssignedStudents = String(students).split(',').map(s => s.trim()).filter(s => s);
    } else if (!Array.isArray(students)) {
      nz.AssignedStudents = [];
    } else if (Array.isArray(students)) {
      nz.AssignedStudents = students.map(s => String(s).trim()).filter(s => s && s !== 'undefined');
    }
    return nz;
  });
}

// Fetch helper for GAS
async function fetchGas(action: string, payload?: any) {
  const url = getGasUrl();
  if (!url) throw new Error('GAS_URL_NOT_SET');
  
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify({ action, payload })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data.data;
}

function fixDriveUrl(url?: string): string {
  if (!url) return '';
  let fileId = '';
  
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      fileId = match[1];
    }
  } else if (url.includes('drive.google.com/uc')) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      fileId = match[1];
    }
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  
  return url;
}

export const api = {
  async login(username: string, password?: string): Promise<User | null> {
    return await fetchGas('login', { username, password });
  },

  async getDashboardData(): Promise<AppState> {
    const data = await fetchGas('getDashboardData');
    
    if (data) {
      if (data.users) data.users = data.users.map(normalizeObjKeys);
      if (data.zones) data.zones = processZones(data.zones);
      if (data.records) data.records = data.records.map(normalizeObjKeys);
    }
    
    // Normalize dates just in case GAS returns ISO strings
    if (data && data.records) {
      data.records = data.records.map((r: any) => {
        if (r.Date && r.Date.includes('T')) {
          const d = new Date(r.Date);
          r.Date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        }
        if (r.Photo1_URL) r.Photo1_URL = fixDriveUrl(r.Photo1_URL);
        if (r.Photo2_URL) r.Photo2_URL = fixDriveUrl(r.Photo2_URL);
        if (r.Photo3_URL) r.Photo3_URL = fixDriveUrl(r.Photo3_URL);
        if (r.ReviewPhoto1_URL) r.ReviewPhoto1_URL = fixDriveUrl(r.ReviewPhoto1_URL);
        return r;
      });
    }
    
    return data;
  },

  async submitRecord(record: Partial<RecordItem>) {
    // Format date as YYYY/MM/DD to match existing data
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    
    const newRecord: RecordItem = {
      RecordID: `REC${Date.now()}`,
      Date: record.Date || dateStr,
      ZoneID: record.ZoneID || '',
      StudentID: record.StudentID || '',
      Photo1_URL: record.Photo1_URL || '',
      Photo2_URL: record.Photo2_URL || '',
      Photo3_URL: record.Photo3_URL || '',
      Status: '待審核',
      CheckBy: '',
      CheckTime: '',
      UploadTime: new Date().toLocaleString('zh-TW'),
      ReviewPhoto1_URL: ''
    };
    
    await fetchGas('submitRecord', newRecord);
    return newRecord;
  },

  async updateRecordStatus(recordId: string, status: RecordItem['Status'], checkBy: string, reviewPhotoUrl: string = '') {
    await fetchGas('updateRecordStatus', { recordId, status, checkBy, reviewPhotoUrl, checkTime: new Date().toLocaleString('zh-TW') });
  }
};
