import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Sparkles, Users, CheckCircle, Target, ShieldAlert, Plus, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

interface RequiredSkill {
  id: string;
  name: string;
  minLevel: number;
  criticality: 'critical' | 'moderate' | 'low';
}

export default function ProjectSkills({ project }: { project: any }) {
  const { activeTenantId } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [masterCompetencies, setMasterCompetencies] = useState<any[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', minLevel: 1, criticality: 'moderate' as const });

  const requiredSkills: RequiredSkill[] = project.requiredCompetencies || [];

  useEffect(() => {
    if (!activeTenantId) return;

    const unEmp = onSnapshot(
      query(collection(db, 'employees'), where('tenantId', '==', activeTenantId)),
      (snap) => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
    );

    const unMaster = onSnapshot(
      collection(db, 'master_competencies'),
      (snap) => setMasterCompetencies(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'master_competencies')
    );

    return () => { unEmp(); unMaster(); };
  }, [activeTenantId]);

  const handleAddSkill = async () => {
    if (!newSkill.name) return;
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        requiredCompetencies: arrayUnion({ id: Math.random().toString(36).substr(2, 9), ...newSkill })
      });
      setShowAddSkill(false);
      setNewSkill({ name: '', minLevel: 1, criticality: 'moderate' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    }
  };

  const handleRemoveSkill = async (skill: RequiredSkill) => {
    try {
      await updateDoc(doc(db, 'projects', project.id), { requiredCompetencies: arrayRemove(skill) });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    }
  };

  const aiSuggestions = useMemo(() => {
    if (requiredSkills.length === 0) return [];

    return employees.map(emp => {
      let matchedCount = 0;
      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];

      requiredSkills.forEach(req => {
        const empSkill = (emp.skills || []).find((s: any) => s.name === req.name);
        if (empSkill && empSkill.level >= req.minLevel) {
          matchedCount++;
          matchedSkills.push(req.name);
        } else {
          missingSkills.push(req.name);
        }
      });

      return {
        ...emp,
        match: Math.round((matchedCount / requiredSkills.length) * 100),
        matchedSkills,
        missingSkills
      };
    }).sort((a, b) => b.match - a.match).slice(0, 5);
  }, [employees, requiredSkills]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={120} /></div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
          <Sparkles size={14} /> Inteligentny Dobór Zespołu
        </h4>
        <p className="text-xs text-slate-400 mb-6 max-w-2xl leading-relaxed">
          Zdefiniuj wymagane kompetencje dla projektu. System przeanalizuje profile pracowników i zaproponuje optymalny skład zespołu, wskazując potencjalne luki kompetencyjne.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">Wymagania projektu</h3>
            <button onClick={() => setShowAddSkill(true)} className="p-1 hover:bg-slate-100 rounded text-slate-500">
              <Plus size={20} />
            </button>
          </div>

          {showAddSkill && (
            <div className="mb-4 p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-3">
              <select
                value={newSkill.name}
                onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="">Wybierz kompetencję...</option>
                {masterCompetencies.map(c => (
                  <option key={c.id} value={c.name?.pl || c.name}>{c.name?.pl || c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <select value={newSkill.minLevel} onChange={e => setNewSkill({ ...newSkill, minLevel: parseInt(e.target.value) })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
                  <option value={1}>Poz. 1 (Podstawowy)</option>
                  <option value={2}>Poz. 2 (Samodzielny)</option>
                  <option value={3}>Poz. 3 (Zaawansowany)</option>
                  <option value={4}>Poz. 4 (Ekspercki)</option>
                </select>
                <select value={newSkill.criticality} onChange={e => setNewSkill({ ...newSkill, criticality: e.target.value as any })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
                  <option value="critical">Critical</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddSkill} className="flex-1 bg-slate-900 text-white text-[10px] font-black uppercase py-2 rounded-lg">Dodaj</button>
                <button onClick={() => setShowAddSkill(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase py-2 rounded-lg">Anuluj</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {requiredSkills.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">Brak zdefiniowanych wymagań</p>
            ) : requiredSkills.map(skill => (
              <div key={skill.id} className="group flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-100 transition-colors">
                <div>
                  <span className="font-semibold text-sm text-slate-700 block">{skill.name}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 inline-block">Min. Level: {skill.minLevel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${skill.criticality === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-200' : skill.criticality === 'moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {skill.criticality}
                  </span>
                  <button onClick={() => handleRemoveSkill(skill)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">Analiza dopasowania zespołu</h3>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase flex items-center gap-1">
              <Sparkles size={10} /> AI Scoring
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiSuggestions.map(employee => (
              <div key={employee.id} className="p-4 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all shadow-sm bg-white flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 uppercase">
                      {employee.name?.[0] || employee.email?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{employee.name || employee.email}</h4>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">{employee.role}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg font-black text-[10px] ${employee.match === 100 ? 'bg-emerald-500 text-white' : employee.match > 50 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {employee.match}%
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {employee.matchedSkills.map((s: string, i: number) => (
                      <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle size={10} /> {s}
                      </span>
                    ))}
                    {employee.missingSkills.map((s: string, i: number) => (
                      <span key={i} className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <ShieldAlert size={10} /> {s}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="mt-4 w-full py-2 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg hover:bg-slate-900 hover:text-white border border-slate-200 transition-all">
                  Przydziel do zespołu
                </button>
              </div>
            ))}

            {aiSuggestions.length === 0 && requiredSkills.length > 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
                Nie znaleziono kandydatów spełniających kryteria.
              </div>
            )}

            {requiredSkills.length === 0 && (
              <div className="col-span-full py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                  <Target size={24} />
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Dodaj wymagania projektowe po lewej stronie, aby AI mogło przeanalizować dostępność pracowników.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
