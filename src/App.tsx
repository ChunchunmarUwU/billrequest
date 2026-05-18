/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import UserLayout from './components/UserLayout';
import AdminLayout from './components/AdminLayout';
import UserDashboard from './pages/UserDashboard';
import NewRequest from './pages/NewRequest';
import RequestDetails from './pages/RequestDetails';
import UserProfile from './pages/UserProfile';
import UserAnalytics from './pages/UserAnalytics';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import UserWishlist from './pages/UserWishlist';
import UserDateIdeas from './pages/UserDateIdeas';
import AdminWishlist from './pages/AdminWishlist';
import AdminDateIdeas from './pages/AdminDateIdeas';
import UserQuests from './pages/UserQuests';
import AdminQuests from './pages/AdminQuests';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={!user ? <Login /> : (user.role === 'Admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)} />
      
      {/* User Routes */}
      <Route path="/" element={user?.role === 'User' ? <UserLayout /> : <Navigate to="/" />}>
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="request/new" element={<NewRequest />} />
        <Route path="request/:id" element={<RequestDetails />} />
        <Route path="analytics" element={<UserAnalytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="wishlist" element={<UserWishlist />} />
        <Route path="date-ideas" element={<UserDateIdeas />} />
        <Route path="quests" element={<UserQuests />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={user?.role === 'Admin' ? <AdminLayout /> : <Navigate to="/" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="wishlist" element={<AdminWishlist />} />
        <Route path="date-ideas" element={<AdminDateIdeas />} />
        <Route path="quests" element={<AdminQuests />} />
      </Route>
    </Routes>
  );
}
