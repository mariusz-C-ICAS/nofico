import React, { useEffect, useState } from 'react';
import { Video, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  getZoomConfig,
  getTeamsConfig,
  createZoomMeeting,
  createTeamsMeeting,
  attachMeetingToBooking,
  VideoMeeting,
} from '../services/videoMeetingService';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = 'zoom' | 'teams';
type Status = 'idle' | 'loading' | 'success' | 'error' | 'no-config';

interface Props {
  bookingId: string;
  startTime: string;
  durationMin: number;
  title?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoMeetingButton({ bookingId, startTime, durationMin, title = 'Spotkanie' }: Props) {
  const { activeTenantId } = useAuth() as any;

  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [existingMeeting, setExistingMeeting] = useState<VideoMeeting | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  // Check which providers are configured and if meeting already exists
  useEffect(() => {
    if (!activeTenantId) return;

    async function check() {
      const [zoomCfg, teamsCfg, bookingSnap] = await Promise.all([
        getZoomConfig(activeTenantId),
        getTeamsConfig(activeTenantId),
        getDoc(doc(db, 'bookings', activeTenantId, 'items', bookingId)),
      ]);

      const providers: Provider[] = [];
      if (zoomCfg) providers.push('zoom');
      if (teamsCfg) providers.push('teams');
      setAvailableProviders(providers);
      if (providers.length > 0) setSelectedProvider(providers[0]);

      if (bookingSnap.exists()) {
        const vm = bookingSnap.data()?.videoMeeting as VideoMeeting | undefined;
        if (vm) setExistingMeeting(vm);
      }

      setConfigChecked(true);
    }

    check().catch(() => setConfigChecked(true));
  }, [activeTenantId, bookingId]);

  // Nothing to show while loading config
  if (!configChecked) return null;

  // No providers configured
  if (availableProviders.length === 0) return null;

  const joinUrl = existingMeeting?.joinUrl ?? null;

  const handleCopy = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!selectedProvider || !activeTenantId) return;
    setStatus('loading');
    setError(null);

    try {
      let meeting: VideoMeeting;

      if (selectedProvider === 'zoom') {
        const cfg = await getZoomConfig(activeTenantId);
        if (!cfg) throw new Error('Brak konfiguracji Zoom');
        const zm = await createZoomMeeting(cfg.apiKey, title, startTime, durationMin);
        meeting = { provider: 'zoom', ...zm };
      } else {
        const cfg = await getTeamsConfig(activeTenantId);
        if (!cfg) throw new Error('Brak konfiguracji Teams');
        const tm = await createTeamsMeeting(cfg.apiKey, title, startTime, durationMin);
        meeting = { provider: 'teams', ...tm };
      }

      await attachMeetingToBooking(activeTenantId, bookingId, meeting);
      setExistingMeeting(meeting);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    }
  };

  // ---------------------------------------------------------------------------
  // Render: existing meeting
  // ---------------------------------------------------------------------------

  if (existingMeeting) {
    const providerLabel = existingMeeting.provider === 'zoom' ? 'Zoom' : 'Teams';
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold">
          <Video size={13} />
          Spotkanie {providerLabel}:&nbsp;
          <a
            href={existingMeeting.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 truncate max-w-[200px]"
          >
            Dołącz
          </a>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-slate-600 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all w-fit"
        >
          {copied ? <CheckCircle size={12} className="text-emerald-600" /> : <Copy size={12} />}
          {copied ? 'Skopiowano!' : 'Kopiuj link'}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: create meeting
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* Provider selector — only if both configured */}
      {availableProviders.length > 1 && (
        <div className="flex items-center gap-3">
          {availableProviders.map(p => (
            <label key={p} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="radio"
                name={`video-provider-${bookingId}`}
                value={p}
                checked={selectedProvider === p}
                onChange={() => setSelectedProvider(p)}
                className="accent-violet-600"
              />
              {p === 'zoom' ? 'Zoom' : 'Teams'}
            </label>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={status === 'loading'}
        className="flex items-center gap-2 bg-violet-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-fit"
      >
        {status === 'loading'
          ? <Loader2 size={13} className="animate-spin" />
          : <Video size={13} />}
        {status === 'loading' ? 'Tworzenie...' : 'Utwórz spotkanie video'}
      </button>

      {status === 'error' && error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-xs font-semibold">
          <AlertCircle size={13} />
          {error}
        </div>
      )}
    </div>
  );
}
