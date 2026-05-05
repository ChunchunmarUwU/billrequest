import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Coins, Home, PlusCircle, Bell, User, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function UserLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
        const q = query(collection(db, 'notifications'), where('user_id', '==', user.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.docs.filter(d => !d.data().is_read).length);
        });
        return unsubscribe;
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'New Request', path: '/request/new', icon: PlusCircle },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-indigo-50/50 pb-16 sm:pb-0">
      {/* Desktop Navigation */}
      <nav className="hidden sm:block border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Coins className="h-8 w-8 text-indigo-500 mr-2" />
              <span className="text-xl font-bold text-gray-900 tracking-tight">Request Portal</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "group relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
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
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <LogOut className="mr-2 h-5 w-5 text-gray-400" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <div className="sm:hidden flex items-center justify-between px-4 h-16 bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center">
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            {navItems.find(i => i.path === location.pathname)?.name || 'Request Portal'}
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full",
                isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1/4 translate-x-2 -translate-y-1 inline-flex items-center justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white border-2 border-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
