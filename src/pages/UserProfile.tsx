import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, Shield, KeyRound, Activity, Heart, Sparkles, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

export default function UserProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const navigate = useNavigate();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin financial state
  const [financialState, setFinancialState] = useState('GOOD');
  const [savingFinancialState, setSavingFinancialState] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const fetchFinState = async() => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'admin_financial_state'));
          if (docSnap.exists()) {
            setFinancialState(docSnap.data().state || 'GOOD');
          }
        } catch(err) {}
      };
      fetchFinState();
    }
  }, [isAdmin]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No authenticated user");
      }
      
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      setMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinancialStateChange = async (state: string) => {
    setFinancialState(state);
    setSavingFinancialState(true);
    try {
      await setDoc(doc(db, 'settings', 'admin_financial_state'), {
        state,
        updatedAt: Date.now(),
        updatedBy: user?.id
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFinancialState(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const containerClass = isAdmin ? "space-y-6 max-w-4xl mx-auto" : "space-y-8 max-w-4xl mx-auto";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClass}
    >
      
      {/* Profile Header */}
      <motion.div 
        whileHover={!isAdmin ? { scale: 1.01 } : {}}
        className={cn(
          "rounded-[3rem] shadow-sm border overflow-hidden relative",
          isAdmin ? "bg-white border-gray-200" : "bg-gradient-to-tr from-pink-100 via-purple-50 to-indigo-100 border-white/50 backdrop-blur-xl"
        )}
      >
        {!isAdmin && (
          <div className="absolute top-0 right-0 -mr-4 -mt-4 text-pink-200/50 pointer-events-none">
            <Heart size={140} fill="currentColor" />
          </div>
        )}
        <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-10 text-center sm:text-left">
          <div className={cn(
            "h-24 w-24 rounded-full flex items-center justify-center font-black text-4xl shrink-0 shadow-sm",
            isAdmin ? "bg-indigo-600 text-white" : "bg-white/80 text-pink-500 border-2 border-white backdrop-blur-md"
          )}>
            {user?.username.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 flex flex-col justify-center h-full pt-2">
            <h2 className={cn(
              "text-3xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-3",
              isAdmin ? "text-gray-900" : "text-gray-800"
            )}>
              {user?.username} {!isAdmin && <Sparkles className="h-6 w-6 text-pink-400" />}
            </h2>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-6 text-sm font-bold">
              <span className={cn(
                "flex items-center gap-1.5 uppercase tracking-widest",
                isAdmin ? "text-gray-500" : "text-indigo-400"
              )}>
                 User Account
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-widest">
                <Shield className={cn("h-4 w-4", isAdmin ? "text-indigo-500" : "text-pink-400")} />
                <span className={isAdmin ? "text-indigo-700" : "text-pink-600"}>{user?.role}</span>
              </span>
            </div>
            {auth.currentUser?.metadata.creationTime && (
               <div className={cn("mt-4 text-xs font-semibold uppercase tracking-widest", isAdmin ? "text-gray-400" : "text-indigo-400/80")}>
                  Joined {new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()}
               </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Password Change */}
         <div className={cn(
         "rounded-[3rem] shadow-sm border overflow-hidden backdrop-blur-xl h-fit",
         isAdmin ? "bg-white border-gray-200" : "bg-white/80 border-pink-100"
         )}>
            <div className={cn(
               "px-8 py-6 border-b flex items-center gap-3",
               isAdmin ? "border-gray-100" : "border-pink-50 bg-white/50"
            )}>
               <KeyRound className={cn("h-5 w-5", isAdmin ? "text-gray-500" : "text-pink-400")} />
               <h3 className={cn("text-lg font-bold tracking-tight", isAdmin ? "text-gray-900" : "text-gray-800")}>Change Password</h3>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
               {message && (
               <div className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700 border border-green-200 shadow-sm">
                  {message}
               </div>
               )}
               {error && (
               <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 border border-red-200 shadow-sm">
                  {error}
               </div>
               )}

               <div className="group">
               <label className={cn("block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 transition-colors", !isAdmin && "group-focus-within:text-pink-500")}>Current Password</label>
               <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={cn(
                     "block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset transition-all",
                     isAdmin ? "focus:ring-indigo-500" : "focus:ring-pink-400"
                  )}
               />
               </div>

               <div className="group">
               <label className={cn("block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 transition-colors", !isAdmin && "group-focus-within:text-pink-500")}>New Password</label>
               <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                     "block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset transition-all",
                     isAdmin ? "focus:ring-indigo-500" : "focus:ring-pink-400"
                  )}
               />
               </div>

               <div className="group">
               <label className={cn("block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 transition-colors", !isAdmin && "group-focus-within:text-pink-500")}>Confirm New Password</label>
               <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                     "block w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset transition-all",
                     isAdmin ? "focus:ring-indigo-500" : "focus:ring-pink-400"
                  )}
               />
               </div>

               <div className="pt-4">
               <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={cn(
                     "w-full flex justify-center rounded-2xl px-6 py-4 text-base font-black text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all",
                     isAdmin ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 hover:shadow-xl" : "bg-gradient-to-r from-pink-500 to-indigo-500 hover:opacity-90 focus:ring-pink-400 hover:shadow-xl hover:-translate-y-0.5"
                  )}
               >
                  {loading ? 'Updating...' : 'Update Password'}
               </motion.button>
               </div>
            </form>
         </div>

         <div className="space-y-8 h-fit">
            {isAdmin && (
               <div className="rounded-[3rem] shadow-sm border overflow-hidden bg-white border-gray-200">
               <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-bold tracking-tight text-gray-900">Financial State</h3>
               </div>
               <div className="p-8 space-y-6">
                  <p className="text-sm text-gray-500 font-medium">Set your current financial state to let users know before they request money.</p>
                  <div className="grid gap-4">
                     {[
                     { val: 'GOOD', color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200', active: 'ring-2 ring-green-500 ring-offset-2' },
                     { val: 'Okay', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200', active: 'ring-2 ring-orange-500 ring-offset-2' },
                     { val: 'Bad', color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200', active: 'ring-2 ring-red-500 ring-offset-2' }
                     ].map(s => (
                     <button
                        key={s.val}
                        onClick={() => handleFinancialStateChange(s.val)}
                        disabled={savingFinancialState}
                        className={cn(
                           "w-full rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-sm transition-all border",
                           s.color,
                           financialState === s.val ? s.active : "opacity-60"
                        )}
                     >
                        {s.val}
                     </button>
                     ))}
                  </div>
               </div>
               </div>
            )}

            <div className={cn(
               "rounded-[3rem] shadow-sm border overflow-hidden backdrop-blur-xl",
               isAdmin ? "bg-white border-gray-200" : "bg-white/80 border-pink-100"
            )}>
               <div className="p-8">
                  <button
                     onClick={handleLogout}
                     className={cn(
                        "w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-sm transition-all border shadow-sm",
                        isAdmin ? "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" : "bg-white text-gray-700 border-pink-100 hover:bg-pink-50/50"
                     )}
                  >
                     <LogOut className="h-5 w-5" /> Logout
                  </button>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
