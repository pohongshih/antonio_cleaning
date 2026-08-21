import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { api } from '../lib/api';
import { Sparkles, User, Lock, ArrowRight, Loader2, GraduationCap, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setError('');
    setLoading(true);
    try {
      const user = await api.login(username, password);
      if (user) {
        login(user);
        navigate('/');
      } else {
        setError('帳號或密碼錯誤');
      }
    } catch (err) {
      setError('登入失敗，請確認網路連線或稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userAcc: string, passAcc: string) => {
    setUsername(userAcc);
    setPassword(passAcc);
    setError('');
    setLoading(true);
    try {
      const user = await api.login(userAcc, passAcc);
      if (user) {
        login(user);
        navigate('/');
      } else {
        setError('帳號或密碼錯誤');
      }
    } catch (err) {
      setError('登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // const testAccounts = [
  //   { title: '班級導師', name: 'pohongshih', pass: '', icon: GraduationCap, color: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300 text-indigo-700' },
  //   { title: '服務股長', name: '1141404', pass: '', icon: ShieldAlert, color: 'bg-violet-50 border-violet-100 hover:border-violet-300 text-violet-700' },
  //   { title: '內掃股長', name: '1141418', pass: '', icon: ShieldAlert, color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700' },
  //   { title: '班級學生', name: '1141401', pass: '', icon: User, color: 'bg-sky-50 border-sky-100 hover:border-sky-300 text-sky-700' },
  // ];

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden px-4 sm:px-6 lg:px-8 py-12">
      {/* Premium ambient decorative elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl shadow-slate-100/80 border border-slate-100 relative z-10"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
          >
            <Sparkles className="h-7 w-7" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            班級整潔管理系統
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            士林高商資料處理科
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                帳號
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={loading}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  placeholder="學號"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                密碼
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={loading}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  placeholder="身分證字號"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center font-medium bg-red-50 py-2 px-3 rounded-xl border border-red-100 flex items-center justify-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </motion.p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  登入系統
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        {/*
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-medium tracking-wider">快速測試登入</span>
          </div>
        </div>

        
        <div className="grid grid-cols-2 gap-3">
          {testAccounts.map((acc, index) => {
            const IconComponent = acc.icon;
            return (
              <motion.button
                key={acc.title}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickLogin(acc.name, acc.pass)}
                disabled={loading}
                className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${acc.color} disabled:opacity-50`}
              >
                <IconComponent className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-bold block">{acc.title}</span>
                <span className="text-[10px] opacity-70 mt-0.5 font-mono">{acc.name}</span>
              </motion.button>
            );
          })}
        </div>
        */}
      </motion.div>
    </div>
  );
}

