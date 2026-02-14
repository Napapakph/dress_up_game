'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Download, AlertTriangle } from 'lucide-react';

function DownloadContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No download ID provided.');
      return;
    }
    
    // Try to get from localStorage
    try {
      const stored = localStorage.getItem(`dressup_export_${id}`);
      if (stored) {
        setDataUrl(stored);
      } else {
        setError('Download link expired or not found on this device.');
      }
    } catch (_e) {
      setError('Could not access local storage.');
    }
  }, [id]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `medi-dressup-${id}.png`; // Assuming PNG for simplicity or store type
    link.href = dataUrl;
    link.click();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <AlertTriangle className="text-red-500 w-12 h-12 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Download Failed</h1>
        <p className="text-gray-600">{error}</p>
        <p className="text-sm text-gray-500 mt-4">Note: Downloads only work on the same device where they were created.</p>
      </div>
    );
  }

  if (!dataUrl) {
    return <div className="min-h-screen flex items-center justify-center">Loading download...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-indigo-700 mb-6">Your Design is Ready!</h1>
        
        <div className="relative aspect-[3/4] w-full bg-gray-100 rounded-lg overflow-hidden mb-6 border border-gray-200">
           <img src={dataUrl} alt="Design Preview" className="w-full h-full object-contain" />
        </div>

        <button 
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
        >
          <Download size={20} />
          Download Image
        </button>
        
        <p className="text-xs text-gray-400 mt-4">
          Link is valid only on this browser.
        </p>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DownloadContent />
    </Suspense>
  );
}
