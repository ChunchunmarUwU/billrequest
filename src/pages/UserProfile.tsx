import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MoneyRequest } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { User, Shield, KeyRound, Activity, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function UserProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Stats state
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const q = isAdmin 
          ? query(collection(db, 'requests')) 
          : query(collection(db, 'requests'), where('user_id', '==', user.id));
          
        const querySnapshot = await getDocs(q);
        
        let totalRequested = 0;
        let totalApproved = 0;
        let totalRejected = 0;
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        const catMap = new Map();
        const monthMap = new Map();
        const urgencyMap = new Map();

        // Initialize urgency map with all levels
        ['Emergency', 'High', 'Medium', 'Low'].forEach(level => {
          urgencyMap.set(level, { urgency: level, count: 0, total: 0 });
        });

        querySnapshot.forEach(doc => {
          const req = doc.data() as MoneyRequest;
          const amount = req.amount || 0;
          totalRequested += amount;
          
          if (req.status === 'Approved') {
            totalApproved += amount;
            approvedCount++;
          } else if (req.status === 'Rejected') {
            totalRejected += amount;
            rejectedCount++;
          } else {
            pendingCount++;
          }

          // Category stats
          if (!catMap.has(req.category)) catMap.set(req.category, { name: req.category, value: 0 });
          catMap.get(req.category).value += amount;

          // Urgency stats
          if (urgencyMap.has(req.urgency)) {
            urgencyMap.get(req.urgency).count++;
            urgencyMap.get(req.urgency).total += amount;
          }

          // Monthly stats
          const date = new Date(req.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap.has(monthKey)) monthMap.set(monthKey, { month: monthKey, amount: 0 });
          monthMap.get(monthKey).amount += amount;
        });

        const categoryStats = Array.from(catMap.values());
        const monthlyStats = Array.from(monthMap.values()).sort((a,b) => a.month.localeCompare(b.month));
        const urgencyStats = Array.from(urgencyMap.values());

        const statusPieData = [
          { name: 'Pending', value: pendingCount, color: isAdmin ? '#8b5cf6' : '#f472b6' },
          { name: 'Approved', value: approvedCount, color: isAdmin ? '#10b981' : '#34d399' },
          { name: 'Rejected', value: rejectedCount, color: isAdmin ? '#ef4444' : '#fb7185' }
        ].filter(d => d.value > 0);

        setStatsData({
          totalRequested,
          totalApproved,
          totalRejected,
          pendingCount,
          approvedCount,
          rejectedCount,
          statusPieData,
          categoryStats,
          monthlyStats,
          urgencyStats,
          avgRequested: (pendingCount + approvedCount + rejectedCount) > 0 
            ? totalRequested / (pendingCount + approvedCount + rejectedCount) 
            : 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user, isAdmin]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No authenticated user");
      }
      
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      setMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const USER_COLORS = ['#f472b6', '#c084fc', '#fb923c', '#fb7185', '#a78bfa', '#2dd4bf'];
  const ADMIN_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const COLORS = isAdmin ? ADMIN_COLORS : USER_COLORS;
  
  const containerClass = isAdmin ? "space-y-6" : "space-y-8 max-w-6xl mx-auto";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClass}
    >
      
      {/* Profile Header */}
      <motion.div 
        whileHover={!isAdmin ? { scale: 1.01 } : {}}
        className={cn(
          "rounded-[3rem] shadow-sm border overflow-hidden relative",
          isAdmin ? "bg-white border-gray-200" : "bg-gradient-to-tr from-pink-100 via-purple-50 to-indigo-100 border-white/50 backdrop-blur-xl"
        )}
      >
        {!isAdmin && (
          <div className="absolute top-0 right-0 -mr-4 -mt-4 text-pink-200/50 pointer-events-none">
            <Heart size={140} fill="currentColor" />
          </div>
        )}
        <div className="p-8 sm:p-10 flex items-center gap-8 relative z-10">
          <div className={cn(
            "h-24 w-24 rounded-[2rem] flex items-center justify-center font-black text-4xl shrink-0 shadow-inner",
            isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-white/60 text-pink-500 border-2 border-white"
          )}>
            {user?.username.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className={cn(
              "text-3xl font-black tracking-tight flex items-center gap-3",
              isAdmin ? "text-gray-900" : "text-gray-800"
            )}>
              {user?.username} {!isAdmin && <Sparkles className="h-6 w-6 text-pink-400" />}
            </h2>
            <div className="mt-3 flex items-center gap-6 text-sm font-bold">
              <span className={cn(
                "flex items-center gap-1.5 uppercase tracking-widest",
                isAdmin ? "text-gray-500" : "text-indigo-400"
              )}>
                <User className="h-4 w-4" /> Account
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-widest">
                <Shield className={cn("h-4 w-4", isAdmin ? "text-indigo-500" : "text-pink-400")} />
                <span className={isAdmin ? "text-indigo-700" : "text-pink-600"}>{user?.role}</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Statistics Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className={cn(
            "rounded-[3rem] shadow-sm border overflow-hidden backdrop-blur-xl",
            isAdmin ? "bg-white border-gray-200" : "bg-white/80 border-pink-100"
          )}>
            <div className={cn(
              "px-8 py-6 border-b flex items-center gap-3",
              isAdmin ? "border-gray-100" : "border-pink-50 bg-white/50"
            )}>
              {isAdmin ? <Activity className="h-5 w-5 text-indigo-500" /> : <TrendingUp className="h-6 w-6 text-pink-400" />}
              <h3 className={cn(
                "text-lg font-bold tracking-tight",
                isAdmin ? "text-gray-900" : "text-gray-800"
              )}>
                {isAdmin ? "Global Network Statistics" : "Your Personal Stats"}
              </h3>
            </div>
            
            {loadingStats ? (
              <div className="p-24 flex flex-col items-center justify-center">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  {isAdmin ? <Activity className="h-10 w-10 text-indigo-300" /> : <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />}
                </motion.div>
                <p className="mt-6 text-sm font-bold tracking-widest uppercase text-gray-400">Loading numbers</p>
              </div>
            ) : !statsData || statsData.totalRequested === 0 ? (
              <div className="p-20 text-center">
                <span className="text-gray-400 font-bold tracking-widest uppercase">No requests found yet.</span>
              </div>
            ) : (
              <div className="p-8 space-y-12">
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={cn("p-6 rounded-[2rem] border", isAdmin ? "border-gray-100 bg-gray-50/50" : "border-indigo-100 bg-indigo-50/50 shadow-inner")}>
                    <p className={cn("text-xs font-black uppercase tracking-widest", isAdmin ? "text-gray-500" : "text-indigo-400")}>{isAdmin ? 'Global Total' : 'Total Requested'}</p>
                    <p className={cn("mt-2 text-2xl font-black", isAdmin ? "text-gray-900" : "text-gray-900")}>${statsData.totalRequested.toLocaleString()}</p>
                    <p className={cn("mt-1 text-xs font-bold", isAdmin ? "text-gray-500" : "text-indigo-500/60")}>{(statsData.pendingCount + statsData.approvedCount + statsData.rejectedCount)} total</p>
                  </div>
                  <div className={cn("p-6 rounded-[2rem] border shadow-inner", isAdmin ? "border-green-100 bg-green-50/50" : "border-emerald-100 bg-emerald-50/50")}>
                    <p className={cn("text-xs font-black uppercase tracking-widest", isAdmin ? "text-green-600" : "text-emerald-500")}>Total Approved</p>
                    <p className={cn("mt-2 text-2xl font-black", isAdmin ? "text-green-700" : "text-emerald-700")}>${statsData.totalApproved.toLocaleString()}</p>
                    <p className={cn("mt-1 text-xs font-bold", isAdmin ? "text-green-600" : "text-emerald-600/70")}>{statsData.approvedCount} approved</p>
                  </div>
                  <div className={cn("p-6 rounded-[2rem] border shadow-inner", isAdmin ? "border-red-100 bg-red-50/50" : "border-rose-100 bg-rose-50/50")}>
                    <p className={cn("text-xs font-black uppercase tracking-widest", isAdmin ? "text-red-600" : "text-rose-500")}>Total Rejected</p>
                    <p className={cn("mt-2 text-2xl font-black", isAdmin ? "text-red-700" : "text-rose-700")}>${statsData.totalRejected.toLocaleString()}</p>
                    <p className={cn("mt-1 text-xs font-bold", isAdmin ? "text-red-600" : "text-rose-600/70")}>{statsData.rejectedCount} rejected</p>
                  </div>
                  <div className={cn("p-6 rounded-[2rem] border shadow-inner", isAdmin ? "border-amber-100 bg-amber-50/50" : "border-pink-100 bg-pink-50/50")}>
                    <p className={cn("text-xs font-black uppercase tracking-widest", isAdmin ? "text-amber-600" : "text-pink-500")}>Average Request</p>
                    <p className={cn("mt-2 text-2xl font-black", isAdmin ? "text-amber-700" : "text-pink-700")}>${Math.round(statsData.avgRequested).toLocaleString()}</p>
                    <p className={cn("mt-1 text-xs font-bold", isAdmin ? "text-amber-600" : "text-pink-600/70")}>{statsData.pendingCount} pending</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Status Chart */}
                  <div className="h-64 flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Requests by Status</h4>
                    <div className="flex-1 filter drop-shadow-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statsData.statusPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {statsData.statusPieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [value, 'Count']} cursor={{fill: 'transparent'}} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Urgency Chart */}
                  <div className="h-64 flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Requests by Urgency</h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.urgencyStats} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="urgency" type="category" width={80} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: isAdmin ? '#f1f5f9' : '#fdf2f8'}} />
                          <Bar dataKey="count" fill={isAdmin ? '#8b5cf6' : '#f472b6'} radius={[0, 8, 8, 0]} name="Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Category & Monthly */}
                <div className="grid grid-cols-1 gap-12">
                  <div className="h-72 flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Amount by Category</h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.categoryStats} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 700 }} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} cursor={{fill: isAdmin ? '#f1f5f9' : '#fdf2f8'}} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {statsData.categoryStats.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="h-72 flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Monthly Request Totals</h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statsData.monthlyStats} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                          <Line type="monotone" dataKey="amount" stroke={isAdmin ? '#6366f1' : '#f472b6'} strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} name="Amount" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="lg:col-span-1 space-y-8">
          <div className={cn(
            "rounded-[3rem] shadow-sm border overflow-hidden backdrop-blur-xl",
            isAdmin ? "bg-white border-gray-200" : "bg-white/80 border-pink-100"
          )}>
            <div className={cn(
              "px-8 py-6 border-b flex items-center gap-3",
              isAdmin ? "border-gray-100" : "border-pink-50 bg-white/50"
            )}>
              <KeyRound className={cn("h-5 w-5", isAdmin ? "text-gray-500" : "text-pink-400")} />
              <h3 className={cn("text-lg font-bold tracking-tight", isAdmin ? "text-gray-900" : "text-gray-800")}>Change Password</h3>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
              {message && (
                <div className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700 border border-green-200 shadow-sm">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 border border-red-200 shadow-sm">
                  {error}
                </div>
              )}

              <div className="group">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-pink-500 transition-colors">Current Password</label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-pink-500 transition-colors">New Password</label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-pink-500 transition-colors">Confirm New Password</label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
                />
              </div>

              <div className="pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full flex justify-center rounded-2xl px-6 py-4 text-base font-black text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all",
                    isAdmin ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 hover:shadow-xl" : "bg-gradient-to-r from-pink-500 to-indigo-500 hover:opacity-90 focus:ring-pink-400 hover:shadow-xl hover:-translate-y-0.5"
                  )}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
