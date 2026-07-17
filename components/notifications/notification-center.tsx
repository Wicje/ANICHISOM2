import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Trash2 } from 'lucide-react';
import { useNotificationStore } from '@/lib/stores/notification.store';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, dismiss: removeNotification, clearAll } = useNotificationStore();

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
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, height: 0, scale: 0.9 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 pr-8 relative group"
                    >
                      <button
                        onClick={() => removeNotification(notif.id)}
                        className="absolute right-2 top-2 p-1 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="font-medium text-sm text-white">{notif.title}</div>
                      {notif.description && (
                        <div className="text-xs text-white/70 mt-1 line-clamp-2">{notif.description}</div>
                      )}
                      <div className="text-[10px] text-white/40 mt-2">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
