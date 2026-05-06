import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, Coins, Copy, Check } from 'lucide-react';

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'MNT',
    category: 'Food',
    urgency: 'Medium',
    importance: 'Medium',
    reason: '',
    details: '',
    needed_by_date: ''
  });

  const [adminFinancialState, setAdminFinancialState] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adminContactName, setAdminContactName] = useState('Rih');
  const [adminContactPhone, setAdminContactPhone] = useState('');
  const [userMessage, setUserMessage] = useState('Minii huseltiig shalgaach, bi chamd zunduu hairtaii bnshuu ❤️');

  React.useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const stateDoc = await getDoc(doc(db, 'settings', 'admin_financial_state'));
        if (stateDoc.exists()) {
          setAdminFinancialState(stateDoc.data().state || null);
        }

        const contactDoc = await getDoc(doc(db, 'cnt', 'admin'));
        if (contactDoc.exists()) {
          const data = contactDoc.data();
          if (data.name) setAdminContactName(data.name);
          if (data.num) setAdminContactPhone(data.num);
        }
      } catch (err) {
        console.error("Failed to fetch admin data", err);
      } finally {
        setLoadingState(false);
      }
    };
    fetchAdminData();
  }, []);

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
      const payload: any = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id,
        user_name: user.username,
        status: 'Pending',
        created_at: Date.now(),
        updated_at: Date.now()
      };

      if (adminFinancialState) {
        payload.adminFinancialStateAtSubmission = adminFinancialState;
      }

      const reqRef = await addDoc(collection(db, 'requests'), payload);

      // Create Admin notification
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'Admin'));
      const adminSnap = await getDocs(adminQuery);
      
      const notifPromises = adminSnap.docs.map(adminDoc => {
        return addDoc(collection(db, 'notifications'), {
          user_id: adminDoc.id,
          request_id: reqRef.id,
          message: `${user.username} just asked for money! 💸`,
          is_read: false,
          created_at: Date.now()
        });
      });
      await Promise.all(notifPromises);

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleOpenMessages = () => {
    if (!adminContactPhone) return;
    try {
      const encodedMessage = encodeURIComponent(userMessage);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isIOS) {
        window.location.href = `sms:${adminContactPhone}&body=${encodedMessage}`;
      } else {
        window.location.href = `sms:${adminContactPhone}?body=${encodedMessage}`;
      }
    } catch (err) {
      alert("Could not open Messages. Please copy the message manually.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Could not copy the message manually.");
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 flex flex-col items-center justify-center p-10 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-pink-100 text-center relative"
      >
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute -top-12 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2"
            >
              <Check className="h-4 w-4 text-pink-400" />
              Message copied 💖
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-6"
        >
          <Heart className="h-10 w-10" fill="currentColor" />
        </motion.div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Your request has been sent, princess 💖</h2>
        <p className="text-gray-500 font-medium tracking-wide mb-8">Please message {adminContactName} so your request gets reviewed faster.</p>

        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-6 relative w-full text-left">
          <textarea 
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none text-pink-900 font-bold italic h-20 focus:outline-none"
          ></textarea>
        </div>

        <div className="flex flex-col gap-3 w-full border-t border-pink-100 pt-6">
          {adminContactPhone ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenMessages}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 text-base font-black text-white shadow-lg hover:shadow-xl focus:outline-none transition-all"
            >
              <Send className="h-5 w-5" />
              Open Messages
            </motion.button>
          ) : (
            <p className="text-sm font-medium text-pink-500 text-center mb-2">Admin contact is missing. Please copy the message manually.</p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-4 text-base font-black text-white shadow-lg hover:shadow-xl focus:outline-none transition-all"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? "Copied!" : "Copy message"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-2xl border-2 border-gray-200 bg-transparent px-6 py-4 text-base font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none transition-all mt-2"
          >
            Close
          </motion.button>
        </div>
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
        
        {!loadingState && adminFinancialState && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-center gap-3 shadow-inner ${
            adminFinancialState === 'GOOD' ? 'bg-green-50 border-green-200 text-green-800' :
            adminFinancialState === 'Okay' ? 'bg-orange-50 border-orange-200 text-orange-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="text-sm font-bold uppercase tracking-widest opacity-70">
              Rih's financial state right now:
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              adminFinancialState === 'GOOD' ? 'bg-green-200 text-green-900' :
              adminFinancialState === 'Okay' ? 'bg-orange-200 text-orange-900' :
              'bg-red-200 text-red-900'
            }`}>
              {adminFinancialState}
            </span>
          </div>
        )}

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
                  className="block w-full rounded-2xl border-0 py-4 pl-6 pr-16 text-2xl font-black text-gray-900 bg-gray-50 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-pink-400 transition-all placeholder:text-gray-300"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-400">₮</span>
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
