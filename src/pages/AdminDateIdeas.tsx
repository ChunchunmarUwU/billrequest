import React, { useState, useEffect, useMemo } from 'react';
import { DateIdea } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { CalendarHeart, Heart, MapPin, Shuffle, Edit3, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CATEGORIES = ['Movie Night', 'Food Date', 'Coffee Date', 'Walk', 'Gaming', 'Cooking Together', 'Shopping', 'Surprise', 'Home Date', 'Outdoor', 'Other'] as const;
const MOODS = ['Cozy', 'Fun', 'Romantic', 'Chill', 'Fancy', 'Lazy', 'Adventure'] as const;

export default function AdminDateIdeas() {
  const { user } = useAuth();
  const [items, setItems] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DateIdea | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Surprise' as DateIdea['category'],
    mood: 'Romantic' as DateIdea['mood'],
    location: '',
    estimatedCost: ''
  });

  const [randomIdea, setRandomIdea] = useState<DateIdea | null>(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [moodFilter, setMoodFilter] = useState('All');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'dateIdeas'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DateIdea)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (item: DateIdea) => {
    try {
      await updateDoc(doc(db, 'dateIdeas', item.id), {
        isFavorite: !item.isFavorite,
        updatedAt: Date.now()
      });
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (item: DateIdea, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'dateIdeas', item.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // Admin needed
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        mood: formData.mood,
        location: formData.location,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
        updatedAt: Date.now()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'dateIdeas', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'dateIdeas'), {
          ...payload,
          createdBy: user.id,
          isFavorite: false,
          status: 'Idea',
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: 'Surprise', mood: 'Romantic', location: '', estimatedCost: '' });
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this date idea?")) return;
    try {
      await deleteDoc(doc(db, 'dateIdeas', id));
      fetchItems();
    } catch(e) {
      console.error(e);
    }
  };

  const openEdit = (item: DateIdea) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category,
      mood: item.mood,
      location: item.location || '',
      estimatedCost: item.estimatedCost?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (moodFilter !== 'All' && item.mood !== moodFilter) return false;
      return true;
    });
  }, [items, statusFilter, categoryFilter, moodFilter]);

  const rollRandom = () => {
    if (filteredItems.length === 0) return;
    const idea = filteredItems[Math.floor(Math.random() * filteredItems.length)];
    setRandomIdea(idea);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            Date Ideas <CalendarHeart className="h-8 w-8 text-indigo-500 drop-shadow-sm" />
          </h1>
          <p className="text-gray-500 font-medium mt-1">Plan and manage future dates.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto relative z-10">
          <button
            onClick={rollRandom}
            className="flex-1 sm:flex-none bg-pink-50 border border-pink-100/50 hover:bg-pink-100/80 text-pink-600 px-5 py-3 rounded-2xl transition-all font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Shuffle className="h-5 w-5" /> Pick Random
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ title: '', description: '', category: 'Surprise', mood: 'Romantic', location: '', estimatedCost: '' });
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="h-5 w-5" /> Add Idea
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-gray-700 shadow-sm cursor-pointer">
          <option value="All">All Statuses</option>
          <option value="Idea">Idea</option>
          <option value="Planned">Planned</option>
          <option value="Done">Done</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-gray-700 shadow-sm cursor-pointer">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={moodFilter} onChange={e => setMoodFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-gray-700 shadow-sm cursor-pointer">
          <option value="All">All Moods</option>
          {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <AnimatePresence>
        {randomIdea && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-pink-50 to-indigo-50 rounded-[2.5rem] p-6 sm:p-8 border border-pink-100/50 relative mb-6 shadow-sm overflow-hidden">
              <button onClick={() => setRandomIdea(null)} className="absolute top-6 right-6 text-pink-500 hover:text-pink-700 bg-white/60 backdrop-blur-md rounded-full p-2 border border-pink-100 transition-colors z-10">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
                <Shuffle className="h-4 w-4" /> Random Pick
              </h2>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 mt-2 shadow-sm border border-pink-100/30 relative z-10">
                <h3 className="text-3xl font-black text-gray-800 tracking-tight">{randomIdea.title}</h3>
                <p className="text-gray-500 mt-3 font-medium leading-relaxed">{randomIdea.description}</p>
                <div className="flex gap-2 mt-6 flex-wrap">
                  <span className="bg-pink-50 text-pink-600 px-3 py-1 font-bold uppercase tracking-widest text-[10px] rounded-lg border border-pink-100">{randomIdea.category}</span>
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 font-bold uppercase tracking-widest text-[10px] rounded-lg border border-indigo-100">{randomIdea.mood}</span>
                  {randomIdea.location && <span className="bg-gray-100 text-gray-500 px-3 py-1 font-bold uppercase tracking-widest text-[10px] rounded-lg flex items-center gap-1 border border-gray-200"><MapPin className="h-3 w-3" /> {randomIdea.location}</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-10 w-10 border-4 border-indigo-100/50 border-t-indigo-500 rounded-full drop-shadow-sm" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-gray-200 border-dashed">
          <CalendarHeart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-500">No ideas found</h3>
          <p className="text-sm font-bold text-gray-400 mt-2">Add your first date idea.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 items-center flex-wrap">
                    <select 
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item, e.target.value)}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl outline-none cursor-pointer appearance-none shadow-sm transition-all border",
                        item.status === 'Planned' ? "bg-amber-50 text-amber-700 border-amber-200/60" :
                        item.status === 'Done' ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" :
                        "bg-gray-50 text-gray-500 border-gray-100"
                      )}
                    >
                      <option value="Idea">Idea</option>
                      <option value="Planned">Planned</option>
                      <option value="Done">Done</option>
                    </select>
                    <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-orange-50 text-orange-700 border border-orange-100 shadow-sm">
                      {item.mood}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleFavorite(item)} className={cn("p-2 rounded-full transition-all flex items-center justify-center", item.isFavorite ? "bg-rose-50 text-rose-500 shadow-inner border border-rose-100" : "bg-white text-gray-300 hover:text-rose-400 hover:bg-rose-50 border border-gray-100")}>
                      <Heart className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-indigo-600 transition-all p-2 rounded-full hover:bg-indigo-50 bg-white border border-gray-100 flex items-center justify-center relative">
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-gray-800 tracking-tight line-clamp-2 mt-auto">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-2 line-clamp-3 font-medium leading-relaxed">{item.description}</p>}
                
                <div className="mt-6 flex flex-col gap-2.5 pt-4 border-t border-gray-100">
                  {item.location && (
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                  {item.estimatedCost ? (
                     <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl w-max shadow-sm">
                       <span className="text-gray-600">{item.estimatedCost.toLocaleString()}</span> ₮
                     </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-gray-100"
          >
            <div className="pt-8 px-8 pb-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0 relative z-10">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
                <CalendarHeart className="h-6 w-6 text-indigo-500 drop-shadow-sm" />
                {editingItem ? 'Edit Idea' : 'Add New Idea'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 p-2 rounded-full transition-colors border border-gray-100 shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 bg-white">
              <form id="admin-date-form" onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm bg-gray-50" placeholder="e.g. Picnic by the matching view" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description (Optional)</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all resize-none text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm bg-gray-50 leading-relaxed" placeholder="Write the details here..." />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all font-bold text-gray-700 bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 cursor-pointer">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mood</label>
                    <select value={formData.mood} onChange={e => setFormData({...formData, mood: e.target.value as any})} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all font-bold text-gray-700 bg-gray-50 shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 cursor-pointer">
                      {MOODS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Location (Optional)</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm bg-gray-50" placeholder="e.g. Any cute spot" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Est. Cost (Optional)</label>
                  <input type="number" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} className="w-full rounded-2xl border border-gray-200 p-4 outline-none transition-all font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm bg-gray-50" placeholder="e.g. 30000" />
                </div>
              </form>
            </div>
            <div className="p-6 sm:p-8 flex-shrink-0 bg-white border-t border-gray-100">
              <button type="submit" form="admin-date-form" className="w-full bg-gray-900 text-white font-bold uppercase tracking-widest py-4 rounded-2xl shadow-md hover:bg-gray-800 hover:-translate-y-0.5 transition-all">
                {editingItem ? 'Save Changes' : 'Save Idea'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
