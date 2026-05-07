import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, BarChart3, Settings, LogOut, Briefcase, Gift, CalendarHeart } from 'lucide-react';
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
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Wishlist', path: '/admin/wishlist', icon: Gift },
    { name: 'Dates', path: '/admin/date-ideas', icon: CalendarHeart },
    { name: 'Profile', path: '/admin/profile', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:grid md:grid-cols-[260px_1fr] pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col bg-gray-900 border-r border-gray-800 h-screen sticky top-0 z-40 overflow-y-auto w-[260px]">
        <div className="h-16 flex flex-shrink-0 items-center px-6 border-b border-gray-800">
          <Briefcase className="h-6 w-6 text-indigo-400 mr-2" />
          <span className="text-lg font-bold text-white tracking-tight">Admin Console</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "group flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-200" : "text-gray-500 group-hover:text-gray-300")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-3 text-sm font-bold text-gray-400 hover:bg-gray-800 hover:text-white rounded-2xl transition-all"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-500" />
            Logout
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 md:static z-30">
          <div className="flex items-center flex-shrink-0">
            <Briefcase className="h-6 w-6 text-indigo-600 mr-3 md:hidden" />
            <h1 className="text-xl font-semibold text-gray-800">
              {navItems.find(i => i.path === location.pathname)?.name || 'Admin'}
            </h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 hidden sm:inline">Logged in as <strong>Admin</strong></span>
            <button
               onClick={handleLogout}
               className="md:hidden ml-4 text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center h-16 z-50 pb-safe overflow-x-auto scrollbar-hide px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[60px] h-full mx-1 flex-shrink-0",
                isActive ? "text-indigo-400" : "text-gray-400 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[9px] font-medium leading-tight whitespace-nowrap text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
