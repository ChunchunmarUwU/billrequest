import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MoneyRequest } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle, ChevronRight, Search, Heart, Sparkles, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    
    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, 'requests'),
          where('user_id', '==', user.id),
          orderBy('created_at', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const reqs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MoneyRequest[];
        setRequests(reqs);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, [user]);

  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && req.category !== categoryFilter) return false;
    return true;
  });

  const categories = ['All', ...Array.from(new Set(requests.map(r => r.category)))];

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'Approved') return <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />;
    if (status === 'Rejected') return <XCircle className="h-4 w-4 mr-1.5 text-red-500" />;
    return <Clock className="h-4 w-4 mr-1.5 text-amber-500" />;
  };

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm border";
    if (status === 'Approved') return cn(base, "bg-green-50/80 text-green-700 border-green-200");
    if (status === 'Rejected') return cn(base, "bg-red-50/80 text-red-700 border-red-200");
    return cn(base, "bg-amber-50/80 text-amber-700 border-amber-200");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Animated Greeting Card */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-tr from-pink-100 via-purple-50 to-indigo-100 rounded-[2rem] p-8 shadow-sm border border-white/50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 text-pink-200/50">
          <Heart size={140} fill="currentColor" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              Hi, {user?.username} <Sparkles className="h-6 w-6 text-pink-500" />
            </h1>
            <p className="mt-2 text-base text-gray-600 font-medium">Here are all your beautiful money requests.</p>
          </div>
          <Link
            to="/request/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <Plus className="h-4 w-4" /> Ask for Money
          </Link>
        </div>
      </motion.div>

      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-pink-100 overflow-hidden">
        <div className="p-5 border-b border-pink-50 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/50">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-2xl border-gray-200 py-2.5 pl-4 pr-10 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 bg-white font-semibold text-gray-700 shadow-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-2xl border-gray-200 py-2.5 pl-4 pr-10 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 bg-white font-semibold text-gray-700 shadow-sm"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />
            </motion.div>
            <p className="mt-6 text-sm font-bold text-gray-400 tracking-widest uppercase">Loading your requests</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-20 text-center"
          >
            <div className="w-24 h-24 bg-pink-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-pink-300 shadow-inner">
              <Search className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No requests found</h3>
            <p className="text-gray-500 font-medium">You haven't made any requests that match these filters.</p>
          </motion.div>
        ) : (
          <motion.ul 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-pink-50/50"
          >
            <AnimatePresence>
              {filteredRequests.map((req) => (
                <motion.li key={req.id} variants={itemVariants} layoutId={`req-${req.id}`}>
                  <Link to={`/request/${req.id}`} className="block hover:bg-pink-50/30 transition-colors group">
                    <div className="px-8 py-6 flex items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                          <p className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full self-start sm:self-auto">
                            {req.category}
                          </p>
                          <p className="text-2xl font-black text-gray-900 tracking-tight">
                            {req.amount.toLocaleString()} <span className="text-sm font-bold text-gray-400">₮</span>
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <p className="text-lg font-bold text-gray-800 truncate pr-4 group-hover:text-indigo-600 transition-colors">
                            {req.reason}
                          </p>
                          <div className={getStatusBadge(req.status)}>
                            <StatusIcon status={req.status} /> {req.status}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <span className="truncate pr-4 border-r border-gray-200">
                            {format(new Date(req.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className={cn(
                            "pl-4 flex items-center gap-1.5",
                            req.urgency === 'Emergency' ? "text-red-400" :
                            req.urgency === 'High' ? "text-orange-400" : "text-blue-400"
                          )}>
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              req.urgency === 'Emergency' ? "bg-red-400" :
                              req.urgency === 'High' ? "bg-orange-400" : "bg-blue-400"
                            )}></span>
                            {req.urgency} urgency
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all shadow-sm">
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}
