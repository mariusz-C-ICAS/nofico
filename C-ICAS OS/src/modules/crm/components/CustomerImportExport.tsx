import React, { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

const CSV_HEADERS = ['name', 'nip', 'email', 'phone', 'city', 'address', 'industry', 'status', 'tags', 'totalRevenue', 'currency', 'website'];

function toCSV(rows: any[]): string {
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_HEADERS.join(',')];
  rows.forEach(r => {
    lines.push(CSV_HEADERS.map(h => {
      if (h === 'tags') return escape((r.tags ?? []).join(';'));
      return escape(r[h] ?? '');
    }).join(','));
  });
  return lines.join('\r\n');
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

export default function CustomerImportExport({ tenantId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const snap = await getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId)));
      const rows = snap.docs.map(d => d.data());
      const csv = toCSV(rows);
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `klienci_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      let ok = 0;
      const errors: string[] = [];
      await Promise.all(rows.map(async (row, i) => {
        if (!row.name?.trim()) { errors.push(`Wiersz ${i + 2}: brak nazwy`); return; }
        try {
          await addDoc(collection(db, 'customers'), {
            tenantId,
            name: row.name.trim(),
            nip: row.nip?.trim() || null,
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            city: row.city?.trim() || null,
            address: row.address?.trim() || null,
            industry: row.industry?.trim() || null,
            status: (['prospect','active','churned','blocked'].includes(row.status) ? row.status : 'prospect'),
            tags: row.tags ? row.tags.split(';').map(t => t.trim()).filter(Boolean) : [],
            totalRevenue: row.totalRevenue ? parseFloat(row.totalRevenue) || 0 : 0,
            currency: row.currency?.trim() || 'PLN',
            website: row.website?.trim() || null,
            leadScore: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ok++;
        } catch {
          errors.push(`Wiersz ${i + 2}: błąd zapisu`);
        }
      }));
      setImportResult({ ok, errors });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Import / Export CSV</h3>
        <p className="text-xs text-slate-500 mt-0.5">Masowy import i eksport bazy klientów</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Export */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Download size={14} className="text-emerald-700" />
            </div>
            <p className="text-sm font-black text-slate-800">Eksport klientów</p>
          </div>
          <p className="text-[10px] text-slate-500">
            Pobierz wszystkich klientów jako plik CSV (UTF-8 BOM, separator: przecinek).
            Pola: {CSV_HEADERS.join(', ')}.
          </p>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs px-4 py-2 rounded-xl">
            {exporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
            Pobierz CSV
          </button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Upload size={14} className="text-indigo-700" />
            </div>
            <p className="text-sm font-black text-slate-800">Import klientów</p>
          </div>
          <p className="text-[10px] text-slate-500">
            Prześlij plik CSV z nagłówkami: <span className="font-mono text-indigo-600">name</span> (wymagane),
            nip, email, phone, city, status, tags (separator: ;), totalRevenue.
          </p>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-4 py-2 rounded-xl">
            {importing ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
            Wczytaj CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Template download */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
        <FileText size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-black text-slate-600 mb-1">Szablon CSV do importu</p>
          <button onClick={() => {
            const csv = CSV_HEADERS.join(',') + '\r\nAcme Sp. z o.o.,1234567890,biuro@acme.pl,+48123456789,Warszawa,,IT,active,vip;kluczowy,50000,PLN,';
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'szablon_klientow.csv'; a.click();
          }} className="text-[10px] font-black text-indigo-600 hover:underline">
            Pobierz szablon
          </button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className={`rounded-2xl p-4 border space-y-2 ${importResult.errors.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs font-black text-slate-800 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Zaimportowano {importResult.ok} klientów
          </p>
          {importResult.errors.map((e, i) => (
            <p key={i} className="text-[10px] text-red-600 flex items-center gap-1">
              <AlertTriangle size={10} /> {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
