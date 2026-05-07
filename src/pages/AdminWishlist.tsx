import React, { useState, useEffect, useMemo } from 'react';
import { WishlistItem, PrincessPoints } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { Gift, Star, Crown, Edit, Check } from 'lucide-react';
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
      case 'Claimed': return "bg-purple-100 text-purple-700 border-purple-200";
      case 'Granted': return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-pink-100 text-pink-700 border-pink-200";
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Wishlist <Gift className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage, price, and grant her wishes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Statuses</option>
          <option value="Wanted">Wanted</option>
          <option value="Claimed">Claimed</option>
          <option value="Granted">Granted</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <Gift className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No items found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                   "bg-white rounded-[2rem] p-6 shadow-sm border flex flex-col group",
                   item.status === 'Claimed' ? "border-purple-300 shadow-purple-100/50" : "border-gray-200"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", getStatusBadge(item.status))}>
                      {item.status}
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-gray-100 text-gray-600">
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
                       className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                     >
                       <Edit className="h-4 w-4" />
                     </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                
                <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Star className="h-4 w-4 fill-current" />
                    {item.priority}
                  </div>
                  {item.estimatedPointValue != null ? (
                    <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                      <Crown className="h-3.5 w-3.5" /> {item.estimatedPointValue.toLocaleString()} pts
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unpriced</span>
                  )}
                </div>

                {item.adminNote && (
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl text-sm italic text-indigo-700 border border-indigo-100">
                    <span className="font-black text-indigo-800 not-italic block mb-0.5 text-[10px] uppercase tracking-wider">Note</span>
                    "{item.adminNote}"
                  </div>
                )}
                
                {item.status === 'Claimed' && (
                   <div className="mt-4 pt-4 border-t border-gray-100">
                     <button 
                       onClick={() => handleGrantClaim(item)}
                       className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                     >
                       <Check className="h-4 w-4" /> Confirm & Deduct Points
                     </button>
                   </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {editModal.open && editModal.item && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className="bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden"
            >
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                   Edit Wishlist Item Pricing
                 </h2>
                 <button onClick={() => setEditModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                   <Edit className="h-5 w-5" />
                 </button>
               </div>
               <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Estimated Point Value</label>
                    <input type="number" min="0" value={formData.estimatedPointValue} onChange={e => setFormData({...formData, estimatedPointValue: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Admin Note (Visible to User)</label>
                    <textarea value={formData.adminNote} onChange={e => setFormData({...formData, adminNote: e.target.value})} rows={3} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none font-medium text-gray-800" placeholder="I'll get this for your birthday!" />
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
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
