import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, Bell, User, LogOut, BarChart3, Gift, CalendarHeart, MoreHorizontal, X, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function UserLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (user) {
      const q = query(collection(db, 'notifications'), where('user_id', '==', user.id));
      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          setUnreadCount(snapshot.docs.filter(d => !d.data().is_read).length);
        },
        (error) => {
          console.error('Firestore Error in notifications snapshot:', error);
        }
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const desktopNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'New Req', path: '/request/new', icon: PlusCircle },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Quests', path: '/quests', icon: Target },
    { name: 'Wishlist', path: '/wishlist', icon: Gift },
    { name: 'Dates', path: '/date-ideas', icon: CalendarHeart },
    { name: 'Notifs', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const mainMobileItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'New Req', path: '/request/new', icon: PlusCircle },
    { name: 'Quests', path: '/quests', icon: Target },
    { name: 'Wishlist', path: '/wishlist', icon: Gift },
  ];

  const moreMobileItems = [
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Dates', path: '/date-ideas', icon: CalendarHeart },
    { name: 'Notifs', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const isMoreActive = moreMobileItems.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen relative pb-20 sm:pb-0">
      {/* Background Image Container with Soft Fallback Gradient */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-40 mix-blend-multiply" 
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}bg-image.png')` }} 
        />
        {/* Soft overlay to ensure readability of UI components */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden sm:block border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 overflow-x-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center flex-shrink-0">
              <span className="text-xl font-bold text-gray-900 tracking-tight mr-4">Portal</span>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide py-2">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "group relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0",
                      isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-indigo-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("mr-2 h-5 w-5", isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500")} />
                    {item.name}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors whitespace-nowrap flex-shrink-0"
              >
                <LogOut className="mr-2 h-5 w-5 text-gray-400" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <div className="sm:hidden flex items-center justify-between px-4 h-16 bg-white/80 backdrop-blur-md border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center">
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            {desktopNavItems.find(i => i.path === location.pathname)?.name || 'Portal'}
          </span>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700 p-2">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
      
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav 
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center z-50 px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {mainMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-[20%] h-16 flex-shrink-0",
                isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap text-center">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={cn(
            "relative flex flex-col items-center justify-center w-[20%] h-16 flex-shrink-0 focus:outline-none",
            (isMoreActive || isMoreOpen) ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
          )}
        >
          {isMoreOpen ? <X className="h-5 w-5 mb-1" /> : <MoreHorizontal className="h-5 w-5 mb-1" />}
          <span className="text-[10px] font-medium leading-tight whitespace-nowrap text-center">More</span>
          {(!isMoreOpen && unreadCount > 0) && (
            <span className="absolute top-1 right-2 translate-x-1 inline-flex items-center justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* Mobile More Menu */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="sm:hidden fixed left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl z-40 overflow-hidden"
              style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
              <div className="p-4 space-y-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                {moreMobileItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-4 rounded-2xl transition-colors",
                        isActive ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700 hover:bg-gray-50 font-medium"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl mr-4", isActive ? "bg-indigo-100/50" : "bg-gray-100")}>
                        <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-gray-500")} />
                      </div>
                      <span className="flex-1">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center px-4 py-4 rounded-2xl transition-colors text-red-600 hover:bg-red-50 font-medium text-left"
                >
                  <div className="p-2 rounded-xl mr-4 bg-red-50">
                    <LogOut className="h-5 w-5 text-red-500" />
                  </div>
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
