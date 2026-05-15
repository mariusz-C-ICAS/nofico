import React, { useState, useEffect } from 'react';
import {
  CalendarDays, ListTodo, Users, Settings2, BarChart3,
  Plus, Leaf, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { subscribeToServiceTypes } from './services/calendarService';
import type { ServiceType, ServiceEvent } from './types';
import ServiceCalendar from './components/ServiceCalendar';
import EventCreateWizard from './components/EventCreateWizard';
import WorkerTodayView from './components/WorkerTodayView';
import ManagerWorkloadView from './components/ManagerWorkloadView';
import ServiceCatalogEditor from './components/ServiceCatalogEditor';
import EventDetailPanel from './components/EventDetailPanel';

type View = 'calendar' | 'mywork' | 'team' | 'catalog' | 'analytics';

export default function FieldServiceModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<View>('calendar');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardDate, setWizardDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<ServiceEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeTenantId) return;
    return subscribeToServiceTypes(activeTenantId, setServiceTypes);
  }, [activeTenantId]);

  if (!user || !activeTenantId) return null;

  const handleNewEvent = (date: Date) => {
    setWizardDate(date);
    setShowCreateWizard(true);
  };

  const handleEventCreated = () => {
    setShowCreateWizard(false);
    setRefreshKey(k => k + 1);
    setView('calendar');
  };

  const handleEventUpdated = () => {
    setSelectedEvent(null);
    setRefreshKey(k => k + 1);
  };

  const navItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: 'calendar', label: 'Kalendarz', icon: CalendarDays },
    { id: 'mywork',   label: 'Mój dzień', icon: ListTodo },
    { id: 'team',     label: 'Zespół',    icon: Users },
    { id: 'catalog',  label: 'Usługi',    icon: Settings2 },
    { id: 'analytics', label: 'Analityka', icon: BarChart3 },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4 bg-slate-800/50 w-fit px-4 py-1.5 rounded-full border border-slate-700/50">
              <Leaf className="text-emerald-400" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                Field Service Management
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">
              Serwisy <span className="text-emerald-500">&</span> Kalendarz
            </h1>
            <p className="text-slate-400 font-medium max-w-xl text-sm italic leading-relaxed">
              Planowanie wizyt, nawigacja 1-klik, dokumentacja postępu.
              Abonament i serwisy jednorazowe. GPS w terenie.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-2xl border border-slate-700">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">GDPR · GPS opt-in</span>
            </div>
            {view === 'calendar' && !showCreateWizard && (
              <button
                onClick={() => handleNewEvent(new Date())}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-emerald-500/20 text-xs uppercase tracking-widest"
              >
                <Plus size={16} /> Nowe zdarzenie
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setView(id); setShowCreateWizard(false); setSelectedEvent(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className={`bg-white rounded-[2.5rem] border border-slate-100 shadow-sm ${showCreateWizard || selectedEvent ? 'p-8' : view === 'calendar' ? 'p-6' : 'p-8'} min-h-[500px]`}>

        {/* Create wizard overlay */}
        {showCreateWizard && (
          <EventCreateWizard
            serviceTypes={serviceTypes}
            preselectedDate={wizardDate}
            onComplete={handleEventCreated}
            onCancel={() => setShowCreateWizard(false)}
          />
        )}

        {/* Event detail side panel */}
        {!showCreateWizard && selectedEvent && (
          <div className="flex gap-6">
            <div className="flex-1">
              <ServiceCalendar
                key={refreshKey}
                serviceTypes={serviceTypes}
                onEventClick={setSelectedEvent}
                onNewEvent={handleNewEvent}
              />
            </div>
            <div className="w-96 flex-shrink-0">
              <EventDetailPanel
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onUpdated={handleEventUpdated}
              />
            </div>
          </div>
        )}

        {/* Calendar view */}
        {!showCreateWizard && !selectedEvent && view === 'calendar' && (
          <ServiceCalendar
            key={refreshKey}
            serviceTypes={serviceTypes}
            onEventClick={setSelectedEvent}
            onNewEvent={handleNewEvent}
          />
        )}

        {/* Worker: My Day */}
        {!showCreateWizard && view === 'mywork' && (
          <WorkerTodayView />
        )}

        {/* Manager: Team workload */}
        {!showCreateWizard && view === 'team' && (
          <ManagerWorkloadView />
        )}

        {/* Service catalog */}
        {!showCreateWizard && view === 'catalog' && (
          <ServiceCatalogEditor serviceTypes={serviceTypes} />
        )}

        {/* Analytics placeholder */}
        {!showCreateWizard && view === 'analytics' && (
          <AnalyticsPlaceholder />
        )}
      </div>
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Analityka & KPI</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Zdarzenia w tym mies.', value: '—', color: 'text-emerald-600' },
          { label: 'Ukończone', value: '—', color: 'text-teal-600' },
          { label: 'Przychód (mies.)', value: '—', color: 'text-blue-600' },
          { label: 'Avg. czas na miejscu', value: '—', color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 rounded-[2rem] p-6 text-center border border-slate-100">
            <p className={`text-4xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 rounded-[2rem] p-10 text-center border border-slate-100">
        <BarChart3 size={32} className="text-slate-200 mx-auto mb-3" />
        <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Wykresy dostępne w wersji Enterprise</p>
        <p className="text-slate-400 text-xs mt-2">Czas na miejscu · Czas przejazdu · Czas oczekiwania · Revenue per client</p>
      </div>
    </div>
  );
}
