import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Quest, PrincessPoints, PointHistory } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Scroll, Crown, History, Check, X, Plus, User, Search, Eye, Map, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { MessageHelperModal } from '../components/MessageHelperModal';

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
  const [smsModal, setSmsModal] = useState({ open: false, message: '', recipient: 'gunj' as 'gunj' | 'admin' });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pointReward: '',
    difficulty: 'Medium' as Quest['difficulty'],
    assignedTo: '',
    dueDate: ''
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
      const qData: any = {
        title: formData.title,
        description: formData.description,
        pointReward: parseInt(formData.pointReward) || 0,
        difficulty: formData.difficulty,
        status: 'Active',
        assignedTo: formData.assignedTo,
        createdBy: adminUser.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (formData.dueDate) {
        // We set to end of day of the selected date for leniency
        const dateObj = new Date(formData.dueDate);
        dateObj.setHours(23, 59, 59, 999);
        qData.dueDate = dateObj.getTime();
      }

      const docRef = await addDoc(collection(db, 'quests'), qData);

      // Create assigned notification
      await addDoc(collection(db, 'notifications'), {
        user_id: formData.assignedTo,
        type: 'NEW_QUEST',
        questId: docRef.id,
        title: 'New quest assigned',
        message: `Rih gave you a new quest: ${formData.title} 💖`,
        is_read: false,
        created_at: Date.now()
      });

      setIsCreateOpen(false);
      setFormData(prev => ({ ...prev, title: '', description: '', pointReward: '', dueDate: '' }));
      fetchData();
      
      setSmsModal({ open: true, message: `gunjee questee haraarai unsiide 💖`, recipient: 'gunj' });
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

        // 4. Notification
        await addDoc(collection(db, 'notifications'), {
          user_id: q.assignedTo,
          type: 'QUEST_APPROVED',
          title: 'Quest approved',
          message: `Your quest was approved and you earned ${q.pointReward} Princess Points 💖`,
          questId: q.id,
          is_read: false,
          created_at: Date.now()
        });

      } else {
        // Reject
        await updateDoc(doc(db, 'quests', q.id), {
          status: 'Rejected',
          adminComment,
          updatedAt: Date.now()
        });
        
        await addDoc(collection(db, 'notifications'), {
          user_id: q.assignedTo,
          type: 'QUEST_REJECTED',
          title: 'Quest rejected',
          message: `Your quest submission was not approved this time.`,
          questId: q.id,
          is_read: false,
          created_at: Date.now()
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
      case 'Easy': return 'text-emerald-600 bg-emerald-50 border-emerald-200/50';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200/50';
      case 'Hard': return 'text-rose-600 bg-rose-50 border-rose-200/50';
      case 'Extreme': return 'text-sky-600 bg-sky-50 border-sky-200/50';
      default: return 'text-stone-500 bg-stone-50 border-stone-200/50';
    }
  };

  const getStatusBadge = (status: string) => {
     switch(status) {
       case 'Active': return 'bg-sky-50 text-sky-700 border-sky-200/50';
       case 'Submitted': return 'bg-amber-50 text-amber-700 border-amber-200/50';
       case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
       case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200/50';
       default: return 'bg-stone-50 text-stone-700 border-stone-200/50';
     }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans relative">
      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between gap-6 relative overflow-hidden">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
           <div>
             <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
               <Scroll className="h-8 w-8 text-indigo-500 drop-shadow-sm" /> Quests
             </h1>
             <p className="text-gray-500 font-bold mt-1">Manage and review tasks.</p>
           </div>
           
           <button
             onClick={() => setIsCreateOpen(true)}
             className="bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 h-12"
           >
             <Plus className="h-5 w-5" /> Add Quest
           </button>
         </div>

         <div className="flex gap-4 border-b border-gray-100 mt-4 relative z-10">
            <button
               onClick={() => setActiveTab('quests')}
               className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 relative", activeTab === 'quests' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600')}
            >
               Active Quests
            </button>
            <button
               onClick={() => setActiveTab('history')}
               className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 relative", activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600')}
            >
               Points History
            </button>
         </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><div className="animate-spin h-10 w-10 border-4 border-indigo-100/50 border-t-indigo-500 rounded-full drop-shadow-sm" /></div>
      ) : activeTab === 'quests' ? (
         <>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
             {['All', 'Active', 'Submitted', 'Completed', 'Rejected'].map(s => (
               <button 
                 key={s} 
                 onClick={() => setStatusFilter(s)}
                 className={cn(
                   "px-5 py-2.5 rounded-[1rem] text-sm font-bold transition-all border whitespace-nowrap outline-none flex items-center gap-2",
                   statusFilter === s ? "bg-gray-800 text-white border-gray-700 shadow-sm" : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-gray-700"
                 )}
               >
                 {s}
                 {s === 'Submitted' && quests.filter(q => q.status === 'Submitted').length > 0 && (
                   <span className="bg-orange-500 text-white shadow-sm rounded-full px-2 py-0.5 text-[10px] font-black">
                     {quests.filter(q => q.status === 'Submitted').length}
                   </span>
                 )}
               </button>
             ))}
            </div>

            {filteredQuests.length === 0 ? (
               <div className="bg-white p-12 rounded-[2rem] text-center shadow-sm border border-gray-200 text-gray-400 font-bold border-dashed">
                  No quests found.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {filteredQuests.map(q => (
                       <motion.div
                         key={q.id}
                         layout
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         className="bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
                       >
                          <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border", getStatusBadge(q.status))}>
                                {q.status}
                              </span>
                              <span className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border", getDifficultyColor(q.difficulty))}>
                                {q.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-xl font-black text-sm shadow-sm">
                              <Crown className="h-3.5 w-3.5" /> +{q.pointReward}
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-black text-gray-800 leading-tight mb-2 tracking-tight relative z-10">{q.title}</h3>
                          
                          {q.dueDate && (
                             <div className="mb-3 relative z-10">
                               {q.status === 'Active' && isPast(new Date(q.dueDate)) && !isToday(new Date(q.dueDate)) ? (
                                  <span className="inline-flex px-3 py-1 rounded-xl items-center bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-widest border border-rose-200">Overdue: {format(new Date(q.dueDate), 'MMM d')}</span>
                               ) : q.status === 'Active' && isToday(new Date(q.dueDate)) ? (
                                  <span className="inline-flex px-3 py-1 rounded-xl items-center bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-widest border border-orange-200 shadow-sm">Due today</span>
                               ) : q.status === 'Active' && isTomorrow(new Date(q.dueDate)) ? (
                                  <span className="inline-flex px-3 py-1 rounded-xl items-center bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-widest border border-sky-200">Due tomorrow</span>
                               ) : (
                                  <span className="text-xs font-bold text-gray-400">Due: {format(new Date(q.dueDate), 'MMM d, yyyy')}</span>
                               )}
                             </div>
                          )}
                          {!q.dueDate && <span className="text-xs font-bold text-gray-400 mb-3 block relative z-10">No specific deadline</span>}

                          <p className="text-sm text-gray-500 mb-6 flex-1 font-medium leading-relaxed relative z-10">{q.description}</p>
                          
                          {q.status === 'Submitted' && (
                             <div className="mt-2 pt-5 border-t border-gray-100 relative z-10">
                               <button 
                                 onClick={() => setReviewModal({ open: true, quest: q })}
                                 className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-4 focus:ring-orange-200"
                               >
                                 <Eye className="h-5 w-5" /> Review Submission
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
         <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-gray-100">
            {history.length === 0 ? (
               <div className="text-center p-12 text-gray-400 font-bold border border-dashed border-gray-200 rounded-[2rem]">No historical records yet.</div>
            ) : (
               <div className="space-y-4">
                 {history.map(item => (
                   <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-5">
                       <div className={cn(
                         "w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-lg shadow-inner",
                         item.type === 'earned' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                       )}>
                         {item.type === 'earned' ? '+' : '-'}{item.amount}
                       </div>
                       <div>
                         <p className="font-black text-gray-800 text-lg tracking-tight">{item.reason}</p>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}</p>
                       </div>
                     </div>
                     <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm hidden sm:block">
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative"
            >
               <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center relative z-10 bg-gray-50">
                 <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
                   <Scroll className="h-6 w-6 text-indigo-500 drop-shadow-sm" /> Add Quest
                 </h2>
                 <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <form onSubmit={handleCreateGroup} className="p-6 sm:p-8 space-y-5 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Quest Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all font-bold text-gray-800 placeholder-gray-400 shadow-inner" placeholder="e.g. Do the dishes" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                    <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none resize-none font-medium text-gray-800 placeholder-gray-400 shadow-inner" placeholder="Details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reward Points</label>
                      <input required type="number" min="1" value={formData.pointReward} onChange={e => setFormData({...formData, pointReward: e.target.value})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none font-bold text-gray-800 placeholder-gray-400 shadow-inner" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Difficulty</label>
                      <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value as any})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none font-bold text-gray-700 shadow-inner appearance-none cursor-pointer">
                         <option value="Easy">Easy</option>
                         <option value="Medium">Medium</option>
                         <option value="Hard">Hard</option>
                         <option value="Extreme">Extreme</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Assign To</label>
                        <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none font-bold text-gray-700 shadow-inner appearance-none cursor-pointer">
                           {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Due Date</label>
                        <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none font-bold text-gray-700 shadow-inner" />
                    </div>
                  </div>
                  <div className="pt-6">
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[1.5rem] shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all outline-none focus:ring-4 focus:ring-indigo-200 text-base">
                      Add Quest
                    </button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.quest && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative"
            >
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
                   Review Submission
                 </h2>
                 <button onClick={() => setReviewModal({ open: false, quest: null })} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors bg-white">
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <div className="p-8 space-y-6">
                  <div>
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Quest</p>
                     <p className="text-2xl font-black text-gray-800 tracking-tight leading-tight">{reviewModal.quest.title}</p>
                     {reviewModal.quest.dueDate && (
                       <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Due: {format(new Date(reviewModal.quest.dueDate), 'MMM d, yyyy')}</p>
                     )}
                  </div>
                  
                  <div className="bg-gray-50 p-5 rounded-[1.5rem] border border-gray-200 shadow-inner">
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">Proof</p>
                     <p className="font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">{reviewModal.quest.proofText}</p>
                  </div>

                  <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Comment (Optional)</label>
                     <textarea 
                       value={adminComment} 
                       onChange={e => setAdminComment(e.target.value)} 
                       rows={2} 
                       className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none resize-none font-medium text-gray-800 placeholder-gray-400 shadow-inner" 
                       placeholder="Reply..." 
                     />
                  </div>

                  <div className="flex gap-4 pt-6 mt-2 border-t border-gray-100">
                     <button onClick={() => handleReview(false)} className="flex-1 bg-rose-50 text-rose-600 font-bold py-4 rounded-[1.5rem] hover:bg-rose-100 transition-colors border border-rose-200">
                       Reject
                     </button>
                     <button onClick={() => handleReview(true)} className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-[1.5rem] shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all outline-none focus:ring-4 focus:ring-indigo-200">
                       Approve (+{reviewModal.quest.pointReward})
                     </button>
                  </div>
               </div>
            </motion.div>
         </div>
      )}

      <MessageHelperModal 
        isOpen={smsModal.open}
        onClose={() => setSmsModal({ open: false, message: '', recipient: 'gunj' })}
        messageText={smsModal.message}
        recipientId={smsModal.recipient}
      />
    </div>
  );
}
