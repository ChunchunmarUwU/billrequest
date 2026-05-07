import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Quest, PrincessPoints, PointHistory } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Target, Crown, History, Check, X, Plus, User, Search, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminQuests() {
  const { user: adminUser } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [users, setUsers] = useState<{id: string, username: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'quests' | 'history'>('quests');
  const [history, setHistory] = useState<PointHistory[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; quest: Quest | null }>({ open: false, quest: null });
  const [adminComment, setAdminComment] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pointReward: '',
    difficulty: 'Medium' as Quest['difficulty'],
    assignedTo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users for assignment (assuming roles are managed or we just want all users except current admin)
      const uSnap = await getDocs(collection(db, 'users'));
      const uList = uSnap.docs
         .map(d => ({ id: d.id, ...d.data() } as any))
         .filter(u => u.role === 'User');
      setUsers(uList);
      
      if (formData.assignedTo === '' && uList.length > 0) {
         setFormData(prev => ({ ...prev, assignedTo: uList[0].id }));
      }

      // Fetch Quests
      const qQuery = query(collection(db, 'quests'), orderBy('createdAt', 'desc'));
      const qSnap = await getDocs(qQuery);
      setQuests(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest)));

      // Fetch Global History
      const hQuery = query(collection(db, 'pointHistory'), orderBy('createdAt', 'desc'));
      const hSnap = await getDocs(hQuery);
      setHistory(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointHistory)));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    try {
      await addDoc(collection(db, 'quests'), {
        title: formData.title,
        description: formData.description,
        pointReward: parseInt(formData.pointReward) || 0,
        difficulty: formData.difficulty,
        status: 'Active',
        assignedTo: formData.assignedTo,
        createdBy: adminUser.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setIsCreateOpen(false);
      setFormData(prev => ({ ...prev, title: '', description: '', pointReward: '' }));
      fetchData();
    } catch(e) {
      console.error(e);
    }
  };

  const handleReview = async (isApproved: boolean) => {
    const q = reviewModal.quest;
    if (!q || !adminUser || !q.assignedTo) return;

    try {
      if (isApproved) {
        // 1. Update Quest
        await updateDoc(doc(db, 'quests', q.id), {
          status: 'Completed',
          adminComment,
          approvedAt: Date.now(),
          updatedAt: Date.now()
        });

        // 2. Add Points
        const pRef = doc(db, 'princessPoints', q.assignedTo);
        const pDoc = await getDoc(pRef);
        if (pDoc.exists()) {
          const pData = pDoc.data() as PrincessPoints;
          await updateDoc(pRef, {
            balance: pData.balance + q.pointReward,
            totalEarned: pData.totalEarned + q.pointReward,
            updatedAt: Date.now()
          });
        } else {
          await setDoc(pRef, {
            userId: q.assignedTo,
            balance: q.pointReward,
            totalEarned: q.pointReward,
            totalSpent: 0,
            updatedAt: Date.now()
          });
        }

        // 3. Keep History
        await addDoc(collection(db, 'pointHistory'), {
          userId: q.assignedTo,
          type: 'earned',
          sourceType: 'quest',
          sourceId: q.id,
          amount: q.pointReward,
          reason: `Completed quest: ${q.title}`,
          createdBy: adminUser.id,
          createdAt: Date.now()
        });

      } else {
        // Reject
        await updateDoc(doc(db, 'quests', q.id), {
          status: 'Rejected',
          adminComment,
          updatedAt: Date.now()
        });
      }

      setReviewModal({ open: false, quest: null });
      setAdminComment('');
      fetchData();
    } catch(e) {
      console.error(e);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between gap-4">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <Target className="h-6 w-6 text-indigo-500" /> Quest Management
             </h1>
             <p className="text-gray-500 font-medium">Create quests and review user submissions.</p>
           </div>
           
           <button
             onClick={() => setIsCreateOpen(true)}
             className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
           >
             <Plus className="h-4 w-4" /> New Quest
           </button>
         </div>

         <div className="flex border-b border-gray-100 mt-2">
            <button
               onClick={() => setActiveTab('quests')}
               className={cn("px-4 py-3 font-bold text-sm border-b-2 transition-all", activeTab === 'quests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800')}
            >
               Quests
            </button>
            <button
               onClick={() => setActiveTab('history')}
               className={cn("px-4 py-3 font-bold text-sm border-b-2 transition-all", activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800')}
            >
               Points History
            </button>
         </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : activeTab === 'quests' ? (
         <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
             {['All', 'Active', 'Submitted', 'Completed', 'Rejected'].map(s => (
               <button 
                 key={s} 
                 onClick={() => setStatusFilter(s)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-sm font-bold transition-all border whitespace-nowrap",
                   statusFilter === s ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                 )}
               >
                 {s}
                 {s === 'Submitted' && quests.filter(q => q.status === 'Submitted').length > 0 && (
                   <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                     {quests.filter(q => q.status === 'Submitted').length}
                   </span>
                 )}
               </button>
             ))}
            </div>

            {filteredQuests.length === 0 ? (
               <div className="bg-white p-10 rounded-2xl text-center shadow-sm border border-gray-100 text-gray-500 font-medium">
                  No quests found.
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
                         className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col"
                       >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", getStatusBadge(q.status))}>
                                {q.status}
                              </span>
                              <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", getDifficultyColor(q.difficulty))}>
                                {q.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-2 py-1 rounded-lg font-bold text-sm">
                              <Crown className="h-3.5 w-3.5" /> +{q.pointReward}
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{q.title}</h3>
                          <p className="text-sm text-gray-500 mb-4 flex-1">{q.description}</p>
                          
                          {q.status === 'Submitted' && (
                             <div className="mt-4 pt-4 border-t border-gray-100">
                               <button 
                                 onClick={() => setReviewModal({ open: true, quest: q })}
                                 className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                               >
                                 <Eye className="h-4 w-4" /> Review Submission
                               </button>
                             </div>
                          )}
                       </motion.div>
                    ))}
                  </AnimatePresence>
               </div>
            )}
         </>
      ) : (
         <div className="bg-white rounded-[2rem] p-4 sm:p-8 shadow-sm border border-gray-100">
            {history.length === 0 ? (
               <div className="text-center p-10 text-gray-500 font-medium">No history points yet.</div>
            ) : (
               <div className="space-y-4">
                 {history.map(item => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                         item.type === 'earned' ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                       )}>
                         {item.type === 'earned' ? '+' : '-'}{item.amount}
                       </div>
                       <div>
                         <p className="font-bold text-gray-800">{item.reason}</p>
                         <p className="text-xs font-semibold text-gray-500 mt-0.5">{format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}</p>
                       </div>
                     </div>
                     <div className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-white px-2 py-1 rounded-md shadow-sm">
                       UserID: {item.userId.substring(0, 5)}...
                     </div>
                   </div>
                 ))}
               </div>
            )}
         </div>
      )}

      {/* Create Quest Modal */}
      {isCreateOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden"
            >
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                   <Target className="h-5 w-5 text-indigo-500" /> New Quest
                 </h2>
                 <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quest Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. Do the dishes" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none resize-none font-medium text-gray-800" placeholder="Details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Reward Points</label>
                      <input required type="number" min="1" value={formData.pointReward} onChange={e => setFormData({...formData, pointReward: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-gray-800" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                      <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none font-semibold text-gray-700">
                         <option value="Easy">Easy</option>
                         <option value="Medium">Medium</option>
                         <option value="Hard">Hard</option>
                         <option value="Extreme">Extreme</option>
                      </select>
                    </div>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Assign To</label>
                      <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none font-semibold text-gray-700">
                         {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                      </select>
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition">
                      Create Quest
                    </button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.quest && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden"
            >
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-50">
                 <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                   Review Submission
                 </h2>
                 <button onClick={() => setReviewModal({ open: false, quest: null })} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full">
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Quest</p>
                     <p className="text-lg font-bold text-gray-800">{reviewModal.quest.title}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                     <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">User's Proof</p>
                     <p className="font-medium text-gray-800 whitespace-pre-wrap">{reviewModal.quest.proofText}</p>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Feedback/Comment (Optional)</label>
                     <textarea 
                       value={adminComment} 
                       onChange={e => setAdminComment(e.target.value)} 
                       rows={2} 
                       className="w-full rounded-xl border border-gray-200 p-3 outline-none" 
                       placeholder="Great job!" 
                     />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                     <button onClick={() => handleReview(false)} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition">
                       Reject
                     </button>
                     <button onClick={() => handleReview(true)} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition shadow-sm">
                       Approve & Grant {reviewModal.quest.pointReward} pts
                     </button>
                  </div>
               </div>
            </motion.div>
         </div>
      )}

    </div>
  );
}
