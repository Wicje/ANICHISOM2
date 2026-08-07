import React, { useState, useEffect } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { Folder, FileText, Image as ImageIcon, Video, Code, Layout, Archive, RefreshCw, Plus, Search, File, HardDrive, Filter, Type, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageAdapter } from '@/lib/storage';
import { PerfectCursor } from 'perfect-cursors';

function BlobViewer({ asset, onClose }: { asset: any, onClose: () => void }) {
  const [asyncSrc, setAsyncSrc] = useState<string>('');
  const [asyncTextContent, setAsyncTextContent] = useState<string>('');

  useEffect(() => {
    if (!asset || !asset.data) return;
    const isText = asset.data.type?.startsWith('text/') || asset.metadata.name.endsWith('.ts') || asset.metadata.name.endsWith('.js') || asset.metadata.name.endsWith('.tsx');
    
    if (isText && asset.data instanceof Blob) {
      let active = true;
      asset.data.text().then((text: string) => {
        if (active) setAsyncTextContent(text);
      });
      return () => { active = false; };
    } else if (!isText && asset.data instanceof Blob) {
      const url = URL.createObjectURL(asset.data);
      Promise.resolve().then(() => {
        setAsyncSrc(url);
      });
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [asset]);

  const isText = asset?.data?.type?.startsWith('text/') || asset?.metadata?.name?.endsWith('.ts') || asset?.metadata?.name?.endsWith('.js') || asset?.metadata?.name?.endsWith('.tsx');
  const textContent = isText ? (asset?.data instanceof Blob ? asyncTextContent : asset?.data?.toString() || '') : '';
  const src = !isText ? (asset?.data instanceof Blob ? asyncSrc : asset?.data?.toString() || '') : '';

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4">
         <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
            <X className="w-6 h-6" />
         </button>
      </div>
      <h3 className="text-xl font-bold text-white mb-6 text-center">{asset.metadata.name}</h3>
      <div className="w-full max-w-4xl max-h-[70vh] bg-[#141414] border border-white/10 rounded-xl overflow-auto shadow-2xl flex items-center justify-center">
        {textContent ? (
          <pre className="p-6 text-sm text-emerald-400 font-mono text-left w-full whitespace-pre-wrap">{textContent}</pre>
        ) : src ? (
          asset.metadata.type?.startsWith('video/') ? (
             <video src={src} controls className="max-w-full max-h-[70vh]" autoPlay />
          ) : asset.metadata.type?.startsWith('image/') ? (
             // eslint-disable-next-line @next/next/no-img-element
             <img loading="lazy" src={src} alt={asset.metadata.name} className="max-w-full max-h-[70vh] object-contain" />
          ) : (
             <div className="p-12 text-white/40 flex flex-col items-center">
                <File className="w-16 h-16 mb-4 opacity-50" />
                <p>Preview not available for this file type</p>
             </div>
          )
        ) : (
          <div className="p-12 animate-pulse text-white/50">Loading asset data...</div>
        )}
      </div>
    </div>
  );
}

export function AssetPipeline({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, workspaceMode } = useOS();
  const storage = React.useRef(new StorageAdapter('asset-pipeline', workspaceMode)).current;
  const [activeTab, setActiveTab] = useState<'snippets' | 'modules' | 'videos'>('snippets');
  const [assets, setAssets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const loadAssets = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const index = await storage.get<{ ids: string[] }>(`index_${activeTab}`) || { ids: [] };
      const loaded = await Promise.all(
        index.ids.map(id => storage.get<any>(id))
      );
      const pipelineAssets = loaded
        .filter(a => a !== null)
        .map(a => ({ key: a.id, ...a }));
      setAssets(pipelineAssets);
    } catch (e) {
      console.error("Failed to load assets", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, storage]);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadAssets();
    });
  }, [loadAssets]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert(`File is too large. Maximum size is 50MB.`);
      return;
    }

    try {
      const assetId = `asset_${activeTab}_${crypto.randomUUID()}`;

      const newAsset = {
        id: assetId,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString(),
        type: file.type,
      };

      await storage.set(assetId, { id: assetId, metadata: newAsset, data: file });
      const index = await storage.get<{ ids: string[] }>(`index_${activeTab}`) || { ids: [] };
      index.ids.push(assetId);
      await storage.set(`index_${activeTab}`, index);
      await loadAssets();
    } catch (err) {
       console.error("Error saving file to storage", err);
    }

    e.target.value = '';
  };

  const filteredAssets = assets.filter(a => 
      a.metadata.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#141414] text-white">
       <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#0c0c0c]">
         <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white/90">Asset Pipeline</h2>
            <div className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/20">
              Local-First
            </div>
         </div>
         <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-2 top-1/2 -translate-y-1/2" />
              <input 
                 type="text"
                 placeholder="Filter assets..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-black border border-white/10 rounded-md py-1 pl-8 pr-3 text-xs text-white/90 placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 w-48"
              />
            </div>
            <button 
              onClick={loadAssets} 
              className={cn("p-1.5 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white", isRefreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <label className="cursor-pointer p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors text-white">
              <Plus className="w-4 h-4" />
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
         </div>
       </div>

       <div className="flex flex-1 overflow-hidden">
         <div className="w-48 border-r border-white/5 bg-[#0a0a0a] flex flex-col py-2 shrink-0">
            <div className="px-3 pb-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Indexed Storage</div>
            <button
               onClick={() => setActiveTab('snippets')}
               className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors", activeTab === 'snippets' ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white")}
            >
               <Code className="w-4 h-4" /> Code Snippets
            </button>
            <button
               onClick={() => setActiveTab('modules')}
               className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors", activeTab === 'modules' ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white")}
            >
               <Layout className="w-4 h-4" /> Framer Modules
            </button>
            <button
               onClick={() => setActiveTab('videos')}
               className={cn("flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors", activeTab === 'videos' ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white")}
            >
               <Video className="w-4 h-4" /> Raw Videos
            </button>

            <div className="mt-auto px-3 py-4">
               <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                     <HardDrive className="w-4 h-4" />
                     <span className="text-xs font-semibold">IndexedDB</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                     <div className="h-full bg-emerald-500 w-1/3" />
                  </div>
                  <div className="text-[10px] text-white/40 text-right">Local Sync</div>
               </div>
            </div>
         </div>

         <div className="flex-1 bg-[#141414] overflow-y-auto p-4">
             {filteredAssets.length === 0 ? (
               <div className="h-full w-full flex flex-col items-center justify-center text-white/30 p-8 text-center bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
                  <Archive className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="text-sm font-semibold text-white/50 mb-1">No local assets indexed</h3>
                  <p className="text-xs max-w-sm mb-4">Upload Code Snippets, Framer files or Raw Video components to the local storage.</p>
                  <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors">
                    Upload File
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
               </div>
             ) : (
               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredAssets.map((asset) => (
                    <div 
                      key={asset.key} 
                      onClick={() => setSelectedAsset(asset)}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors group cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]"
                    >
                       {activeTab === 'snippets' && <Code className="w-10 h-10 text-emerald-400/50 mb-3 group-hover:scale-110 transition-transform" />}
                       {activeTab === 'modules' && <Layout className="w-10 h-10 text-cyan-400/50 mb-3 group-hover:scale-110 transition-transform" />}
                       {activeTab === 'videos' && <Video className="w-10 h-10 text-emerald-400/50 mb-3 group-hover:scale-110 transition-transform" />}
                       <div className="font-medium text-xs text-center truncate w-full group-hover:text-white text-white/80">{asset.metadata.name}</div>
                       <div className="text-[10px] text-white/40 mt-1">{asset.metadata.size}</div>
                    </div>
                 ))}
               </div>
             )}
         </div>
       </div>
       
       {selectedAsset && (
          <BlobViewer asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
       )}
    </div>
  );
}
