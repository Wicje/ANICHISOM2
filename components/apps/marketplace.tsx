'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Store, Download, CheckCircle, Trash2, Box, Sparkles, Server, ShoppingBag, Cpu, Code2, Camera, Star, Code, UploadCloud, FileText, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { get, set } from 'idb-keyval';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PluginPack {
  id: string;
  name: string;
  description: string;
  developer: string;
  price: string;
  icon: any;
  features: string[];
  isFirstParty: boolean;
  githubUrl?: string;
}

const AVAILABLE_PACKS: PluginPack[] = [
  {
    id: 'proposals',
    name: 'ANICHISOM Creative Pack',
    description: 'The ultimate agency toolkit. Moodboard Mill, Proposal Generator, Client Portal, and Brand Guides.',
    developer: 'ANICHISOM',
    price: '$15/mo',
    icon: Sparkles,
    features: ['Moodboard Mill (Voting)', 'Proposal Generator', 'Phase-aware UI', 'Client Portal'],
    isFirstParty: true
  },
  {
    id: 'ziklag',
    name: 'Ziklag Forensics Pack',
    description: 'Data recovery and forensics toolkit. Case Management, Chain of Custody, and Evidence Logs.',
    developer: 'ANICHISOM',
    price: '$25/mo',
    icon: Server,
    features: ['Case Manager', 'Chain of Custody', 'Evidence Log', 'Hash Verifier'],
    isFirstParty: true
  },
  {
    id: 'clothing',
    name: 'Clothing Brand Pack',
    description: 'End-to-end fashion venture management. Lookbooks, inventory, and Shopify integration.',
    developer: 'ANICHISOM',
    price: '$12/mo',
    icon: ShoppingBag,
    features: ['Lookbook Manager', 'Supplier Tracker', 'Collection Planner', 'Shopify Sync'],
    isFirstParty: true
  },
  {
    id: 'hardware',
    name: 'Hardware Pack',
    description: 'Electronics venture management. BOMs, firmware tracking, and component libraries.',
    developer: 'ANICHISOM',
    price: '$12/mo',
    icon: Cpu,
    features: ['BOM Manager', 'Firmware Tracker', 'Supplier Contacts', 'Component Library'],
    isFirstParty: true
  },
  {
    id: 'developer',
    name: 'Developer Pack',
    description: 'Freelance developer environment. Deployment tracking, code review logs, and CI bridge.',
    developer: 'ANICHISOM',
    price: '$10/mo',
    icon: Code2,
    features: ['Deployment Tracker', 'Code Review Log', 'API Monitor', 'CI Bridge'],
    isFirstParty: true
  },
  {
    id: 'photography',
    name: 'Photography Pack',
    description: 'Freelance photography toolkit. Galleries, client delivery, and print orders.',
    developer: 'ANICHISOM',
    price: '$10/mo',
    icon: Camera,
    features: ['Gallery Manager', 'Client Delivery', 'Watermarking', 'Print Orders'],
    isFirstParty: true
  },
  {
    id: 'sidegigs',
    name: 'Side Gigs Pack',
    description: 'Manage multiple side hustles easily. Income tracking, client CRM, and task boards.',
    developer: 'ANICHISOM',
    price: '$5/mo',
    icon: Briefcase,
    features: ['Income Tracker', 'Client CRM', 'Task Boards', 'Tax Export'],
    isFirstParty: true
  }
];

export function Marketplace({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser, installedApps, installApp, uninstallApp, openWindow } = useOS();
  const [packs, setPacks] = useState<PluginPack[]>(AVAILABLE_PACKS);
  const [selectedPack, setSelectedPack] = useState<PluginPack | null>(null);
  const [viewMode, setViewMode] = useState<'store' | 'developer'>('store');
  const [submitForm, setSubmitForm] = useState({ name: '', description: '', price: '', githubUrl: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
     const unsub = onSnapshot(collection(db, 'plugins'), (snap) => {
        const dbPacks = snap.docs.map(doc => {
           const data = doc.data();
           return {
              id: doc.id,
              name: data.name,
              description: data.description,
              developer: data.developer || 'Community',
              price: data.price ? `$${data.price}/mo` : 'Free',
              icon: Box, // Default icon for third party
              features: ['Sandboxed Execution', 'Third-Party Verification'],
              isFirstParty: false,
              githubUrl: data.githubUrl
           } as PluginPack;
        });
        setPacks([...AVAILABLE_PACKS, ...dbPacks]);
     });
     return () => unsub();
  }, []);

  const handleInstall = async (pack: PluginPack) => {
    await installApp(pack.id);
    
    emitEvent({
      workspaceId: 'global',
      type: 'project_updated',
      entityId: 'marketplace',
      userId: currentUser?.id || 'anonymous',
      comment: `Installed plugin pack: ${pack.name}`
    });
  };

  const handleUninstall = async (packId: string) => {
    await uninstallApp(packId);
    
    emitEvent({
      workspaceId: 'global',
      type: 'project_updated',
      entityId: 'marketplace',
      userId: currentUser?.id || 'anonymous',
      comment: `Uninstalled plugin pack: ${packId}`
    });
  };

  return (
    <div className="w-full h-full flex bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar - Plugin Registry */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-[#111]">
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-medium">Ecosystem Registry</h2>
          </div>
          <div className="flex bg-white/5 rounded-lg p-1 mt-2">
            <button 
              onClick={() => { setViewMode('store'); setSelectedPack(null); }}
              className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", viewMode === 'store' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80")}
            >
              Storefront
            </button>
            <button 
              onClick={() => setViewMode('developer')}
              className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", viewMode === 'developer' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80")}
            >
              Developer Portal
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {viewMode === 'store' ? packs.map(pack => {
            const Icon = pack.icon;
            const isInstalled = installedApps.includes(pack.id);
            const isSelected = selectedPack?.id === pack.id;
            
            return (
              <button
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  isSelected ? "bg-white/10 border border-white/10" : "hover:bg-white/5 border border-transparent",
                  isInstalled ? "opacity-100" : "opacity-70"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-white/60"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{pack.name}</div>
                  <div className="text-[10px] text-white/50 truncate">
                    {isInstalled ? <span className="text-emerald-400">Installed</span> : pack.price}
                  </div>
                </div>
              </button>
            );
          }) : (
            <div className="text-xs text-white/40 p-4 text-center">
              Developer tools active. Register your plugins here.
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Store UI */}
      <div className="flex-1 flex flex-col relative overflow-y-auto bg-gradient-to-br from-[#111] to-[#0a0a0a]">
        {viewMode === 'developer' ? (
          <div className="p-10 max-w-4xl mx-auto w-full">
             <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
               <div>
                 <h1 className="text-3xl font-bold text-white mb-2">Developer Portal</h1>
                 <p className="text-white/60">Submit your plugins to the ANICHISOM OS Public Marketplace.</p>
               </div>
               <Code className="w-16 h-16 text-purple-500/20" />
             </div>
             
             <div className="grid grid-cols-2 gap-8 mb-10">
               <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                 <h3 className="font-bold text-purple-400 text-lg mb-2">Revenue Share</h3>
                 <p className="text-sm text-white/80 leading-relaxed mb-4">
                   You keep <strong className="text-white">75%</strong> of all subscription revenue generated by your plugin pack. ANICHISOM takes 25% to cover platform hosting, Stripe processing, and plugin sandboxing costs.
                 </p>
                 <div className="text-2xl font-light text-white">75% / 25%</div>
               </div>
               
               <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                 <h3 className="font-bold text-white text-lg mb-2">Review Process</h3>
                 <ul className="text-sm text-white/60 space-y-2 list-disc pl-4">
                   <li>Mandatory code scan for Sandbox escapes.</li>
                   <li>No external API calls without user consent.</li>
                   <li>Must use OSPluginAPI for state and presence.</li>
                   <li>Manual review takes 48-72 hours.</li>
                 </ul>
               </div>
             </div>

             {submitted ? (
               <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 flex flex-col items-center text-center">
                 <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                 <h2 className="text-xl font-bold text-white mb-2">Submission Received!</h2>
                 <p className="text-white/60">Your plugin has been stored in the database. It will appear live in the Marketplace immediately.</p>
                 <button onClick={() => setSubmitted(false)} className="mt-6 text-sm text-emerald-400 hover:text-emerald-300">Submit another</button>
               </div>
             ) : (
               <div className="bg-black/40 border border-white/10 rounded-2xl p-8">
                 <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <UploadCloud className="w-5 h-5 text-white/50" />
                     Submit New Plugin Pack
                   </div>
                   <button 
                     onClick={() => openWindow('plugin', 'Sandboxed Plugin Preview', { pluginUrl: '/plugin-mock.html' })}
                     className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs font-medium rounded-lg transition-colors border border-white/10 flex items-center gap-2"
                   >
                     <Box className="w-3.5 h-3.5" />
                     Test Local Sandbox
                   </button>
                 </h3>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-medium text-white/60 mb-1">Plugin Name</label>
                     <input type="text" value={submitForm.name} onChange={e => setSubmitForm({...submitForm, name: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors" placeholder="e.g., Marketing Pack" />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-white/60 mb-1">Description</label>
                     <textarea value={submitForm.description} onChange={e => setSubmitForm({...submitForm, description: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors min-h-[100px]" placeholder="What does this pack do?" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-white/60 mb-1">Monthly Price (USD)</label>
                       <input type="number" value={submitForm.price} onChange={e => setSubmitForm({...submitForm, price: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors" placeholder="e.g., 10" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-white/60 mb-1">GitHub Repository (Private allowed)</label>
                       <input type="url" value={submitForm.githubUrl} onChange={e => setSubmitForm({...submitForm, githubUrl: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors" placeholder="https://github.com/..." />
                     </div>
                   </div>
                   <button 
                     onClick={async () => {
                       try {
                         await addDoc(collection(db, 'plugins'), { 
                           ...submitForm, 
                           developer: currentUser?.name || 'Unknown', 
                           createdAt: serverTimestamp() 
                         });
                         setSubmitted(true);
                       } catch (err: any) {
                         alert(err.message);
                       }
                     }}
                     disabled={!submitForm.name || !submitForm.githubUrl}
                     className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg w-full transition-colors"
                   >
                     Submit & Publish
                   </button>
                 </div>
               </div>
             )}
          </div>
        ) : selectedPack ? (
          <div className="p-10 max-w-3xl mx-auto w-full">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                <selectedPack.icon className="w-12 h-12 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{selectedPack.name}</h1>
                  {selectedPack.isFirstParty && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> First-Party
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-sm mb-4 leading-relaxed">{selectedPack.description}</p>
                <div className="text-xs text-white/40 mb-6">By {selectedPack.developer}</div>
                
                {installedApps.includes(selectedPack.id) ? (
                  <div className="flex gap-3">
                    <button className="px-6 py-2 bg-white/10 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-default">
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Installed
                    </button>
                    <button 
                      onClick={() => handleUninstall(selectedPack.id)}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg text-sm font-medium transition-colors border border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleInstall(selectedPack)}
                    className="px-6 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    <Download className="w-4 h-4" /> Install ({selectedPack.price})
                  </button>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10 w-full mb-8" />

            <h3 className="text-lg font-medium mb-4">Included Features</h3>
            <div className="grid grid-cols-2 gap-4">
              {selectedPack.features.map((feature, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-start gap-3">
                  <Box className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">{feature}</div>
                    <div className="text-xs text-white/40">Integrates directly with OS Core layer.</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="text-sm text-blue-400 font-medium mb-2">Sandbox Architecture Validated</div>
              <p className="text-xs text-white/50 leading-relaxed">
                This plugin runs inside an isolated iframe with PostMessage IPC. It can only access Layer 1 services via the approved OSPluginAPI and cannot access the DOM of other apps or the host OS.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-xl font-medium mb-2">Ecosystem Marketplace</h2>
            <p className="text-white/50 max-w-md text-sm">
              Select a plugin pack from the registry to view details and install it to your workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
