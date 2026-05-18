import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Sparkles, LogOut, Scroll, Gem, Map, LineChart, Bell, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: BookOpen },
    { name: 'Wishlist', path: '/admin/wishlist', icon: Gem },
    { name: 'Quests', path: '/admin/quests', icon: Map },
    { name: 'Analytics', path: '/admin/analytics', icon: LineChart },
    { name: 'Date Ideas', path: '/admin/date-ideas', icon: Sparkles },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Profile', path: '/admin/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-16 md:pb-0 bg-gray-50 text-gray-900 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 z-40 overflow-y-auto w-[260px] shadow-sm">
        <div className="h-20 flex flex-shrink-0 items-center px-8 border-b border-gray-100">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
            <User className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <span className="text-xl font-black text-gray-800 tracking-tight block leading-none">Admin</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 block">Dashboard</span>
          </div>
        </div>
        
        <nav className="flex-1 px-5 py-8 space-y-2 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "group relative flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all overflow-hidden",
                  isActive 
                    ? "text-indigo-700 bg-indigo-50 shadow-sm border border-indigo-100" 
                    : "text-gray-500 hover:text-indigo-600 hover:bg-gray-50"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-lg" />
                )}
                <Icon className={cn("mr-3 h-4 w-4 transition-colors", isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-xl transition-all group"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            Logout
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 min-w-0 relative z-10 w-full md:w-auto">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 sm:px-10 sticky top-0 md:static z-30 bg-white/80 backdrop-blur-md">
          <div className="flex items-center flex-shrink-0">
            <div className="md:hidden h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 mr-3">
               <User className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">
                {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">System Online</span>
            </div>
            <button
               onClick={handleLogout}
               className="md:hidden h-9 w-9 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 shadow-sm border border-gray-200 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 lg:p-10 relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-gray-200 shadow-lg rounded-2xl flex justify-around items-center h-16 z-50 px-2 pb-safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[50px] h-full mx-0.5 flex-shrink-0 transition-all",
                isActive ? "text-indigo-600 translate-y-[-2px]" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {isActive && (
                <div className="absolute -top-3 w-4 h-[3px] bg-indigo-500 rounded-full" />
              )}
              <Icon className={cn("h-4 w-4 mb-1 transition-all", isActive && "drop-shadow-sm")} />
              <span className="text-[9px] font-bold leading-tight whitespace-nowrap text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
