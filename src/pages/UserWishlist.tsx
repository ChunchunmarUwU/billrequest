import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WishlistItem, PrincessPoints } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Gift, Search, Plus, X, Tag, Star, ChevronDown, Check, EyeOff, Crown, Copy, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { MessageHelperModal } from '../components/MessageHelperModal';

const CATEGORIES = ['Gift', 'Food', 'Date', 'Shopping', 'Beauty', 'Experience', 'Other'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Dream'] as const;

export default function UserWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [points, setPoints] = useState<PrincessPoints | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [smsModal, setSmsModal] = useState({ open: false, message: '', recipient: 'admin' as 'admin' | 'gunj' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Gift' as WishlistItem['category'],
    priority: 'Medium' as WishlistItem['priority']
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch Wishlist Items
      const q = query(
        collection(db, 'wishlist'),
        where('userId', '==', user!.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem)));

      // Fetch Princess Points
      const pointsDoc = await getDoc(doc(db, 'princessPoints', user!.id));
      if (pointsDoc.exists()) {
        setPoints({ ...pointsDoc.data(), id: pointsDoc.id } as PrincessPoints);
      } else {
        setPoints({ id: user!.id, userId: user!.id, balance: 0, totalEarned: 0, totalSpent: 0, updatedAt: Date.now() });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        updatedAt: Date.now()
      };

      if (editingItem && editingItem.status === 'Wanted') {
        await updateDoc(doc(db, 'wishlist', editingItem.id), payload);
      } else if (!editingItem) {
        await addDoc(collection(db, 'wishlist'), {
          ...payload,
          userId: user.id,
          status: 'Wanted',
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: 'Gift', priority: 'Medium' });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (item: WishlistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.status !== 'Wanted') return;
    if (!window.confirm("Delete this wishlist item?")) return;
    try {
      await deleteDoc(doc(db, 'wishlist', item.id));
      fetchData();
    } catch(e) {
      console.error(e);
    }
  };

  const handleClaim = async (item: WishlistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !points || item.status !== 'Wanted' || item.estimatedPointValue == null || points.balance < item.estimatedPointValue) return;
    
    if (!window.confirm(`Claim "${item.title}" for ${item.estimatedPointValue} Princess Points?`)) return;

    try {
      // 1. Update Wishlist Item Status
      await updateDoc(doc(db, 'wishlist', item.id), {
        status: 'Claimed',
        claimedAt: Date.now(),
        updatedAt: Date.now()
      });

      // 2. Create Admin Notification
      await addDoc(collection(db, 'notifications'), {
        user_id: 'admin', 
        type: 'WISHLIST_CLAIMED',
        title: 'Wishlist item claimed',
        message: `${user.username || 'Gunj'} claimed a wishlist item: ${item.title}`,
        request_id: item.id,
        is_read: false,
        created_at: Date.now()
      });

      setSmsModal({ open: true, message: `Minii wishlist haraachee claim hiilee, love ya 💖`, recipient: 'admin' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (item: WishlistItem) => {
    if (item.status !== 'Wanted') return;
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category,
      priority: item.priority
    });
    setIsModalOpen(true);
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
    <div className="space-y-6 max-w-5xl mx-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 opacity-10 -mr-6 -mt-6 pointer-events-none">
          <Gift size={120} />
        </div>
        <div className="z-10 w-full flex flex-col sm:flex-row justify-between items-center sm:items-start">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center justify-center sm:justify-start gap-2">
              My Wishlist <Gift className="h-6 w-6 text-indigo-500" />
            </h1>
            <p className="text-gray-500 font-medium mt-1">Add things you want, big or small.</p>
          </div>
          {points && (
             <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-3 rounded-2xl flex items-center gap-3 border border-purple-200 shadow-sm mr-0 sm:mr-4">
                <div className="bg-white p-2 rounded-xl text-purple-600 shadow-sm flex-shrink-0">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Princess Points</p>
                  <p className="text-xl font-black text-purple-900 leading-tight">{points.balance.toLocaleString()}</p>
                </div>
             </div>
          )}
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ title: '', description: '', category: 'Gift', priority: 'Medium' });
            setIsModalOpen(true);
          }}
          className="z-10 w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center font-bold gap-2 sm:px-6"
        >
          <Plus className="h-5 w-5" /> Add
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700 shadow-sm">
          <option value="All">All Statuses</option>
          <option value="Wanted">Wanted</option>
          <option value="Claimed">Claimed</option>
          <option value="Granted">Granted</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700 shadow-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700 shadow-sm">
          <option value="All">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
            <Gift className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">No items found</h3>
          <p className="text-gray-500 mt-2">Adjust your filters or add something new.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => openEdit(item)}
                className={cn(
                    "bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border flex flex-col group cursor-pointer transition-all",
                    item.status === 'Claimed' ? "border-purple-200" : item.status === 'Granted' ? "border-green-200 bg-green-50/50" : "border-gray-100 hover:border-indigo-200 hover:shadow-md"
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
                  {item.status === 'Wanted' && (
                    <button onClick={(e) => handleDelete(item, e)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                
                <div className="mt-4 mt-auto flex items-center justify-between text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Star className="h-4 w-4 fill-current" />
                    {item.priority} Priority
                  </div>
                  {item.estimatedPointValue != null && (
                    <span className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1.5 rounded-lg font-bold">
                      <Crown className="h-3.5 w-3.5" />
                      {item.estimatedPointValue.toLocaleString()} pts
                    </span>
                  )}
                </div>
                
                {item.adminNote && (
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl text-sm italic text-indigo-700 border border-indigo-100">
                    <span className="font-black text-indigo-800 not-italic block mb-0.5 text-[10px] uppercase tracking-wider">Note from Rih</span>
                    "{item.adminNote}"
                  </div>
                )}
                
                {/* Claim Button Logic */}
                {item.status === 'Wanted' && item.estimatedPointValue != null ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {(points?.balance ?? 0) >= item.estimatedPointValue ? (
                      <button 
                        onClick={(e) => handleClaim(item, e)}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        Claim with Points
                      </button>
                    ) : (
                      <div className="w-full bg-gray-50 text-gray-400 text-center font-bold py-2.5 rounded-xl border border-gray-100 text-sm">
                        Not enough Princess Points yet 💖
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm shadow-2xl">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-500" />
                {editingItem ? 'View/Edit Item' : 'New Wishlist Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input disabled={!!editingItem && editingItem.status !== 'Wanted'} required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-gray-800 disabled:opacity-60 disabled:bg-gray-50" placeholder="e.g. New Shoes" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                <textarea disabled={!!editingItem && editingItem.status !== 'Wanted'} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none text-sm font-medium text-gray-800 disabled:opacity-60 disabled:bg-gray-50" placeholder="Link, size, color..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select disabled={!!editingItem && editingItem.status !== 'Wanted'} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700 disabled:opacity-60 disabled:bg-gray-50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                  <select disabled={!!editingItem && editingItem.status !== 'Wanted'} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700 disabled:opacity-60 disabled:bg-gray-50">
                    {PRIORITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {(!editingItem || editingItem?.status === 'Wanted') && (
                <div className="pt-4">
                  <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
                    {editingItem ? 'Save Changes' : 'Add to Wishlist'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <MessageHelperModal 
        isOpen={smsModal.open}
        onClose={() => setSmsModal({ open: false, message: '', recipient: 'admin' })}
        messageText={smsModal.message}
        recipientId={smsModal.recipient}
      />
    </div>
  );
}
