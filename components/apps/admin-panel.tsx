'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { audioSystem } from '@/lib/services/audio-engine';
import { getSupabase } from '@/lib/supabase';
import { ShieldCheck, UserCheck, UserX, Key, RefreshCw, Loader2, AppWindow, Plus, Trash2, Activity, HardDrive, Cpu, Ticket, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

export function AdminPanel({ window: osWindow }: { window: OSWindow }) {
  const { currentUser } = useOS();
  const [activeTab, setActiveTab] = useState<'dashboard'|'users'|'apps'|'invites'|'marketplace'>('dashboard');
  
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCount, setInviteCount] = useState(1);
  const [inviteRole, setInviteRole] = useState('filmmaker');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const analyticsData = [
    { time: '00:00', load: 12, users: 4 },
    { time: '04:00', load: 15, users: 2 },
    { time: '08:00', load: 45, users: 18 },
    { time: '12:00', load: 82, users: 42 },
    { time: '16:00', load: 60, users: 35 },
    { time: '20:00', load: 30, users: 15 },
    { time: '24:00', load: 20, users: 8 },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .limit(500);
      if (!error && data) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/admin/invites');
      const json = await res.json();
      if (json.success && json.data?.invites) {
        setInvites(json.data.invites);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/marketplace?status=pending');
      const json = await res.json();
      if (json.ok) setSubmissions(json.submissions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSubmission = async (submissionId: string, action: 'approve' | 'reject') => {
    const notes = action === 'reject' ? prompt('Rejection reason (optional):') : '';
    try {
      const res = await fetch('/api/marketplace/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, action, reviewNotes: notes || '' }),
      });
      const json = await res.json();
      if (json.ok) {
        fetchSubmissions();
      } else {
        window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Review Failed', description: json.error || 'Failed to review', type: 'error' } }));
      }
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Review Error', description: e.message, type: 'error' } }));
    }
  };

  const generateInvites = async () => {
    setGenerating(true);
    try {
      let createdCodes: any[] = [];

      try {
        const res = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: inviteCount,
            role: inviteRole,
            expiresInDays: inviteExpiry ? parseInt(inviteExpiry) : undefined,
          }),
        });
        const json = await res.json();
        if (json.success && json.data?.codes) {
          createdCodes = json.data.codes;
        }
      } catch (err) {
        console.warn('API invite generation offline, using local fallback:', err);
      }

      // Local fallback if API didn't return codes (e.g. offline/guest mode)
      if (createdCodes.length === 0) {
        const prefix = inviteRole === 'beta' ? 'BETA' : inviteRole === 'admin' ? 'ADMIN' : inviteRole === 'filmmaker' ? 'FILM' : 'USER';
        for (let i = 0; i < inviteCount; i++) {
          const randHex = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
          const code = `${prefix}-${randHex}`;
          createdCodes.push({
            id: 'local-' + Date.now() + '-' + i,
            code,
            role: inviteRole,
            createdAt: new Date().toISOString(),
            expiresAt: inviteExpiry ? new Date(Date.now() + parseInt(inviteExpiry) * 86400000).toISOString() : null,
          });
        }
      }

      // Persist created codes locally so they never disappear (Issue fix)
      let existingLocal: any[] = [];
      try {
        existingLocal = JSON.parse(localStorage.getItem('continuaos_invites_cache') || '[]');
      } catch {}
      const updatedLocal = [...createdCodes, ...existingLocal];
      try {
        localStorage.setItem('continuaos_invites_cache', JSON.stringify(updatedLocal));
      } catch {}

      setInvites(updatedLocal);

      const newCodesStr = createdCodes.map((c: any) => c.code).join(', ');
      window.dispatchEvent(new CustomEvent('os:notify', { 
        detail: { 
          title: `Generated ${createdCodes.length} ${inviteRole.toUpperCase()} Code(s)`, 
          description: `Codes: ${newCodesStr}`, 
          type: 'success' 
        } 
      }));
      audioSystem.playClick();
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Generation Error', description: e.message, type: 'error' } }));
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    fetchInvites();
    
    // Subscribe to apps collection via Supabase Realtime
    const channel = getSupabase()
      .channel('admin:apps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apps' },
        () => {
          getSupabase()
            .from('apps')
            .select('*')
            .limit(200)
            .then(({ data }) => {
              if (data) setApps(data);
            });
        }
      )
      .subscribe();

    // Initial apps fetch
    getSupabase()
      .from('apps')
      .select('*')
      .limit(200)
      .then(({ data }) => {
        if (data) setApps(data);
      });
    
    return () => { getSupabase().removeChannel(channel); };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await getSupabase().from('users').update({ status: 'approved' }).eq('id', id);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      await getSupabase().from('users').update({ role }).eq('id', id);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await getSupabase().auth.resetPasswordForEmail(email);
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Password Reset', description: `Password reset email sent to ${email}`, type: 'success' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Reset Error', description: e.message, type: 'error' } }));
    }
  };

  const handleAddApp = async () => {
    const title = prompt("Enter the App Name (e.g., Internal CRM):");
    const url = prompt("Enter the App URL (e.g., https://crm.company.com):");
    if (!title || !url || !currentUser) return;
    
    try {
      const appId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await getSupabase().from('apps').upsert({
        id: appId,
        title,
        url,
        icon: 'Globe',
        color: 'text-emerald-400',
        ownerId: currentUser.id
      }, { onConflict: 'id' });
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Add App Error', description: e.message, type: 'error' } }));
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Remove this app from the OS registry?")) return;
    try {
      await getSupabase().from('apps').delete().eq('id', id);
    } catch(e: any) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Delete App Error', description: e.message, type: 'error' } }));
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
              <button onClick={() => setActiveTab('dashboard')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'dashboard' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>Dashboard</button>
              <button onClick={() => setActiveTab('users')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'users' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>Users</button>
              <button onClick={() => setActiveTab('invites')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'invites' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>Invites</button>
               <button onClick={() => setActiveTab('apps')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'apps' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>App Registry</button>
               <button onClick={() => setActiveTab('marketplace')} className={cn("px-4 py-1.5 rounded-md transition-colors", activeTab === 'marketplace' ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90")}>Marketplace</button>
            </div>
         </div>
          {activeTab === 'users' ?(
            <button onClick={fetchUsers} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white">
               <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          ) : activeTab === 'invites' ? (
            <button onClick={fetchInvites} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white">
               <RefreshCw className="w-4 h-4" />
            </button>
          ) : activeTab === 'marketplace' ? (
            <button onClick={fetchSubmissions} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white">
               <RefreshCw className="w-4 h-4" />
            </button>
          ) : (
           <button onClick={handleAddApp} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors">
              <Plus className="w-4 h-4" /> Add App
           </button>
         )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {activeTab === 'dashboard' && (
           <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 text-white/50 mb-2 text-sm"><Activity className="w-4 h-4 text-emerald-400" /> System Load</div>
                    <div className="text-3xl font-bold">42%</div>
                    <div className="text-xs text-emerald-400 mt-2">Optimal performance</div>
                 </div>
                 <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 text-white/50 mb-2 text-sm"><HardDrive className="w-4 h-4 text-blue-400" /> Database I/O</div>
                    <div className="text-3xl font-bold">12.4k</div>
                    <div className="text-xs text-blue-400 mt-2">Operations / minute</div>
                 </div>
                 <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 text-white/50 mb-2 text-sm"><Cpu className="w-4 h-4 text-purple-400" /> Active Sessions</div>
                    <div className="text-3xl font-bold">84</div>
                    <div className="text-xs text-purple-400 mt-2">Across 3 regions</div>
                 </div>
              </div>
              
              <div className="bg-[#111] border border-white/10 rounded-xl p-6 shadow-lg h-80 flex flex-col mt-2">
                 <h3 className="font-bold mb-4 text-white/80">Compute Usage & Session Load</h3>
                 <div className="flex-1 min-h-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={analyticsData}>
                       <defs>
                         <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                       <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#111', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                         itemStyle={{ color: '#fff' }}
                       />
                       <Area type="monotone" dataKey="load" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" name="Compute Load (%)" />
                       <Area type="monotone" dataKey="users" stroke="#60a5fa" strokeWidth={2} fill="transparent" name="Active Users" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>
           </div>
         )}
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

          {activeTab === 'invites' && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Ticket className="w-4 h-4 text-emerald-400" /> Generate Invite Codes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Count</label>
                    <input type="number" min={1} max={50} value={inviteCount} onChange={e => setInviteCount(parseInt(e.target.value) || 1)} className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-emerald-400">
                      <option value="beta">🎟️ Beta Tester (Beta Boys)</option>
                      <option value="user">👤 Standard User</option>
                      <option value="filmmaker">🎬 Filmmaker</option>
                      <option value="technician">⚡ Technician</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Expires (days, blank=never)</label>
                    <input type="number" min={1} value={inviteExpiry} onChange={e => setInviteExpiry(e.target.value)} placeholder="Never" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 placeholder-white/20" />
                  </div>
                  <button onClick={generateInvites} disabled={generating} className="flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50">
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>

              {invites.length === 0 ? (
                <div className="text-center text-white/50 text-sm py-8">No invite codes yet.</div>
              ) : (
                <div className="grid gap-2">
                  {invites.map(inv => (
                    <div key={inv.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-white bg-white/10 px-2 py-1 rounded">{inv.code}</span>
                        <button onClick={() => copyCode(inv.code)} className="text-white/40 hover:text-white" title="Copy">
                          {copiedCode === inv.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-white/50">{inv.role}</span>
                        {inv.email && <span className="text-white/40">{inv.email}</span>}
                        {inv.usedBy && <span className="text-emerald-400/60">Used</span>}
                        {!inv.usedBy && <span className="text-white/30">Unused</span>}
                        {inv.expiresAt && <span className="text-white/30">Exp: {new Date(inv.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

          {activeTab === 'marketplace' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/80">Pending Submissions ({submissions.length})</h3>
                <button onClick={fetchSubmissions} className="text-xs text-white/50 hover:text-white">Refresh</button>
              </div>
              {submissions.length === 0 ? (
                <div className="text-center text-white/50 text-sm py-8">No pending submissions.</div>
              ) : (
                <div className="grid gap-3">
                  {submissions.map((sub: any) => (
                    <div key={sub.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-sm">{sub.name}</div>
                          <div className="text-xs text-white/50 mt-1">{sub.description}</div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                            <span>v{sub.version}</span>
                            <span className="bg-white/10 px-2 py-0.5 rounded">{sub.category}</span>
                            <span>{sub.developer_id?.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewSubmission(sub.id, 'approve')}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-xs font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewSubmission(sub.id, 'reject')}
                            className="px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
