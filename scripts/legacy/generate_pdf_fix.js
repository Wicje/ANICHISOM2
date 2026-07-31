const fs = require('fs');

const path = '/home/zk3/workstation/experiments/ANICHISOM2/components/apps/productivity-suite.tsx';
let code = fs.readFileSync(path, 'utf-8');

const newPdfEditor = `function PdfEditor({ initialUrl }: { initialUrl?: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialUrl || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;
    
    let active = true;
    setLoading(true);
    setError(null);
    containerRef.current.innerHTML = ''; // Clear previous renders

    const scriptId = 'pdfjs-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const renderPdf = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (!active) return;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (!active) return;
          
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = "my-4 mx-auto block shadow-xl border border-neutral-300 bg-white max-w-full h-auto";
          
          containerRef.current?.appendChild(canvas);
          await page.render({ canvasContext: context, viewport: viewport }).promise;
        }
        setLoading(false);
      } catch (err: any) {
        if (active) {
           setError('Failed to load PDF. ' + err.message);
           setLoading(false);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => { if (active) renderPdf(); };
      document.body.appendChild(script);
    } else {
      if ((window as any).pdfjsLib) {
         renderPdf();
      } else {
         script.addEventListener('load', () => { if (active) renderPdf(); });
      }
    }

    return () => { active = false; };
  }, [pdfUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
       const url = URL.createObjectURL(file);
       setPdfUrl(url);
    } else if (file) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Invalid File', description: 'Please upload a valid PDF file.' } }));
    }
  };

  return (
     <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center overflow-hidden">
        {!pdfUrl ? (
           <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 flex flex-col items-center max-w-sm text-center shadow-lg">
             <FileCode className="w-12 h-12 text-blue-500 mb-4" />
             <h2 className="text-xl font-medium text-white mb-2">Open PDF Document</h2>
             <p className="text-neutral-400 text-sm mb-6">Select a standard PDF file to read within the OS environment. (Cross-browser supported)</p>
             <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow">
                Choose File
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
             </label>
           </div>
        ) : (
           <div className="w-full h-full flex flex-col">
             <div className="bg-neutral-900 p-2 flex shrink-0 items-center gap-2 border-b border-neutral-700 shadow-md z-10">
                <button 
                  onClick={() => setPdfUrl(null)} 
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 border border-neutral-600 transition-colors"
                >
                  Close Document
                </button>
             </div>
             <div className="flex-1 overflow-auto bg-neutral-200 relative">
               {loading && (
                 <div className="absolute inset-0 flex items-center justify-center text-neutral-500 animate-pulse font-medium">
                   Rendering PDF...
                 </div>
               )}
               {error && (
                 <div className="absolute inset-0 flex items-center justify-center text-red-500 font-medium">
                   {error}
                 </div>
               )}
               <div ref={containerRef} className="min-h-full py-4 flex flex-col items-center" />
             </div>
           </div>
        )}
     </div>
  );
}`;

const startIndex = code.indexOf('function PdfEditor(');
if (startIndex !== -1) {
  code = code.substring(0, startIndex) + newPdfEditor + "\n";
  fs.writeFileSync(path, code);
  console.log('PdfEditor replaced successfully.');
} else {
  console.log('Could not find boundaries.');
}
