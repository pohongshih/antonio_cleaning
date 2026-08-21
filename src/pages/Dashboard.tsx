import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { api } from '../lib/api';
import { AppState } from '../types';
import TeacherView from './TeacherView';
import LeaderView from './LeaderView';
import StudentView from './StudentView';
import { LogOut, User as UserIcon, Calendar, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AppState | null>(null);

  const loadData = async () => {
    const dbData = await api.getDashboardData();
    setData(dbData);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!user) return null;

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm animate-pulse">正在載入系統資料...</p>
        </div>
      </div>
    );
  }

  // Determine role badge style
  const getRoleBadge = (role: string, title: string) => {
    switch (role) {
      case 'Teacher':
        return {
          bg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
          label: `教師 - ${title}`
        };
      case 'Leader':
        return {
          bg: 'bg-violet-50 border-violet-100 text-violet-700',
          label: `股長 - ${title}`
        };
      default:
        return {
          bg: 'bg-sky-50 border-sky-100 text-sky-700',
          label: `學生 - ${title}`
        };
    }
  };

  const badge = getRoleBadge(user.Role, user.JobTitle);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm shadow-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10"
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">班級整潔管理系統</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Classroom Cleanliness</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-slate-100 pr-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800 flex items-center justify-end gap-1">
                  {user.Name}
                </p>
                <div className="flex gap-1.5 mt-0.5 justify-end">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-600">
                    {user.Class}班
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-sm border border-slate-200/50">
                {user.Name.substring(0, 1)}
              </div>
              {/* Small details on mobile */}
              <div className="text-left md:hidden">
                <p className="text-xs font-bold text-slate-800">{user.Name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{user.JobTitle}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100 active:scale-[0.97]"
              title="登出系統"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-bold hidden sm:block">登出</span>
            </button>
          </div>
        </div>
      </header>

      <motion.main 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8"
      >
        {user.Role === 'Teacher' && <TeacherView data={data} reloadData={loadData} />}
        {user.Role === 'Leader' && <LeaderView data={data} user={user} reloadData={loadData} />}
        {user.Role === 'Student' && <StudentView data={data} user={user} reloadData={loadData} />}
      </motion.main>

      <footer className="py-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 施柏宏. All rights reserved.</p>
      </footer>
    </div>
  );
}

