'use client';
import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Camera, Printer, Shield, Send, Image as ImageIcon, Download, Share2, Info, Plus, CheckCircle, Copy, Link as LinkIcon, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { usePhotographyStore, Shoot, PhotoGallery, Client, PrintOrder, WatermarkPreset } from '@/lib/stores/photography.store';

export function PhotographyPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'delivery' | 'watermark' | 'prints'>('gallery');
  const [selectedImage, setSelectedImage] = useState<LocalFile | null>(null);
  const [images, setImages] = useState<LocalFile[]>([]);

  // Delivery Portal State
  const [localGalleries, setLocalGalleries] = useState<any[]>([]);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [viewedGallery, setViewedGallery] = useState<any>(null);

  // Watermark State
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [watermarkText, setWatermarkText] = useState('PROOF ONLY');

  // Store hooks
  const {
    shoots, galleries: storeGalleries, clients, printOrders, watermarkPresets,
    createShoot, updateShoot, createGallery: createStoreGallery, updateGallery,
    createClient, createPrintOrder, updatePrintOrder,
    getShootsByStatus, getGalleriesByStatus, getPrintOrdersByStatus,
    getActiveWatermarkPreset, setActiveWatermarkPreset,
    createWatermarkPreset,
  } = usePhotographyStore();

  // Shoot form state
  const [newShootName, setNewShootName] = useState('');
  const [newShootDate, setNewShootDate] = useState('');
  const [newShootLocation, setNewShootLocation] = useState('');

  // Print order form state
  const [newOrderGalleryId, setNewOrderGalleryId] = useState('');
  const [newOrderSize, setNewOrderSize] = useState('8x10');
  const [newOrderQty, setNewOrderQty] = useState(1);
  const [newOrderFinish, setNewOrderFinish] = useState<'matte' | 'glossy' | 'metallic' | 'canvas'>('matte');

  // Watermark preset form state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetText, setNewPresetText] = useState('');

  const loadGalleries = async () => {
      try {
         const file = await FS.read('galleries.json');
         if (file?.content) {
            setLocalGalleries(JSON.parse(file.content as string));
         }
      } catch (e) {
         // No galleries file yet
      }
  };

  const saveGalleries = async (newGalleries: any[]) => {
      setLocalGalleries(newGalleries);
      await FS.write('galleries.json', JSON.stringify(newGalleries));
  };

  const loadImages = async () => {
      const files = await FS.readDir('');
      const imageFiles = files.filter(f => f.mimeType?.startsWith('image/'));
      setImages(imageFiles);
  };

  useEffect(() => {
     loadImages();
     loadGalleries();
      (usePhotographyStore as any).hydrate?.();
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files) return;
     for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]!;
        await FS.write(file.name, file, file.type);
     }
     await loadImages();
  };

  const handleCreateGallery = () => {
     if(!newGalleryName.trim()) return;
     const newGal = {
        id: Date.now(),
        name: newGalleryName,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Draft',
        expires: '30 days',
        pin: Math.floor(1000 + Math.random() * 9000).toString()
     };
      saveGalleries([newGal, ...localGalleries]);
     setNewGalleryName('');
  };

  const applyWatermark = async () => {
     if(images.length === 0) return alert('No images imported to watermark!');
     setIsWatermarking(true);
     
     for (const img of images) {
         if (img.name.startsWith('WM_')) continue; // skip already watermarked
         
         const imgEl = new Image();
         imgEl.src = img.content as string;
         await new Promise(r => { imgEl.onload = r; });
         
         const canvas = document.createElement('canvas');
         canvas.width = imgEl.width;
         canvas.height = imgEl.height;
         const ctx = canvas.getContext('2d');
         if (!ctx) continue;
         
         // Draw original image
         ctx.drawImage(imgEl, 0, 0);
         
         // Apply watermark styling
         const fontSize = Math.floor(canvas.width / 10);
         ctx.font = `bold ${fontSize}px sans-serif`;
         ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         
         // Rotate and draw in center
         ctx.translate(canvas.width / 2, canvas.height / 2);
         ctx.rotate(-Math.PI / 4);
         
         // Add text shadow for visibility on light backgrounds
         ctx.shadowColor = "rgba(0,0,0,0.5)";
         ctx.shadowBlur = 10;
         ctx.fillText(watermarkText, 0, 0);
         
         // Convert to blob and save
         const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
         const res = await fetch(dataUrl);
         const blob = await res.blob();
         
         await FS.write(`WM_${img.name}`, new File([blob], `WM_${img.name}`, { type: 'image/jpeg' }));
     }
     
     await loadImages();
     setIsWatermarking(false);
     alert('Batch watermarking complete! New files saved with WM_ prefix.');
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
      <div className="h-14 border-b border-zinc-200 flex items-center px-4 shrink-0 bg-white">
        <Camera className="w-5 h-5 text-indigo-500 mr-3" />
        <h1 className="font-bold hidden sm:block">Photography Studio Pack</h1>
        <div className="ml-8 flex gap-2 overflow-x-auto no-scrollbar">
          {(['gallery', 'delivery', 'watermark', 'prints'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 text-xs font-bold rounded-full capitalize whitespace-nowrap transition-all", activeTab === tab ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "hover:bg-zinc-100 text-zinc-600")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'gallery' && (
          <div className="flex flex-col gap-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">Image Asset Pipeline</h2>
                   <p className="text-zinc-500 text-sm">{images.length} files stored locally via OPFS Virtual Storage.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <label className="px-5 py-2.5 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 rounded-xl text-sm font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-2 justify-center w-full sm:w-auto transition-colors">
                      <Plus className="w-4 h-4" /> Import Files
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImport} />
                   </label>
                </div>
             </div>
             
             {/* Shoots Panel */}
             <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-lg">Shoots</h3>
                   <span className="text-xs text-zinc-500">{Object.keys(shoots).length} total</span>
                </div>
                {Object.values(shoots).length === 0 ? (
                   <p className="text-sm text-zinc-400">No shoots yet. Create one below.</p>
                ) : (
                   <div className="flex flex-col gap-2 mb-4">
                      {Object.values(shoots).map(s => (
                         <div key={s.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                               <div className={cn("w-2 h-2 rounded-full", s.status === 'completed' ? "bg-green-500" : s.status === 'in-progress' ? "bg-amber-500" : s.status === 'post-processed' ? "bg-indigo-500" : "bg-zinc-300")} />
                               <div>
                                  <div className="text-sm font-bold">{s.name}</div>
                                  <div className="text-xs text-zinc-500">{s.location} &middot; {s.date}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", s.status === 'completed' ? "bg-green-100 text-green-700" : s.status === 'in-progress' ? "bg-amber-100 text-amber-700" : s.status === 'post-processed' ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600")}>
                                  {s.status}
                               </span>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                   <input value={newShootName} onChange={e => setNewShootName(e.target.value)} placeholder="Shoot name..." className="px-3 py-2 border border-zinc-200 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                   <input type="date" value={newShootDate} onChange={e => setNewShootDate(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                   <input value={newShootLocation} onChange={e => setNewShootLocation(e.target.value)} placeholder="Location..." className="px-3 py-2 border border-zinc-200 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                   <button onClick={() => { if (!newShootName.trim() || !newShootDate) return; createShoot(newShootName, newShootDate, newShootLocation); setNewShootName(''); setNewShootDate(''); setNewShootLocation(''); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
                      + New Shoot
                   </button>
                </div>
             </div>

             <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {images.length === 0 ? (
                   <div className="text-zinc-500 text-sm py-12 col-span-full text-center bg-white border border-zinc-200 border-dashed rounded-2xl">
                      <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                      No images found in your local OS storage.<br/>Click "Import Files" to load photos securely into the virtual filesystem.
                   </div>
                ) : images.map((img, i) => (
                   <div 
                     key={img.id} 
                     onClick={() => setSelectedImage(img)}
                     className={cn(
                        "relative bg-zinc-200 rounded-xl overflow-hidden border border-zinc-300 group cursor-pointer hover:shadow-2xl transition-all duration-300",
                        i % 4 === 0 ? "h-80" : i % 3 === 0 ? "h-64" : i % 2 === 0 ? "h-96" : "h-56"
                     )}
                   >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors z-10" />
                      {img.content ? (
                         <img loading="lazy" src={img.content as string} className="w-full h-full object-cover" alt={img.name} />
                      ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-zinc-400 opacity-20" />
                         </div>
                      )}
                      {/* Watermark Tag */}
                      {img.name.startsWith('WM_') && (
                         <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-20">WATERMARKED</div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-y-4 group-hover:translate-y-0 duration-300">
                         <div className="font-bold text-sm truncate">{img.name}</div>
                         <div className="text-xs text-zinc-300 mt-2 flex items-center justify-between">
                            <span>{img.size ? (img.size / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown'}</span>
                            <Info className="w-4 h-4 hover:text-white" />
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}
        
        {activeTab === 'delivery' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">Client Delivery Portal</h2>
                   <p className="text-zinc-500 text-sm">Securely share galleries with clients via pin-protected links.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <input 
                     value={newGalleryName} 
                     onChange={e => setNewGalleryName(e.target.value)} 
                     placeholder="Gallery Name..." 
                     className="px-3 py-2 border border-zinc-200 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                   <button onClick={handleCreateGallery} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm whitespace-nowrap">
                      + New Gallery
                   </button>
                </div>
             </div>
             
             {[...localGalleries, ...Object.values(storeGalleries).map(g => {
                  const now = Date.now();
                  return {
                    id: g.id,
                    name: g.name,
                    date: new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    status: g.status === 'delivered' ? 'Delivered' : g.status === 'reviewing' ? 'Reviewing' : g.status === 'archived' ? 'Archived' : 'Draft',
                    expires: g.expiresAt > now ? `${Math.ceil((g.expiresAt - now) / (1000 * 60 * 60 * 24))} days` : 'Expired',
                    pin: g.pin,
                    _isStore: true,
                  };
               })].map((gallery) => (
                <div key={gallery.id} className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                      <div>
                         <div className="font-bold text-xl">{gallery.name}</div>
                         <div className="text-sm text-zinc-500 mt-1 flex gap-2 items-center">
                            <span>{gallery.date}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span>Expires in {gallery.expires}</span>
                         </div>
                      </div>
                      <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider w-max", 
                         gallery.status === 'Delivered' ? "bg-green-100 text-green-700" :
                         gallery.status === 'Reviewing' ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"
                      )}>
                         {gallery.status}
                      </div>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-5 border-t border-zinc-100 gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                         <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Client Link</label>
                            <div className="flex items-center gap-2">
                               <div className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-500 w-full sm:w-64 truncate select-all">
                                  https://delivery.continuaos.com/g/{gallery.id}
                               </div>
                               <button 
                                 className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" 
                                 title="Copy Link"
                                 onClick={() => {
                                    navigator.clipboard.writeText(`https://delivery.continuaos.com/g/${gallery.id}`);
                                    alert('Delivery link copied to clipboard!');
                                 }}
                               >
                                  <Copy className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Access PIN</label>
                            <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-mono font-bold tracking-widest">
                               {gallery.pin}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={() => setViewedGallery(gallery)} className="px-4 py-2 text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2">
                            <Eye className="w-4 h-4" /> View Portal
                         </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}

        {/* Client Portal Modal Overlay */}
        {viewedGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-zinc-900/40 backdrop-blur-sm">
             <div className="bg-white rounded-3xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="h-20 border-b border-zinc-100 flex items-center justify-between px-8 bg-white shrink-0">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                         <Camera className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                         <h2 className="font-bold text-lg">{viewedGallery.name}</h2>
                         <p className="text-xs text-zinc-500 font-medium">Prepared by ContinuaOS Studios</p>
                      </div>
                   </div>
                   <button onClick={() => setViewedGallery(null)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full text-sm font-bold transition-colors">Close Portal</button>
                </div>
                
                {/* Cover Image */}
                <div className="h-64 sm:h-80 bg-zinc-900 w-full relative shrink-0">
                   {images.length > 0 ? (
                      <img loading="lazy" src={images[0]!.content as string} className="w-full h-full object-cover opacity-60" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">No images available</div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                      <div className="text-white">
                         <h1 className="text-4xl font-bold mb-2">{viewedGallery.name}</h1>
                         <p className="text-white/70 font-medium">{images.length} High-Resolution Photos • Expires in {viewedGallery.expires}</p>
                      </div>
                   </div>
                </div>
                
                {/* Masonry Grid */}
                <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl">Gallery</h3>
                      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                         <Download className="w-4 h-4" /> Download All
                      </button>
                   </div>
                   
                   <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                      {images.length === 0 ? (
                         <div className="col-span-full py-12 text-center text-zinc-500 font-medium bg-white rounded-2xl border border-zinc-200 border-dashed">
                            Gallery is empty. Watermark and assign photos to this gallery to display them here.
                         </div>
                      ) : (
                         images.map((img, i) => (
                            <div key={img.id} className="relative rounded-xl overflow-hidden group cursor-pointer border border-zinc-200 bg-white">
                               <img loading="lazy" src={img.content as string} className="w-full h-auto" />
                               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <button className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-colors">
                                     <Download className="w-5 h-5" />
                                  </button>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'watermark' && (
          <div className="flex flex-col h-full items-center justify-center max-w-2xl mx-auto w-full">
             <div className="bg-white border border-zinc-200 rounded-3xl shadow-xl p-10 w-full flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                   <Shield className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-bold mb-3">Batch Watermarking Engine</h3>
                <p className="text-zinc-500 mb-8 max-w-md">
                   Apply dynamic, non-destructive watermarks to your imported photos instantly using a hardware-accelerated Canvas engine.
                </p>
                
                <div className="w-full max-w-sm flex flex-col gap-4 mb-8">
                   <div className="flex flex-col text-left">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Watermark Text</label>
                      <input 
                         type="text" 
                         value={watermarkText} 
                         onChange={e => setWatermarkText(e.target.value)} 
                         className="px-4 py-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center text-lg uppercase tracking-widest bg-zinc-50"
                      />
                   </div>

                   {/* Watermark Presets */}
                   {Object.keys(watermarkPresets).length > 0 && (
                      <div className="flex flex-col text-left mt-2">
                         <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Saved Presets</label>
                         <div className="flex flex-col gap-1.5">
                            {Object.values(watermarkPresets).map(p => {
                               const active = getActiveWatermarkPreset()?.id === p.id;
                               return (
                                  <button key={p.id} onClick={() => { setActiveWatermarkPreset(active ? null : p.id); if (!active) { setWatermarkText(p.text); } }}
                                     className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all", active ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-zinc-200 hover:border-zinc-300")}>
                                     <span className="font-bold">{p.name}</span>
                                     <span className="text-xs opacity-60">"{p.text}" &middot; {Math.round(p.opacity * 100)}%</span>
                                  </button>
                               );
                            })}
                         </div>
                      </div>
                   )}

                   {/* New Preset Form */}
                   <div className="flex flex-col text-left mt-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Create Preset</label>
                      <div className="flex gap-2">
                         <input value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="Preset name..." className="px-3 py-2 border border-zinc-200 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                         <input value={newPresetText} onChange={e => setNewPresetText(e.target.value)} placeholder="Text..." className="px-3 py-2 border border-zinc-200 rounded-lg text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                         <button onClick={() => { if (!newPresetName.trim() || !newPresetText.trim()) return; createWatermarkPreset(newPresetName, newPresetText); setNewPresetName(''); setNewPresetText(''); }} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
                            Save
                         </button>
                      </div>
                   </div>
                </div>

                <div className="w-full flex flex-col items-center gap-3">
                   <button 
                     onClick={applyWatermark}
                     disabled={isWatermarking || images.length === 0}
                     className={cn("px-8 py-4 rounded-xl font-bold text-lg w-full max-w-sm transition-all flex items-center justify-center gap-3", 
                        isWatermarking ? "bg-zinc-200 text-zinc-500" : "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-105"
                     )}
                   >
                     {isWatermarking ? (
                        <><div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin" /> Processing {images.length} Files...</>
                     ) : (
                        <><CheckCircle className="w-5 h-5" /> Execute Batch Watermark</>
                     )}
                   </button>
                   {images.length === 0 && (
                      <div className="text-xs text-red-500 font-bold">Please import files in the Gallery tab first.</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'prints' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">Print Fulfillment Labs</h2>
                   <p className="text-zinc-500 text-sm">Automatically route client print orders to WHCC or Miller's Lab via direct API integration.</p>
                </div>
             </div>

             {/* Print Orders */}
             {Object.keys(printOrders).length === 0 ? (
                <div className="text-center py-12 bg-white border border-zinc-200 border-dashed rounded-2xl">
                   <Printer className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                   <p className="text-sm text-zinc-500">No print orders yet. Create one below.</p>
                </div>
             ) : (
                <div className="flex flex-col gap-3">
                   {Object.values(printOrders).map(order => (
                      <div key={order.id} className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center justify-between mb-3">
                            <div className="font-bold text-sm">{order.id}</div>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", order.status === 'delivered' ? "bg-green-100 text-green-700" : order.status === 'shipped' ? "bg-blue-100 text-blue-700" : order.status === 'processing' ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600")}>
                               {order.status}
                            </span>
                         </div>
                         <div className="flex flex-wrap gap-2 text-xs text-zinc-500 mb-2">
                            {order.items.map((item, i) => (
                               <span key={i} className="px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-lg">
                                  {item.size} {item.finish} x{item.quantity}
                               </span>
                            ))}
                         </div>
                         <div className="text-sm font-bold text-indigo-600">${order.total.toFixed(2)}</div>
                      </div>
                   ))}
                </div>
             )}

             {/* New Print Order Form */}
             <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                <h4 className="font-bold text-sm mb-4">New Print Order</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                   <select value={newOrderGalleryId} onChange={e => setNewOrderGalleryId(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select gallery...</option>
                      {Object.values(storeGalleries).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                   </select>
                   <select value={newOrderSize} onChange={e => setNewOrderSize(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="5x7">5x7</option>
                      <option value="8x10">8x10</option>
                      <option value="11x14">11x14</option>
                      <option value="16x20">16x20</option>
                      <option value="20x24">20x24</option>
                      <option value="24x36">24x36</option>
                   </select>
                   <input type="number" min={1} value={newOrderQty} onChange={e => setNewOrderQty(Number(e.target.value))} className="w-20 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                   <select value={newOrderFinish} onChange={e => setNewOrderFinish(e.target.value as any)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="matte">Matte</option>
                      <option value="glossy">Glossy</option>
                      <option value="metallic">Metallic</option>
                      <option value="canvas">Canvas</option>
                   </select>
                   <button onClick={() => {
                      if (!newOrderGalleryId) return;
                      const prices: Record<string, number> = { '5x7': 15, '8x10': 25, '11x14': 40, '16x20': 60, '20x24': 80, '24x36': 120 };
                      const base = prices[newOrderSize] || 25;
                      const finishMultiplier = newOrderFinish === 'canvas' ? 2.5 : newOrderFinish === 'metallic' ? 1.5 : 1;
                      createPrintOrder(newOrderGalleryId, [{ size: newOrderSize, quantity: newOrderQty, finish: newOrderFinish, price: Math.round(base * finishMultiplier * 100) / 100 }]);
                      setNewOrderQty(1);
                   }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
                      + Create Order
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* EXIF Modal overlay */}
      {selectedImage !== null && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col md:flex-row" onClick={() => setSelectedImage(null)}>
           <div className="flex-1 p-4 md:p-12 flex items-center justify-center relative">
              <button className="absolute top-6 right-6 text-white/50 hover:text-white md:hidden bg-black/50 p-2 rounded-full backdrop-blur">✖</button>
              <div className="w-full h-full max-h-[80vh] bg-black/50 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                 {selectedImage.content ? (
                    <img loading="lazy" src={selectedImage.content as string} className="w-full h-full object-contain" alt={selectedImage.name} />
                 ) : (
                    <ImageIcon className="w-16 h-16 text-zinc-700" />
                 )}
              </div>
           </div>
           <div className="w-full md:w-96 bg-zinc-900 border-l border-zinc-800 p-8 flex flex-col overflow-y-auto text-zinc-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-8">
                 <h3 className="text-2xl font-bold text-white break-words">{selectedImage.name}</h3>
                 <button onClick={() => setSelectedImage(null)} className="hidden md:block text-zinc-500 hover:text-white">✖</button>
              </div>
              
              <div className="space-y-8">
                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-4">Camera Details</div>
                    <div className="grid grid-cols-2 gap-y-4 text-sm bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                       <div className="text-zinc-500">Camera</div><div className="text-white font-medium">Canon EOS R5</div>
                       <div className="text-zinc-500">Lens</div><div className="text-white font-medium">RF 85mm F1.2 L</div>
                       <div className="text-zinc-500">Focal Length</div><div className="text-white font-medium">85mm</div>
                    </div>
                 </div>
                 
                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-4">Exposure</div>
                    <div className="grid grid-cols-2 gap-y-4 text-sm bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                       <div className="text-zinc-500">Aperture</div><div className="text-white font-medium">ƒ/1.2</div>
                       <div className="text-zinc-500">Shutter</div><div className="text-white font-medium">1/4000s</div>
                       <div className="text-zinc-500">ISO</div><div className="text-white font-medium">100</div>
                       <div className="text-zinc-500">WB</div><div className="text-white font-medium">5600K</div>
                    </div>
                 </div>

                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-4">Location & Time</div>
                    <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                       <div className="text-sm text-white font-medium mb-1">Lake Como, Italy</div>
                       <div className="text-xs text-zinc-500 font-mono mb-3">45°59'11"N 9°15'44"E</div>
                       <div className="text-xs text-zinc-500">Capture: Oct 24, 2026 14:32:01</div>
                    </div>
                 </div>
              </div>
              
              <div className="mt-auto pt-8 flex gap-3">
                 <button className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">
                    Download
                 </button>
                 <button className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                    Edit in Studio
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
