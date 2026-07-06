'use client';
import React, { useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Camera, Printer, Shield, Send, Image as ImageIcon, Download, Share2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS, LocalFile } from '@/lib/fs';
import { useEffect } from 'react';

export function PhotographyPack({ window: osWindow }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'delivery' | 'watermark' | 'prints'>('gallery');
  const [selectedImage, setSelectedImage] = useState<LocalFile | null>(null);
  const [images, setImages] = useState<LocalFile[]>([]);

  useEffect(() => {
     FS.readDir('').then(files => {
        const imageFiles = files.filter(f => f.mimeType?.startsWith('image/'));
        setImages(imageFiles);
     });
  }, []);
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
      <div className="h-14 border-b border-zinc-200 flex items-center px-4 shrink-0 bg-white">
        <Camera className="w-5 h-5 text-indigo-500 mr-3" />
        <h1 className="font-bold">Photography Studio Pack</h1>
        <div className="ml-8 flex gap-2">
          {(['gallery', 'delivery', 'watermark', 'prints'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 text-xs font-semibold rounded-full capitalize", activeTab === tab ? "bg-indigo-500 text-white" : "hover:bg-zinc-100")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'gallery' && (
          <div className="flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">Recent Shoots</h2>
                   <p className="text-zinc-500 text-sm">482 unedited RAW files synced.</p>
                </div>
                <div className="flex gap-2">
                   <button className="px-4 py-2 bg-white border border-zinc-200 shadow-sm rounded-lg text-sm font-medium hover:bg-zinc-50">Filter</button>
                   <label className="px-4 py-2 bg-indigo-500 text-white shadow-sm rounded-lg text-sm font-medium hover:bg-indigo-600 cursor-pointer">
                      Import Files
                      <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                         if (!e.target.files) return;
                         for (let i = 0; i < e.target.files.length; i++) {
                            const file = e.target.files[i];
                            await FS.write(file.name, file, file.type);
                         }
                         const files = await FS.readDir('');
                         setImages(files.filter(f => f.mimeType?.startsWith('image/')));
                      }} />
                   </label>
                </div>
             </div>
             <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {images.length === 0 ? (
                   <div className="text-zinc-500 text-sm py-8 col-span-full">No images found in your local OS storage. Import files via File Manager.</div>
                ) : images.map((img, i) => (
                   <div 
                     key={img.id} 
                     onClick={() => setSelectedImage(img)}
                     className={cn(
                        "relative bg-zinc-200 rounded-xl overflow-hidden border border-zinc-300 group cursor-pointer hover:shadow-xl transition-all duration-300",
                        i % 4 === 0 ? "h-80" : i % 3 === 0 ? "h-64" : i % 2 === 0 ? "h-96" : "h-56"
                     )}
                   >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
                      {img.content ? (
                         <img src={img.content} className="w-full h-full object-cover" alt={img.name} />
                      ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-zinc-400 opacity-20" />
                         </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-y-2 group-hover:translate-y-0 duration-300">
                         <div className="font-bold text-sm truncate">{img.name}</div>
                         <div className="text-xs text-zinc-300 mt-1 flex items-center justify-between">
                            <span>{img.size ? (img.size / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown'}</span>
                            <Info className="w-3.5 h-3.5" />
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}
        {activeTab === 'delivery' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold tracking-tight">Client Delivery Portal</h2>
                <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 shadow-sm">+ New Gallery</button>
             </div>
             
             {[
               { name: "Wedding - Sarah & John", date: "Oct 24, 2026", status: "Delivered", expires: "30 days" },
               { name: "Corporate Headshots - Acme Corp", date: "Oct 15, 2026", status: "Reviewing", expires: "14 days" },
               { name: "Product Shoot - Fall Collection", date: "Oct 10, 2026", status: "Archived", expires: "Expired" }
             ].map((gallery, idx) => (
                <div key={idx} className="p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex items-center justify-between mb-4">
                      <div>
                         <div className="font-bold text-lg">{gallery.name}</div>
                         <div className="text-sm text-zinc-500 mt-1">{gallery.date} • {gallery.expires}</div>
                      </div>
                      <div className={cn("px-3 py-1 rounded-full text-xs font-bold", 
                         gallery.status === 'Delivered' ? "bg-green-100 text-green-700" :
                         gallery.status === 'Reviewing' ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"
                      )}>
                         {gallery.status}
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-3">
                         <div className="relative">
                           <input type="password" value="secretpassword123" readOnly className="border border-zinc-200 px-3 py-1.5 rounded-lg text-sm w-56 bg-zinc-50 focus:outline-none" />
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-200 blur-sm" />
                         </div>
                         <button className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium px-4 py-1.5 rounded-lg transition-colors border border-zinc-200 shadow-sm">Copy Link</button>
                      </div>
                      <div className="flex items-center gap-2">
                         <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"><Share2 className="w-4 h-4" /></button>
                         <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}
        {activeTab === 'watermark' && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
             <Shield className="w-16 h-16 text-indigo-200 mb-6" />
             <h3 className="text-2xl font-bold mb-2">Batch Watermarking</h3>
             <p className="text-zinc-500 mb-8">Apply dynamic, non-destructive watermarks to thousands of images instantly using WebGL shaders.</p>
             <button className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 hover:shadow-indigo-500/40 transition-all w-full">Select Folder to Process</button>
          </div>
        )}
        {activeTab === 'prints' && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
             <Printer className="w-16 h-16 text-indigo-200 mb-6" />
             <h3 className="text-2xl font-bold mb-2">Print Fulfillment Labs</h3>
             <p className="text-zinc-500 mb-8">Automatically route client print orders to WHCC or Miller's Lab via direct API integration.</p>
             <button className="px-6 py-3 bg-white border-2 border-zinc-200 text-zinc-800 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all w-full">Connect Lab Account</button>
          </div>
        )}
      </div>

      {/* EXIF Modal overlay */}
      {selectedImage !== null && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex" onClick={() => setSelectedImage(null)}>
           <div className="flex-1 p-8 flex items-center justify-center">
              <div className="w-full max-w-3xl aspect-[3/2] bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl flex items-center justify-center overflow-hidden">
                 {selectedImage.content ? (
                    <img src={selectedImage.content} className="w-full h-full object-contain" alt={selectedImage.name} />
                 ) : (
                    <ImageIcon className="w-16 h-16 text-zinc-700" />
                 )}
              </div>
           </div>
           <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col overflow-y-auto text-zinc-300" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-6 break-words">{selectedImage.name}</h3>
              
              <div className="space-y-6">
                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Camera Details</div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                       <div className="text-zinc-500">Camera</div><div className="text-white">Canon EOS R5</div>
                       <div className="text-zinc-500">Lens</div><div className="text-white">RF 85mm F1.2 L</div>
                       <div className="text-zinc-500">Focal Length</div><div className="text-white">85mm</div>
                    </div>
                 </div>
                 
                 <div className="h-px bg-zinc-800 w-full" />
                 
                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Exposure</div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                       <div className="text-zinc-500">Aperture</div><div className="text-white">ƒ/1.2</div>
                       <div className="text-zinc-500">Shutter</div><div className="text-white">1/4000s</div>
                       <div className="text-zinc-500">ISO</div><div className="text-white">100</div>
                       <div className="text-zinc-500">WB</div><div className="text-white">5600K</div>
                    </div>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />
                 
                 <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Location</div>
                    <div className="text-sm text-white">Lake Como, Italy</div>
                    <div className="text-xs text-zinc-500 mt-1 font-mono">45°59'11"N 9°15'44"E</div>
                 </div>
              </div>
              
              <div className="mt-auto pt-8">
                 <button className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold shadow-lg transition-colors">
                    Open in Editor
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
