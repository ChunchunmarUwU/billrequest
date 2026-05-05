import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MoneyRequest } from '../types';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Calendar, Tag, AlertTriangle, MessageSquare, Heart, Sparkles, Send, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    const fetchRequest = async () => {
      try {
        const docRef = doc(db, 'requests', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const reqData = { id: docSnap.id, ...docSnap.data() } as MoneyRequest;
          setRequest(reqData);
          if (reqData.status === 'Approved') {
            triggerConfetti();
          }
        } else {
          setError('Request not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id, user]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  if (loading) return (
    <div className="p-24 flex flex-col items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />
      </motion.div>
      <p className="mt-6 text-sm font-bold text-gray-400 tracking-widest uppercase">Opening Details</p>
    </div>
  );
  if (error || !request) return <div className="p-8 text-center text-red-500">{error || 'Request not found'}</div>;

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold shadow-sm border";
    if (status === 'Approved') return cn(base, "bg-green-50 text-green-700 border-green-200");
    if (status === 'Rejected') return cn(base, "bg-red-50 text-red-700 border-red-200");
    return cn(base, "bg-amber-50 text-amber-700 border-amber-200");
  };

  const StatusIcon = ({ status, className }: { status: string, className?: string }) => {
    if (status === 'Approved') return <CheckCircle2 className={cn("text-green-500", className)} />;
    if (status === 'Rejected') return <XCircle className={cn("text-red-500", className)} />;
    return <Clock className={cn("text-amber-500", className)} />;
  };

  // Timeline derivation
  const timeline = [
    { label: 'Request Submitted', date: request.created_at, icon: Send, active: true },
    { label: 'Under Review', date: null, icon: Eye, active: request.status !== 'Pending' || true },
    { 
      label: request.status === 'Approved' ? 'Approved' : request.status === 'Rejected' ? 'Rejected' : 'Decision Pending', 
      date: request.decision_date, 
      icon: request.status === 'Approved' ? CheckCircle2 : request.status === 'Rejected' ? XCircle : Clock, 
      active: request.status !== 'Pending',
      color: request.status === 'Approved' ? 'text-green-500' : request.status === 'Rejected' ? 'text-red-500' : 'text-gray-400'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-6 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-pink-500 transition-colors bg-white px-4 py-2 rounded-full shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-sm border border-pink-100 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-pink-50 relative overflow-hidden">
          {request.status === 'Approved' && (
            <motion.div 
              initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 10, scale: 1, opacity: 0.1 }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 4 }}
              className="absolute -top-10 -right-10 text-green-500 z-0 pointer-events-none"
            >
              <Heart size={200} fill="currentColor" />
            </motion.div>
          )}

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{request.reason}</h1>
                <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
                  {format(new Date(request.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className={getStatusBadge(request.status)}>
                <StatusIcon status={request.status} className="mr-1.5 h-4 w-4" />
                {request.status}
              </div>
            </div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              className={cn(
                "rounded-3xl p-8 flex flex-col items-center justify-center border shadow-inner transition-colors",
                request.status === 'Approved' ? "bg-green-50 border-green-100" :
                request.status === 'Rejected' ? "bg-red-50 border-red-100" :
                "bg-indigo-50 border-indigo-100"
              )}
            >
              <span className={cn(
                "text-xs font-black uppercase tracking-widest mb-1",
                request.status === 'Approved' ? "text-green-500" :
                request.status === 'Rejected' ? "text-red-500" :
                "text-indigo-500"
              )}>Amount Requested</span>
              <span className="text-5xl font-black text-gray-900">
                {request.amount.toLocaleString()} <span className="text-2xl text-gray-400 font-bold">{request.currency}</span>
              </span>
            </motion.div>
          </div>
        </div>

        <div className="p-8 sm:p-10 space-y-12">

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 pl-2">Timeline</h3>
            <div className="relative">
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100 rounded-full" />
              <div className="space-y-6 relative">
                {timeline.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className={cn("flex items-start gap-4", step.active ? "opacity-100" : "opacity-40")}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                        step.color ? "bg-white border-transparent shadow-sm" : step.active ? "bg-indigo-50 border-indigo-200 text-indigo-500" : "bg-gray-50 border-gray-200 text-gray-400"
                      )}>
                        <Icon className={cn("h-5 w-5", step.color)} />
                      </div>
                      <div className="pt-2">
                        <p className={cn("text-sm font-bold", step.color || "text-gray-900")}>{step.label}</p>
                        {step.date && (
                          <p className="text-xs font-medium text-gray-400 mt-0.5">{format(new Date(step.date), 'MMM d, yyyy h:mm a')}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-400 shrink-0">
                 <Tag className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Category</p>
                <p className="mt-1 text-base font-bold text-gray-900">{request.category}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 shrink-0">
                 <Calendar className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Needed By</p>
                <p className="mt-1 text-base font-bold text-gray-900">
                  {request.needed_by_date ? format(new Date(request.needed_by_date), 'MMM d, yyyy') : 'Not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 shrink-0">
                 <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Urgency & Importance</p>
                <p className="mt-1 text-base font-bold text-gray-900">
                  <span className={cn(
                    request.urgency === 'Emergency' ? 'text-red-500' : request.urgency === 'High' ? 'text-orange-500' : ''
                  )}>{request.urgency}</span> / <span>{request.importance}</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 sm:col-span-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                 <MessageSquare className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Full Explanation</p>
                <p className="mt-2 text-base font-medium text-gray-700 leading-relaxed bg-white rounded-2xl p-4 border border-gray-100 shadow-sm whitespace-pre-wrap">
                  {request.details || 'No additional details provided.'}
                </p>
              </div>
            </div>
          </div>

          {(request.status !== 'Pending' || request.admin_comment) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "rounded-[2rem] p-8 border shadow-sm relative overflow-hidden",
                request.status === 'Approved' ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100" :
                request.status === 'Rejected' ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-100" :
                "bg-gray-50 border-gray-200"
              )}
            >
              <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-500 relative z-10">
                <BriefcaseIcon className="h-4 w-4" /> Admin Decision
              </h3>
              
              {request.status === 'Approved' && (
                <div className="mb-6 inline-flex flex-wrap items-center rounded-2xl bg-white px-5 py-3 border border-green-200 shadow-lg text-sm font-black text-green-700 relative z-10 transform -rotate-1">
                  🎉 "The RICH SUCCESSFUL boyfriend has granted his pretty princess money." <Sparkles className="inline ml-2 h-4 w-4 text-green-500" />
                </div>
              )}

              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Comment</p>
                {request.admin_comment ? (
                  <p className="text-gray-800 text-lg font-medium italic bg-white/50 p-4 rounded-xl">"{request.admin_comment}"</p>
                ) : (
                  <p className="text-gray-400 italic font-medium">No specific comment provided.</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BriefcaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
