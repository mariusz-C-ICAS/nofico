import React, { useState, useEffect, useRef } from 'react';
import { toast } from '../../../shared/utils/toast';
import { Upload, FileText, Trash2, Download, RefreshCw, File, Image, Archive } from 'lucide-react';
import { db, storage } from '../../../shared/lib/firebase';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'firebase/storage';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Props {
  tenantId: string;
  customerId: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByEmail: string;
  createdAt: any;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} className="text-indigo-500" />;
  if (type.includes('pdf')) return <FileText size={14} className="text-red-500" />;
  if (type.includes('zip') || type.includes('rar')) return <Archive size={14} className="text-amber-500" />;
  return <File size={14} className="text-slate-500" />;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function CustomerAttachments({ tenantId, customerId }: Props) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, `tenants/${tenantId}/customerAttachments`),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      ),
      snap => { setAttachments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attachment))); setLoading(false); }
    );
  }, [tenantId, customerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setUploading(true);
    setProgress(0);

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.info(`${file.name}: max 20 MB`);
        continue;
      }
      const path = `tenants/${tenantId}/customers/${customerId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(db, `tenants/${tenantId}/customerAttachments`), {
              tenantId, customerId,
              name: file.name,
              size: file.size,
              type: file.type,
              storagePath: path,
              downloadUrl: url,
              uploadedBy: user.uid,
              uploadedByEmail: user.email ?? '',
              createdAt: serverTimestamp(),
            });
            resolve();
          }
        );
      }).catch(console.error);
    }

    setUploading(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (att: Attachment) => {
    if (!confirm(`Usuń ${att.name}?`)) return;
    setDeleting(att.id);
    try {
      await deleteObject(ref(storage, att.storagePath));
      await deleteDoc(doc(db, `tenants/${tenantId}/customerAttachments`, att.id));
    } catch (e) {
      console.error(e);
    }
    setDeleting(null);
  };

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-800">Dokumenty i pliki</p>
          <p className="text-[10px] text-slate-500">{attachments.length} plików · max 20 MB</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-4 py-2 rounded-xl">
          {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? `${progress}%` : 'Dodaj pliki'}
        </button>
        <input ref={fileRef} type="file" multiple accept="*/*" onChange={handleUpload} className="hidden" />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const dt = { target: { files: e.dataTransfer.files } } as any;
          handleUpload(dt);
        }}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-[10px] text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
        onClick={() => fileRef.current?.click()}>
        <Upload size={20} className="mx-auto mb-2 opacity-40" />
        Przeciągnij pliki lub kliknij aby wybrać
      </div>

      {loading && <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-indigo-400" /></div>}

      {/* Attachments list */}
      <div className="space-y-2">
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
              {fileIcon(att.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 truncate">{att.name}</p>
              <p className="text-[9px] text-slate-500">{fmtSize(att.size)} · {fmtDate(att.createdAt)} · {att.uploadedByEmail}</p>
            </div>
            <a href={att.downloadUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Download size={12} />
            </a>
            <button onClick={() => handleDelete(att)} disabled={deleting === att.id}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              {deleting === att.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          </div>
        ))}
        {!loading && attachments.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-4">Brak załączników. Dodaj umowy, faktury lub inne dokumenty.</p>
        )}
      </div>
    </div>
  );
}
