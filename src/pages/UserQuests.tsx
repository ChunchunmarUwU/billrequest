import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Quest, PrincessPoints, PointHistory } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Target, Crown, History, Gift, Check, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function UserQuests() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [points, setPoints] = useState<PrincessPoints | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'quests' | 'history'>('quests');
  const [statusFilter, setStatusFilter] = useState('Active');
  
  const [submitModal, setSubmitModal] = useState<{ open: boolean; quest: Quest | null }>({ open: false, quest: null });
  const [proofText, setProofText] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // 1. Quests (Active, Submitted, Completed, Rejected) - all of them
      const qQuery = query(collection(db, 'quests'), orderBy('createdAt', 'desc'));
      const qSnap = await getDocs(qQuery);
      setQuests(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest)));

      // 2. Princess Points
      const pDoc = await getDoc(doc(db, 'princessPoints', user!.id));
      if (pDoc.exists()) {
        setPoints({ ...pDoc.data(), id: pDoc.id } as PrincessPoints);
      } else {
        setPoints({ id: user!.id, userId: user!.id, balance: 0, totalEarned: 0, totalSpent: 0, updatedAt: Date.now() });
      }

      // 3. History
      const hQuery = query(collection(db, 'pointHistory'), where('userId', '==', user!.id), orderBy('createdAt', 'desc'));
      const hSnap = await getDocs(hQuery);
      setHistory(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointHistory)));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModal.quest || !user) return;
    
    try {
      await updateDoc(doc(db, 'quests', submitModal.quest.id), {
        status: 'Submitted',
        proofText,
        submittedAt: Date.now(),
        updatedAt: Date.now()
      });
      setSubmitModal({ open: false, quest: null });
      setProofText('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredQuests = useMemo(() => {
    if (statusFilter === 'All') return quests;
    return quests.filter(q => q.status === statusFilter);
  }, [quests, statusFilter]);

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'Easy': return 'text-green-500 bg-green-50 border-green-200';
      case 'Medium': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'Hard': return 'text-red-500 bg-red-50 border-red-200';
      case 'Extreme': return 'text-purple-500 bg-purple-50 border-purple-200';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
     switch(status) {
       case 'Active': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
       case 'Submitted': return 'bg-amber-100 text-amber-700 border-amber-200';
       case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
       case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
       default: return 'bg-gray-100 text-gray-700';
     }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 opacity-10 -mr-10 -mt-10">
          <Target size={180} />
        </div>
        <div className="z-10 w-full flex flex-col sm:flex-row justify-between items-center sm:items-start">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <h1 className="text-3xl font-black text-indigo-900 tracking-tight flex items-center justify-center sm:justify-start gap-2">
              Quests & Points <Crown className="h-6 w-6 text-purple-500" />
            </h1>
            <p className="text-indigo-600 font-medium mt-1">Complete quests, earn points, get rewards! 💖</p>
          </div>
          {points && (
             <div className="bg-white/80 px-8 py-4 rounded-3xl flex flex-col items-center justify-center border border-indigo-100 shadow-sm mr-0 sm:mr-4">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Current Balance</p>
                <div className="flex items-center gap-2">
                  <Crown className="h-7 w-7 text-purple-500" />
                  <p className="text-4xl font-black text-gray-900 leading-tight">{points.balance.toLocaleString()}</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-gray-100 shadow-sm mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('quests')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'quests' ? "bg-indigo-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          )}
        >
          <Target className="h-4 w-4" /> Quests
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'history' ? "bg-indigo-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          )}
        >
          <History className="h-4 w-4" /> History
        </button>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : activeTab === 'quests' ? (
        <>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
             {['Active', 'Submitted', 'Completed', 'Rejected', 'All'].map(s => (
               <button 
                 key={s} 
                 onClick={() => setStatusFilter(s)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-sm font-bold transition-all border whitespace-nowrap",
                   statusFilter === s ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                 )}
               >
                 {s}
               </button>
             ))}
          </div>

          {filteredQuests.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-16 text-center shadow-sm border border-gray-100">
              <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
                <Target className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">No quests found</h3>
              <p className="text-gray-500 mt-2">Check back later for new missions! ✨</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <AnimatePresence>
                 {filteredQuests.map(q => (
                   <motion.div
                     key={q.id}
                     layout
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col group overflow-hidden relative"
                   >
                     {q.status === 'Completed' && (
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                     )}
                     
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex gap-2 items-center flex-wrap">
                         <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", getStatusBadge(q.status))}>
                           {q.status}
                         </span>
                         <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", getDifficultyColor(q.difficulty))}>
                           {q.difficulty}
                         </span>
                       </div>
                       <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl font-black shadow-sm">
                         <Crown className="h-4 w-4" /> +{q.pointReward}
                       </div>
                     </div>
                     
                     <h3 className="text-lg font-bold text-gray-800 leading-tight mb-2">{q.title}</h3>
                     <p className="text-sm text-gray-500 mb-4">{q.description}</p>
                     
                     {q.status === 'Rejected' && q.adminComment && (
                       <div className="mt-2 mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 italic">
                         <span className="font-bold not-italic block mb-1 uppercase tracking-wider text-[10px]">Note from Admin</span>
                         "{q.adminComment}"
                       </div>
                     )}

                     {q.status === 'Completed' && q.adminComment && (
                       <div className="mt-2 mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 italic">
                         <span className="font-bold not-italic block mb-1 uppercase tracking-wider text-[10px]">Note from Admin</span>
                         "{q.adminComment}"
                       </div>
                     )}
                     
                     <div className="mt-auto pt-4 border-t border-gray-100">
                       {q.status === 'Active' ? (
                         <button 
                           onClick={() => setSubmitModal({ open: true, quest: q })}
                           className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                         >
                           <Check className="h-4 w-4" /> Complete Quest
                         </button>
                       ) : q.status === 'Submitted' ? (
                         <div className="w-full bg-amber-50 text-amber-600 font-bold py-2.5 rounded-xl text-center text-sm border border-amber-100">
                           Awaiting admin review...
                         </div>
                       ) : q.status === 'Completed' ? (
                         <div className="w-full bg-green-50/50 text-green-600 font-bold py-2.5 rounded-xl text-center text-sm border border-green-100 flex items-center justify-center gap-2">
                           <Check className="h-4 w-4" /> Points Added!
                         </div>
                       ) : null}
                     </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-gray-100">
           <h2 className="text-xl font-black text-gray-800 mb-6 px-4">Transaction History</h2>
           {history.length === 0 ? (
             <div className="text-center p-10 text-gray-500 font-medium">No history yet!</div>
           ) : (
             <div className="space-y-4">
               {history.map(item => (
                 <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                   <div className="flex items-center gap-4">
                     <div className={cn(
                       "w-12 h-12 rounded-full flex items-center justify-center shadow-sm",
                       item.type === 'earned' ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                     )}>
                       {item.sourceType === 'quest' ? <Target className="h-6 w-6" /> : <Gift className="h-6 w-6" />}
                     </div>
                     <div>
                       <p className="font-bold text-gray-800">{item.reason}</p>
                       <p className="text-xs font-semibold text-gray-500 mt-0.5">{format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}</p>
                     </div>
                   </div>
                   <div className={cn(
                     "font-black text-lg",
                     item.type === 'earned' ? "text-green-500" : "text-purple-500"
                   )}>
                     {item.type === 'earned' ? '+' : '-'}{item.amount}
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* Submit Modal */}
      {submitModal.open && submitModal.quest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden relative"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-indigo-50/30">
              <div>
                <h2 className="text-xl font-black text-gray-800">Complete Quest</h2>
                <p className="text-sm font-semibold text-indigo-600 mt-1">{submitModal.quest.title}</p>
              </div>
              <button onClick={() => setSubmitModal({ open: false, quest: null })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Proof / Message (Required)</label>
                  <textarea 
                    value={proofText} 
                    onChange={e => setProofText(e.target.value)} 
                    rows={4} 
                    required
                    className="w-full rounded-xl border border-gray-200 p-4 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none text-sm font-medium text-gray-800 bg-gray-50" 
                    placeholder="I finished the quest! Here is what I did..." 
                  />
               </div>
               <div className="pt-2">
                 <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                   Submit for Review
                 </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
