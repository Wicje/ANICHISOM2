'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { db, doc, updateDoc, collection, getDocs, setDoc, deleteDoc, sendPasswordResetEmail, auth, onSnapshot, query, limit } from '@/lib/firebase';
import { ShieldCheck, UserCheck, UserX, Key, RefreshCw, Loader2, AppWindow, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPanel({ window }: { window: OSWindow }) {
  const { currentUser } = useOS();
  const [activeTab, setActiveTab] = useState<'users'|'apps'>('users');
  
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), limit(500));
      const qs = await getDocs(q);
      const loaded: any[] = [];
      qs.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() });
      });
      setUsers(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    
    // Subscribe to apps collection
    const appsQuery = query(collection(db, 'apps'), limit(200));
    const unsubApps = onSnapshot(appsQuery, (snap) => {
      const loadedApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApps(loadedApps);
    });
    
    return () => unsubApps();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { status: 'approved' });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { role });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (e: any) {
      alert(`Error sending reset email: ${e.message}`);
    }
  };

  const handleAddApp = async () => {
    const title = prompt("Enter the App Name (e.g., Internal CRM):");
    const url = prompt("Enter the App URL (e.g., https://crm.company.com):");
    if (!title || !url || !currentUser) return;
    
    try {
      const appId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      // Set fixed Icon and Color for now to simplify UI, these can be extended
      await setDoc(doc(db, 'apps', appId), {
        title,
        url,
        icon: 'Globe',
        color: 'text-emerald-400',
        ownerId: currentUser.id
      });
    } catch (e: any) {
      alert('Error adding app: ' + e.message);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Remove this app from the OS registry?")) return;
    try {
      await deleteDoc(doc(db, 'apps', id));
    } catch(e: any) {
      alert('Error deleting app: ' + e.message);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-6">
           <h2 className="text-lg font-medium flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              OS Configuration
           </h2>
           <div className="flex items-center gap-2 text-sm bg-white/5 p-1 rounded-lg">
             <button onClick={() => setActiveTab('users')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'users' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>Users</button>
             <button onClick={() => setActiveTab('apps')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'apps' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>App Registry</button>
           </div>
         </div>
         {activeTab === 'users' ?(
           <button onClick={fetchUsers} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
           </button>
         ) : (
           <button onClick={handleAddApp} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors">
              <Plus className="w-4 h-4" /> Add App
           </button>
         )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {activeTab === 'users' && (
           <>
             {loading ? (
                <div className="flex justify-center py-8">
                   <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
             ) : users.length === 0 ? (
                <div className="text-center text-white/50 text-sm py-8">No users found.</div>
             ) : (
                <div className="grid gap-3">
                   {users.map(u => (
                      <div key={u.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                         <div className="flex flex-col">
                            <span className="font-semibold text-sm">{u.name}</span>
                            <span className="text-xs text-white/50 font-mono">{u.email}</span>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-white/40">Role:</span>
                               <select 
                                 value={u.role || 'filmmaker'} 
                                 onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                 className="bg-black border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-emerald-400"
                                 disabled={u.status !== 'approved' && u.role !== 'admin'}
                               >
                                  <option value="admin">Admin</option>
                                  <option value="technician">Technician</option>
                                  <option value="filmmaker">Filmmaker</option>
                               </select>
                            </div>

                            {u.status === 'pending' ? (
                               <button onClick={() => handleApprove(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded shadow text-xs font-medium transition-colors">
                                  <UserCheck className="w-4 h-4" /> Approve
                               </button>
                            ) : (
                               <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-emerald-400 text-xs px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                     Active
                                  </div>
                                  <button onClick={() => handleResetPassword(u.email)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors" title="Send Password Reset">
                                     <Key className="w-4 h-4" />
                                  </button>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             )}
           </>
         )}

         {activeTab === 'apps' && (
           <>
              {apps.length === 0 ? (
                <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 w-full">
                  <AppWindow className="w-8 h-8 text-white/40" />
                  <div className="text-white font-medium">No External Company Tools Found</div>
                  <div className="text-white/60 text-sm max-w-sm">
                    Apps registered here will be synchronized to all active user workspaces instantly.
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                   {apps.map(app => (
                      <div key={app.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                             <AppWindow className="w-5 h-5 text-emerald-400" />
                           </div>
                           <div className="flex flex-col">
                              <span className="font-semibold text-sm">{app.title}</span>
                              <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{app.url}</a>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 mr-4 font-mono">ID: {app.id}</span>
                            <button onClick={() => handleDeleteApp(app.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition-colors" title="Remove App">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
              )}
           </>
         )}
      </div>
    </div>
  );
}
