import React, { useState } from 'react';
import { Calendar, Users, List, Settings, Layers, CalendarDays, ExternalLink, BarChart2, Repeat, Bell, Package, Gift, Star, Box } from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import BookingServiceConfig from './components/BookingServiceConfig';
import BookingStaffConfig from './components/BookingStaffConfig';
import BookingCalendarView from './components/BookingCalendarView';
import BookingsList from './components/BookingsList';
import BookingSettings from './components/BookingSettings';
import BookingAnalytics from './components/BookingAnalytics';
import RecurringBooking from './components/RecurringBooking';
import WaitlistManager from './components/WaitlistManager';
import VisitPackages from './components/VisitPackages';
import GiftVouchers from './components/GiftVouchers';
import PostVisitReview from './components/PostVisitReview';
import GroupBookingConfig from './components/GroupBookingConfig';
import BookingResourceConfig from './components/BookingResourceConfig';

type BookingTab =
  | 'calendar' | 'bookings' | 'services' | 'staff'
  | 'recurring' | 'analytics' | 'waitlist' | 'packages'
  | 'vouchers' | 'reviews' | 'group' | 'resources' | 'settings';

const TABS: { id: BookingTab; label: string; icon: React.ElementType }[] = [
  { id: 'calendar',   label: 'Kalendarz',  icon: Calendar },
  { id: 'bookings',   label: 'Rezerwacje', icon: List },
  { id: 'waitlist',   label: 'Oczekujący', icon: Bell },
  { id: 'services',   label: 'Usługi',     icon: Layers },
  { id: 'staff',      label: 'Personel',   icon: Users },
  { id: 'group',      label: 'Grupowe',    icon: Users },
  { id: 'resources',  label: 'Zasoby',     icon: Box },
  { id: 'recurring',  label: 'Cykliczne',  icon: Repeat },
  { id: 'packages',   label: 'Pakiety',    icon: Package },
  { id: 'vouchers',   label: 'Vouchery',   icon: Gift },
  { id: 'reviews',    label: 'Opinie',     icon: Star },
  { id: 'analytics',  label: 'Analityka',  icon: BarChart2 },
  { id: 'settings',   label: 'Ustawienia', icon: Settings },
];

export default function BookingModule() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<BookingTab>('calendar');

  if (!activeTenantId) {
    return (
      <div className="p-10 text-center text-slate-400 text-sm">
        Brak aktywnego tenanta.
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/book/${activeTenantId}`;

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-600 p-2 rounded-lg shadow-lg shadow-violet-200">
              <CalendarDays className="text-white" size={20} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Booking</h1>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Rezerwacje online & Kalendarz wizyt</p>
        </div>

        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all">
          <ExternalLink size={13} /> Strona publiczna
        </a>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-1 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-lg scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeTab === 'calendar'   && <BookingCalendarView tenantId={activeTenantId} />}
        {activeTab === 'bookings'   && <BookingsList tenantId={activeTenantId} />}
        {activeTab === 'waitlist'   && <WaitlistManager tenantId={activeTenantId} />}
        {activeTab === 'services'   && <BookingServiceConfig tenantId={activeTenantId} />}
        {activeTab === 'staff'      && <BookingStaffConfig tenantId={activeTenantId} />}
        {activeTab === 'group'      && <GroupBookingConfig tenantId={activeTenantId} />}
        {activeTab === 'resources'  && <BookingResourceConfig tenantId={activeTenantId} />}
        {activeTab === 'recurring'  && <RecurringBooking tenantId={activeTenantId} />}
        {activeTab === 'packages'   && <VisitPackages tenantId={activeTenantId} />}
        {activeTab === 'vouchers'   && <GiftVouchers tenantId={activeTenantId} />}
        {activeTab === 'reviews'    && <PostVisitReview tenantId={activeTenantId} />}
        {activeTab === 'analytics'  && <BookingAnalytics tenantId={activeTenantId} />}
        {activeTab === 'settings'   && <BookingSettings tenantId={activeTenantId} />}
      </div>
    </div>
  );
}
