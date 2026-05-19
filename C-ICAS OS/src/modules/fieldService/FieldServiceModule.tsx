import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays, ListTodo, Users, Settings2, BarChart3,
  Plus, Leaf, ShieldCheck, Globe, MessageSquare, Map, Navigation2,
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
import CalendarEmbedConfig from './components/CalendarEmbedConfig';
import PendingChangeRequests from './components/PendingChangeRequests';
import DirectorDashboardView from './components/DirectorDashboardView';
import LiveMapView from './components/LiveMapView';
import WorkerTrackingConfig from './components/WorkerTrackingConfig';

type View = 'calendar' | 'mywork' | 'team' | 'catalog' | 'analytics' | 'embed' | 'pending' | 'livemap' | 'gps';

export default function FieldServiceModule() {
  const { t } = useTranslation();
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
    { id: 'calendar',  label: t('fieldService.nav.calendar'),  icon: CalendarDays },
    { id: 'mywork',    label: t('fieldService.nav.mywork'),    icon: ListTodo },
    { id: 'team',      label: t('fieldService.nav.team'),      icon: Users },
    { id: 'catalog',   label: t('fieldService.nav.catalog'),   icon: Settings2 },
    { id: 'analytics', label: t('fieldService.nav.analytics'), icon: BarChart3 },
    { id: 'pending',   label: t('fieldService.nav.pending'),   icon: MessageSquare },
    { id: 'livemap',   label: t('fieldService.nav.livemap'),   icon: Map },
    { id: 'gps',       label: t('fieldService.nav.gps'),       icon: Navigation2 },
    { id: 'embed',     label: t('fieldService.nav.embed'),     icon: Globe },
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
                {t('fieldService.badge')}
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">
              {t('fieldService.title')}
            </h1>
            <p className="text-slate-400 font-medium max-w-xl text-sm italic leading-relaxed">
              {t('fieldService.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-2xl border border-slate-700">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t('fieldService.gdprBadge')}</span>
            </div>
            {view === 'calendar' && !showCreateWizard && (
              <button
                onClick={() => handleNewEvent(new Date())}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-emerald-500/20 text-xs uppercase tracking-widest"
              >
                <Plus size={16} /> {t('fieldService.newEvent')}
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

        {/* Director dashboard */}
        {!showCreateWizard && view === 'analytics' && (
          <DirectorDashboardView />
        )}

        {/* Client change requests */}
        {!showCreateWizard && view === 'pending' && (
          <PendingChangeRequests />
        )}

        {/* Live Map */}
        {!showCreateWizard && view === 'livemap' && (
          <LiveMapView />
        )}

        {/* GPS client tracking config */}
        {!showCreateWizard && view === 'gps' && (
          <WorkerTrackingConfig />
        )}

        {/* iFrame embed config */}
        {!showCreateWizard && view === 'embed' && (
          <CalendarEmbedConfig />
        )}
      </div>
    </div>
  );
}
