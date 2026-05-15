import React, { useState, useRef } from 'react';
import { Camera, Briefcase, CheckCircle2, AlertTriangle, X, Image as ImageIcon, Film } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance } from '../services/workflowEngine';
import { transitionDocument } from '../services/workflowEngine';
import type { DocumentAttachment } from '../types';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

type Step = 'project' | 'media' | 'routing' | 'review';

interface FormData {
  title: string;
  projectId: string;
  milestoneId: string;
  description: string;
  isBillable: boolean;
  sendToMarketing: boolean;
}

interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'project', label: 'Projekt' },
  { id: 'media', label: 'Media' },
  { id: 'routing', label: 'Routing' },
  { id: 'review', label: 'Wyślij' },
];

export default function SubmitProjectDeliveryWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('project');
  const [form, setForm] = useState<FormData>({
    title: '',
    projectId: '',
    milestoneId: '',
    description: '',
    isBillable: false,
    sendToMarketing: false,
  });
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: MediaFile[] = [];
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
      });
    });
    setMediaFiles(prev => [...prev, ...next]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canProceed = (): boolean => {
    if (step === 'project') return form.title.trim().length > 0 && form.projectId.trim().length > 0;
    if (step === 'media') return mediaFiles.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const attachments: DocumentAttachment[] = await Promise.all(
        mediaFiles.map(async (mf, i) => {
          const storageRef = ref(storage, `tenants/${activeTenantId}/attachments/${Date.now()}_${i}_${mf.file.name}`);
          await uploadBytes(storageRef, mf.file);
          const downloadUrl = await getDownloadURL(storageRef);
          return {
            id: `att_${i}`,
            name: mf.file.name,
            size: mf.file.size,
            mimeType: mf.file.type,
            storageRef: downloadUrl,
            hash: `${mf.file.size}_${mf.file.lastModified}`,
            uploadedAt: new Date() as any,
            uploadedBy: user.uid,
          } satisfies DocumentAttachment;
        })
      );

      const docId = await createDocumentInstance(
        activeTenantId,
        user.uid,
        user.email ?? '',
        'PROJECT_DELIVERY',
        'default-project-delivery',
        {
          title: form.title.trim(),
          projectId: form.projectId.trim() || undefined,
          milestoneId: form.milestoneId.trim() || undefined,
          description: form.description.trim() || undefined,
          isBillable: form.isBillable,
          sendToMarketing: form.sendToMarketing,
        },
        attachments
      );

      await transitionDocument(
        activeTenantId,
        docId,
        'SUBMIT',
        user.uid,
        user.email ?? '',
        'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: 'Realizacja projektu wysłana do zatwierdzenia.' }
      );

      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors mb-4 block">
          ← Anuluj
        </button>
        <div className="flex items-center gap-3 mb-1">
          <Camera size={20} className="text-cyan-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Realizacja projektu</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Zdjęcia i filmy z realizacji — dowód pracy, fakturowanie, Marketing.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full transition-all ${i <= stepIndex ? 'bg-cyan-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${i === stepIndex ? 'text-cyan-600' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step: project */}
      {step === 'project' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł realizacji *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="np. Montaż klimatyzacji — ul. Kwiatowa 5, Kraków"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID projektu *</label>
              <input
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                placeholder="PROJ-2026-042"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Milestone (opcjonalnie)</label>
              <input
                value={form.milestoneId}
                onChange={e => setForm(f => ({ ...f, milestoneId: e.target.value }))}
                placeholder="M3 — odbiór końcowy"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis pracy</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Opisz wykonane prace, zakres, uwagi..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Step: media */}
      {step === 'media' && (
        <div className="space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyan-200 rounded-[2rem] p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/30 transition-all"
          >
            <Camera size={32} className="text-cyan-400" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Dodaj zdjęcia i filmy</p>
            <p className="text-[10px] text-slate-400 font-medium">JPG, PNG, HEIC, MP4, MOV — max 50 MB każdy</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
          </div>

          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {mediaFiles.map((mf, i) => (
                <div key={i} className="relative group rounded-2xl overflow-hidden bg-slate-100 aspect-square">
                  {mf.type === 'image' ? (
                    <img src={mf.previewUrl} alt={mf.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Film size={24} className="text-slate-400" />
                      <span className="text-[9px] text-slate-500 font-bold px-2 text-center truncate w-full">{mf.file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full items-center justify-center hidden group-hover:flex"
                  >
                    <X size={10} />
                  </button>
                  <div className="absolute bottom-1.5 left-1.5">
                    {mf.type === 'image'
                      ? <ImageIcon size={10} className="text-white drop-shadow" />
                      : <Film size={10} className="text-white drop-shadow" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {mediaFiles.length === 0 && (
            <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5"><AlertTriangle size={12} /> Wymagane co najmniej 1 zdjęcie lub film</p>
          )}
        </div>
      )}

      {/* Step: routing */}
      {step === 'routing' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-medium">Zaznacz, co szef powinien zrobić po zatwierdzeniu:</p>

          <label className={`flex items-start gap-4 p-5 rounded-[2rem] border cursor-pointer transition-all ${form.isBillable ? 'bg-lime-50 border-lime-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
            <input type="checkbox" checked={form.isBillable} onChange={e => setForm(f => ({ ...f, isBillable: e.target.checked }))} className="mt-1 w-4 h-4 accent-lime-600" />
            <div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Gotowe do fakturowania klienta</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Szef będzie mógł jednym kliknięciem skierować dokument do działu finansów (status BILLING_READY).</p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-[2rem] border cursor-pointer transition-all ${form.sendToMarketing ? 'bg-pink-50 border-pink-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
            <input type="checkbox" checked={form.sendToMarketing} onChange={e => setForm(f => ({ ...f, sendToMarketing: e.target.checked }))} className="mt-1 w-4 h-4 accent-pink-600" />
            <div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Zatwierdź do publikacji przez Marketing</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Zdjęcia/filmy trafią do przeglądu marketingowego (status MARKETING_REVIEW) celem publikacji na stronie firmowej.</p>
            </div>
          </label>
        </div>
      )}

      {/* Step: review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={form.title} />
            <Row label="ID projektu" value={form.projectId} />
            {form.milestoneId && <Row label="Milestone" value={form.milestoneId} />}
            {form.description && <Row label="Opis" value={form.description} />}
            <Row label="Pliki" value={`${mediaFiles.length} plik(ów)`} />
            <Row label="Fakturowanie" value={form.isBillable ? 'Tak' : 'Nie'} />
            <Row label="Marketing" value={form.sendToMarketing ? 'Tak' : 'Nie'} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => {
            const prev: Step[] = ['project', 'media', 'routing', 'review'];
            const idx = prev.indexOf(step);
            if (idx > 0) setStep(prev[idx - 1]);
            else onCancel();
          }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
        >
          ← {step === 'project' ? 'Anuluj' : 'Wstecz'}
        </button>

        {step !== 'review' ? (
          <button
            disabled={!canProceed()}
            onClick={() => {
              const order: Step[] = ['project', 'media', 'routing', 'review'];
              const idx = order.indexOf(step);
              setStep(order[idx + 1]);
            }}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all"
          >
            Dalej →
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-cyan-500/20"
          >
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Wyślij do zatwierdzenia</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}
