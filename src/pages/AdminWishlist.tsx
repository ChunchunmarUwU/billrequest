import React, { useState, useEffect, useMemo } from 'react';
import { WishlistItem, PrincessPoints } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { Gift, Star, Crown, Edit, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const CATEGORIES = ['Gift', 'Food', 'Date', 'Shopping', 'Beauty', 'Experience', 'Other'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Dream'] as const;

export default function AdminWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [editModal, setEditModal] = useState<{ open: boolean; item: WishlistItem | null }>({ open: false, item: null });
  const [formData, setFormData] = useState({
    estimatedPointValue: '',
    adminNote: '',
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'wishlist'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.item) return;

    try {
      const pointValue = formData.estimatedPointValue ? parseInt(formData.estimatedPointValue) : null;
      
      await updateDoc(doc(db, 'wishlist', editModal.item.id), {
        estimatedPointValue: pointValue,
        adminNote: formData.adminNote,
        updatedAt: Date.now()
      });
      
      setEditModal({ open: false, item: null });
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleGrantClaim = async (item: WishlistItem) => {
    if (item.status !== 'Claimed' || !item.estimatedPointValue) return;
    
    if (!window.confirm(`Are you sure you want to GRANT "${item.title}"? This will deduct ${item.estimatedPointValue} points from the user.`)) return;

    try {
      // 1. Deduct points
      const pRef = doc(db, 'princessPoints', item.userId);
      const pDoc = await getDoc(pRef);
      if (pDoc.exists()) {
        const pData = pDoc.data() as PrincessPoints;
        await updateDoc(pRef, {
          balance: pData.balance - item.estimatedPointValue,
          totalSpent: pData.totalSpent + item.estimatedPointValue,
          updatedAt: Date.now()
        });
      }

      // 2. Add history
      await addDoc(collection(db, 'pointHistory'), {
        userId: item.userId,
        type: 'spent',
        sourceType: 'wishlist',
        sourceId: item.id,
        amount: item.estimatedPointValue,
        reason: `Claimed wishlist item: ${item.title}`,
        createdBy: 'admin',
        createdAt: Date.now()
      });

      // 3. Update Wishlist
      await updateDoc(doc(db, 'wishlist', item.id), {
        status: 'Granted',
        grantedAt: Date.now(),
        updatedAt: Date.now()
      });

      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Claimed': return "bg-sky-50 text-sky-700 border-sky-200/50";
      case 'Granted': return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      default: return "bg-rose-50 text-rose-700 border-rose-200/50";
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [items, statusFilter, categoryFilter, priorityFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans relative">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-between items-start gap-4 relative overflow-hidden">
         <div className="relative z-10 text-left">
           <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
             <Gift className="h-8 w-8 text-indigo-500 drop-shadow-sm" /> Wishlist
           </h1>
           <p className="text-gray-500 font-bold mt-1">Manage and grant wishes.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all font-bold text-gray-700 shadow-inner appearance-none cursor-pointer">
          <option value="All">All Statuses</option>
          <option value="Wanted">Wanted</option>
          <option value="Claimed">Claimed</option>
          <option value="Granted">Granted</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all font-bold text-gray-700 shadow-inner appearance-none cursor-pointer">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all font-bold text-gray-700 shadow-inner appearance-none cursor-pointer">
          <option value="All">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><div className="animate-spin h-10 w-10 border-4 border-indigo-100/50 border-t-indigo-500 rounded-full drop-shadow-sm" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-16 rounded-[2.5rem] text-center shadow-sm border border-gray-200 border-dashed">
          <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-400">Empty list</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                   "bg-white rounded-[2rem] p-7 shadow-sm border flex flex-col group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
                   item.status === 'Claimed' ? "border-sky-200/60 shadow-sky-100/30" : "border-gray-100"
                )}
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border", getStatusBadge(item.status))}>
                      {item.status}
                    </span>
                    <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-gray-50 text-gray-500 border border-gray-200">
                      {item.category}
                    </span>
                  </div>
                  {(item.status === 'Wanted' || item.status === 'Claimed') && (
                     <button
                       onClick={() => {
                         setEditModal({ open: true, item });
                         setFormData({
                           estimatedPointValue: item.estimatedPointValue?.toString() || '',
                           adminNote: item.adminNote || ''
                         });
                       }}
                       className="text-gray-400 hover:text-indigo-600 transition-colors p-2 hover:bg-gray-50 rounded-full"
                     >
                       <Edit className="h-4 w-4" />
                     </button>
                  )}
                </div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight leading-tight relative z-10">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-2 font-medium line-clamp-2 leading-relaxed relative z-10">{item.description}</p>}
                
                <div className="mt-5 flex items-center justify-between text-sm font-bold relative z-10">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="h-4 w-4 fill-current drop-shadow-sm" />
                    {item.priority}
                  </div>
                  {item.estimatedPointValue != null ? (
                    <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm">
                      <Crown className="h-4 w-4" /> {item.estimatedPointValue.toLocaleString()} pts
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic font-medium">Unpriced</span>
                  )}
                </div>

                {item.adminNote && (
                  <div className="mt-5 p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 font-medium border border-gray-100 relative z-10 shadow-inner">
                    <span className="font-bold text-gray-400 block mb-1 text-[10px] uppercase tracking-widest drop-shadow-sm">Admin Note</span>
                    "{item.adminNote}"
                  </div>
                )}
                
                {item.status === 'Claimed' && (
                   <div className="mt-4 pt-5 border-t border-gray-100 relative z-10">
                     <button 
                       onClick={() => handleGrantClaim(item)}
                       className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-4 focus:ring-emerald-200 outline-none"
                     >
                       <Check className="h-5 w-5" /> Grant & Deduct Points
                     </button>
                   </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {editModal.open && editModal.item && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative"
            >
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h2 className="text-xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
                   Evaluate Pricing
                 </h2>
                 <button onClick={() => setEditModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors bg-white">
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <form onSubmit={handleSaveEdit} className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Estimated Value</label>
                    <input type="number" min="0" value={formData.estimatedPointValue} onChange={e => setFormData({...formData, estimatedPointValue: e.target.value})} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all font-bold text-gray-800 placeholder-gray-400 shadow-inner" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Admin Note</label>
                    <textarea value={formData.adminNote} onChange={e => setFormData({...formData, adminNote: e.target.value})} rows={3} className="w-full bg-gray-50 rounded-[1.5rem] border border-gray-200 p-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all resize-none font-medium text-gray-800 placeholder-gray-400 shadow-inner" placeholder="Note" />
                  </div>
                  <div className="pt-2">
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[1.5rem] shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-sm outline-none focus:ring-4 focus:ring-indigo-200">
                      Save Changes
                    </button>
                  </div>
               </form>
            </motion.div>
         </div>
      )}
    </div>
  );
}
