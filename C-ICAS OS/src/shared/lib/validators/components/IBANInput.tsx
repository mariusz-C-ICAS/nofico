import React, { useState } from 'react';
import { validateIBAN } from '../services/validators';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export function IBANInput({ value, onChange, label = 'IBAN', required, className = '' }: Props) {
  const [touched, setTouched] = useState(false);
  const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  const result = value ? validateIBAN(value) : null;
  const hasError = touched && result && !result.valid;
  const hasOk = touched && result?.valid;

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={formatted}
          onChange={e => onChange(e.target.value.replace(/\s/g, '').toUpperCase())}
          onBlur={() => setTouched(true)}
          placeholder="PL61 1090 1014 0000 0712 1981 2874"
          maxLength={34}
          className={`w-full px-3 py-2.5 pr-9 text-[13px] font-mono bg-white border rounded-xl outline-none transition-colors
            ${hasError ? 'border-rose-400' : hasOk ? 'border-emerald-400' : 'border-slate-200 focus:border-indigo-400'}`}
        />
        {hasError && <XCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400" />}
        {hasOk && <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
      </div>
      {hasError && <p className="text-[10px] text-rose-500 font-bold">{result?.error}</p>}
    </div>
  );
}
