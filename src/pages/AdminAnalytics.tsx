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
    <div className="flex flex-col items-center justify-center p-24 text-gray-500 bg-white rounded-[2rem] shadow-sm border border-gray-100 max-w-6xl mx-auto">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 mb-6" />
      <span className="font-bold uppercase tracking-widest text-xs">Loading analytics...</span>
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Analytics</h2>
            <p className="text-sm font-medium text-gray-500">Global insights and request metrics.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 xl:justify-end shrink-0">
          <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-w-[120px]">
             <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Approval Rate</p>
             <p className="text-lg font-black text-gray-900">{data.approvalRate}%</p>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-w-[120px]">
             <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Avg Request</p>
             <p className="text-lg font-black text-gray-900">{data.avgAmount.toLocaleString()} ₮</p>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-w-[120px]">
             <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Total Requests</p>
             <p className="text-lg font-black text-gray-900">{data.totalRequests}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Requested</dt>
            <dd className="text-xl sm:text-3xl font-black tracking-tight text-gray-900">
              {Math.round(data.totalRequested).toLocaleString()} <span className="text-[10px] sm:text-sm text-gray-400">₮</span>
            </dd>
          </div>
        </div>
        <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-emerald-100 bg-emerald-50/50 shadow-sm flex flex-col justify-between">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Approved</dt>
            <dd className="text-xl sm:text-3xl font-black tracking-tight text-emerald-700">
              {Math.round(data.totalApproved).toLocaleString()} <span className="text-[10px] sm:text-sm text-emerald-500">₮</span>
            </dd>
          </div>
          <p className="text-[10px] sm:text-sm font-bold text-emerald-600 mt-4">{data.approvedCount} approved</p>
        </div>
        <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-amber-100 bg-amber-50/50 shadow-sm flex flex-col justify-between">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-amber-600/70 uppercase tracking-widest mb-1">Total Pending</dt>
            <dd className="text-xl sm:text-3xl font-black tracking-tight text-amber-700">
              {Math.round(data.totalPending).toLocaleString()} <span className="text-[10px] sm:text-sm text-amber-500">₮</span>
            </dd>
          </div>
          <p className="text-[10px] sm:text-sm font-bold text-amber-600 mt-4">{data.pendingCount} pending</p>
        </div>
        <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-rose-100 bg-rose-50/50 shadow-sm flex flex-col justify-between">
          <div>
            <dt className="text-[10px] sm:text-xs font-black text-rose-600/70 uppercase tracking-widest mb-1">Total Rejected</dt>
            <dd className="text-xl sm:text-3xl font-black tracking-tight text-rose-700">
              {Math.round(data.totalRejected).toLocaleString()} <span className="text-[10px] sm:text-sm text-rose-500">₮</span>
            </dd>
          </div>
          <p className="text-[10px] sm:text-sm font-bold text-rose-600 mt-4">{data.rejectedCount} rejected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-xs sm:text-sm font-black text-indigo-400 uppercase tracking-widest mb-2">Most Expensive Category</h3>
            <p className="text-2xl sm:text-3xl font-black text-indigo-900">{data.mostExpensiveCat}</p>
          </div>
          <TrendingUp className="absolute right-[-2rem] bottom-[-2rem] w-32 h-32 text-indigo-100 opacity-50" />
        </div>
        <div className="bg-pink-50 border border-pink-100 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-xs sm:text-sm font-black text-pink-400 uppercase tracking-widest mb-2">Most Common Category</h3>
            <p className="text-2xl sm:text-3xl font-black text-pink-900">{data.mostCommonCat}</p>
          </div>
          <BarChart3 className="absolute right-[-2rem] bottom-[-2rem] w-32 h-32 text-pink-100 opacity-50" />
        </div>
      </div>

      {data.pendingCount > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-black text-orange-900">Needs Attention</h3>
          </div>
          <div className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">High Urgency</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900">{data.highUrgencyPending}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Emergency</p>
              <p className="text-xl sm:text-2xl font-black text-red-600">{data.emergencyPending}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Oldest Pending</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">
                {data.oldestPendingTime ? formatDistanceToNow(data.oldestPendingTime, { addSuffix: true }) : 'N/A'}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-center md:justify-end">
              <Link to="/admin" className="inline-flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 px-6 py-3 rounded-xl font-bold transition-colors w-full md:w-auto justify-center">
                Review Requests <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* User Sensitivity Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden">
         <div className="px-6 py-6 sm:px-8 border-b border-gray-100 flex items-center justify-between">
            <div>
               <h3 className="text-lg font-black text-gray-900">User Sensitivity to Financial State</h3>
               <p className="text-sm font-medium text-gray-500 mt-1">Do users ask for less when the network's financial state is Bad?</p>
            </div>
         </div>
         <div className="p-6 sm:p-8">
            {data.sensitivityScore === null ? (
               <div className="text-center py-10">
                  <p className="text-gray-500 font-medium h-fit">Not enough data to measure sensitivity yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Both "GOOD" and "Bad" states require at least 2 requests to appear.</p>
               </div>
            ) : (
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="p-6 rounded-[1.5rem] border border-cyan-100 bg-cyan-50/50 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] sm:text-xs font-black text-cyan-600 uppercase tracking-widest mb-1">Sensitivity Score</p>
                        <p className="text-2xl sm:text-3xl font-black text-cyan-900">{data.sensitivityScore}%</p>
                        <p className="text-xs text-cyan-600/70 mt-2 font-medium">
                           Request behavior appears to decrease by {data.sensitivityScore}% when financial state is Bad.
                        </p>
                     </div>
                     <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">When GOOD</p>
                        <p className="text-lg font-black text-gray-900">{Math.round(data.sensitivityData.GOOD.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-black text-gray-500">{Math.round(data.sensitivityData.GOOD.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-gray-400 font-bold mt-2">{data.sensitivityData.GOOD.count} requests</p>
                     </div>
                     <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">When Okay</p>
                        <p className="text-lg font-black text-gray-900">{Math.round(data.sensitivityData.Okay.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-black text-gray-500">{Math.round(data.sensitivityData.Okay.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-gray-400 font-bold mt-2">{data.sensitivityData.Okay.count} requests</p>
                     </div>
                     <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                        <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">When Bad</p>
                        <p className="text-lg font-black text-gray-900">{Math.round(data.sensitivityData.Bad.avg).toLocaleString()} ₮ <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Avg</span></p>
                        <p className="text-sm font-black text-gray-500">{Math.round(data.sensitivityData.Bad.median).toLocaleString()} ₮ <span className="text-[10px] text-gray-400">Med.</span></p>
                        <p className="text-[10px] text-gray-400 font-bold mt-2">{data.sensitivityData.Bad.count} requests</p>
                     </div>
                  </div>

                  <div className="h-64 mt-8">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.financialStats} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <XAxis dataKey="state" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} />
                           <YAxis 
                             domain={[0, financialChartMax]}
                             width={80}
                             fontSize={11} 
                             tickLine={false} 
                             axisLine={false} 
                             tick={{fill: '#9ca3af', fontWeight: 600}} 
                             tickFormatter={formatCompactMNT} 
                           />
                           <RechartsTooltip 
                           cursor={{ fill: '#f1f5f9' }} 
                           content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                 const d = payload[0].payload;
                                 return (
                                 <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl">
                                    <p className="font-bold text-gray-900 mb-1">State: {d.state}</p>
                                    <p className="text-cyan-600 font-black text-lg">{d.avg.toLocaleString()} ₮ (Avg)</p>
                                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                                       <p>Total requests: {d.count}</p>
                                       <p>Total amount: {d.total.toLocaleString()} ₮</p>
                                    </div>
                                 </div>
                                 );
                              }
                              return null;
                           }}
                           />
                           <Bar dataKey="avg" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Average Request Amount" />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-200">
          <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Request Statuses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-200">
          <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Category Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedCategory} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} />
                <YAxis 
                  domain={[0, categoryChartMax]}
                  width={80}
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#9ca3af', fontWeight: 600}} 
                  tickFormatter={formatCompactMNT} 
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl">
                          <p className="font-bold text-gray-900 mb-1">{data.name}</p>
                          <p className="text-indigo-600 font-black text-lg">{data.Total.toLocaleString()} ₮</p>
                          <div className="text-xs text-gray-500 mt-2 space-y-1">
                            <p>Total requests: {data.Count}</p>
                            <p className="text-emerald-600">Approved: {data.approved}</p>
                            <p className="text-amber-600">Pending: {data.pending}</p>
                            <p className="text-rose-600">Rejected: {data.rejected}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Total" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-200 lg:col-span-2">
           <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Monthly Trend</h3>
           <div className="h-72 flex flex-col justify-center">
             {formattedMonthly.length <= 1 ? (
               <div className="text-center">
                 <p className="text-gray-500 font-medium">Not enough monthly data to show a trend yet.</p>
                 <p className="text-sm text-gray-400 mt-1">Keep using the app to see your history!</p>
               </div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={formattedMonthly} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                   <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} />
                   <YAxis 
                     domain={[0, monthlyChartMax]}
                     width={80}
                     fontSize={11} 
                     tickLine={false} 
                     axisLine={false} 
                     tick={{fill: '#9ca3af', fontWeight: 600}} 
                     tickFormatter={formatCompactMNT} 
                   />
                   <RechartsTooltip formatter={(val: number) => [`${val.toLocaleString()} ₮`, 'Total Requested']} />
                   <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />
                 </LineChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Urgency Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.urgencyStats} margin={{top: 20, right: 24, left: 32, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="urgency" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} />
                <YAxis 
                  domain={[0, urgencyChartMax]}
                  width={80}
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#9ca3af', fontWeight: 600}} 
                  tickFormatter={formatCompactMNT} 
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl">
                          <p className="font-bold text-gray-900 mb-1">Urgency: {d.urgency}</p>
                          <p className="text-indigo-600 font-black text-lg">{d.total.toLocaleString()} ₮</p>
                          <p className="text-xs text-gray-500 mt-1">{d.count} requests</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
