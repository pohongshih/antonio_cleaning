import React, { useState, useRef } from 'react';
import { AppState, RecordItem, Zone, User } from '../types';
import { api, formatDateTime } from '../lib/api';
import { Check, X, Camera, Image as ImageIcon, Users, Maximize2, Calendar, ShieldCheck, UserCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TeacherView({ data, reloadData }: { data: AppState, reloadData: () => void }) {
  const [activeTab, setActiveTab] = useState<'review' | 'management'>('review');
  
  return (
    <div className="space-y-6">
      {/* Segmented Tab control with sliding design style */}
      <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full max-w-sm mx-auto sm:mx-0 border border-slate-200/50">
        <button 
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'review' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
          }`}
        >
          🧹 打掃審核
        </button>
        <button 
          onClick={() => setActiveTab('management')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'management' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
          }`}
        >
          ⚙️ 班級管理
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'review' ? (
            <TeacherReviewTab data={data} reloadData={reloadData} />
          ) : (
            <TeacherManagementTab data={data} reloadData={reloadData} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TeacherReviewTab({ data, reloadData }: { data: AppState, reloadData: () => void }) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string>('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [optimisticRecords, setOptimisticRecords] = useState<RecordItem[]>(data.records);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setOptimisticRecords(data.records);
  }, [data.records]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const formattedDate1 = selectedDate.replace(/-/g, '/');
  const d = new Date(selectedDate);
  const formattedDate2 = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

  // Generate all tasks for all zones on selected date
  const tasks = data.zones.flatMap(zone => {
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
  }).filter(t => t.student);

  const handleReview = async (recordId: string, status: RecordItem['Status']) => {
    setSubmittingId(recordId);
    try {
      setOptimisticRecords(prev => prev.map(r => r.RecordID === recordId ? { ...r, Status: status, CheckBy: '老師', ReviewPhoto1_URL: reviewPhoto || r.ReviewPhoto1_URL } : r));
      const currentReviewPhoto = reviewPhoto;
      setReviewPhoto('');
      await api.updateRecordStatus(recordId, status, '老師', currentReviewPhoto);
      await reloadData();
    } catch (err) {
      alert('更新狀態失敗');
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
      setOptimisticRecords(prev => prev.map(r => recordsToUpdate.includes(r.RecordID) ? { ...r, Status: status, CheckBy: '老師' } : r));

      for (const rid of recordsToUpdate) {
        await api.updateRecordStatus(rid, status, '老師', '');
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
        setOptimisticRecords(prev => prev.map(r => r.RecordID === recordId ? { ...r, Status: '不合格', CheckBy: '老師', ReviewPhoto1_URL: result } : r));
        await api.updateRecordStatus(recordId, '不合格', '老師', result);
        await reloadData();
      } catch (err) {
        alert('不合格說明照上傳失敗');
      } finally {
        setSubmittingId(null);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 overflow-hidden border border-slate-100">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">全班打掃進度與審查</h3>
          <p className="text-xs text-slate-500 mt-0.5">查看今日全班清掃進度，可單獨審核，或勾選後批次標記為合格</p>
        </div>
        
        <div className="flex gap-4 items-center w-full sm:w-auto self-start sm:self-auto">
          {/* Batch panel */}
          <AnimatePresence>
            {selectedTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-2 w-full sm:w-auto"
              >
                <button 
                  onClick={() => handleBatchReview('合格')}
                  disabled={submittingId !== null}
                  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-4 h-4" /> 批次合格 ({selectedTasks.length})
                </button>
                <button 
                  onClick={() => handleBatchReview('不合格')}
                  disabled={submittingId !== null}
                  className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 shadow-md shadow-red-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <X className="w-4 h-4" /> 批次不合格 ({selectedTasks.length})
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  checked={tasks.filter(t => t.record).length > 0 && selectedTasks.length === tasks.filter(t => t.record).length}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">學生姓名</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">負責區域</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">當前狀態</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">打掃成果照</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">導師審核</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="max-w-xs mx-auto text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-indigo-500 opacity-60" />
                    <p className="text-sm font-bold text-slate-800">無任何分配掃區</p>
                    <p className="text-xs mt-1">請在班級管理分頁指派學生的打掃區域。</p>
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
                              className="relative h-10 w-16 rounded-lg overflow-hidden border border-slate-100 cursor-pointer shadow-sm hover:shadow group shrink-0"
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {hasRecord ? (
                        <div className="flex flex-col gap-1.5">
                          {isRecordSubmitting ? (
                            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                              更新中...
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select 
                                className="border border-slate-200 rounded-xl text-xs font-bold py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white outline-none cursor-pointer"
                                value={task.record?.Status}
                                onChange={async (e) => {
                                  if (e.target.value === '合格') {
                                    await handleReview(task.record!.RecordID, '合格');
                                  } else if (e.target.value === '不合格') {
                                    await handleReview(task.record!.RecordID, '不合格');
                                  } else if (e.target.value === '不合格(附圖)') {
                                    const fileInput = document.getElementById(`teacher-file-${task.record!.RecordID}`);
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
                                id={`teacher-file-${task.record!.RecordID}`}
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileChange(e, task.record!.RecordID)}
                              />
                            </div>
                          )}
                          {task.record?.CheckBy && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              最後審核: {task.record.CheckBy}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">無紀錄</span>
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
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">選擇所有已回報</span>
        </div>
        
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">目前無分配的區域與學生</div>
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
                        <img referrerPolicy="no-referrer" src={photoUrl as string} alt={`成果照 ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {task.record?.ReviewPhoto1_URL && (
                      <div 
                        className="relative h-14 w-20 rounded-xl overflow-hidden border border-red-300 cursor-pointer shadow-sm"
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
                          正在進行審查處理中...
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
                              const fileInput = document.getElementById(`teacher-file-mobile-${task.record!.RecordID}`);
                              if (fileInput) fileInput.click();
                            }}
                            className="flex-1 min-w-[100px] bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-100/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" /> 退回(附圖)
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
                            id={`teacher-file-mobile-${task.record!.RecordID}`}
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, task.record!.RecordID)}
                          />
                        </div>
                      )}
                      {task.record?.CheckBy && (
                        <div className="text-[10px] text-slate-400 text-center font-semibold bg-slate-50 py-1.5 rounded-lg border border-slate-100">
                          審查標記：{task.record?.CheckBy} ({formatDateTime(task.record?.CheckTime)})
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Enlarged popup modal */}
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
              <svg className="animate-spin h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-800 font-bold text-sm sm:text-base text-center">正在更新審核狀態<br/><span className="text-slate-500 text-xs mt-1 block">請稍候，可能需要數秒時間...</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherManagementTab({ data }: { data: AppState, reloadData: () => void }) {
  const leaders = data.users.filter(u => u.JobTitle === '服務股長' || u.JobTitle === '內掃股長' || u.JobTitle === '外掃股長');

  return (
    <div className="space-y-6">
      {/* Leader Assignments */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 p-6 sm:p-8 border border-slate-100">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0 border border-violet-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">班級幹部指派清單</h3>
            <p className="text-xs text-slate-500">此清單中的股長具有清掃區域的直接核可權限</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leaders.map(leader => (
            <div key={leader.UserID} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/40 hover:border-slate-200 transition-all shadow-sm shadow-slate-100/30">
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                {leader.JobTitle}
              </span>
              <p className="font-extrabold text-slate-900 mt-2.5 text-base">{leader.Name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{leader.Username}</p>
              
              <div className="mt-4 pt-3 border-t border-slate-100/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">審核權限</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> 已授權
                </span>
              </div>
            </div>
          ))}
          {leaders.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-sm font-semibold">
              目前班級無指派任何股長
            </div>
          )}
        </div>
      </div>

      {/* Zone Assignments List */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 p-6 sm:p-8 border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">班級打掃分配對照表</h3>
            <p className="text-xs text-slate-500">列出各區域目前所對應分配的打掃學生，以協助日常核對</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-l-xl">負責區域名稱</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-r-xl">負責學生組員</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.zones.map(zone => {
                const students = zone.AssignedStudents.map(sid => data.users.find(u => String(u.UserID) === String(sid))?.Name).filter(Boolean);
                return (
                  <tr key={zone.ZoneID} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">{zone.ZoneName}</td>
                    <td className="px-5 py-4">
                      {students.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {students.map((student, sIdx) => (
                            <span key={sIdx} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 shadow-sm shadow-slate-100/30">
                              👤 {student}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500 font-medium italic">⚠️ 尚未分配學生負責此區</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
