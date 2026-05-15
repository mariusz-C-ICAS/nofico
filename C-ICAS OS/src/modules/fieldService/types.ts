// Field Service Management — type definitions

export type EventStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_TRANSIT'
  | 'ON_SITE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export const EVENT_STATUS_META: Record<EventStatus, { label: string; color: string; bg: string; dot: string }> = {
  DRAFT:      { label: 'Szkic',        color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400' },
  SCHEDULED:  { label: 'Zaplanowane',  color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  CONFIRMED:  { label: 'Potwierdzone', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  IN_TRANSIT: { label: 'W drodze',     color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500' },
  ON_SITE:    { label: 'Na miejscu',   color: 'text-green-700',   bg: 'bg-green-100',   dot: 'bg-green-500' },
  COMPLETED:  { label: 'Zakończone',   color: 'text-teal-700',    bg: 'bg-teal-100',    dot: 'bg-teal-500' },
  CANCELLED:  { label: 'Anulowane',    color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500' },
  ARCHIVED:   { label: 'Zarchiwizowane', color: 'text-slate-500', bg: 'bg-slate-200',   dot: 'bg-slate-300' },
};

export interface ServiceLocation {
  address: string;
  city: string;
  postalCode: string;
  lat?: number;
  lng?: number;
  accessNotes?: string;
}

export interface AssignedWorker {
  uid: string;
  email: string;
  displayName: string;
}

export interface ServiceEvent {
  id: string;
  tenantId: string;
  title: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  projectId?: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeColor: string;
  description?: string;
  location: ServiceLocation;
  assignedWorkers: AssignedWorker[];
  scheduledStart: any;
  scheduledEnd: any;
  estimatedDurationMinutes: number;
  estimatedTravelMinutes?: number;
  actualStartTime?: any;
  actualEndTime?: any;
  status: EventStatus;
  recurrenceId?: string;
  isRecurring: boolean;
  recurrenceLabel?: string;
  createdBy: string;
  createdByEmail: string;
  quoteId?: string;
  mediaUrls?: string[];
  workerNotes?: string;
  clientNotes?: string;
  price?: number;
  currency: string;
  actualCost?: number;
  createdAt: any;
  updatedAt: any;
}

export interface ServiceType {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  defaultDurationMinutes: number;
  defaultPrice: number;
  currency: string;
  travelBufferMinutes: number;
  color: string;
  category: string;
  isActive: boolean;
  createdAt: any;
}

export interface RecurrenceRule {
  id: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  serviceTypeId: string;
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string;
  defaultWorkers: AssignedWorker[];
  location: ServiceLocation;
  basePrice?: number;
  isActive: boolean;
  createdAt: any;
}

export interface WorkerTimeLog {
  id: string;
  tenantId: string;
  workerId: string;
  workerEmail: string;
  eventId: string;
  phase: 'transit' | 'on_site' | 'waiting' | 'break';
  startTime: any;
  endTime?: any;
  durationMinutes?: number;
  notes?: string;
}

export interface GpsPosition {
  workerId: string;
  workerEmail: string;
  workerName: string;
  tenantId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: any;
  eventId?: string;
  phase?: EventStatus;
}

export interface GpsConsent {
  workerId: string;
  tenantId: string;
  hasConsent: boolean;
  consentDate?: any;
}

export interface WorkerLoad {
  uid: string;
  email: string;
  displayName: string;
  todayEvents: number;
  weekEvents: number;
  currentStatus?: EventStatus;
  currentEventTitle?: string;
  lastPosition?: { lat: number; lng: number };
  lastSeen?: any;
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export const SERVICE_CATEGORIES = [
  'Ogrodnictwo',
  'Sprzątanie',
  'Budownictwo',
  'Instalacje',
  'Serwis techniczny',
  'Dostawy',
  'Inne',
];

export const CURRENCY_OPTIONS = ['PLN', 'EUR', 'USD'];
