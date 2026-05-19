/**
 * Data: 2026-05-19
 * Modul: DMS — Cloud Drive Picker
 * Opis: Komponent do przeglądania i importowania plików z OneDrive i Google Drive.
 *       Obsługuje stany: brak tokenu, ładowanie, błąd, sukces.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  FileText,
  X,
  Loader2,
  CheckSquare,
  Square,
  Download,
  AlertCircle,
  Settings,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import {
  DriveProvider,
  DriveFile,
  getTokenForProvider,
  listOneDriveFiles,
  listGoogleDriveFiles,
  listDropboxFiles,
  importFileToDMS,
} from '../services/cloudDriveService';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

type PickerState = 'idle' | 'loading' | 'no_token' | 'error' | 'success';

interface CloudDrivePickerProps {
  onClose: () => void;
  onImported: () => void;
}

// ---------------------------------------------------------------------------
// Stałe
// ---------------------------------------------------------------------------

const PROVIDER_LABELS: Record<DriveProvider, string> = {
  onedrive: 'OneDrive',
  googledrive: 'Google Drive',
  dropbox: 'Dropbox',
};

const PROVIDER_COLORS: Record<DriveProvider, string> = {
  onedrive: 'text-blue-600 bg-blue-50',
  googledrive: 'text-red-600 bg-red-50',
  dropbox: 'text-blue-800 bg-blue-50',
};

const PROVIDER_DOT_COLORS: Record<DriveProvider, string> = {
  onedrive: 'bg-blue-500',
  googledrive: 'bg-red-500',
  dropbox: 'bg-blue-800',
};

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function CloudDrivePicker({ onClose, onImported }: CloudDrivePickerProps) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  const [activeProvider, setActiveProvider] = useState<DriveProvider>('onedrive');
  const [state, setState] = useState<PickerState>('idle');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async () => {
    if (!activeTenantId) return;

    setState('loading');
    setFiles([]);
    setSelected(new Set());
    setErrorMessage('');

    const { token, configured } = await getTokenForProvider(activeTenantId, activeProvider);

    if (!configured || !token) {
      setState('no_token');
      return;
    }

    try {
      let result: DriveFile[];
      if (activeProvider === 'onedrive') {
        result = await listOneDriveFiles(token);
      } else if (activeProvider === 'googledrive') {
        result = await listGoogleDriveFiles(token);
      } else {
        result = await listDropboxFiles(token);
      }

      setFiles(result);
      setState('idle');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Błąd połączenia z API');
      setState('error');
    }
  }, [activeTenantId, activeProvider]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!user || !activeTenantId || selected.size === 0) return;

    const toImport = files.filter((f) => selected.has(f.id));
    const ids = new Set(toImport.map((f) => f.id));
    setImportingIds(ids);

    const results = await Promise.all(
      toImport.map((file) =>
        importFileToDMS(activeTenantId, user.uid, file, activeProvider)
      )
    );

    const successIds = new Set(
      toImport
        .filter((_, i) => results[i].success)
        .map((f) => f.id)
    );

    const failCount = results.filter((r) => !r.success).length;

    setImportedIds((prev) => new Set([...prev, ...successIds]));
    setImportingIds(new Set());
    setSelected(new Set());

    if (failCount === 0) {
      setState('success');
      setTimeout(() => {
        onImported();
        onClose();
      }, 1200);
    } else {
      setErrorMessage(`${failCount} z ${results.length} plików nie udało się zaimportować.`);
      setState('error');
    }
  };

  const selectAll = () => {
    const importable = files.filter((f) => !importedIds.has(f.id));
    setSelected(new Set(importable.map((f) => f.id)));
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderNoToken = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
        <Settings size={32} className="text-amber-500" />
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">
        Brak konfiguracji {PROVIDER_LABELS[activeProvider]}
      </h3>
      <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-xs mb-6">
        Aby przeglądać pliki, skonfiguruj integrację{' '}
        <strong>{PROVIDER_LABELS[activeProvider]}</strong> w module Integracji.
        Wymagane jest połączenie OAuth2.
      </p>
      <a
        href="#integrations"
        onClick={onClose}
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
      >
        Przejdz do Integracji
      </a>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-rose-500" />
      </div>
      <p className="text-[11px] text-rose-700 font-black uppercase tracking-tight mb-4">
        {errorMessage}
      </p>
      <button
        onClick={loadFiles}
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
      >
        Sprobuj ponownie
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
        <CheckCheck size={32} className="text-emerald-500" />
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
        Zaimportowano pomyslnie
      </h3>
      <p className="text-[11px] text-slate-500 font-bold mt-1">
        Dokumenty pojawiaja sie w Skarbcu Firmowym.
      </p>
    </div>
  );

  const renderFileList = () => {
    if (state === 'loading') {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <span className="ml-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">
            Pobieranie listy plikow...
          </span>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[11px] font-black uppercase tracking-widest">Brak plikow w tym folderze</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {files.map((file) => {
          const isSelected = selected.has(file.id);
          const isImported = importedIds.has(file.id);
          const isImporting = importingIds.has(file.id);

          return (
            <div
              key={file.id}
              onClick={() => !isImported && toggleSelect(file.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                isImported
                  ? 'bg-emerald-50 border-emerald-200 opacity-60 cursor-default'
                  : isSelected
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              {/* Checkbox */}
              <div className="shrink-0">
                {isImported ? (
                  <CheckCheck size={18} className="text-emerald-500" />
                ) : isImporting ? (
                  <Loader2 size={18} className="animate-spin text-indigo-500" />
                ) : isSelected ? (
                  <CheckSquare size={18} className="text-indigo-600" />
                ) : (
                  <Square size={18} className="text-slate-300" />
                )}
              </div>

              {/* Ikona pliku */}
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-slate-400" />
              </div>

              {/* Metadane */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {formatSize(file.size)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(file.modifiedAt).toLocaleDateString('pl-PL')}
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase truncate max-w-[120px]">
                    {file.mimeType.split('/').pop()}
                  </span>
                </div>
              </div>

              {/* Link zewnętrzny */}
              {file.webUrl && (
                <a
                  href={file.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-300 hover:text-indigo-500 transition-all"
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render główny
  // ---------------------------------------------------------------------------

  const importableCount = files.filter((f) => !importedIds.has(f.id)).length;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95">

      {/* Nagłówek */}
      <div className="flex justify-between items-start p-8 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cloud size={18} className="text-indigo-500" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
              Import z Chmury
            </h3>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Przegladaj i importuj pliki do DMS
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        >
          <X size={22} />
        </button>
      </div>

      {/* Zakładki providerów */}
      <div className="flex gap-2 px-8 pt-6">
        {(['onedrive', 'googledrive', 'dropbox'] as DriveProvider[]).map((provider) => (
          <button
            key={provider}
            onClick={() => setActiveProvider(provider)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeProvider === provider
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${PROVIDER_DOT_COLORS[provider]}`} />
            {PROVIDER_LABELS[provider]}
          </button>
        ))}
      </div>

      {/* Toolbar (widoczny gdy są pliki) */}
      {state === 'idle' && files.length > 0 && (
        <div className="flex items-center justify-between px-8 pt-4">
          <button
            onClick={selectAll}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
          >
            Zaznacz wszystkie ({importableCount})
          </button>
          {selected.size > 0 && (
            <span className="text-[10px] font-black text-slate-500 uppercase">
              {selected.size} zaznaczono
            </span>
          )}
        </div>
      )}

      {/* Lista plików / stany */}
      <div className="flex-1 overflow-y-auto px-8 py-4 min-h-[200px]">
        {state === 'no_token' && renderNoToken()}
        {state === 'error' && renderError()}
        {state === 'success' && renderSuccess()}
        {(state === 'idle' || state === 'loading') && renderFileList()}
      </div>

      {/* Stopka z przyciskiem import */}
      {state === 'idle' && selected.size > 0 && (
        <div className="px-8 py-6 border-t border-slate-100">
          <button
            onClick={handleImport}
            disabled={importingIds.size > 0}
            className="w-full bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/10"
          >
            {importingIds.size > 0 ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importowanie...
              </>
            ) : (
              <>
                <Download size={16} />
                Importuj do DMS ({selected.size})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
