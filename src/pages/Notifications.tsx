import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';
import { format } from 'date-fns';
import { Bell, Coins, Check, Heart, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('user_id', '==', user.id),
          orderBy('created_at', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const notifs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        setNotifications(notifs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="p-24 flex flex-col items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />
      </motion.div>
      <p className="mt-6 text-sm font-bold text-gray-400 tracking-widest uppercase">Fetching updates</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className={cn("flex h-20 w-20 items-center justify-center rounded-[2rem] mb-4 shadow-inner", isAdmin ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-pink-100 text-pink-500")}
        >
          <Bell className={cn("h-10 w-10", isAdmin ? "fill-indigo-600/20 text-indigo-600" : "fill-pink-500/20")} />
        </motion.div>
        <div>
          <h1 className={cn("text-3xl tracking-tight", isAdmin ? "font-black text-gray-800" : "font-black text-gray-900")}>Notifications</h1>
          <p className={cn("mt-2 text-base font-medium", isAdmin ? "text-gray-500" : "text-gray-500")}>{isAdmin ? "The latest notices and events." : "Love notes and money updates."}</p>
        </div>
      </div>

      <div className={cn("rounded-[3rem] shadow-sm overflow-hidden", isAdmin ? "bg-white border border-gray-100" : "bg-white/80 backdrop-blur-xl border border-pink-100")}>
        {notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-16 text-center"
          >
            <div className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner", isAdmin ? "bg-gray-50 text-gray-300" : "bg-pink-50 text-pink-300")}>
              <Sparkles className="h-12 w-12" />
            </div>
            <h3 className={cn("text-xl mb-2", isAdmin ? "font-black text-gray-400" : "font-bold text-gray-800")}>{isAdmin ? "No notifications" : "No news yet!"}</h3>
            <p className={cn("font-medium", isAdmin ? "text-gray-400" : "text-gray-500")}>{isAdmin ? "Nothing new to review right now." : "Sit tight, pretty princess. Updates will show up here."}</p>
          </motion.div>
        ) : (
          <ul className={cn("divide-y", isAdmin ? "divide-gray-100" : "divide-pink-50")}>
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.li 
                  layoutId={`notif-${notif.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={notif.id} 
                  className={cn(
                    "p-8 transition-colors relative overflow-hidden group",
                    !notif.is_read ? (isAdmin ? "bg-indigo-50/50" : "bg-pink-50/50") : "bg-white"
                  )}
                >
                  {!notif.is_read && (
                    <div className={cn("absolute top-0 bottom-0 left-0 w-1.5", isAdmin ? "bg-indigo-500" : "bg-pink-400")} />
                  )}
                  <div className="flex gap-6 relative z-10">
                    <div className="flex-shrink-0 mt-1">
                      <div className={cn(
                        "h-12 w-12 rounded-[1.5rem] flex items-center justify-center shadow-sm",
                        !notif.is_read 
                           ? (isAdmin ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-pink-200 text-pink-600") 
                           : (isAdmin ? "bg-gray-50 text-gray-400 border border-gray-100" : "bg-gray-50 text-gray-400 border border-gray-100")
                      )}>
                        {notif.message.includes('princess') ? (
                          <Heart className="h-6 w-6" fill={!notif.is_read ? "currentColor" : "none"} />
                        ) : (
                          <Coins className="h-6 w-6" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-bold leading-relaxed",
                        !notif.is_read ? (isAdmin ? "text-gray-800 text-lg" : "text-gray-900 text-lg") : (isAdmin ? "text-gray-500 text-base" : "text-gray-600 text-base")
                      )}>
                        {notif.message}
                      </p>
                      <p className={cn("text-sm uppercase tracking-wider mt-2", isAdmin ? "font-bold text-gray-400" : "font-bold text-gray-400")}>
                        {format(new Date(notif.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {notif.request_id && (
                        <Link 
                          to={isAdmin ? `/admin` : `/request/${notif.request_id}`}
                          className={cn("inline-flex items-center mt-4 text-sm font-bold px-4 py-2 rounded-full transition-colors", isAdmin ? "bg-white border border-gray-200 text-indigo-600 hover:bg-gray-50" : "text-pink-500 hover:text-pink-600 bg-pink-50")}
                        >
                          View Request <span className="ml-1">&rarr;</span>
                        </Link>
                      )}
                    </div>
                    {!notif.is_read && (
                      <div className="flex-shrink-0 flex flex-col items-end">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => markAsRead(notif.id)}
                          className={cn("text-xs font-bold flex items-center transition-colors px-3 py-1.5 rounded-full shadow-sm border", isAdmin ? "text-gray-500 hover:text-indigo-600 bg-white border-gray-200" : "text-pink-400 hover:text-pink-600 bg-white border-pink-100")}
                        >
                          <Check className="h-3 w-3 mr-1.5" /> Mark read
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  );
}
