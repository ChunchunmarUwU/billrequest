import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MoneyRequest } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Search, Clock, ArrowRight, AlertCircle, FileText, Download, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
      case 'Approved': return { bg: 'bg-emerald-50/30', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 };
      case 'Rejected': return { bg: 'bg-rose-50/30', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800', icon: XCircle };
      default: return { bg: 'bg-white', border: 'border-indigo-100', text: 'text-gray-900', badge: 'bg-amber-100 text-amber-800 border-amber-200 border', icon: Clock };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "rounded-xl px-4 py-3 shadow-xl border flex items-center gap-3 backdrop-blur-xl font-medium",
            toastMessage.type === 'success' ? "bg-emerald-50/90 border-emerald-200 text-emerald-900" : "bg-white border-rose-200 text-rose-900"
          )}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-rose-500" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col xl:flex-row gap-6 justify-between items-center z-10 mb-8">
        <div className="self-start xl:self-auto flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Admin Console</h2>
            <p className="text-sm font-medium text-gray-500">Manage and review incoming requests.</p>
          </div>
        </div>
        
        <div className="flex w-full xl:w-auto flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search user, category, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm font-bold text-gray-700 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="All">All Requests</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 text-gray-500 bg-white rounded-[2rem] shadow-sm border border-gray-100">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 mb-6" />
          <span className="font-bold uppercase tracking-widest text-xs">Loading requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 text-gray-500 bg-white rounded-[2rem] shadow-sm border border-gray-200 border-dashed">
          <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No requests found</h3>
          <p className="text-gray-500 font-medium mb-6">Try adjusting your search or filters.</p>
          {(statusFilter !== 'All' || searchQuery !== '') && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="px-6 py-2.5 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
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
              <div key={req.id} className={cn("rounded-[2rem] shadow-sm border overflow-hidden transition-all bg-white hover:shadow-md", statusInfo.border)}>
                <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-8 lg:gap-12">
                  
                  {/* User Info & Amount */}
                  <div className="flex md:flex-col justify-between items-start md:w-64 shrink-0 pb-6 md:pb-0 border-b md:border-b-0 md:border-r border-gray-100 md:pr-8">
                    <div className="flex items-center gap-4 md:mb-6">
                      <div className="h-12 w-12 rounded-[1rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                        {req.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">{req.user_name}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right md:text-left mt-1 md:mt-0 bg-gray-50 rounded-2xl p-4 border border-gray-100 w-full">
                      <p className="text-xs text-gray-500 font-black uppercase tracking-widest mb-1.5">Amount</p>
                      <div className="text-3xl font-black text-gray-900 tracking-tight">{req.amount.toLocaleString()} <span className="text-sm font-bold text-gray-400">₮</span></div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                       <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 uppercase tracking-wider">
                          {req.category}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider",
                          req.urgency === 'Emergency' ? "bg-red-100 text-red-700" :
                          req.urgency === 'High' ? "bg-orange-100 text-orange-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          Urgency: {req.urgency}
                        </span>
                        {req.adminFinancialStateAtSubmission && (
                          <span className={cn(
                            "inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider",
                            req.adminFinancialStateAtSubmission === 'GOOD' ? 'bg-green-100 text-green-700' :
                            req.adminFinancialStateAtSubmission === 'Okay' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            Fin State: {req.adminFinancialStateAtSubmission}
                          </span>
                        )}
                        {req.needed_by_date && (
                           <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Needed: {format(new Date(req.needed_by_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest", statusInfo.badge)}>
                        <StatusIcon className="h-4 w-4" />
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="mb-6 flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2 leading-relaxed">
                        "{req.reason}"
                      </h4>
                      {req.details && (
                        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
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
                            placeholder="Add an admin remark (optional)..."
                            value={adminComment[req.id] || ''}
                            onChange={(e) => setAdminComment(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                          <div className="flex gap-3 shrink-0">
                            <button
                              onClick={() => openConfirmDialog(req.id, 'Rejected')}
                              disabled={processingId === req.id}
                              className="inline-flex justify-center flex-1 sm:flex-none items-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-red-600 border border-red-200 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => openConfirmDialog(req.id, 'Approved')}
                              disabled={processingId === req.id}
                              className="inline-flex justify-center flex-1 sm:flex-none items-center rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      req.admin_comment && (
                        <div className={cn("mt-auto pt-6 border-t", statusInfo.border)}>
                          <div className="flex items-start gap-3">
                            <ArrowRight className={cn("h-5 w-5 mt-0.5", statusInfo.text)} />
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                                Admin Remark
                              </p>
                              <p className={cn("text-sm font-medium", statusInfo.text)}>
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
          <div className="mt-8 flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-bold rounded-xl text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-500">
              Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-bold rounded-xl text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
        </>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 fade-in duration-200">
            <div className="p-8 text-center pt-10">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                confirmDialog.status === 'Approved' ? "bg-emerald-100 text-emerald-500" : "bg-red-100 text-red-500"
              )}>
                {confirmDialog.status === 'Approved' ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Confirm {confirmDialog.status}</h3>
              <p className="text-base font-medium text-gray-500 px-4">
                Are you sure you want to {confirmDialog.status?.toLowerCase()} this request? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-4 rounded-b-[2rem] border-t border-gray-100">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                autoFocus
              >
                Go Back
              </button>
              <button
                onClick={handleDecision}
                className={cn(
                  "flex-1 rounded-xl px-4 py-3 text-sm font-black text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
                  confirmDialog.status === 'Approved' ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500" : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                )}
              >
                Yes, {confirmDialog.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
