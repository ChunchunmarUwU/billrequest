import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { BarChart3 } from 'lucide-react';

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
        
        // ... (data fetching remains the same)
        let totalRequested = 0;
        let totalApproved = 0;
        let totalRejected = 0;
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        const catMap = new Map();
        const monthMap = new Map();

        querySnapshot.forEach(doc => {
          const req = doc.data();
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
          if (!catMap.has(req.category)) catMap.set(req.category, { count: 0, total: 0 });
          const c = catMap.get(req.category);
          c.count++;
          c.total += amount;

          // Monthly stats
          const date = new Date(req.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap.has(monthKey)) monthMap.set(monthKey, { count: 0, total: 0 });
          const m = monthMap.get(monthKey);
          m.count++;
          m.total += amount;
        });

        const categoryStats = Array.from(catMap.entries()).map(([cat, stats]) => ({ category: cat, ...stats }));
        const monthlyStats = Array.from(monthMap.entries()).map(([month, stats]) => ({ month, ...stats })).sort((a,b) => a.month.localeCompare(b.month));

        setData({
          totalRequested,
          totalApproved,
          totalRejected,
          pendingCount,
          approvedCount,
          rejectedCount,
          categoryStats,
          monthlyStats
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
    Count: s.count
  }));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-6 sm:p-8 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Analytics</h2>
          <p className="text-sm font-medium text-gray-500">Global insights and request metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="p-8 rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <dt className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Requested</dt>
          <dd className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            ${data.totalRequested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </dd>
        </div>
        <div className="p-8 rounded-[2rem] border border-emerald-100 bg-emerald-50/30 shadow-sm">
          <dt className="text-xs font-black text-emerald-600 uppercase tracking-widest">Total Approved</dt>
          <dd className="mt-2 text-3xl font-black tracking-tight text-emerald-700">
            ${data.totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </dd>
        </div>
        <div className="p-8 rounded-[2rem] border border-rose-100 bg-rose-50/30 shadow-sm">
          <dt className="text-xs font-black text-rose-600 uppercase tracking-widest">Total Rejected</dt>
          <dd className="mt-2 text-3xl font-black tracking-tight text-rose-700">
            ${data.totalRejected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </dd>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200">
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
                <RechartsTooltip cursor={{fill: 'transparent'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200">
          <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Requests by Category (Total Amount)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontWeight: 600}} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="Total" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Monthly Request Amounts</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedMonthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#6b7280', fontWeight: 700}} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontWeight: 600}} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
