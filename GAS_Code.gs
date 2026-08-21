/**
 * Google Apps Script 部署程式碼 (Google Sheets API 後台)
 * 1. 請開啟您的 Google Sheets
 * 2. 點擊「擴充功能」->「Apps Script」
 * 3. 貼上以下程式碼並覆寫原本的 Code.gs
 * 4. 點擊「部署」->「新增部署作業」
 * 5. 選取類型為「網頁應用程式 (Web App)」
 * 6. 執行身分選「我」，權限選「所有人」
 * 7. 部署後，將獲得的網址填入系統設定中
 */

const FOLDER_ID = '12ayUhTFfJ1x70Z-T4rrF05xGZTiJmw0D';

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    
    let result = null;
    
    if (action === 'login') {
      result = handleLogin(payload.username, payload.password);
    } else if (action === 'getDashboardData') {
      result = getDashboardData();
    } else if (action === 'submitRecord') {
      result = submitRecord(payload);
    } else if (action === 'updateRecordStatus') {
      result = updateRecordStatus(payload);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 為了支援 CORS
function doGet(e) {
  return ContentService.createTextOutput("API is running.");
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  
  // 移除所有欄位名稱的前後空白，避免讀取不到
  const headers = data[0].map(h => String(h).trim()); 
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function handleLogin(username, password) {
  const users = getSheetData('Users');
  const user = users.find(u => String(u.Username).trim() === String(username).trim() && String(u.Password).trim() === String(password).trim());
  if (user) return user;
  throw new Error('帳號或密碼錯誤');
}

function getDashboardData() {
  const users = getSheetData('Users');
  
  const rawZones = getSheetData('Zones');
  const zones = rawZones.map(z => {
    let students = String(z.AssignedStudents || '').split(',').map(s => s.trim()).filter(s => s !== '' && s !== 'undefined');
    return {
      ...z,
      AssignedStudents: students
    };
  });
  
  const records = getSheetData('Records');
  
  return { users, zones, records };
}

function deletePhotoByUrl(url) {
  if (!url) return;
  try {
    let fileId = '';
    const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (match1 && match1[1]) {
      fileId = match1[1];
    } else if (match2 && match2[1]) {
      fileId = match2[1];
    }
    
    if (fileId) {
      DriveApp.getFileById(fileId).setTrashed(true);
    }
  } catch (e) {
    // ignore
  }
}

function uploadImageToDrive(base64Str) {
  if (!base64Str) return '';
  if (base64Str.indexOf('http') === 0) return base64Str; // Already a URL
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    let contentType = 'image/jpeg';
    let base64Data = base64Str;
    
    if (base64Str.indexOf(';') > -1) {
      contentType = base64Str.substring(5, base64Str.indexOf(';'));
    }
    if (base64Str.indexOf('base64,') > -1) {
      base64Data = base64Str.substr(base64Str.indexOf('base64,') + 7);
    } else if (base64Str.indexOf(',') > -1) {
      base64Data = base64Str.split(',')[1];
    }
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, 'upload_' + new Date().getTime() + '.jpg');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=drivesdk';
  } catch (e) {
    return '';
  }
}

function submitRecord(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Records');
  
  // 上傳照片
  const photo1Url = payload.Photo1_URL ? uploadImageToDrive(payload.Photo1_URL) : '';
  const photo2Url = payload.Photo2_URL ? uploadImageToDrive(payload.Photo2_URL) : '';
  const photo3Url = payload.Photo3_URL ? uploadImageToDrive(payload.Photo3_URL) : '';
  
  const newRow = [
    payload.RecordID,
    payload.Date,
    payload.ZoneID,
    payload.StudentID,
    photo1Url,
    photo2Url,
    photo3Url,
    payload.Status,
    payload.CheckBy || '',
    payload.CheckTime || '',
    payload.UploadTime,
    '' // ReviewPhoto
  ];
  
  sheet.appendRow(newRow);
  payload.Photo1_URL = photo1Url; // 回傳更新後的 URL
  payload.Photo2_URL = photo2Url;
  payload.Photo3_URL = photo3Url;
  return payload;
}

function updateRecordStatus(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Records');
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return false;
  
  const headers = data[0].map(h => String(h).trim());
  const idIndex = headers.indexOf('RecordID');
  
  let reviewPhotoUrl = '';
  if (payload.reviewPhotoUrl && payload.reviewPhotoUrl.startsWith('data:image')) {
    reviewPhotoUrl = uploadImageToDrive(payload.reviewPhotoUrl);
  }
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(payload.recordId)) {
      sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(payload.status);
      sheet.getRange(i + 1, headers.indexOf('CheckBy') + 1).setValue(payload.checkBy);
      sheet.getRange(i + 1, headers.indexOf('CheckTime') + 1).setValue(payload.checkTime);
      if (reviewPhotoUrl) {
        sheet.getRange(i + 1, headers.indexOf('ReviewPhoto1_URL') + 1).setValue(reviewPhotoUrl);
      }
      break;
    }
  }
  return true;
}
