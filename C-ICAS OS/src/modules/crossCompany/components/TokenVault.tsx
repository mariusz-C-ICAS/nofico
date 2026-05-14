/**
 * TokenVault.tsx
 * Zarządzanie tokenami OAuth per tenant.
 * CC-IMP-02
 */
import React, { useState } from 'react';
import { 
  Key, ShieldCheck, Mail, Globe, 
  RefreshCw, AlertTriangle, Lock, Trash2,
  Plus, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function TokenVault() {
  const [tokens] = useState([
    { id: '1', provider: 'Google Mail', scope: 'gmail.send', status: 'valid', tenant: 'BudPol Sp. z o.o.', lastUsed: '12 min temu' },
    { id: '2', provider: 'Microsoft 365', scope: 'user.read, mail.send', status: 'expiring', tenant: 'GardenDesign', lastUsed: '1h temu' },
    { id: '3', provider: 'GitHub', scope: 'repo', status: 'revoked', tenant: 'Logistix S.A.', lastUsed: '2 dni temu' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Magazyn Tokenów OAuth</h2>
          <p className="text-sm text-gray-500 font-mono">CC-IMP-02: OAuth2 Token Vault (Secret Manager)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus size={16} />
          Podłącz Nowy Provider
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tokens.map((token) => (
          <motion.div 
            key={token.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 bg-white border rounded-xl flex items-center justify-between group transition-all hover:shadow-md ${
              token.status === 'revoked' ? 'border-red-100 bg-red-50/10' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                token.status === 'valid' ? 'bg-emerald-50 text-emerald-600' :
                token.status === 'expiring' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
              }`}>
                {token.provider === 'Google Mail' ? <Mail size={20} /> : <Globe size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{token.provider}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono uppercase tracking-tight">
                    {token.tenant}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                  <Lock size={12} className="text-gray-400" />
                  Scope: {token.scope}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  token.status === 'valid' ? 'bg-emerald-100 text-emerald-800' :
                  token.status === 'expiring' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {token.status}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Użyto: {token.lastUsed}</span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors" title="Odśwież Token">
                  <RefreshCw size={14} />
                </button>
                <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Usuń/Unieważnij">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-4">
        <ShieldCheck className="text-indigo-600 mt-1 flex-shrink-0" size={24} />
        <div>
          <h4 className="text-sm font-semibold text-indigo-900">Bezpieczeństwo Poziomu Bankowego</h4>
          <p className="text-xs text-indigo-700 leading-relaxed mt-1 italic font-serif">
            Wszystkie tokeny są szyfrowane kluczem AES-256 (KMS) przypisanym do Twojej organizacji. 
            Dostęp do tokenów jest logowany w rejestrze Audit Evidence dla zachowania standardów SOC2/NIS2.
          </p>
        </div>
      </div>
    </div>
  );
}
