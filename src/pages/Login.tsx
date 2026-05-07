import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Heart, ChevronLeft } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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

      <AnimatePresence mode="wait">
        {!isLoginOpen ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="z-10 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setIsLoginOpen(true)}
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-white/40 backdrop-blur-md shadow-xl border border-white/50 text-pink-500 mb-6"
            >
              <Heart className="h-12 w-12 sm:h-16 sm:w-16 fill-pink-400 stroke-pink-500" />
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl font-black text-gray-800 drop-shadow-md text-center mb-2"
            >
              Sainuu Gunjee <span className="inline-block animate-pulse">💖</span>
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 font-bold bg-white/40 px-6 py-2 rounded-full backdrop-blur-sm border border-white/30 drop-shadow-sm text-sm sm:text-base cursor-pointer hover:bg-white/50 transition-colors"
            >
              Tap to enter
            </motion.p>
          </motion.div>
        ) : (
          <motion.div 
            key="login-form"
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-[90%] max-w-[420px] rounded-[1.5rem] sm:rounded-[2rem] bg-white/35 sm:bg-white/45 backdrop-blur-sm p-6 sm:p-8 shadow-2xl border border-white/30 z-10 my-4 relative"
          >
            <button 
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-900 bg-white/30 hover:bg-white/50 rounded-full backdrop-blur-sm transition-colors border border-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="mb-6 sm:mb-8 flex flex-col items-center mt-2">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-white/40 backdrop-blur-md text-pink-500 mb-4 sm:mb-6 shadow-inner border border-white/50"
              >
                <Heart className="h-8 w-8 sm:h-10 sm:w-10 fill-pink-400 stroke-pink-500" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-2xl sm:text-3xl font-black text-gray-800 drop-shadow-sm"
              >
                Welcome back
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs sm:text-sm font-bold text-gray-700 mt-1 sm:mt-2 drop-shadow-sm"
              >
                Sign in to your account
              </motion.p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-2xl bg-red-50/90 backdrop-blur-sm p-4 text-sm font-bold text-red-600 border border-red-200 shadow-sm"
                >
                  {error}
                </motion.div>
              )}
              
              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wider ml-1 drop-shadow-sm">Username</label>
                <motion.input 
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/50 bg-white/65 backdrop-blur-sm p-3.5 sm:p-4 text-sm sm:text-base text-gray-900 shadow-inner focus:bg-white/90 focus:ring-2 focus:ring-pink-400 outline-none transition-all font-medium"
                  required
                />
              </div>
              
              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wider ml-1 drop-shadow-sm">Password</label>
                <motion.input 
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/50 bg-white/65 backdrop-blur-sm p-3.5 sm:p-4 text-sm sm:text-base text-gray-900 shadow-inner focus:bg-white/90 focus:ring-2 focus:ring-pink-400 outline-none transition-all font-medium"
                  required
                />
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading}
                className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 py-3.5 sm:py-4 mt-4 sm:mt-6 text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl focus:outline-none disabled:opacity-50 transition-all border border-pink-400"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" /> Loading...
                  </span>
                ) : 'Enter'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
