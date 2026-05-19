import React, { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
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
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';
import CalSyncImportButton from './components/CalSyncImportButton';

const VideoMeetingButton = lazy(() => import('./components/VideoMeetingButton'));

type BookingTab =
  | 'calendar' | 'bookings' | 'services' | 'staff'
  | 'recurring' | 'analytics' | 'waitlist' | 'packages'
  | 'vouchers' | 'reviews' | 'group' | 'resources' | 'settings';

export default function BookingModule() {
  const { t } = useTranslation();
  const { activeTenantId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<BookingTab>('calendar');

  const TABS: { id: BookingTab; label: string; icon: React.ElementType }[] = [
    { id: 'calendar',   label: t('booking.tabs.calendar'),  icon: Calendar },
    { id: 'bookings',   label: t('booking.tabs.bookings'),  icon: List },
    { id: 'waitlist',   label: t('booking.tabs.waitlist'),  icon: Bell },
    { id: 'services',   label: t('booking.tabs.services'),  icon: Layers },
    { id: 'staff',      label: t('booking.tabs.staff'),     icon: Users },
    { id: 'group',      label: t('booking.tabs.group'),     icon: Users },
    { id: 'resources',  label: t('booking.tabs.resources'), icon: Box },
    { id: 'recurring',  label: t('booking.tabs.recurring'), icon: Repeat },
    { id: 'packages',   label: t('booking.tabs.packages'),  icon: Package },
    { id: 'vouchers',   label: t('booking.tabs.vouchers'),  icon: Gift },
    { id: 'reviews',    label: t('booking.tabs.reviews'),   icon: Star },
    { id: 'analytics',  label: t('booking.tabs.analytics'), icon: BarChart2 },
    { id: 'settings',   label: t('booking.tabs.settings'),  icon: Settings },
  ];

  if (!activeTenantId) {
    return (
      <div className="p-10 text-center text-slate-400 text-sm">
        {t('booking.noTenant')}
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
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{t('booking.title')}</h1>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('booking.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <CalSyncImportButton tenantId={activeTenantId} />
          <IdesGenerateButton moduleKey="hr" />
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all">
            <ExternalLink size={13} /> {t('booking.publicPage')}
          </a>
        </div>
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
        {activeTab === 'bookings'   && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Suspense fallback={null}>
                <VideoMeetingButton tenantId={activeTenantId} />
              </Suspense>
            </div>
            <BookingsList tenantId={activeTenantId} />
          </div>
        )}
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
