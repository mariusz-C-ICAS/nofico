import React, { useState } from 'react';
import { validateNIP } from '../services/validators';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  onBlurLookup?: (nip: string) => void;
}

export function NIPInput({ value, onChange, label = 'NIP', required, className = '', onBlurLookup }: Props) {
  const [touched, setTouched] = useState(false);
  const result = value ? validateNIP(value) : null;
  const hasError = touched && result && !result.valid;
  const hasOk = touched && result?.valid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\-]/g, '');
    onChange(raw);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={() => { setTouched(true); if (result?.valid && onBlurLookup) onBlurLookup(value); }}
          placeholder="000-000-00-00"
          maxLength={13}
          className={`w-full px-3 py-2.5 pr-9 text-[13px] font-mono bg-white border rounded-xl outline-none transition-colors
            ${hasError ? 'border-rose-400 focus:border-rose-500' : hasOk ? 'border-emerald-400 focus:border-emerald-500' : 'border-slate-200 focus:border-indigo-400'}`}
        />
        {hasError && <XCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400" />}
        {hasOk && <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
      </div>
      {hasError && <p className="text-[10px] text-rose-500 font-bold">{result?.error}</p>}
    </div>
  );
}
