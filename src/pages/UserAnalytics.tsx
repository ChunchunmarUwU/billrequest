import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MoneyRequest } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { TrendingUp, Activity, Heart, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function UserAnalytics() {
  const { user } = useAuth();
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'requests'), where('user_id', '==', user.id));
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

        ['Emergency', 'High', 'Medium', 'Low'].forEach(level => {
          urgencyMap.set(level, { urgency: level, count: 0, total: 0 });
        });

        querySnapshot.forEach(doc => {
          const req = doc.data() as MoneyRequest;
          const amount = Number(req.amount) || 0;
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

          if (!catMap.has(req.category)) catMap.set(req.category, { name: req.category, count: 0, value: 0 });
          const catEntry = catMap.get(req.category);
          catEntry.count += 1;
          catEntry.value += amount;

          if (urgencyMap.has(req.urgency)) {
            urgencyMap.get(req.urgency).count++;
            urgencyMap.get(req.urgency).total += amount;
          }

          const date = new Date(req.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap.has(monthKey)) monthMap.set(monthKey, { month: monthKey, amount: 0 });
          monthMap.get(monthKey).amount += amount;
        });

        const categoryStats = Array.from(catMap.values());
        const monthlyStats = Array.from(monthMap.values()).sort((a,b) => a.month.localeCompare(b.month));
        const urgencyStats = Array.from(urgencyMap.values());
        
        let mostRequestedCat = categoryStats.length > 0 ? categoryStats.reduce((prev, curr) => (prev.count > curr.count) ? prev : curr).name : 'None';
        let mostExpensiveCat = categoryStats.length > 0 ? categoryStats.reduce((prev, curr) => (prev.value > curr.value) ? prev : curr).name : 'None';
        
        const allReqs = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as MoneyRequest) }));
        const recentActivity = allReqs.sort((a, b) => b.created_at - a.created_at).slice(0, 5);

        const statusPieData = [
          { name: 'Pending', value: pendingCount, color: '#f472b6' },
          { name: 'Approved', value: approvedCount, color: '#34d399' },
          { name: 'Rejected', value: rejectedCount, color: '#fb7185' }
        ].filter(d => d.value > 0);
        
        const totalReqCount = pendingCount + approvedCount + rejectedCount;
        const approvalRate = totalReqCount > 0 ? Math.round((approvedCount / totalReqCount) * 100) : 0;

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
          mostRequestedCat,
          mostExpensiveCat,
          recentActivity,
          approvalRate,
          avgRequested: totalReqCount > 0 ? totalRequested / totalReqCount : 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user]);

  const COLORS = ['#f472b6', '#c084fc', '#fb923c', '#fb7185', '#a78bfa', '#2dd4bf'];

  const getChartMax = (values: number[]) => {
    const max = Math.max(...values.map(v => Number(v) || 0), 0);
    if (max <= 0) return 10000;
  
    const padded = max * 1.2;
  
    if (padded <= 10000) return Math.ceil(padded / 1000) * 1000;
    if (padded <= 100000) return Math.ceil(padded / 10000) * 10000;
    if (padded <= 1000000) return Math.ceil(padded / 50000) * 50000;
    return Math.ceil(padded / 100000) * 100000;
  };
  
  const formatCompactMNT = (value: number) => {
    const num = Number(value) || 0;
    if (num === 0) return '0 ₮';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M ₮`;
    }
    if (num >= 1000) {
      return `${Math.round(num / 1000)}k ₮`;
    }
    return `${num} ₮`;
  };

  const urgencyChartMax = statsData ? getChartMax(statsData.urgencyStats.map((item: any) => item.total)) : 10000;
  const categoryChartMax = statsData ? getChartMax(statsData.categoryStats.map((item: any) => item.value)) : 10000;
  const monthlyChartMax = statsData ? getChartMax(statsData.monthlyStats.map((item: any) => item.amount)) : 10000;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      <div className="bg-gradient-to-tr from-pink-100 via-purple-50 to-indigo-100 border-white/50 backdrop-blur-xl rounded-[3rem] shadow-sm border overflow-hidden p-8 sm:p-10 flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-gray-800">
               My Analytics <TrendingUp className="h-6 w-6 text-pink-400" />
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-600">Track your requests, spending trends, and approvals.</p>
         </div>
      </div>

      {loadingStats ? (
        <div className="p-24 flex flex-col items-center justify-center bg-white/80 rounded-[3rem]">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />
          </motion.div>
          <p className="mt-6 text-sm font-bold tracking-widest uppercase text-gray-400">Loading numbers</p>
        </div>
      ) : (!statsData || statsData.totalRequested === 0) ? (
        <div className="p-20 text-center bg-white/80 rounded-[3rem]">
          <span className="text-gray-400 font-bold tracking-widest uppercase">No requests found yet.</span>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-indigo-100 bg-indigo-50/50 shadow-inner flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-400">My Total Requested</p>
                     <p className="mt-1 text-xl sm:text-2xl font-black text-gray-900">{Math.round(statsData.totalRequested).toLocaleString()} ₮</p>
                  </div>
                  <p className="mt-4 text-xs font-bold text-indigo-500/60">{(statsData.pendingCount + statsData.approvedCount + statsData.rejectedCount)} total requests</p>
               </div>
               <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border shadow-inner border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-500">My Total Approved</p>
                     <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700">{Math.round(statsData.totalApproved).toLocaleString()} ₮</p>
                  </div>
                  <p className="mt-4 text-xs font-bold text-emerald-600/70">{statsData.approvedCount} approved</p>
               </div>
               <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border shadow-inner border-amber-100 bg-amber-50/50 flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-500">My Total Pending</p>
                     <p className="mt-1 text-xl sm:text-2xl font-black text-amber-700">{Math.round(statsData.pendingCount > 0 ? statsData.totalRequested - statsData.totalApproved - statsData.totalRejected : 0).toLocaleString()} ₮</p>
                  </div>
                  <p className="mt-4 text-xs font-bold text-amber-600/70">{statsData.pendingCount} pending</p>
               </div>
               <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border shadow-inner border-rose-100 bg-rose-50/50 flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-rose-500">My Total Rejected</p>
                     <p className="mt-1 text-xl sm:text-2xl font-black text-rose-700">{Math.round(statsData.totalRejected).toLocaleString()} ₮</p>
                  </div>
                  <p className="mt-4 text-xs font-bold text-rose-600/70">{statsData.rejectedCount} rejected</p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">My Approval Rate</p>
                  <p className="text-xl font-black text-gray-900">{statsData.approvalRate}%</p>
               </div>
               <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">My Average Req</p>
                  <p className="text-xl font-black text-gray-900">{Math.round(statsData.avgRequested).toLocaleString()} ₮</p>
               </div>
               <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-400">Most Requested</p>
                  <p className="text-lg font-black text-indigo-900 leading-tight">{statsData.mostRequestedCat}</p>
               </div>
               <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-pink-400">Most Expensive</p>
                  <p className="text-lg font-black text-pink-900 leading-tight">{statsData.mostExpensiveCat}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-sm border border-pink-100 flex flex-col min-h-[320px]">
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">My Requests by Status</h4>
                  <div className="flex-1 h-64 filter drop-shadow-sm">
                     {statsData.statusPieData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center">
                           <span className="text-sm font-medium text-gray-500">No request data yet.</span>
                        </div>
                     ) : (
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
                        <Tooltip formatter={(value: number, name: string, props: any) => [`${value} requests`, name]} cursor={{fill: 'transparent'}} />
                        <Legend />
                     </PieChart>
                     </ResponsiveContainer>
                     )}
                  </div>
               </div>

               <div className="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-sm border border-pink-100 flex flex-col min-h-[320px]">
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">My Urgency Breakdown</h4>
                  <div className="flex-1 h-64">
                     {statsData.urgencyStats.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center">
                           <span className="text-sm font-medium text-gray-500">No request data yet.</span>
                        </div>
                     ) : (
                     <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={statsData.urgencyStats} layout="vertical" margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis 
                          type="number" 
                          domain={[0, urgencyChartMax]} 
                          tickFormatter={formatCompactMNT} 
                          tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis dataKey="urgency" type="category" width={80} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: '#fdf2f8'}} 
                          formatter={(value: number, name: string, props: any) => {
                            if (name === 'Total Amount') return [`${value.toLocaleString()} ₮`, 'Total Amount'];
                            return [value, name];
                          }}
                        />
                        <Bar dataKey="total" fill="#f472b6" radius={[0, 8, 8, 0]} name="Total Amount" />
                     </BarChart>
                     </ResponsiveContainer>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-sm border border-pink-100 flex flex-col min-h-[320px]">
               <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">My Amount by Category</h4>
               <div className="flex-1 h-72">
                  {statsData.categoryStats.length === 0 ? (
                     <div className="flex items-center justify-center h-full text-center">
                        <span className="text-sm font-medium text-gray-500">No request data yet.</span>
                     </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.categoryStats} margin={{ top: 20, right: 24, left: 32, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 700 }} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                     <YAxis 
                       domain={[0, categoryChartMax]}
                       width={80}
                       tickFormatter={formatCompactMNT} 
                       tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} 
                       axisLine={false} 
                       tickLine={false} 
                     />
                     <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ₮`, 'Amount']} cursor={{fill: '#fdf2f8'}} />
                     <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {statsData.categoryStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Bar>
                  </BarChart>
                  </ResponsiveContainer>
                  )}
               </div>
            </div>

            <div className="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-sm border border-pink-100 flex flex-col min-h-[320px]">
               <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">My Monthly Trend</h4>
               <div className="flex-1 flex flex-col justify-center h-64">
                  {statsData.monthlyStats.length <= 1 ? (
                     <div className="text-center">
                        <p className="text-gray-500 font-medium text-sm">Not enough data to show a monthly trend yet.</p>
                     </div>
                  ) : (
                     <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={statsData.monthlyStats} margin={{ top: 20, right: 24, left: 32, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis 
                          domain={[0, monthlyChartMax]}
                          width={80}
                          tickFormatter={formatCompactMNT} 
                          tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ₮`, 'Amount']} />
                        <Line type="monotone" dataKey="amount" stroke="#f472b6" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} name="Amount" />
                     </LineChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>

            {statsData.recentActivity?.length > 0 && (
               <div className="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-sm border border-pink-100">
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Recent Activity</h4>
                  <div className="space-y-3">
                     {statsData.recentActivity.map((req: any) => (
                     <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-pink-50 shadow-sm">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                           <span className="font-black text-gray-900">{req.amount.toLocaleString()} ₮</span>
                           <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{req.category} request</span>
                        </div>
                        <span className={cn(
                           "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                           req.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                           req.status === 'Rejected' ? "bg-rose-100 text-rose-700" :
                           "bg-amber-100 text-amber-700"
                        )}>
                           {req.status}
                        </span>
                     </div>
                     ))}
                  </div>
               </div>
            )}
        </div>
      )}
    </motion.div>
  );
}
