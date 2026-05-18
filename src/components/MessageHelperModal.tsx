import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Copy, X, Check } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MessageHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: 'admin' | 'gunj';
  messageText: string;
}

export function MessageHelperModal({ isOpen, onClose, recipientId, messageText }: MessageHelperModalProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    const fetchContact = async () => {
      try {
        const contactDoc = await getDoc(doc(db, 'cnt', recipientId));
        if (contactDoc.exists()) {
          setPhoneNumber(contactDoc.data().num);
        }
      } catch (err) {
        console.error("Error fetching contact:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContact();
  }, [isOpen, recipientId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMessages = () => {
    if (!phoneNumber) return;
    const encodedMessage = encodeURIComponent(messageText);
    const smsUrlIOS = `sms:${phoneNumber}&body=${encodedMessage}`;
    const smsUrlFallback = `sms:${phoneNumber}?body=${encodedMessage}`;
    
    // Try to open standard tel URI, if it fails they can copy.
    // Modern devices often handle sms:number?body=... well.
    // Actually iOS format is sms:number&body=...
    // We will just use the fallback / generic one based on useragent if we wanted, 
    // but the simplest across most devices is `sms:${phoneNumber}?body=${encodedMessage}`
    // Let's use user agent to detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS ? smsUrlIOS : smsUrlFallback;
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4"
      >
        <div className="mx-auto w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-2">
          <MessageCircle className="h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-black text-gray-900">Send a Message</h2>
        <p className="text-sm font-medium text-gray-500">
          Let them know! Tap "Open Messages" to prefill your text app or copy the message.
        </p>

        <div className="bg-gray-50 p-4 rounded-2xl italic text-gray-700 text-sm font-medium border border-gray-100 relative">
          "{messageText}"
        </div>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-100 rounded-xl w-full"></div>
        ) : (
          <div className="space-y-3 pt-2">
            {phoneNumber ? (
              <button
                onClick={handleOpenMessages}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" /> Open Messages
              </button>
            ) : (
              <p className="text-xs text-red-500 font-bold">User contact is missing. Please copy the message manually.</p>
            )}
            
            <button
              onClick={handleCopy}
              className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              {copied ? 'Message copied 💖' : 'Copy message'}
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-gray-400 hover:text-gray-600 font-bold py-2 transition-all text-sm"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
