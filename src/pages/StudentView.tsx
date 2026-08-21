import React, { useRef, useState } from 'react';
import { AppState, User, Zone } from '../types';
import { Camera, Upload, CheckCircle, AlertCircle, Clock, Maximize2, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { api, formatDateTime } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentView({ data, user, reloadData }: { data: AppState, user: User, reloadData: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  
  const myZone = data.zones.find(z => z.AssignedStudents.some(sid => String(sid) === String(user.UserID)));
  
  const now = new Date();
  const today1 = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const today2 = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  
  // Find today's latest record for this student/zone
  const myRecord = [...data.records].reverse().find(r => String(r.StudentID) === String(user.UserID) && String(r.ZoneID) === String(myZone?.ZoneID) && (r.Date === today1 || r.Date === today2));

  // Find all historical records (excluding today if shown above)
  const historyRecords = data.records.filter(r => String(r.StudentID) === String(user.UserID) && String(r.ZoneID) === String(myZone?.ZoneID) && r.Date !== today1 && r.Date !== today2).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64Watermarked = await applyWatermark(file);
    const newPhotos = [...photos];
    newPhotos[index] = base64Watermarked;
    setPhotos(newPhotos);
    
    // reset input
    e.target.value = '';
  };
  
  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = '';
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    if (!myZone) return;
    const validPhotos = photos.filter(p => p);
    if (validPhotos.length < 2) {
      alert('請至少上傳 2 張打掃照片！');
      return;
    }

    setUploading(true);
    try {
      await api.submitRecord({
        Date: today1,
        ZoneID: myZone.ZoneID,
        StudentID: user.UserID,
        Photo1_URL: validPhotos[0] || '',
        Photo2_URL: validPhotos[1] || '',
        Photo3_URL: validPhotos[2] || '',
      });

      setPhotos([]);
      await reloadData();
    } catch (err) {
      alert('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const applyWatermark = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // Resize to max 640px to reduce payload size heavily
          const MAX_SIZE = 640;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);

          ctx.drawImage(img, 0, 0, width, height);
          
          // Add watermark
          const timestamp = formatDateTime(new Date().toISOString());
          const fontSize = Math.max(14, height * 0.04);
          ctx.font = `${fontSize}px Arial`;
          
          const textWidth = ctx.measureText(timestamp).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillRect(10, height - fontSize - 20, textWidth + 20, fontSize + 15);
          
          ctx.fillStyle = 'red';
          ctx.fillText(timestamp, 20, height - 15);
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  if (!myZone) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-100/55 border border-slate-100 text-center max-w-md mx-auto my-12">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-500 border border-amber-100">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-950">目前沒有分配到的掃區</h3>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          系統中目前並未將您指派給特定的整潔區域。<br />
          請連繫導師或服務股長為您指派負責區域。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic welcome hero panel */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 sm:p-8 rounded-2xl shadow-xl shadow-blue-500/10 text-white overflow-hidden">
        {/* Abstract decorative ambient layers */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                個人任務
              </span>
              <span className="text-white/80 text-xs font-medium">| {today1}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <BroomIcon className="text-white h-7 w-7 shrink-0" />
              我的打掃區域：<span className="underline decoration-blue-300 decoration-2 underline-offset-4">{myZone.ZoneName}</span>
            </h2>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-xs font-bold">狀態：連線中</p>
          </div>
        </div>
      </div>

      {/* Main submission or state card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100">
        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              今日打掃回報
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">每日需完成打掃並上傳至少 2 張打掃成果照</p>
          </div>
          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">
            {today1}
          </span>
        </div>

        {myRecord && myRecord.Status !== '不合格' ? (
          <div className="space-y-6">
            {/* Status alerts */}
            <div className={`p-5 rounded-2xl border flex items-start gap-3.5 transition-all ${
              myRecord.Status === '合格' 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 shadow-sm shadow-emerald-500/5' 
                : 'bg-blue-50/50 border-blue-100 text-blue-950 shadow-sm shadow-blue-500/5'
            }`}>
              {myRecord.Status === '合格' ? (
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200">
                  <CheckCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-200">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2">
                  審核進度：
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                    myRecord.Status === '合格' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {myRecord.Status}
                  </span>
                </p>
                {myRecord.CheckBy ? (
                  <p className="text-xs text-slate-500">
                    審核人：<span className="font-bold text-slate-700">{myRecord.CheckBy}</span> ({formatDateTime(myRecord.CheckTime)})
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    打掃成果已提交，正等待導師或服務股長審核。
                  </p>
                )}
              </div>
            </div>

            {/* Photo review display */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">已上傳打掃成果</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[myRecord.Photo1_URL, myRecord.Photo2_URL, myRecord.Photo3_URL].filter(Boolean).map((photoUrl, idx) => (
                  <div key={idx} className="group relative">
                    <p className="text-xs text-slate-500 mb-1.5 font-semibold">成果照片 {idx + 1}</p>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm shadow-slate-100 hover:shadow-md transition-all group shrink-0 aspect-video"
                      onClick={() => setEnlargedImage(photoUrl as string)}
                    >
                      <img referrerPolicy="no-referrer" src={photoUrl as string} alt="成果照片" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                        <Maximize2 className="text-white w-5 h-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-200" />
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-6">
            {myRecord?.Status === '不合格' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-2xl border bg-red-50/50 border-red-100 text-red-950 shadow-sm shadow-red-500/5 flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0 border border-red-200">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-950">狀態：退回修改 (不合格)</p>
                    <p className="text-xs text-red-800 leading-relaxed">
                      您的今日打掃成果未通過審核。請依照以下修改意見重新打掃，並拍攝新的打掃照片再次上傳。
                    </p>
                    {myRecord.CheckBy && (
                      <p className="text-[11px] text-red-700/80 mt-1 font-medium">
                        審核人：{myRecord.CheckBy} ({formatDateTime(myRecord.CheckTime)})
                      </p>
                    )}
                  </div>
                </div>
                
                {myRecord.ReviewPhoto1_URL && (
                  <div className="bg-red-50/20 p-4 rounded-2xl border border-red-100/40">
                    <p className="text-xs text-red-700 mb-2 font-extrabold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      審核人標記之不合格處
                    </p>
                    <div 
                      className="relative rounded-xl max-w-full sm:max-w-xs overflow-hidden border border-red-100 cursor-pointer shadow-sm hover:shadow-md group aspect-video"
                      onClick={() => setEnlargedImage(myRecord.ReviewPhoto1_URL as string)}
                    >
                      <img referrerPolicy="no-referrer" src={myRecord.ReviewPhoto1_URL} alt="不合格標記照" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                        <Maximize2 className="text-white w-5 h-5" />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            <div>
              <p className="text-sm text-slate-700 font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                拍攝打掃照片並上傳：
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="relative">
                    {photos[idx] ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group rounded-xl overflow-hidden shadow-sm hover:shadow border border-slate-200 cursor-pointer"
                        onClick={() => setEnlargedImage(photos[idx])}
                      >
                        <img referrerPolicy="no-referrer" src={photos[idx]} alt={`預覽 ${idx + 1}`} className="w-full object-cover aspect-video bg-slate-50" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <Maximize2 className="text-white w-6 h-6" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(idx);
                          }}
                          className="absolute top-2 right-2 bg-slate-900/60 hover:bg-red-500/90 text-white p-2 rounded-lg shadow-lg active:scale-90 transition-all z-10 cursor-pointer backdrop-blur-sm"
                          title="刪除照片並重拍"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-bold pointer-events-none">
                          照片 {idx + 1} {idx < 2 ? '(必填)' : '(選填)'}
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        onClick={() => {
                          if (idx === 0) fileInputRef1.current?.click();
                          else if (idx === 1) fileInputRef2.current?.click();
                          else fileInputRef3.current?.click();
                        }}
                        className="w-full h-32 flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 rounded-xl transition-all text-slate-500 group cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold tracking-wide group-hover:text-blue-700 transition-colors">
                          拍攝照片 {idx + 1} <span className={idx < 2 ? 'text-blue-600' : 'text-slate-400'}>{idx < 2 ? '(必填)' : '(選填)'}</span>
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={uploading || photos.filter(p => p).length < 2}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>正在壓印浮水印並上傳照片...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>送出整潔審核</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" capture="environment" ref={fileInputRef1} onChange={(e) => handleFileChange(e, 0)} className="hidden" />
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef2} onChange={(e) => handleFileChange(e, 1)} className="hidden" />
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef3} onChange={(e) => handleFileChange(e, 2)} className="hidden" />
      </div>

      {/* Historical logs */}
      {historyRecords.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
            歷史打掃回報紀錄
          </h3>
          
          <div className="space-y-4">
            {historyRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(record => (
              <div key={record.RecordID} className="border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-all shadow-sm shadow-slate-100/40 bg-slate-50/30">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                  <span className="font-extrabold text-slate-800 text-sm tracking-wide">{record.Date}</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    record.Status === '合格' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                    record.Status === '不合格' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                  }`}>
                    {record.Status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[record.Photo1_URL, record.Photo2_URL, record.Photo3_URL].filter(Boolean).map((photoUrl, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-semibold">成果照片 {idx + 1}</p>
                      <div 
                        className="relative rounded-lg overflow-hidden border border-slate-100 cursor-pointer shadow-sm hover:shadow group aspect-video"
                        onClick={() => setEnlargedImage(photoUrl as string)}
                      >
                        <img referrerPolicy="no-referrer" src={photoUrl as string} alt={`打掃照片 ${idx + 1}`} className="w-full h-full object-cover bg-slate-50" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <Maximize2 className="text-white w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {record.ReviewPhoto1_URL && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-red-500 font-semibold">退回修改說明圖</p>
                      <div 
                        className="relative rounded-lg overflow-hidden border border-red-100 cursor-pointer shadow-sm hover:shadow group aspect-video"
                        onClick={() => setEnlargedImage(record.ReviewPhoto1_URL as string)}
                      >
                        <img referrerPolicy="no-referrer" src={record.ReviewPhoto1_URL} alt="不合格照片" className="w-full h-full object-cover bg-slate-50" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <Maximize2 className="text-white w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {historyRecords.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs text-slate-500 font-bold">
                第 {currentPage} 頁 / 共 {Math.ceil(historyRecords.length / ITEMS_PER_PAGE)} 頁
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(historyRecords.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(historyRecords.length / ITEMS_PER_PAGE)}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modern Dialog Preview */}
      <AnimatePresence>
        {enlargedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onClick={() => setEnlargedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-[-48px] right-0 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full backdrop-blur-md cursor-pointer transition-colors"
                onClick={() => setEnlargedImage(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                referrerPolicy="no-referrer" 
                src={enlargedImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {uploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
          >
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-[80vw]">
              <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-800 font-bold text-sm sm:text-base text-center">正在壓印浮水印並上傳資料<br/><span className="text-slate-500 text-xs mt-1 block">請稍候，可能需要數秒時間...</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BroomIcon({ className = "text-blue-500" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 13 13 2.5"/>
      <path d="M12.5 14.5c.32-2.33 2.1-4.11 4.43-4.43l3.52-.45c.84-.1 1.54.59 1.44 1.44l-.45 3.52c-.32 2.33-2.1 4.11-4.43 4.43Z"/>
      <path d="m20.5 10.5-6-6"/>
      <path d="m15 16-1-1"/>
      <path d="m16 15-1-1"/>
    </svg>
  );
}
