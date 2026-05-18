import React, { useRef, useState } from 'react';
import { User, Upload, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export default function KontoSection() {
  const { user, userData, updateUserSettings } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState(userData?.displayName ?? user?.displayName ?? '');
  const [phone, setPhone] = useState((userData as any)?.phone ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const photoURL = userData?.photoURL || user?.photoURL || '';
  const initials = (name || userData?.displayName || userData?.email || '?').charAt(0).toUpperCase();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
      await updateUserSettings({ photoURL: url });
      setSuccess('Zdjęcie zostało zaktualizowane.');
    } catch (err: any) {
      setError(err.message ?? 'Błąd wgrywania zdjęcia.');
    } finally {
      setSaving(false);
    }
  };

  const syncGooglePhoto = async () => {
    if (!user?.photoURL || !user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateUserSettings({ photoURL: user.photoURL });
      setSuccess('Zdjęcie z Google zostało zsynchronizowane.');
    } catch (err: any) {
      setError(err.message ?? 'Błąd synchronizacji.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateProfile(user, { displayName: name });
      await updateUserSettings({ displayName: name, ...(phone && { phone }) } as any);
      setSuccess('Dane konta zapisane.');
    } catch (err: any) {
      setError(err.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <User size={18} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Konto</h3>
        </div>

        <div className="p-8 space-y-8">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoURL ? (
                <img src={photoURL} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100" />
              ) : (
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic">
                  {initials}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zdjęcie profilowe</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  <Upload size={13} /> Wgraj zdjęcie
                </button>
                {user?.providerData.some(p => p.providerId === 'google.com') && (
                  <button
                    onClick={syncGooglePhoto}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={13} /> Pobierz z Google
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <div className="text-[9px] text-slate-400 font-bold">JPG, PNG, max 5 MB. Synchronizacja przy każdym logowaniu Google.</div>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-50 pt-6">
            <div className="md:col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Imię i nazwisko</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input
                value={userData?.email ?? user?.email ?? ''}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefon</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+48 500 000 000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dostawca logowania</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-400">
                {user?.providerData.map(p => p.providerId).join(', ') || 'email/hasło'}
              </div>
            </div>
          </div>

          {error && <p className="flex items-center gap-2 text-red-600 text-xs font-bold"><AlertTriangle size={12} />{error}</p>}
          {success && <p className="flex items-center gap-2 text-emerald-600 text-xs font-bold"><CheckCircle2 size={12} />{success}</p>}

          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2"
            >
              <CheckCircle2 size={14} /> {saving ? 'Zapisuję...' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
