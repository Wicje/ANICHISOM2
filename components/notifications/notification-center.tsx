import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useNotificationStore } from '@/lib/stores/notification.store';

const TYPE_CONFIG = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Info },
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, dismiss, markAllRead, clearAll } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('os:toggle-notification-center', handleToggle);
    window.addEventListener('os:close-notification-center', handleClose);
    
    return () => {
      window.removeEventListener('os:toggle-notification-center', handleToggle);
      window.removeEventListener('os:close-notification-center', handleClose);
    };
  }, []);

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllRead();
    }
  }, [isOpen, unreadCount, markAllRead]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-4 top-12 bottom-20 w-80 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white/70" />
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors" title="Clear all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-2">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((notif) => {
                    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, height: 0, scale: 0.9 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                        className="border rounded-xl p-3 pr-8 relative group"
                        style={{ background: config.bg, borderColor: `${config.color}20` }}
                      >
                        <button
                          onClick={() => dismiss(notif.id)}
                          className="absolute right-2 top-2 p-1 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="flex items-start gap-2">
                          <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: config.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-white">{notif.title}</div>
                            {notif.description && (
                              <div className="text-xs text-white/70 mt-1 line-clamp-2">{notif.description}</div>
                            )}
                            <div className="text-[10px] text-white/40 mt-2">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
