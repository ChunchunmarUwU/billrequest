import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MoneyRequest } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Search, Clock, ArrowRight, AlertCircle, FileText, Download, Briefcase, Heart, Crown, Target, Gift, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, where } from 'firebase/firestore';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [adminStats, setAdminStats] = useState({
    pointsBalance: 0,
    pendingQuests: 0,
    claimedWishlist: 0,
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const daysTogether = Math.floor((new Date().getTime() - new Date("2023-10-08").getTime()) / (1000 * 60 * 60 * 24));
  
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);
  
  // Processing logic
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminComment, setAdminComment] = useState<{ [key: string]: string }>({});
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, id: string | null, status: 'Approved' | 'Rejected' | null }>({ isOpen: false, id: null, status: null });
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'requests'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const reqs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MoneyRequest[];
      setRequests(reqs);

      // Fetch points stats
      const ppSnap = await getDocs(collection(db, 'princessPoints'));
      let pts = 0;
      if (!ppSnap.empty) {
        pts = ppSnap.docs[0].data().balance;
      }
      
      const qSnap = await getDocs(query(collection(db, 'quests'), where('status', '==', 'Submitted')));
      const pendingQ = qSnap.size;

      const wSnap = await getDocs(query(collection(db, 'wishlist'), where('status', '==', 'Claimed')));
      const claimedW = wSnap.size;

      setAdminStats({
        pointsBalance: pts,
        pendingQuests: pendingQ,
        claimedWishlist: claimedW,
      });

    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openConfirmDialog = (id: string, status: 'Approved' | 'Rejected') => {
    setConfirmDialog({ isOpen: true, id, status });
  };

  const handleDecision = async () => {
    const { id, status } = confirmDialog;
    if (!id || !status) return;
    
    setConfirmDialog({ isOpen: false, id: null, status: null });
    setProcessingId(id);
    try {
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, {
        status,
        admin_comment: adminComment[id] || '',
        decision_date: Date.now(),
        updated_at: Date.now()
      });

      if (status === 'Approved') {
        const req = requests.find(r => r.id === id);
        if (req) {
          await addDoc(collection(db, 'notifications'), {
            user_id: req.user_id,
            request_id: id,
            message: 'Your money request was approved!',
            is_read: false,
            created_at: Date.now()
          });
        }
      } else {
        const req = requests.find(r => r.id === id);
        if (req) {
          await addDoc(collection(db, 'notifications'), {
            user_id: req.user_id,
            request_id: id,
            message: 'Your money request was rejected.',
            is_read: false,
            created_at: Date.now()
          });
        }
      }

      showToast('success', `Request successfully ${status.toLowerCase()}.`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      showToast('error', `Failed to process request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'User', 'Amount', 'Currency', 'Category', 'Urgency', 'Importance', 'Status', 'Date', 'Reason', 'Admin Comment'];
    const csvRows = [headers.join(',')];
    
    requests.forEach(req => {
      const row = [
        `"${req.id}"`,
        `"${req.user_name}"`,
        req.amount,
        `"MNT"`,
        `"${req.category}"`,
        `"${req.urgency}"`,
        `"${req.importance}"`,
        `"${req.status}"`,
        `"${format(new Date(req.created_at), 'yyyy-MM-dd HH:mm:ss')}"`,
        `"${req.reason?.replace(/"/g, '""') || ''}"`,
        `"${req.admin_comment?.replace(/"/g, '""') || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `requests_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('success', 'Exported to CSV');
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!req.reason.toLowerCase().includes(q) && !req.category.toLowerCase().includes(q) && !req.user_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700', badge: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200/50', icon: CheckCircle2 };
      case 'Rejected': return { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-700', badge: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 border-rose-200/50', icon: XCircle };
      default: return { bg: 'bg-white/60', border: 'border-indigo-100', text: 'text-slate-800', badge: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200/50 border', icon: Clock };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-sans relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "rounded-2xl px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border flex items-center gap-3 backdrop-blur-xl font-medium",
            toastMessage.type === 'success' ? "bg-emerald-50/95 border-emerald-200/50 text-emerald-900" : "bg-white/95 border-rose-200/50 text-rose-900"
          )}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500 drop-shadow-sm" /> : <AlertCircle className="h-5 w-5 text-rose-500 drop-shadow-sm" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 z-10 mb-8 relative">
        <div className="col-span-2 lg:col-span-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden">
          <Briefcase className="h-8 w-8 text-indigo-500 mb-3" />
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Dashboard</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage all requests.</p>
        </div>

        <div className="col-span-1 border border-pink-100 bg-pink-50/50 rounded-[2rem] shadow-sm p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <Heart className="h-6 w-6 text-pink-400 mb-2 fill-pink-300/50 animate-pulse" />
          <h3 className="text-2xl font-black text-gray-800">{daysTogether}</h3>
          <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-1 text-center">Days Together</p>
        </div>

        <Link to="/admin/quests" className="col-span-1 bg-amber-50/50 rounded-[2rem] shadow-sm border border-amber-100 p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <Target className="h-6 w-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black text-gray-800">{adminStats.pendingQuests}</h3>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1 text-center">Pending Quests</p>
        </Link>
        
        <Link to="/admin/wishlist" className="col-span-1 lg:col-span-1 bg-sky-50/50 rounded-[2rem] shadow-sm border border-sky-100 p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <Gift className="h-6 w-6 text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black text-gray-800">{adminStats.claimedWishlist}</h3>
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mt-1 text-center">Claimed Wishlist</p>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-center z-10">
        <div className="flex w-full flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm font-bold text-gray-700 focus:bg-white focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all cursor-pointer"
            >
              <option value="All">All Requests</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-gray-800 hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-gray-200"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 text-gray-400 bg-white rounded-[2rem] shadow-sm border border-gray-100">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100/50 border-t-indigo-500 mb-6 drop-shadow-sm" />
          <span className="font-bold uppercase tracking-widest text-xs text-indigo-500">Loading requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 text-gray-500 bg-white rounded-[3rem] shadow-sm border border-gray-200 border-dashed">
          <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <FileText className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">No requests found</h3>
          <p className="text-gray-500 font-medium mb-6">No requests match your current filters.</p>
          {(statusFilter !== 'All' || searchQuery !== '') && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="px-8 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 font-bold hover:bg-white hover:text-indigo-600 transition-all shadow-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid gap-6">
          {paginatedRequests.map((req) => {
            const statusInfo = getStatusInfo(req.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={req.id} className={cn("rounded-[2.5rem] shadow-sm border overflow-hidden transition-all bg-white hover:shadow-md hover:-translate-y-0.5", statusInfo.border)}>
                <div className="p-6 sm:p-10 flex flex-col md:flex-row gap-8 lg:gap-12 relative">
                  
                  {/* User Info & Amount */}
                  <div className="flex md:flex-col justify-between items-start md:w-56 shrink-0 pb-6 md:pb-0 border-b md:border-b-0 md:border-r border-gray-100 md:pr-8 relative z-10">
                    <div className="flex items-center gap-4 md:mb-8">
                      <div className="h-14 w-14 rounded-[1.2rem] bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 font-black text-2xl shadow-sm">
                        {req.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-black text-gray-800 tracking-tight">{req.user_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right md:text-left mt-1 md:mt-0 bg-gray-50 rounded-[1.5rem] p-5 border border-gray-100 w-full shadow-inner">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 md:justify-start justify-end">
                         <Gem className="w-3 h-3 text-indigo-400" /> Amount
                      </p>
                      <div className="text-3xl font-black text-gray-900 tracking-tight">{req.amount.toLocaleString()} <span className="text-xs font-bold text-gray-400 align-top mt-1 inline-block">₮</span></div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 min-w-0 flex flex-col relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                       <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-xl bg-gray-100 px-3.5 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest border border-gray-200">
                          {req.category}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded-xl px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border",
                          req.urgency === 'Emergency' ? "bg-rose-50 text-rose-700 border-rose-200" :
                          req.urgency === 'High' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-sky-50 text-sky-700 border-sky-200"
                        )}>
                          {req.urgency}
                        </span>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest shadow-sm", statusInfo.badge)}>
                        <StatusIcon className="h-4 w-4" />
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="mb-8 flex-1">
                      <h4 className="text-xl font-black text-gray-800 mb-3 leading-relaxed tracking-tight">
                        "{req.reason}"
                      </h4>
                      {req.details && (
                        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl font-medium relative pl-4 border-l-2 border-indigo-200">
                          {req.details}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {req.status === 'Pending' ? (
                      <div className="pt-6 border-t border-gray-100 w-full mt-auto">
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
                          <input
                            type="text"
                            placeholder="Add a comment (optional)..."
                            value={adminComment[req.id] || ''}
                            onChange={(e) => setAdminComment(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm font-bold text-gray-700 focus:bg-white focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all placeholder:text-gray-400"
                          />
                          <div className="flex gap-3 shrink-0">
                            <button
                              onClick={() => openConfirmDialog(req.id, 'Rejected')}
                              disabled={processingId === req.id}
                              className="inline-flex justify-center flex-1 sm:flex-none items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-rose-600 border border-gray-200 shadow-sm hover:border-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:opacity-50 transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => openConfirmDialog(req.id, 'Approved')}
                              disabled={processingId === req.id}
                              className="inline-flex justify-center flex-1 sm:flex-none items-center rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 transition-all"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      req.admin_comment && (
                        <div className={cn("mt-auto pt-6 border-t", statusInfo.border)}>
                          <div className="flex items-start gap-4">
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border", statusInfo.bg, statusInfo.border, statusInfo.text)}>
                               <ArrowRight className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                Admin Comment
                              </p>
                              <p className={cn("text-sm font-bold bg-white p-4 rounded-xl border", statusInfo.text, statusInfo.border)}>
                                "{req.admin_comment}"
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-gray-100">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-6 py-2.5 text-sm font-bold rounded-xl text-gray-600 hover:bg-gray-50 hover:text-indigo-600 border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Page <span className="font-black text-indigo-600">{currentPage}</span> of <span className="text-gray-800">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-6 py-2.5 text-sm font-bold rounded-xl text-gray-600 hover:bg-gray-50 hover:text-indigo-600 border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
        </>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })} />
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 fade-in duration-300">
            <div className="p-10 text-center pt-12 relative overflow-hidden">
              <div className={cn(
                "w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner relative z-10",
                confirmDialog.status === 'Approved' ? "bg-emerald-50 text-emerald-500 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100"
              )}>
                {confirmDialog.status === 'Approved' ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight relative z-10">{confirmDialog.status === 'Approved' ? 'Approve Request' : 'Reject Request'}</h3>
              <p className="text-base font-bold text-gray-500 px-4 relative z-10 leading-relaxed">
                Are you sure you want to {confirmDialog.status === 'Approved' ? 'approve' : 'reject'} this request? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-4 rounded-b-[3rem] border-t border-gray-100">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })}
                className="flex-1 rounded-2xl bg-white px-4 py-4 text-sm font-black text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all"
                autoFocus
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                className={cn(
                  "flex-1 rounded-2xl px-4 py-4 text-sm font-black text-white shadow-md focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all hover:-translate-y-0.5",
                  confirmDialog.status === 'Approved' ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30 focus:ring-indigo-200" : "bg-rose-500 hover:bg-rose-600 hover:shadow-rose-500/30 focus:ring-rose-200"
                )}
              >
                Confirm {confirmDialog.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
