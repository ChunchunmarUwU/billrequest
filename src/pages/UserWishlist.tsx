import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WishlistItem } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Gift, Search, Plus, X, Tag, Star, ChevronDown, Check, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const CATEGORIES = ['Gift', 'Food', 'Date', 'Shopping', 'Beauty', 'Experience', 'Other'] as const;
const PRIORITIES = ['Low', 'Medium', 'High', 'Dream'] as const;

export default function UserWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Gift' as WishlistItem['category'],
    priority: 'Medium' as WishlistItem['priority'],
    estimatedAmount: ''
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      const q = query(
        collection(db, 'wishlist'),
        where('userId', '==', user!.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem)));
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
        estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : 0,
        updatedAt: Date.now()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'wishlist', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'wishlist'), {
          ...payload,
          userId: user.id,
          status: 'Wanted',
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: 'Gift', priority: 'Medium', estimatedAmount: '' });
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this wishlist item?")) return;
    try {
      await deleteDoc(doc(db, 'wishlist', id));
      fetchItems();
    } catch(e) {
      console.error(e);
    }
  };

  const openEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category,
      priority: item.priority,
      estimatedAmount: item.estimatedAmount?.toString() || ''
    });
    setIsModalOpen(true);
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
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 opacity-10 -mr-6 -mt-6">
          <Gift size={120} />
        </div>
        <div className="z-10">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            My Wishlist <Gift className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-gray-500 font-medium mt-1">Add things you want, big or small.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ title: '', description: '', category: 'Gift', priority: 'Medium', estimatedAmount: '' });
            setIsModalOpen(true);
          }}
          className="z-10 w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center font-bold gap-2 pr-5"
        >
          <Plus className="h-5 w-5" /> Add
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Statuses</option>
          <option value="Wanted">Wanted</option>
          <option value="Planned">Planned</option>
          <option value="Hidden Surprise">Hidden Surprise</option>
          <option value="Done">Done</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
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
                className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group"
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
                  <button onClick={(e) => handleDelete(item.id, e)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                
                <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Star className="h-4 w-4 fill-current" />
                    {item.priority} Priority
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-500" />
                {editingItem ? 'Edit Item' : 'New Wishlist Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. New Shoes" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none text-sm font-medium text-gray-800" placeholder="Link, size, color..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold text-gray-700">
                    {PRIORITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Est. Amount (Optional)</label>
                <input type="number" value={formData.estimatedAmount} onChange={e => setFormData({...formData, estimatedAmount: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. 50000" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
                  {editingItem ? 'Save Changes' : 'Add to Wishlist'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
