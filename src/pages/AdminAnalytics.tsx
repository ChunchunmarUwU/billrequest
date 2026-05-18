import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { BarChart3, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalytics = async () => {
      try {
        const q = query(collection(db, 'requests'));
        const querySnapshot = await getDocs(q);
        
        let totalRequested = 0;
        let totalApproved = 0;
        let totalRejected = 0;
        let totalPending = 0;
        
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        let highUrgencyPending = 0;
        let emergencyPending = 0;
        let oldestPendingTime = Infinity;
        
        const catMap = new Map();
        const monthMap = new Map();
        const urgencyStats = new Map();
        const financialStats = new Map();
        const fAmounts = new Map();

        querySnapshot.forEach(doc => {
          const req = doc.data();
          const amount = Number(req.amount) || 0;
          totalRequested += amount;
          
          if (req.status === 'Approved') {
            totalApproved += amount;
            approvedCount++;
          } else if (req.status === 'Rejected') {
            totalRejected += amount;
            rejectedCount++;
          } else {
            totalPending += amount;
            pendingCount++;
            if (req.created_at < oldestPendingTime) oldestPendingTime = req.created_at;
            if (req.urgency === 'High') highUrgencyPending++;
            if (req.urgency === 'Emergency') emergencyPending++;
          }

          // Category stats
          if (!catMap.has(req.category)) catMap.set(req.category, { count: 0, total: 0, approved: 0, rejected: 0, pending: 0 });
          const c = catMap.get(req.category);
          c.count++;
          c.total += amount;
          if (req.status === 'Approved') c.approved++;
          else if (req.status === 'Rejected') c.rejected++;
          else c.pending++;

          // Monthly stats
          const date = new Date(req.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap.has(monthKey)) monthMap.set(monthKey, { count: 0, total: 0 });
          const m = monthMap.get(monthKey);
          m.count++;
          m.total += amount;
          
          // Urgency stats
          if (!urgencyStats.has(req.urgency)) urgencyStats.set(req.urgency, { count: 0, total: 0 });
          const u = urgencyStats.get(req.urgency);
          u.count++;
          u.total += amount;

          // Financial stats
          const fState = req.adminFinancialStateAtSubmission || 'Unknown';
          if (!financialStats.has(fState)) financialStats.set(fState, { count: 0, total: 0, approved: 0, state: fState });
          const f = financialStats.get(fState);
          f.count++;
          f.total += amount;
          if (req.status === 'Approved') f.approved++;

          if (!fAmounts.has(fState)) fAmounts.set(fState, []);
          fAmounts.get(fState).push(amount);
        });

        const categoryStatsArray = Array.from(catMap.entries()).map(([cat, stats]) => ({ category: cat, ...stats }));
        const monthlyStatsArray = Array.from(monthMap.entries()).map(([month, stats]) => ({ month, ...stats })).sort((a,b) => a.month.localeCompare(b.month));
        const urgencyStatsArray = Array.from(urgencyStats.entries()).map(([urgency, stats]) => ({ urgency, ...stats }));
        
        let mostExpensiveCat = categoryStatsArray.length > 0 ? categoryStatsArray.reduce((prev, curr) => (prev.total > curr.total) ? prev : curr).category : 'None';
        let mostCommonCat = categoryStatsArray.length > 0 ? categoryStatsArray.reduce((prev, curr) => (prev.count > curr.count) ? prev : curr).category : 'None';
        const totalRequests = approvedCount + rejectedCount + pendingCount;
        const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;
        const avgAmount = totalRequests > 0 ? Math.round(totalRequested / totalRequests) : 0;

        // Sensitivity math
        const calculateMedian = (arr: number[]) => {
          if (!arr || arr.length === 0) return 0;
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const fGood = financialStats.get('GOOD');
        const fOkay = financialStats.get('Okay');
        const fBad = financialStats.get('Bad');

        const sensitivityData = {
           GOOD: fGood ? { count: fGood.count, avg: fGood.total / fGood.count, median: calculateMedian(fAmounts.get('GOOD')) } : { count: 0, avg: 0, median: 0 },
           Okay: fOkay ? { count: fOkay.count, avg: fOkay.total / fOkay.count, median: calculateMedian(fAmounts.get('Okay')) } : { count: 0, avg: 0, median: 0 },
           Bad: fBad ? { count: fBad.count, avg: fBad.total / fBad.count, median: calculateMedian(fAmounts.get('Bad')) } : { count: 0, avg: 0, median: 0 }
        };

        let sensitivityScore = null;
        let okaySensitivityScore = null;
        if (sensitivityData.GOOD.count >= 2 && sensitivityData.Bad.count >= 2) {
           sensitivityScore = Math.round((1 - (sensitivityData.Bad.avg / sensitivityData.GOOD.avg)) * 100);
        }
        if (sensitivityData.GOOD.count >= 2 && sensitivityData.Okay.count >= 2) {
           okaySensitivityScore = Math.round((1 - (sensitivityData.Okay.avg / sensitivityData.GOOD.avg)) * 100);
        }

        const financialStatsArray = [
           fGood || null,
           fOkay || null,
           fBad || null
        ].filter(Boolean).map(s => {
           return {
              state: s.state,
              total: s.total,
              count: s.count,
              approved: s.approved,
              avg: Math.round(s.total / s.count)
           }
        });

        setData({
          totalRequested, totalApproved, totalRejected, totalPending,
          pendingCount, approvedCount, rejectedCount, totalRequests,
          highUrgencyPending, emergencyPending, 
          oldestPendingTime: oldestPendingTime === Infinity ? null : oldestPendingTime,
          categoryStats: categoryStatsArray,
          monthlyStats: monthlyStatsArray,
          urgencyStats: urgencyStatsArray,
          financialStats: financialStatsArray,
          sensitivityData,
          sensitivityScore,
          okaySensitivityScore,
          mostExpensiveCat, mostCommonCat,
          approvalRate, avgAmount
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-24 text-gray-500 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 max-w-6xl mx-auto">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100/50 border-t-indigo-500 mb-6 drop-shadow-sm" />
      <span className="font-bold uppercase tracking-widest text-[10px]">Loading analytics...</span>
    </div>
  );
  if (!data) return null;

  const statusData = [
    { name: 'Pending', value: data.pendingCount },
    { name: 'Approved', value: data.approvedCount },
    { name: 'Rejected', value: data.rejectedCount },
  ];
  const COLORS = ['#8b5cf6', '#10b981', '#ef4444'];

  const formattedMonthly = data.monthlyStats.map((s: any) => ({
    name: s.month,
    Total: s.total,
    Count: s.count
  }));

  const formattedCategory = data.categoryStats.map((s: any) => ({
    name: s.category,
    Total: s.total,
    Count: s.count,
    approved: s.approved,
    pending: s.pending,
    rejected: s.rejected
  }));

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

  const financialChartMax = getChartMax(data.financialStats.map((item: any) => item.avg));
  const categoryChartMax = getChartMax(formattedCategory.map((item: any) => item.Total));
  const monthlyChartMax = getChartMax(formattedMonthly.map((item: any) => item.Total));
  const urgencyChartMax = getChartMax(data.urgencyStats.map((item: any) => item.total));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-sans relative">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gray-800">Analytics</h2>
            <p className="text-sm font-bold text-gray-500 mt-1">Global insights and metrics.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 xl:justify-end shrink-0 relative z-10">
          <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm min-w-[120px]">
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Approval Rate</p>
             <p className="text-xl font-black text-gray-800 tracking-tight">{data.approvalRate}%</p>
          </div>
          <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm min-w-[120px]">
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Request</p>
             <p className="text-xl font-black text-gray-800 tracking-tight">{data.avgAmount.toLocaleString()} ₮</p>
          </div>
          <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm min-w-[120px]">
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Requests</p>
             <p className="text-xl font-black text-gray-800 tracking-tight">{data.totalRequests}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-[2rem] border border-gray-100 bg-white shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <dt className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Requested</dt>
            <dd className="text-2xl sm:text-3xl font-black tracking-tight text-gray-800">
              {Math.round(data.totalRequested).toLocaleString()} <span className="text-sm text-gray-400 font-bold">₮</span>
            </dd>
          </div>
        </div>
        <div className="p-6 rounded-[2rem] border border-emerald-100 bg-emerald-50 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">Total Approved</dt>
            <dd className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700">
              {Math.round(data.totalApproved).toLocaleString()} <span className="text-sm text-emerald-400 font-bold">₮</span>
            </dd>
          </div>
          <p className="text-xs font-bold text-emerald-500 mt-4 bg-emerald-100/50 w-fit px-2 py-1 rounded-md">{data.approvedCount} approved</p>
        </div>
        <div className="p-6 rounded-[2rem] border border-amber-100 bg-amber-50 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-amber-500 uppercase tracking-widest mb-2">Total Pending</dt>
            <dd className="text-2xl sm:text-3xl font-black tracking-tight text-amber-700">
              {Math.round(data.totalPending).toLocaleString()} <span className="text-sm text-amber-400 font-bold">₮</span>
            </dd>
          </div>
          <p className="text-xs font-bold text-amber-500 mt-4 bg-amber-100/50 w-fit px-2 py-1 rounded-md">{data.pendingCount} pending</p>
        </div>
        <div className="p-6 rounded-[2rem] border border-rose-100 bg-rose-50 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-rose-500 uppercase tracking-widest mb-2">Total Rejected</dt>
            <dd className="text-2xl sm:text-3xl font-black tracking-tight text-rose-700">
              {Math.round(data.totalRejected).toLocaleString()} <span className="text-sm text-rose-400 font-bold">₮</span>
            </dd>
          </div>
          <p className="text-xs font-bold text-rose-500 mt-4 bg-rose-100/50 w-fit px-2 py-1 rounded-md">{data.rejectedCount} rejected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-sky-50 border border-sky-100 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-2">Most Expensive Category</h3>
            <p className="text-3xl font-black text-sky-900">{data.mostExpensiveCat}</p>
          </div>
          <TrendingUp className="absolute right-[-2rem] bottom-[-2rem] w-40 h-40 text-sky-100 pointer-events-none" />
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Most Common Category</h3>
            <p className="text-3xl font-black text-amber-900">{data.mostCommonCat}</p>
          </div>
          <BarChart3 className="absolute right-[-2rem] bottom-[-2rem] w-40 h-40 text-amber-100 pointer-events-none" />
        </div>
      </div>

      {data.pendingCount > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 px-8 py-5 border-b border-amber-100 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 drop-shadow-sm" />
            <h3 className="text-lg font-black text-amber-900 tracking-tight">Needs Attention</h3>
          </div>
          <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">High Urgency</p>
              <p className="text-2xl font-black text-gray-800">{data.highUrgencyPending}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Emergency</p>
              <p className="text-2xl font-black text-rose-600">{data.emergencyPending}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Oldest Pending</p>
              <p className="text-lg font-black text-gray-800">
                {data.oldestPendingTime ? formatDistanceToNow(data.oldestPendingTime, { addSuffix: true }) : 'N/A'}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-center md:justify-end">
              <Link to="/admin" className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 py-3.5 rounded-2xl font-bold transition-all w-full md:w-auto justify-center shadow-sm">
                Review Requests <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* User Sensitivity Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
         <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between relative z-10">
            <div>
               <h3 className="text-xl font-black text-gray-800 tracking-tight">Financial Empathy</h3>
               <p className="text-sm font-bold text-gray-500 mt-1">Do users ask for less when finances are tight?</p>
            </div>
         </div>
         <div className="p-8 relative z-10">
            {data.sensitivityScore === null ? (
               <div className="text-center py-12 border border-dashed border-gray-200 rounded-[2rem] bg-gray-50">
                  <p className="text-gray-500 font-bold h-fit">Insufficient data.</p>
                  <p className="text-xs text-gray-400 mt-2">Requires at least 2 requests in Good and Bad states.</p>
               </div>
            ) : (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
                     <div className="p-6 rounded-[2rem] border border-teal-200 bg-teal-50 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] sm:text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">Empathy Score</p>
                        <p className="text-3xl font-black text-teal-800">{data.sensitivityScore}%</p>
                        <p className="text-[10px] text-teal-600/70 mt-2 font-bold uppercase tracking-wider leading-relaxed">
                           Demands decrease by {data.sensitivityScore}% during low funds.
                        </p>
                     </div>
                     <div className="p-6 rounded-[2rem] border border-gray-100 bg-white shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Funds are Good</p>
                        <p className="text-xl font-black text-gray-800 truncate">{Math.round(data.sensitivityData.GOOD.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-bold text-gray-500 mt-0.5">{Math.round(data.sensitivityData.GOOD.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-emerald-700 font-bold mt-3 bg-emerald-50 w-fit px-2 py-1 rounded-md">{data.sensitivityData.GOOD.count} requests</p>
                     </div>
                     <div className="p-6 rounded-[2rem] border border-gray-100 bg-white shadow-sm">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Funds are Okay</p>
                        <p className="text-xl font-black text-gray-800 truncate">{Math.round(data.sensitivityData.Okay.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-bold text-gray-500 mt-0.5">{Math.round(data.sensitivityData.Okay.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-amber-700 font-bold mt-3 bg-amber-50 w-fit px-2 py-1 rounded-md">{data.sensitivityData.Okay.count} requests</p>
                     </div>
                     <div className="p-6 rounded-[2rem] border border-gray-100 bg-white shadow-sm">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Funds are Low</p>
                        <p className="text-xl font-black text-gray-800 truncate">{Math.round(data.sensitivityData.Bad.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-bold text-gray-500 mt-0.5">{Math.round(data.sensitivityData.Bad.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-rose-700 font-bold mt-3 bg-rose-50 w-fit px-2 py-1 rounded-md">{data.sensitivityData.Bad.count} requests</p>
                     </div>
                  </div>

                  <div className="h-72 mt-10">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.financialStats} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="state" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b', fontWeight: 800}} />
                           <YAxis 
                             domain={[0, financialChartMax]}
                             width={80}
                             fontSize={11} 
                             tickLine={false} 
                             axisLine={false} 
                             tick={{fill: '#94a3b8', fontWeight: 700}} 
                             tickFormatter={formatCompactMNT} 
                           />
                           <RechartsTooltip 
                           cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                           content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                 const d = payload[0].payload;
                                 return (
                                 <div className="bg-white p-4 border border-gray-100 shadow-lg rounded-3xl">
                                    <p className="font-black text-gray-800 mb-1 tracking-tight">State: {d.state}</p>
                                    <p className="text-indigo-500 font-black text-xl">{d.avg.toLocaleString()} ₮ <span className="text-xs text-gray-400">Avg</span></p>
                                    <div className="text-[10px] font-bold text-gray-500 mt-3 space-y-1 uppercase tracking-widest">
                                       <p>Total requests: {d.count}</p>
                                       <p>Total cost: {d.total.toLocaleString()} ₮</p>
                                    </div>
                                 </div>
                                 );
                              }
                              return null;
                           }}
                           />
                           <Bar dataKey="avg" fill="url(#cyanGradient)" radius={[12, 12, 0, 0]} name="Average Request Amount" />
                           <defs>
                             <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                               <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                             </linearGradient>
                           </defs>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">Statuses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  cursor={{fill: 'transparent'}} 
                  formatter={(value, name, props) => [
                    `${value} requests`, 
                    name
                  ]} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#78716c' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">Cost by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedCategory} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#78716c', fontWeight: 800}} />
                <YAxis 
                  domain={[0, categoryChartMax]}
                  width={80}
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#a8a29e', fontWeight: 700}} 
                  tickFormatter={formatCompactMNT} 
                />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border border-gray-100 shadow-lg rounded-3xl">
                          <p className="font-black text-gray-800 mb-1 tracking-tight">{data.name}</p>
                          <p className="text-indigo-500 font-black text-xl">{data.Total.toLocaleString()} ₮</p>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-3 space-y-1">
                            <p>Requests: {data.Count}</p>
                            <p className="text-emerald-500">Approved: {data.approved}</p>
                            <p className="text-amber-500">Pending: {data.pending}</p>
                            <p className="text-rose-500">Rejected: {data.rejected}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Total" fill="url(#indigoGradient)" radius={[12, 12, 0, 0]} />
                <defs>
                   <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8}/>
                   </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-2">
           <h3 className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">Monthly Trends</h3>
           <div className="h-72 flex flex-col justify-center">
             {formattedMonthly.length <= 1 ? (
               <div className="text-center py-10 border border-dashed border-gray-200 rounded-[2rem] bg-gray-50">
                 <p className="text-gray-500 font-bold">Not enough history.</p>
                 <p className="text-xs text-gray-400 mt-2">More time needed to show trends.</p>
               </div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={formattedMonthly} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                   <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#78716c', fontWeight: 800}} />
                   <YAxis 
                     domain={[0, monthlyChartMax]}
                     width={80}
                     fontSize={11} 
                     tickLine={false} 
                     axisLine={false} 
                     tick={{fill: '#a8a29e', fontWeight: 700}} 
                     tickFormatter={formatCompactMNT} 
                   />
                   <RechartsTooltip 
                     contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     itemStyle={{ fontWeight: 'bold' }}
                     formatter={(val: number) => [`${val.toLocaleString()} ₮`, 'Cost']} 
                   />
                   <Line type="monotone" dataKey="Total" stroke="#14b8a6" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, fill: '#14b8a6', stroke: '#fff', strokeWidth: 3 }} />
                 </LineChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">Urgency Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.urgencyStats} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="urgency" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#78716c', fontWeight: 800}} />
                <YAxis 
                  domain={[0, urgencyChartMax]}
                  width={80}
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#a8a29e', fontWeight: 700}} 
                  tickFormatter={formatCompactMNT} 
                />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border border-gray-100 shadow-lg rounded-3xl">
                          <p className="font-black text-gray-800 mb-1 tracking-tight">Urgency: {d.urgency}</p>
                          <p className="text-rose-500 font-black text-xl">{d.total.toLocaleString()} ₮</p>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mt-2">{d.count} requests</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" fill="url(#roseGradient)" radius={[12, 12, 0, 0]} />
                <defs>
                   <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.8}/>
                   </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
