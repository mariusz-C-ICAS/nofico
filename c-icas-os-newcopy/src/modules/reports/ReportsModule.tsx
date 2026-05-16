/**
 * Data: 2026-05-10 13:24
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja Modułu Raportów.
 * Opis: Widok z logami pracy dla Administratorów/Zarządzających.
 */
import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Clock, Filter, Activity, ExternalLink, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportsModule() {
  const { userData, hasPermission, activeTenantId } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'time' | 'audit'>('time');
  const [filterProject, setFilterProject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const hasAccess = hasPermission('*') || hasPermission('reports.view');
  const hasAuditAccess = hasPermission('*') || hasPermission('roles.manage');

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    // Podstawowy mapping użytkowników dla czytelności raportów
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const map: Record<string, string> = {};
        snap.forEach(doc => {
          const d = doc.data();
          // Preferujemy name, potem email, potem wycinek UID
          map[doc.id] = d.name || d.email?.split('@')[0] || doc.id.substring(0, 8);
        });
        setUsersMap(map);
      } catch (err) {
        console.error("User fetch error:", err);
      }
    };
    fetchUsers();

    if (!activeTenantId) return;

    // W MVP ładujemy wszystkie (z limitem) dla adminów / managerów
    const q = query(collection(db, 'timeEntries'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'), limit(100));

    const unsubscribeTime = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
    });

    const qAudit = query(collection(db, 'auditLogs'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeAudit = onSnapshot(qAudit, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
      setLoading(false);
    });

    return () => {
      unsubscribeTime();
      unsubscribeAudit();
    };
  }, []);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500">
        Nie masz uprawnień do przeglądania raportów globalnych.
      </div>
    );
  }

  const filteredEntries = entries.filter(e => {
    let match = true;
    if (filterProject && !e.projectId.toLowerCase().includes(filterProject.toLowerCase())) match = false;
    if (filterType && e.type !== filterType) match = false;
    if (filterUser && !e.userId.toLowerCase().includes(filterUser.toLowerCase())) match = false;
    return match;
  });

  if (loading) return <div>Wczytywanie raportów z Firestore...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <FileText className="text-blue-600" />
            Raportowanie i Audyt
          </h2>
          <p className="text-sm text-slate-500 mt-1">Podgląd historii modyfikacji, raportów modułów oraz czasu</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('time')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'time' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Czas Pracy
          </button>
          {hasAuditAccess && (
            <button 
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              System Audit (RODO)
            </button>
          )}
        </div>
      </div>

      {activeTab === 'time' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Filtry:</span>
            </div>
            <input 
              type="text" 
              placeholder="Szukaj po UID Pracownika..." 
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[150px]"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Szukaj po ID Projektu..." 
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[150px]"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            />
            <select 
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Wszystkie typy</option>
              <option value="work">Praca</option>
              <option value="travel">Podróż</option>
              <option value="break">Przerwa</option>
            </select>
            
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded-lg transition-colors font-medium text-sm sm:ml-auto">
              <Download size={16} /> Eksportuj CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 border-b border-gray-100">Pracownik</th>
                  <th className="p-4 border-b border-gray-100">Projekt / Typ</th>
                  <th className="p-4 border-b border-gray-100">Data</th>
                  <th className="p-4 border-b border-gray-100">Koniec</th>
                  <th className="p-4 border-b border-gray-100 text-right">Czas Łączny</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                      Brak dopasowanych logów do filtrów.
                    </td>
                  </tr>
                ) : filteredEntries.map(entry => {
                  const start = entry.startTime?.toDate();
                  const end = entry.endTime?.toDate();
                  let duration = '-';
                  if (start && end) {
                    const diffMs = end.getTime() - start.getTime();
                    const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
                    duration = `${diffHrs}h`;
                  }
                  
                  return (
                    <tr 
                      key={entry.id} 
                      onClick={() => navigate(`/projects/${entry.projectId}`)}
                      className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                              <UserIcon size={16} />
                           </div>
                           <div className="font-bold text-slate-800">{usersMap[entry.userId] || entry.userId.substring(0, 8)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-xs flex items-center gap-1">
                           {entry.projectId}
                           <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 capitalize">{entry.type}</div>
                      </td>
                      <td className="p-4 flex flex-col gap-1">
                        <span>{start ? format(start, 'dd.MM.yyyy') : '-'}</span>
                        <span className="flex items-center gap-1 text-slate-500 text-xs"><Clock size={12}/> {start ? format(start, 'HH:mm') : '-'}</span>
                      </td>
                      <td className="p-4">
                        {end ? <span className="flex items-center gap-1 text-slate-600"><Clock size={14}/> {format(end, 'HH:mm')}</span> : (
                          <span className="text-amber-500 text-xs font-semibold px-2 py-1 bg-amber-50 rounded-full">W Trakcie</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-right text-slate-900">{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'audit' && hasAuditAccess && (
        <div className="flex flex-col gap-4">
          <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-xl text-indigo-800 text-sm flex gap-2">
            <Activity size={20} className="shrink-0" />
            <p>Logi Audytowe pokazują aktywację/deaktywację modułów oraz inne działania wrażliwe z punktu widzenia administratora i compliance.</p>
          </div>
          
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 border-b border-gray-100">Data</th>
                  <th className="p-4 border-b border-gray-100">Kolekcja/Akcja</th>
                  <th className="p-4 border-b border-gray-100">Zmiany</th>
                  <th className="p-4 border-b border-gray-100">Edytor (UID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">Brak zdarzeń audytowych.</td>
                  </tr>
                ) : auditLogs.map(log => {
                  const stamp = log.createdAt?.toDate();
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{stamp ? format(stamp, 'dd.MM.yyyy') : ''}</div>
                        <div className="text-xs text-slate-500">{stamp ? format(stamp, 'HH:mm:ss') : ''}</div>
                      </td>
                      <td className="p-4">
                         <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold mr-2">{log.collection}</span>
                         <span className="text-slate-500 text-xs">{log.action}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">{log.changes}</td>
                      <td className="p-4 font-bold text-slate-900">{usersMap[log.userId] || log.userId}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
