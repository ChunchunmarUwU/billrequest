import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DateIdea } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { CalendarHeart, Search, Plus, X, Heart, MapPin, Navigation, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CATEGORIES = ['Movie Night', 'Food Date', 'Coffee Date', 'Walk', 'Gaming', 'Cooking Together', 'Shopping', 'Surprise', 'Home Date', 'Outdoor', 'Other'] as const;
const MOODS = ['Cozy', 'Fun', 'Romantic', 'Chill', 'Fancy', 'Lazy', 'Adventure'] as const;

export default function UserDateIdeas() {
  const { user } = useAuth();
  const [items, setItems] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DateIdea | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Movie Night' as DateIdea['category'],
    mood: 'Cozy' as DateIdea['mood'],
    location: '',
    estimatedCost: ''
  });

  const [randomIdea, setRandomIdea] = useState<DateIdea | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [moodFilter, setMoodFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      const q = query(
        collection(db, 'dateIdeas'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DateIdea)));
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
        mood: formData.mood,
        location: formData.location,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
        updatedAt: Date.now()
      };

      if (editingItem) {
        // Can only edit if created by user
        if (editingItem.createdBy !== user.id) {
          alert('You can only edit ideas you created.');
          return;
        }
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
      setFormData({ title: '', description: '', category: 'Movie Night', mood: 'Cozy', location: '', estimatedCost: '' });
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (item: DateIdea, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.createdBy !== user?.id) {
      alert("You can only delete your own ideas.");
      return;
    }
    if (!window.confirm("Delete this date idea?")) return;
    try {
      await deleteDoc(doc(db, 'dateIdeas', item.id));
      fetchItems();
    } catch(e) {
      console.error(e);
    }
  };

  const toggleFavorite = async (item: DateIdea, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const openEdit = (item: DateIdea) => {
    if (item.createdBy !== user?.id) return;
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 opacity-10 -mr-6 -mt-6">
          <CalendarHeart size={120} />
        </div>
        <div className="z-10">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            Date Ideas <CalendarHeart className="h-6 w-6 text-orange-500" />
          </h1>
          <p className="text-gray-500 font-medium mt-1">Save cute places to go and things to do.</p>
        </div>
        <div className="z-10 flex gap-3 w-full sm:w-auto">
          <button
            onClick={rollRandom}
            className="flex-1 sm:flex-none bg-orange-100/50 hover:bg-orange-100 text-orange-600 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center font-bold gap-2"
          >
            <Shuffle className="h-5 w-5" /> Random
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ title: '', description: '', category: 'Movie Night', mood: 'Cozy', location: '', estimatedCost: '' });
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center font-bold gap-2 pr-5"
          >
            <Plus className="h-5 w-5" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-orange-100/50 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Statuses</option>
          <option value="Idea">Idea</option>
          <option value="Planned">Planned</option>
          <option value="Done">Done</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-2xl border border-orange-100/50 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-semibold text-gray-700">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={moodFilter} onChange={e => setMoodFilter(e.target.value)} className="w-full rounded-2xl border border-orange-100/50 bg-white/60 backdrop-blur-md p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-semibold text-gray-700">
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
            <div className="bg-gradient-to-tr from-orange-50 to-amber-50 rounded-3xl p-6 border border-orange-200 shadow-sm relative mb-6">
              <button onClick={() => setRandomIdea(null)} className="absolute top-4 right-4 text-orange-400 hover:text-orange-600 bg-white/50 rounded-full p-2">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Shuffle className="h-4 w-4" /> Random Idea Selected
              </h2>
              <div className="bg-white/80 rounded-2xl p-6 mt-4 shadow-sm border border-orange-100">
                <h3 className="text-2xl font-black text-gray-800">{randomIdea.title}</h3>
                <p className="text-gray-600 mt-2 font-medium">{randomIdea.description}</p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 font-bold text-xs rounded-lg">{randomIdea.category}</span>
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 font-bold text-xs rounded-lg">{randomIdea.mood}</span>
                  {randomIdea.location && <span className="bg-gray-100 text-gray-700 px-3 py-1 font-bold text-xs rounded-lg flex items-center gap-1"><MapPin className="h-3 w-3" /> {randomIdea.location}</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-16 text-center shadow-sm border border-gray-100">
          <div className="mx-auto w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-400 mb-4">
            <CalendarHeart className="h-10 w-10" />
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
                  "bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border transition-colors group",
                  item.createdBy === user?.id ? "cursor-pointer hover:border-orange-300" : "border-gray-100"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border", 
                      item.status === 'Planned' ? "bg-blue-100 text-blue-700 border-blue-200" :
                      item.status === 'Done' ? "bg-green-100 text-green-700 border-green-200" :
                      "bg-orange-100 text-orange-700 border-orange-200"
                    )}>
                      {item.status}
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-gray-100 text-gray-600">
                      {item.mood}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => toggleFavorite(item, e)} className={cn("p-1.5 rounded-full transition-colors", item.isFavorite ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400 hover:text-red-400")}>
                      <Heart className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                    </button>
                    {item.createdBy === user?.id && (
                      <button onClick={(e) => handleDelete(item, e)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                
                <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-gray-500">
                  {item.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-orange-400" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                  {item.estimatedCost ? (
                     <div className="text-gray-600 bg-gray-50 px-2 py-1 rounded-lg w-max">~ {item.estimatedCost.toLocaleString()} ₮</div>
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
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarHeart className="h-5 w-5 text-orange-500" />
                {editingItem ? 'Edit Idea' : 'New Date Idea'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="date-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. Picnic at the park" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none text-sm font-medium text-gray-800" placeholder="Details, activities..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-semibold text-gray-700">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mood</label>
                    <select value={formData.mood} onChange={e => setFormData({...formData, mood: e.target.value as any})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-semibold text-gray-700">
                      {MOODS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location (Optional)</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. Downtown" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Est. Cost (Optional)</label>
                  <input type="number" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-gray-800" placeholder="e.g. 30000" />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 flex-shrink-0 bg-white">
              <button type="submit" form="date-form" className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-orange-600 transition-colors">
                {editingItem ? 'Save Changes' : 'Add Idea'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
