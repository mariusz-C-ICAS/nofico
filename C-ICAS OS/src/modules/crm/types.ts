// CRM Module — type definitions

export type CustomerStatus = 'prospect' | 'active' | 'churned' | 'blocked';

export interface CrmCustomer {
  id: string;
  tenantId: string;
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  industry?: string;
  status: CustomerStatus;
  tags: string[];
  leadScore: number;      // 0-100 computed
  totalRevenue: number;
  currency: string;
  assignedTo?: string;
  whiteListValid?: boolean;
  serviceEventCount?: number;
  lastActivityAt?: any;
  createdAt: any;
  updatedAt: any;
}

export type ActivityType =
  | 'note' | 'call' | 'email' | 'meeting'
  | 'service_visit' | 'quote_sent' | 'deal_won' | 'deal_lost' | 'nps_response';

export interface CrmActivity {
  id: string;
  tenantId: string;
  customerId: string;
  type: ActivityType;
  title: string;
  body?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  linkedEventId?: string;
  linkedDealId?: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: any;
}

export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'proposal';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface CrmTask {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  title: string;
  type: TaskType;
  dueDate: any;
  assignedTo: string;
  assignedToEmail: string;
  isDone: boolean;
  priority: TaskPriority;
  note?: string;
  createdAt: any;
  completedAt?: any;
}

export interface NpsResponse {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  eventId?: string;
  score: number; // 0-10
  comment?: string;
  sentAt: any;
  respondedAt?: any;
}

export type AutomationTrigger =
  | 'no_activity_days' | 'deal_moved' | 'service_count_reached'
  | 'deal_won' | 'deal_lost';

export type AutomationAction =
  | 'create_task' | 'send_email' | 'add_tag' | 'flag_upsell';

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  triggerValue?: number;
  triggerStage?: string;
  action: AutomationAction;
  actionPayload: {
    taskTitle?: string;
    taskType?: TaskType;
    taskPriority?: TaskPriority;
    emailTemplate?: string;
    tag?: string;
    daysUntilDue?: number;
  };
  runCount: number;
  createdAt: any;
}

export interface UpsellOpportunity {
  customerId: string;
  customerName: string;
  reason: string;
  serviceEventCount: number;
  estimatedValue?: number;
  suggestedAction: string;
  tags: string[];
  lastServiceDate: any;
}

export interface LeadScoreBreakdown {
  total: number;
  recency: number;
  revenue: number;
  pipeline: number;
  serviceFrequency: number;
  engagement: number;
}

export interface DealForecast {
  dealId: string;
  title: string;
  customer: string;
  value: number;
  probability: number;
  weighted: number;
  stage: string;
  expectedCloseMonth: string;
}

export const ACTIVITY_META: Record<ActivityType, { label: string; color: string; bg: string }> = {
  note:          { label: 'Notatka',       color: 'text-slate-600',  bg: 'bg-slate-100' },
  call:          { label: 'Rozmowa',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  email:         { label: 'Email',         color: 'text-indigo-700', bg: 'bg-indigo-100' },
  meeting:       { label: 'Spotkanie',     color: 'text-violet-700', bg: 'bg-violet-100' },
  service_visit: { label: 'Wizyta serwis', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  quote_sent:    { label: 'Oferta wysłana', color: 'text-amber-700', bg: 'bg-amber-100' },
  deal_won:      { label: 'Deal wygrany',  color: 'text-teal-700',   bg: 'bg-teal-100' },
  deal_lost:     { label: 'Deal utracony', color: 'text-red-700',    bg: 'bg-red-100' },
  nps_response:  { label: 'NPS',           color: 'text-pink-700',   bg: 'bg-pink-100' },
};

export const TASK_TYPE_META: Record<TaskType, { label: string; icon: string }> = {
  call:      { label: 'Zadzwoń',     icon: '📞' },
  email:     { label: 'Wyślij email', icon: '✉️' },
  meeting:   { label: 'Spotkanie',   icon: '🤝' },
  follow_up: { label: 'Follow-up',   icon: '🔔' },
  proposal:  { label: 'Propozycja',  icon: '📋' },
};
