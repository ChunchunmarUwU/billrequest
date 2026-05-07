import { useState, useEffect, useMemo } from 'react';
import { WishlistItem } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Gift, Star, CheckSquare, Edit3 } from 'lucide-react';
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

  const handleUpdateStatus = async (item: WishlistItem, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'wishlist', item.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Planned': return "bg-blue-100 text-blue-700 border-blue-200";
      case 'Done': return "bg-green-100 text-green-700 border-green-200";
      case 'Hidden Surprise': return "bg-purple-100 text-purple-700 border-purple-200";
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
          <p className="text-gray-500 font-medium mt-1">Manage and grant her wishes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Statuses</option>
          <option value="Wanted">Wanted</option>
          <option value="Planned">Planned</option>
          <option value="Hidden Surprise">Hidden Surprise</option>
          <option value="Done">Done</option>
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
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <select 
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item, e.target.value)}
                      className={cn(
                        "px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border outline-none cursor-pointer appearance-none",
                        getStatusBadge(item.status)
                      )}
                    >
                      <option value="Wanted">Wanted</option>
                      <option value="Planned">Planned</option>
                      <option value="Hidden Surprise">Hidden Surprise</option>
                      <option value="Done">Done</option>
                    </select>

                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-gray-100 text-gray-600">
                      {item.category}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                
                <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Star className="h-4 w-4 fill-current" />
                    {item.priority}
                  </div>
                  {item.estimatedAmount ? (
                    <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">~ {item.estimatedAmount.toLocaleString()} ₮</span>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
