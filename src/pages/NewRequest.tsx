import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Heart, Send, Coins } from 'lucide-react';

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: 'Food',
    urgency: 'Medium',
    importance: 'Medium',
    reason: '',
    details: '',
    needed_by_date: ''
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'requests'), {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id,
        user_name: user.username,
        status: 'Pending',
        created_at: Date.now(),
        updated_at: Date.now()
      });

      setSubmitted(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-pink-100 text-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-6"
        >
          <Heart className="h-10 w-10" fill="currentColor" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Request Sent!</h2>
        <p className="text-gray-500 font-medium tracking-wide">Fingers crossed he says yes! 💕</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8 pl-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          Ask for Money <Coins className="h-8 w-8 text-pink-400" />
        </h1>
        <p className="mt-2 text-base text-gray-500 font-medium">Please provide the cute details for your request.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-lg border border-pink-100 overflow-hidden p-8 sm:p-12 relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <Heart size={200} />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 font-bold border border-red-100 shadow-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
            <div className="sm:col-span-4 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Amount</label>
              <div className="relative rounded-2xl shadow-sm">
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="number"
                  name="amount"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  className="block w-full rounded-2xl border-0 py-4 pl-6 pr-24 text-2xl font-black text-gray-900 bg-gray-50 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all placeholder:text-gray-300"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="h-[80%] rounded-xl border-transparent bg-white shadow-sm text-gray-700 focus:ring-pink-400 focus:border-pink-400 sm:text-lg font-bold pl-3 pr-8 w-24"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>MNT</option>
                    <option>AUD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sm:col-span-3 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Category</label>
              <motion.select
                whileFocus={{ scale: 1.01 }}
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 pl-4 pr-10 text-base font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
              >
                {['Food', 'Shopping', 'Transportation', 'Emergency', 'Health', 'Education', 'Entertainment', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </motion.select>
            </div>

            <div className="sm:col-span-3 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Needed By (Optional)</label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="date"
                name="needed_by_date"
                value={formData.needed_by_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 px-4 text-base font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
              />
            </div>

            <div className="sm:col-span-3 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Urgency</label>
              <motion.select
                whileFocus={{ scale: 1.01 }}
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 pl-4 pr-10 text-base font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
              >
                {['Low', 'Medium', 'High', 'Emergency'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </motion.select>
            </div>

            <div className="sm:col-span-3 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Importance</label>
              <motion.select
                whileFocus={{ scale: 1.01 }}
                name="importance"
                value={formData.importance}
                onChange={handleChange}
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 pl-4 pr-10 text-base font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all"
              >
                {['Low', 'Medium', 'High', 'Very Important'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </motion.select>
            </div>

            <div className="sm:col-span-6 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Reason</label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                name="reason"
                required
                value={formData.reason}
                onChange={handleChange}
                placeholder="Brief reason for the request"
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 px-5 text-lg font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all placeholder:text-gray-300 placeholder:font-medium"
              />
            </div>

            <div className="sm:col-span-6 group">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 group-focus-within:text-pink-500 transition-colors">Extra Details (Optional)</label>
              <motion.textarea
                whileFocus={{ scale: 1.01 }}
                name="details"
                rows={4}
                value={formData.details}
                onChange={handleChange}
                placeholder="Any further explanation..."
                className="mt-1 block w-full rounded-2xl border-0 bg-gray-50 py-4 px-5 text-base font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-100">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto rounded-2xl border-2 border-gray-200 bg-transparent px-8 py-4 text-base font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all order-2 sm:order-1"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-500 px-8 py-4 text-base font-black text-white shadow-lg hover:shadow-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 transition-all order-1 sm:order-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Heart className="h-5 w-5 animate-pulse" /> Sending
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-5 w-5" /> Submit Request
                </span>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
