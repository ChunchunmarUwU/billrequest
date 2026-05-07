import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Heart } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Floating hearts logic
  const [hearts, setHearts] = useState<{ id: number, x: number, delay: number, duration: number, size: number }[]>([]);

  useEffect(() => {
    // Generate some random floating hearts
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // random percentage for left
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      size: 10 + Math.random() * 20
    }));
    setHearts(newHearts);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const email = `${username}@app.local`;
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        setError(err.message || 'Failed to login');
        return;
      }

      // Check role to redirect
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === 'Admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        await auth.signOut();
        setError('User role not found. Please contact an administrator.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-indigo-50 to-purple-50 p-4 overflow-hidden">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-40 mix-blend-multiply" 
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}bg-image.png')` }} 
        />
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
      </div>

      {/* Animated Floating Hearts Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute bottom-0 text-pink-300/40"
            style={{ left: `${heart.x}%` }}
            initial={{ y: '100%', opacity: 0, rotate: 0 }}
            animate={{ 
              y: '-100vh', 
              opacity: [0, 1, 1, 0],
              rotate: [0, 45, -45, 0] 
            }}
            transition={{ 
              duration: heart.duration, 
              repeat: Infinity, 
              delay: heart.delay,
              ease: 'linear'
            }}
          >
            <Heart size={heart.size} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm rounded-[2rem] bg-white/80 backdrop-blur-xl p-8 shadow-2xl border border-white/50 z-10"
      >
        <div className="mb-8 flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-200 to-indigo-200 text-indigo-600 mb-6 shadow-inner"
          >
            <Coins className="h-10 w-10 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent"
          >
            Gunj
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-medium text-gray-500 mt-2"
          >
            Sign in or set up your account
          </motion.p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100"
            >
              {error}
            </motion.div>
          )}
          
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Username</label>
            <motion.input 
              whileFocus={{ scale: 1.02 }}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-2xl border-0 bg-gray-50/50 p-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all"
              required
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Password</label>
            <motion.input 
              whileFocus={{ scale: 1.02 }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border-0 bg-gray-50/50 p-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all"
              required
            />
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 py-4 mt-6 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:opacity-90 focus:outline-none disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Heart className="h-5 w-5 animate-pulse" /> Loading...
              </span>
            ) : 'Enter'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
