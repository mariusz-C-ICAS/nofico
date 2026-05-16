import React, { useState } from 'react';
import { FileText, Image, Download, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import type { DocumentAttachment } from '../types';

interface Props {
  attachment: DocumentAttachment;
  compact?: boolean;
}

export default function AttachmentPreview({ attachment, compact = false }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isImage = attachment.mimeType?.startsWith('image/');
  const isPdf = attachment.mimeType === 'application/pdf';
  const canPreview = isImage || isPdf;

  const loadUrl = async () => {
    if (url || loading) return;
    if (!attachment.storageRef) {
      setError('Brak ścieżki do pliku');
      return;
    }
    setLoading(true);
    try {
      const downloadUrl = await getDownloadURL(ref(storage, attachment.storageRef));
      setUrl(downloadUrl);
    } catch {
      setError('Nie można załadować podglądu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!expanded) await loadUrl();
    setExpanded(v => !v);
  };

  const sizeMb = (attachment.size / 1024 / 1024).toFixed(2);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-6 py-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-emerald-50' : isPdf ? 'bg-red-50' : 'bg-slate-100'}`}>
          {isImage ? <Image size={15} className="text-emerald-600" /> : <FileText size={15} className={isPdf ? 'text-red-500' : 'text-slate-500'} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-900 truncate">{attachment.name}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
            {attachment.mimeType} · {sizeMb} MB
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canPreview && (
            <button
              onClick={handleToggle}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : expanded ? <EyeOff size={11} /> : <Eye size={11} />}
              {expanded ? 'Ukryj' : 'Podgląd'}
            </button>
          )}
          {url && (
            <a
              href={url}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 transition-all"
            >
              <Download size={11} /> Pobierz
            </a>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-4 flex items-center gap-2 text-red-600 text-[10px] font-bold">
          <AlertTriangle size={11} /> {error}
        </div>
      )}

      {/* Preview area */}
      {expanded && url && (
        <div className="border-t border-slate-200 bg-white">
          {isImage && (
            <div className="flex justify-center p-4 max-h-[500px] overflow-auto">
              <img
                src={url}
                alt={attachment.name}
                className="max-w-full rounded-2xl shadow-sm object-contain"
                style={{ maxHeight: 480 }}
              />
            </div>
          )}
          {isPdf && (
            <iframe
              src={url}
              title={attachment.name}
              className="w-full rounded-none"
              style={{ height: 600 }}
            />
          )}
        </div>
      )}

      {/* Offline/local only indicator */}
      {attachment.isLocalOnly && (
        <div className="px-6 pb-4 text-[9px] text-amber-600 font-black uppercase tracking-widest">
          Plik lokalny — zostanie przesłany po synchronizacji
        </div>
      )}
    </div>
  );
}
