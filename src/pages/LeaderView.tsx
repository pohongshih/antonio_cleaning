import React, { useState, useRef } from 'react';
import { AppState, User, RecordItem, Zone } from '../types';
import { api, formatDateTime } from '../lib/api';
import { Check, X, Camera, Image as ImageIcon, Maximize2, Calendar, Sparkles, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LeaderView({ data, user, reloadData }: { data: AppState, user: User, reloadData: () => void }) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string>('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [optimisticRecords, setOptimisticRecords] = useState<RecordItem[]>(data.records);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setOptimisticRecords(data.records);
  }, [data.records]);

  // Find zones managed by this leader type
  const managedZones = data.zones.filter(z => String(z.ManagerID) === String(user.UserID));
  
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const formattedDate1 = selectedDate.replace(/-/g, '/');
  const d = new Date(selectedDate);
  const formattedDate2 = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  
  // Generate all tasks for the managed zones on selected date
  const tasks = managedZones.flatMap(zone => {
    return zone.AssignedStudents.map(studentId => {
      const student = data.users.find(u => String(u.UserID) === String(studentId));
      const record = [...optimisticRecords].reverse().find(r => 
        String(r.ZoneID) === String(zone.ZoneID) && 
        String(r.StudentID) === String(studentId) && 
        (r.Date === formattedDate1 || r.Date === formattedDate2)
      );
      return {
        id: `${zone.ZoneID}-${studentId}`,
        zone,
        student,
        record
      };
    });
  }).filter(t => t.student); // Only include if student exists

  const handleReview = async (recordId: string, status: RecordItem['Status']) => {
    setSubmittingId(recordId);
    try {
      setOptimisticRecords(prev => prev.map(r => r.RecordID === recordId ? { ...r, Status: status, CheckBy: user.Name, ReviewPhoto1_URL: reviewPhoto || r.ReviewPhoto1_URL } : r));
      const currentReviewPhoto = reviewPhoto;
      setReviewPhoto('');
      await api.updateRecordStatus(recordId, status, user.Name, currentReviewPhoto);
      await reloadData();
    } catch (err) {
      alert('更新審核狀態失敗');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleBatchReview = async (status: RecordItem['Status']) => {
    const recordsToUpdate = tasks
      .filter(t => selectedTasks.includes(t.id) && t.record)
      .map(t => t.record!.RecordID);
    
    if (recordsToUpdate.length === 0) return;

    setSubmittingId('batch');
    try {
      setOptimisticRecords(prev => prev.map(r => recordsToUpdate.includes(r.RecordID) ? { ...r, Status: status, CheckBy: user.Name } : r));
      
      for (const rid of recordsToUpdate) {
        await api.updateRecordStatus(rid, status, user.Name, '');
      }
      
      setSelectedTasks([]);
      await reloadData();
    } catch (err) {
      alert('批次更新審核狀態失敗');
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const reviewableIds = tasks.filter(t => t.record).map(t => t.id);
    if (selectedTasks.length === reviewableIds.length && reviewableIds.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(reviewableIds);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, recordId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      setSubmittingId(recordId);
      try {
        setOptimisticRecords(prev => prev.map(r => r.RecordID === recordId ? { ...r, Status: '不合格', CheckBy: user.Name, ReviewPhoto1_URL: result } : r));
        await api.updateRecordStatus(recordId, '不合格', user.Name, result);
        await reloadData();
      } catch (err) {
        alert('照片上傳失敗');
      } finally {
        setSubmittingId(null);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Leader Header Panel */}
      <div className="relative bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 p-6 sm:p-8 rounded-2xl shadow-xl shadow-indigo-500/10 text-white overflow-hidden">
        {/* Ambient decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-violet-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                股長管理面板
              </span>
              <span className="text-white/80 text-xs font-semibold">| 負責管理 {managedZones.length} 個班級掃區</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Sparkles className="text-white h-7 w-7" />
              整潔督導：{user.JobTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm self-start sm:self-auto w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-white shrink-0" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Review Dashboard */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">學生成果審核區</h3>
            <p className="text-xs text-slate-500 mt-0.5">點擊學生欄位，或勾選後進行批次快速合格/不合格審查</p>
          </div>
          
          {/* Batch action panel */}
          <AnimatePresence mode="wait">
            {selectedTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="flex items-center gap-2 w-full sm:w-auto shrink-0"
              >
                <button 
                  onClick={() => handleBatchReview('合格')}
                  disabled={submittingId !== null}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-4 h-4" /> 批次合格 ({selectedTasks.length})
                </button>
                <button 
                  onClick={() => handleBatchReview('不合格')}
                  disabled={submittingId !== null}
                  className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <X className="w-4 h-4" /> 批次不合格 ({selectedTasks.length})
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/55">
              <tr>
                <th scope="col" className="px-6 py-4 text-left w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={tasks.filter(t => t.record).length > 0 && selectedTasks.length === tasks.filter(t => t.record).length}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">負責學生</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">打掃區域</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">當前狀態</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">上傳成果照</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">審查作業</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-60 text-indigo-500" />
                      <p className="text-sm font-bold text-slate-800">無任何分配區域</p>
                      <p className="text-xs mt-1">您在此日期下目前沒有任何指派的清掃人員與區域。</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map(task => {
                  const hasRecord = !!task.record;
                  const status = hasRecord ? task.record!.Status : '未到';
                  const isSelected = selectedTasks.includes(task.id);
                  const isRecordSubmitting = submittingId === task.record?.RecordID;
                  
                  return (
                    <tr key={task.id} className={`transition-colors duration-150 ${isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/40'}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          checked={isSelected}
                          onChange={() => toggleTaskSelection(task.id)}
                          disabled={!hasRecord}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs border border-slate-150 shrink-0">
                            {task.student?.Name?.substring(0, 1)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{task.student?.Name || '未知'}</p>
                            <p className="text-[10px] text-slate-400 font-medium font-mono">{task.student?.Username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                        {task.zone.ZoneName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold border ${
                          !hasRecord ? 'bg-slate-50 border-slate-100 text-slate-400' :
                          status === '合格' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                          status === '不合格' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                          {!hasRecord ? '未回報' : status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasRecord ? (
                          <div className="flex gap-2">
                            {[task.record?.Photo1_URL, task.record?.Photo2_URL, task.record?.Photo3_URL].filter(Boolean).map((photoUrl, idx) => (
                              <div 
                                key={idx}
                                className="relative h-10 w-16 rounded-lg overflow-hidden border border-slate-100 cursor-pointer shadow-sm shadow-slate-100 hover:shadow group shrink-0"
                                onClick={() => setEnlargedImage(photoUrl as string)}
                              >
                                <img referrerPolicy="no-referrer" src={photoUrl as string} alt={`成果照 ${idx + 1}`} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-150">
                                  <Maximize2 className="text-white w-3 h-3" />
                                </div>
                              </div>
                            ))}
                            {task.record?.ReviewPhoto1_URL && (
                              <div 
                                className="relative h-10 w-16 rounded-lg overflow-hidden border border-red-200 cursor-pointer shadow-sm hover:shadow group shrink-0"
                                onClick={() => setEnlargedImage(task.record!.ReviewPhoto1_URL)}
                              >
                                <img referrerPolicy="no-referrer" src={task.record!.ReviewPhoto1_URL} alt="不合格照片" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-150">
                                  <Maximize2 className="text-white w-3 h-3" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">尚未回報</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {hasRecord ? (
                          <div className="flex items-center gap-2">
                            {isRecordSubmitting ? (
                              <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                                處理中...
                              </span>
                            ) : (
                              <>
                                <select 
                                  className="border border-slate-200 rounded-xl text-xs font-bold py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none cursor-pointer"
                                  value={task.record?.Status}
                                  onChange={async (e) => {
                                    if (e.target.value === '合格') {
                                      await handleReview(task.record!.RecordID, '合格');
                                    } else if (e.target.value === '不合格') {
                                      await handleReview(task.record!.RecordID, '不合格');
                                    } else if (e.target.value === '不合格(附圖)') {
                                      const fileInput = document.getElementById(`file-${task.record!.RecordID}`);
                                      if (fileInput) fileInput.click();
                                    } else {
                                      await handleReview(task.record!.RecordID, '待審核');
                                    }
                                  }}
                                >
                                  <option value="待審核">🔄 待審核</option>
                                  <option value="合格">🟢 設為合格</option>
                                  <option value="不合格">🔴 不合格 (無圖)</option>
                                  <option value="不合格(附圖)">📸 不合格 (附圖)</option>
                                </select>
                                <input 
                                  type="file" 
                                  id={`file-${task.record!.RecordID}`}
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleFileChange(e, task.record!.RecordID)}
                                />
                                {task.record?.CheckBy && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ({task.record.CheckBy}審)
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">無需審核</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed View */}
        <div className="md:hidden divide-y divide-slate-100">
          <div className="p-4 bg-slate-50/55 flex items-center gap-2">
            <input 
              type="checkbox" 
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              checked={tasks.filter(t => t.record).length > 0 && selectedTasks.length === tasks.filter(t => t.record).length}
              onChange={toggleAll}
            />
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">選擇所有已回報項目</span>
          </div>
          
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">目前無負責管理的區域與學生</div>
          ) : (
            tasks.map(task => {
              const hasRecord = !!task.record;
              const status = hasRecord ? task.record!.Status : '未到';
              const isSelected = selectedTasks.includes(task.id);
              const isRecordSubmitting = submittingId === task.record?.RecordID;
              
              return (
                <div key={task.id} className={`p-5 flex flex-col gap-4 transition-all ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer mt-1 disabled:opacity-30"
                        checked={isSelected}
                        onChange={() => toggleTaskSelection(task.id)}
                        disabled={!hasRecord}
                      />
                      <div>
                        <h4 className="font-bold text-slate-950 text-sm">{task.student?.Name || '未知'}</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{task.zone.ZoneName}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                      !hasRecord ? 'bg-slate-50 border-slate-100 text-slate-400' :
                      status === '合格' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                      status === '不合格' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                    }`}>
                      {!hasRecord ? '未回報' : status}
                    </span>
                  </div>

                  {hasRecord && (
                    <div className="flex flex-wrap gap-2">
                      {[task.record?.Photo1_URL, task.record?.Photo2_URL, task.record?.Photo3_URL].filter(Boolean).map((photoUrl, idx) => (
                        <div 
                          key={idx}
                          className="relative h-14 w-20 rounded-xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm"
                          onClick={() => setEnlargedImage(photoUrl as string)}
                        >
                          <img referrerPolicy="no-referrer" src={photoUrl as string} alt={`照片 ${idx + 1}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {task.record?.ReviewPhoto1_URL && (
                        <div 
                          className="relative h-14 w-20 rounded-xl overflow-hidden border border-red-200 cursor-pointer shadow-sm"
                          onClick={() => setEnlargedImage(task.record!.ReviewPhoto1_URL)}
                        >
                          <img referrerPolicy="no-referrer" src={task.record!.ReviewPhoto1_URL} alt="不合格照片" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-1">
                    {hasRecord ? (
                      <div className="space-y-3">
                        {isRecordSubmitting ? (
                          <div className="py-2 text-center text-xs text-indigo-600 font-bold animate-pulse">
                            正在更新打掃成果狀態...
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => handleReview(task.record!.RecordID, '合格')}
                              className="flex-1 min-w-[70px] bg-emerald-50 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100/70 active:scale-95 transition-all cursor-pointer"
                            >
                              合格
                            </button>
                            <button 
                              onClick={() => handleReview(task.record!.RecordID, '不合格')}
                              className="flex-1 min-w-[70px] bg-red-50 text-red-700 border border-red-200 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100/70 active:scale-95 transition-all cursor-pointer"
                            >
                              不合格
                            </button>
                            <button 
                              onClick={() => {
                                const fileInput = document.getElementById(`file-mobile-${task.record!.RecordID}`);
                                if (fileInput) fileInput.click();
                              }}
                              className="flex-1 min-w-[100px] bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-100/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" /> 不合格(附圖)
                            </button>
                            {task.record?.Status !== '待審核' && (
                              <button 
                                onClick={() => handleReview(task.record!.RecordID, '待審核')}
                                className="flex-1 min-w-[70px] bg-slate-50 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                              >
                                重設待審
                              </button>
                            )}
                            <input 
                              type="file" 
                              id={`file-mobile-${task.record!.RecordID}`}
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleFileChange(e, task.record!.RecordID)}
                            />
                          </div>
                        )}
                        {task.record?.CheckBy && (
                          <div className="text-[10px] text-slate-400 text-center font-semibold bg-slate-50 py-1.5 rounded-lg border border-slate-100">
                            最後更新者：{task.record.CheckBy} ({formatDateTime(task.record.CheckTime)})
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium italic py-1 text-center bg-slate-50/50 rounded-lg">
                        同學尚未回報，請督促同學完成打掃
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Enlarged image preview modal */}
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
        {submittingId !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
          >
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-[80vw]">
              <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-800 font-bold text-sm sm:text-base text-center">正在更新打掃成果狀態<br/><span className="text-slate-500 text-xs mt-1 block">請稍候，可能需要數秒時間...</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
