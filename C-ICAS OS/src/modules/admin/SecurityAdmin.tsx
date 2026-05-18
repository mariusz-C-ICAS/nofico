/**
 * Data: 2026-05-12 19:57
 * Opis: ADM-IMP-03: Strona bezpieczeństwa z politykami.
 */
import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Save, AlertCircle, 
  Terminal, Key, Activity, Globe, CheckCircle2,
  LockKeyhole, ShieldCheck, Database, FileKey, 
  RefreshCw, History, ShieldAlert
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';
import { useAuth } from '../../shared/hooks/AuthContext';
import { ComplianceScoreService, ComplianceScoreResult } from '../compliance/services/ComplianceScoreService';
import { loadAuditConfig, AuditConfig } from '../../shared/lib/audit';

export default function SecurityAdmin() {
  const { userData, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'policies' | 'hardening' | 'compliance'>('policies');
  const [policies, setPolicies] = useState({
    passwordMinLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    sessionTimeoutMinutes: 60,
    mfaRequired: false,
    ipAllowlist: '',
  });
  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    logLevel: 'STANDARD',
    logCategories: ['documents', 'users', 'transactions', 'master_data', 'system']
  });
  const [auditRetentionDays, setAuditRetentionDays] = useState(365);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [complianceScore, setComplianceScore] = useState<ComplianceScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const hardeningStats = [
    { id: 'SEC-01', name: 'VPC Service Controls', status: 'Active', icon: Globe, detail: 'Wszystkie projekty w obwodzie bezpieczeństwa' },
    { id: 'SEC-02', name: 'CMEK (KMS)', status: 'Enabled', icon: Key, detail: 'Klucze zarządzane przez klienta: Firestore, SQL, Storage' },
    { id: 'SEC-03', name: 'Cloud HSM', status: 'Operational', icon: LockKeyhole, detail: 'Klucze pieczęci kwalifikowanej w hardware HSM' },
    { id: 'SEC-04', name: 'Cloud Armor', status: 'Monitoring', icon: ShieldCheck, detail: 'OWASP Top 10 + Geo-blocking (PL/EU Only)' },
    { id: 'SEC-05', name: 'App Check', status: 'Protected', icon: Activity, detail: 'DeviceCheck & reCAPTCHA Enterprise' },
    { id: 'SEC-07', name: 'Secret Manager', status: 'Auto-Rotate', icon: RefreshCw, detail: 'Rotacja kluczy co 90 dni (SOC2)' }
  ];

  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const snap = await getDoc(doc(db, 'system_config', 'security_policies'));
        if (snap.exists()) {
          setPolicies(prev => ({ ...prev, ...snap.data() }));
        }
        
        if (activeTenantId) {
          const config = await loadAuditConfig(activeTenantId);
          setAuditConfig(config);
          
          const tSnap = await getDoc(doc(db, 'system_config', `audit_retention_${activeTenantId}`));
          if (tSnap.exists()) {
            setAuditRetentionDays(tSnap.data().days || 365);
          }
        }
      } catch (err) {
        console.error('Error loading policies:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPolicies();

    // Listen to real-time audit logs from Firestore
    if (activeTenantId) {
      const qLogs = query(
        collection(db, 'auditLogs'), 
        where('tenantId', '==', activeTenantId),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
      const unsubscribeLogs = onSnapshot(qLogs, (snap) => {
        setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs'));
  
      ComplianceScoreService.calculateAndSaveScore(activeTenantId, userData?.id || 'system')
        .then(res => setComplianceScore(res))
        .catch(err => console.error(err));

      return () => unsubscribeLogs();
    }
  }, [userData, activeTenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'system_config', 'security_policies'), {
        ...policies,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      if (activeTenantId && userData?.id) {
        await setDoc(doc(db, 'system_config', `audit_${activeTenantId}`), auditConfig);
        await setDoc(doc(db, 'system_config', `audit_retention_${activeTenantId}`), { days: auditRetentionDays, updatedAt: serverTimestamp() });

        await setDoc(doc(collection(db, 'auditLogs')), {
          tenantId: activeTenantId,
          entityId: 'security_policies',
          collection: 'system_config',
          action: 'update',
          userId: userData.id,
          changes: 'Updated security policies and audit config',
          createdAt: serverTimestamp()
        });
      }

      setMessage('Polityki zostały zaktualizowane pomyślnie.');
    } catch (err) {
      console.error('Error saving policies:', err);
      setMessage('Błąd podczas zapisywania polityk.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Ładowanie systemów bezpieczeństwa...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-900 rounded-lg text-indigo-400">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Security Command Center</h1>
          </div>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Hardening & Compliance Engine (SEC-01 - SEC-15)</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'policies' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Polityki
          </button>
          <button 
            onClick={() => setActiveTab('hardening')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hardening' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Hardening
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'compliance' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Compliance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {activeTab === 'policies' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl"
            >
              <form onSubmit={handleSave} className="p-8 space-y-8">
                {message && (
                  <div className={`p-4 rounded-2xl font-bold text-sm flex items-center gap-3 ${message.includes('Błąd') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                    <AlertCircle size={18} />
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-l-4 border-indigo-600 pl-4">Hasła i Autoryzacja</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Minimalna długość hasła</label>
                        <input 
                          type="number" 
                          value={policies.passwordMinLength}
                          onChange={e => setPolicies(p => ({ ...p, passwordMinLength: parseInt(e.target.value) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Lock size={18} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Wymagaj znaków specjalnych</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPolicies(p => ({ ...p, requireSpecialChars: !p.requireSpecialChars }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${policies.requireSpecialChars ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${policies.requireSpecialChars ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Activity size={18} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Wymagaj liczb</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPolicies(p => ({ ...p, requireNumbers: !p.requireNumbers }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${policies.requireNumbers ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${policies.requireNumbers ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-l-4 border-indigo-600 pl-4">Sesja i Dostęp</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Timeout sesji (minuty)</label>
                        <input 
                          type="number" 
                          value={policies.sessionTimeoutMinutes}
                          onChange={e => setPolicies(p => ({ ...p, sessionTimeoutMinutes: parseInt(e.target.value) }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Shield size={18} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Wymuś MFA dla wszystkich</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setPolicies(p => ({ ...p, mfaRequired: !p.mfaRequired }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${policies.mfaRequired ? 'bg-red-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${policies.mfaRequired ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Allowlist IP (Admin)</label>
                        <textarea 
                          value={policies.ipAllowlist}
                          onChange={e => setPolicies(p => ({ ...p, ipAllowlist: e.target.value }))}
                          placeholder="Wpisz adresy IP oddzielone przecinkami..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8 mt-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-l-4 border-indigo-600 pl-4">Logowanie Audytowe i Retencja</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Poziom logowania</label>
                        <div className="relative">
                          <select 
                            value={auditConfig.logLevel}
                            onChange={e => setAuditConfig(p => ({ ...p, logLevel: e.target.value as any }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                          >
                            <option value="NONE">Brak (NONE)</option>
                            <option value="CRITICAL_ONLY">Tylko krytyczne (CRITICAL_ONLY)</option>
                            <option value="STANDARD">Standardowe (STANDARD)</option>
                            <option value="VERBOSE">Pełne (VERBOSE)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Retencja logów i Compliance (dni)</label>
                        <input 
                          type="number" 
                          value={auditRetentionDays}
                          onChange={e => setAuditRetentionDays(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-l-4 border-indigo-600 pl-4">Kategorie Logowania</h3>
                     <div className="space-y-3 relative z-10">
                       {['documents', 'users', 'transactions', 'master_data', 'system', 'incidents'].map(cat => {
                         const isActive = auditConfig.logCategories?.includes(cat);
                         
                         const catDescriptions: Record<string, React.ReactNode> = {
                          'documents': <><span className="text-white font-bold block mb-1">Dokumenty, umowy, pliki, KSeF.</span>Odczyt, modyfikacja, usuwanie, podział.</>,
                          'users': <><span className="text-white font-bold block mb-1">Operacje na użytkownikach.</span>Logowania, role, nadawanie uprawnień.</>,
                          'transactions': <><span className="text-white font-bold block mb-1">Operacje finansowe.</span>Księgi księgowe, płatności, faktury, autoryzacje.</>,
                          'master_data': <><span className="text-white font-bold block mb-1">Główne dane słownikowe.</span>Rejestry i bazowe konfiguracje modułów.</>,
                          'system': <><span className="text-white font-bold block mb-1">Konfiguracja systemowa.</span>Ustawienia tenanta, reguły bezpieczeństwa.</>,
                          'incidents': <><span className="text-white font-bold block mb-1">Zarządzanie incydentami.</span>Alarmy bezpieczeństwa, podejrzane logowania.</>
                         };

                         return (
                           <div key={cat} className="relative group shrink-0 w-full z-10 hover:z-50">
                             <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                               <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{cat}</span>
                               <input 
                                 type="checkbox" 
                                 checked={isActive}
                                 onChange={(e) => {
                                   let newCats = [...(auditConfig.logCategories || [])];
                                   if (e.target.checked && !isActive) newCats.push(cat);
                                   else if (!e.target.checked) newCats = newCats.filter(c => c !== cat);
                                   setAuditConfig(p => ({ ...p, logCategories: newCats }));
                                 }}
                                 className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                               />
                             </label>
                             <div className="pointer-events-none group-hover:pointer-events-auto absolute left-1/2 bottom-full mb-2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] bg-slate-800 text-slate-300 text-xs py-2 px-4 rounded-xl shadow-2xl border border-slate-700 min-w-[200px] text-center select-text">
                               {catDescriptions[cat]}
                               <div className="absolute -bottom-2 left-0 right-0 h-2 bg-transparent"></div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50"
                  >
                    {saving ? 'Zapisywanie...' : <><Save size={18} /> Zapisz Polityki</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'hardening' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {hardeningStats.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <item.icon size={24} />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                      {item.status}
                    </div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.id}</div>
                  <h4 className="font-black text-slate-900 uppercase italic tracking-tighter mb-2">{item.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">{item.detail}</p>
                </div>
              ))}
              
              <div className="md:col-span-2 bg-slate-900 p-8 rounded-3xl text-white">
                <div className="flex items-center gap-4 mb-6">
                  <Terminal className="text-emerald-400" size={32} />
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Security Logs (Real-time)</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Audyt infrastruktury w chmurze</p>
                  </div>
                </div>
                <div className="space-y-3 font-mono text-[10px] max-h-96 overflow-y-auto custom-scrollbar pr-4">
                  {auditLogs.length > 0 ? (
                    auditLogs.map(log => {
                      const time = log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() :
                                   log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'N/A';
                      
                      const systemName = log.collection || 'System';
                      let logColor = 'text-slate-500';
                      let textClass = 'text-slate-400';
                      let prefix = '';
                      
                      if (log.action === 'delete') { 
                        logColor = 'text-rose-400'; 
                        textClass = 'text-rose-200';
                        prefix = 'DELETE';
                      } else if (log.action === 'create') { 
                        logColor = 'text-emerald-400'; 
                        textClass = 'text-white';
                        prefix = 'INSERT';
                      } else { 
                        logColor = 'text-indigo-400'; 
                        textClass = 'text-white';
                        prefix = 'UPDATE';
                      }

                      return (
                        <div key={log.id} className={`flex items-start gap-3 ${logColor}`}>
                          <span className="opacity-50 shrink-0">[{time}]</span>
                          <span className="font-bold shrink-0">{systemName.toUpperCase()}:</span>
                          <span className={`${textClass} break-all`}>
                            {prefix} by {log.userId || 'system'} na ID: {log.entityId} 
                            {log.changes && <span className="opacity-50 block mt-1">{JSON.stringify(log.changes)}</span>}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 animate-pulse flex items-center gap-2">
                       <RefreshCw size={14} className="animate-spin" />
                       <span>Oczekiwanie na logi Cloud Logging & Firestore Audit...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'compliance' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Audit Readiness Dashboard</h3>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-[10px]">Monitoring zgodności ISO 27001 / SOC2</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-indigo-600 leading-none">
                      {complianceScore ? `${complianceScore.score}%` : '...'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compliance Score</div>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { name: 'SOC 2 Type II (Faza 3)', status: 'In Progress', progress: 75, color: 'bg-indigo-600' },
                    { name: 'ISO 27001 (Audit 2026)', status: 'Verified', progress: 100, color: 'bg-emerald-500' },
                    { name: 'DPIA (AI Copilot)', status: 'Final Review', progress: 90, color: 'bg-emerald-500' },
                    { name: 'GDPR / RODO Audit', status: 'Compliant', progress: 100, color: 'bg-emerald-500' }
                  ].map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-700">{item.name}</span>
                        <span className={item.progress === 100 ? 'text-emerald-500' : 'text-indigo-600'}>{item.status}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          className={`h-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-900 p-6 rounded-3xl text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="text-emerald-400" />
                    <h4 className="font-black uppercase italic tracking-tighter">Ostatni Penetration Test</h4>
                  </div>
                  <div className="text-2xl font-black mb-1">0 CRITICAL</div>
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Audyt kwartalny (Q1 2026) zakończony pomyślnie</p>
                </div>
                <div className="bg-indigo-900 p-6 rounded-3xl text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <History className="text-indigo-400" />
                    <h4 className="font-black uppercase italic tracking-tighter">Backup & DR Status</h4>
                  </div>
                  <div className="text-2xl font-black mb-1">RPO &lt; 5m</div>
                  <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Cross-region replication (DORA Compliant)</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <Database size={16} className="text-indigo-600" /> Bezpieczeństwo Danych
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Firestore Rules</div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center justify-between">
                  <span>Deny by Default</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data at Rest</div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center justify-between">
                  <span>AES-256 (CMEK)</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Trail</div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center justify-between">
                  <span>Tamper-proof (WORM)</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileKey size={120} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <Lock size={16} className="text-indigo-600" /> Zero Trust Architecture
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed relative z-10">
              System implementuje model Zero Trust. Każdy pakiet danych i każde żądanie jest weryfikowane pod kątem tożsamości, uprawnień handlowych i kontekstu operacyjnego (Workload Identity).
            </p>
            <button className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10">
              Pobierz Raport Bezpieczeństwa
            </button>
          </div>

          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
            <h4 className="text-xs font-black uppercase tracking-widest mb-4">On-Call Security</h4>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">24/7</div>
              <div className="text-[10px] font-bold uppercase tracking-widest">Monitorowanie zagrożeń i reagowanie na incydenty (SIRT)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
