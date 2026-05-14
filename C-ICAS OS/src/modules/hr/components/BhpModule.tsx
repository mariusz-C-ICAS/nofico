/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/BhpModule.tsx
 */
import React, { useState } from 'react';
import {
  ShieldCheck, Stethoscope, ClipboardList, AlertTriangle,
  HardHat, CheckSquare, Clock, XCircle, CheckCircle2,
  Bell, ChevronRight, Package, CalendarCheck
} from 'lucide-react';
import { motion } from 'motion/react';

type BhpTab = 'trainings' | 'medical' | 'risk' | 'accidents' | 'equipment' | 'audits';
type TrainingStatus = 'Valid' | 'Expiring' | 'Expired';
type AccidentSeverity = 'Minor' | 'Major' | 'Fatal';
type InvestigationStatus = 'Open' | 'In Progress' | 'Closed';

interface Training {
  id: string;
  employee: string;
  position: string;
  type: string;
  completedDate: string;
  expiryDate: string;
  status: TrainingStatus;
}

interface MedicalExam {
  id: string;
  employee: string;
  examType: string;
  lastExam: string;
  nextExam: string;
  daysLeft: number;
  valid: boolean;
}

interface RiskAssessment {
  id: string;
  name: string;
  area: string;
  date: string;
  assessor: string;
  reviewDate: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

interface Accident {
  id: string;
  date: string;
  employee: string;
  description: string;
  severity: AccidentSeverity;
  investigation: InvestigationStatus;
  location: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  quantity: number;
  assigned: number;
  assignedTo: string[];
  expiryDate: string;
}

interface Audit {
  id: string;
  name: string;
  date: string;
  auditor: string;
  score: number;
  status: 'Scheduled' | 'Completed' | 'Overdue';
  findings: number;
}

const TRAININGS: Training[] = [
  { id: 'T01', employee: 'Marek Zając',       position: 'Inżynier',  type: 'BHP Ogólne',        completedDate: '2024-03-10', expiryDate: '2026-03-10', status: 'Expired' },
  { id: 'T02', employee: 'Anna Kowalska',     position: 'PM',        type: 'BHP Stanowiskowe',   completedDate: '2025-04-15', expiryDate: '2026-06-01', status: 'Expiring' },
  { id: 'T03', employee: 'Piotr Nowak',       position: 'Analityk',  type: 'BHP Ogólne',        completedDate: '2025-11-20', expiryDate: '2027-11-20', status: 'Valid' },
  { id: 'T04', employee: 'Katarzyna Wilk',    position: 'HR',        type: 'Pierwsza Pomoc',     completedDate: '2025-01-08', expiryDate: '2026-01-08', status: 'Expired' },
  { id: 'T05', employee: 'Tomasz Wiśniewski', position: 'Dev',       type: 'BHP Stanowiskowe',   completedDate: '2025-09-12', expiryDate: '2026-06-10', status: 'Expiring' },
  { id: 'T06', employee: 'Monika Dąbrowska',  position: 'Designer',  type: 'BHP Ogólne',        completedDate: '2025-12-01', expiryDate: '2027-12-01', status: 'Valid' },
  { id: 'T07', employee: 'Adam Lewandowski',  position: 'QA',        type: 'Praca na wysokości', completedDate: '2025-08-22', expiryDate: '2027-08-22', status: 'Valid' },
];

const MEDICAL_EXAMS: MedicalExam[] = [
  { id: 'M01', employee: 'Marek Zając',       examType: 'Badanie wstępne',   lastExam: '2024-01-15', nextExam: '2026-01-15', daysLeft: -119, valid: false },
  { id: 'M02', employee: 'Anna Kowalska',     examType: 'Badanie okresowe',  lastExam: '2025-06-10', nextExam: '2026-06-10', daysLeft: 27,   valid: true },
  { id: 'M03', employee: 'Piotr Nowak',       examType: 'Badanie okresowe',  lastExam: '2025-11-20', nextExam: '2027-11-20', daysLeft: 555,  valid: true },
  { id: 'M04', employee: 'Katarzyna Wilk',    examType: 'Badanie kontrolne', lastExam: '2026-01-08', nextExam: '2027-01-08', daysLeft: 239,  valid: true },
  { id: 'M05', employee: 'Tomasz Wiśniewski', examType: 'Badanie okresowe',  lastExam: '2025-05-02', nextExam: '2026-05-20', daysLeft: 6,    valid: true },
];

const RISK_ASSESSMENTS: RiskAssessment[] = [
  { id: 'R01', name: 'Ocena stanowisk biurowych',  area: 'Biuro Open Space',    date: '2026-01-10', assessor: 'Jan BHP',      reviewDate: '2027-01-10', riskLevel: 'Low' },
  { id: 'R02', name: 'Praca z monitorami ekranowymi', area: 'Dział IT',         date: '2026-02-15', assessor: 'Jan BHP',      reviewDate: '2027-02-15', riskLevel: 'Low' },
  { id: 'R03', name: 'Magazyn — zagrożenia mechaniczne', area: 'Magazyn',       date: '2025-11-01', assessor: 'Anna BHP',     reviewDate: '2026-11-01', riskLevel: 'Medium' },
  { id: 'R04', name: 'Praca na wysokości > 1m',    area: 'Hala produkcyjna',    date: '2025-08-20', assessor: 'Anna BHP',     reviewDate: '2026-08-20', riskLevel: 'High' },
  { id: 'R05', name: 'Substancje chemiczne',        area: 'Laboratorium',       date: '2026-03-05', assessor: 'Jan BHP',      reviewDate: '2027-03-05', riskLevel: 'Medium' },
];

const ACCIDENTS: Accident[] = [
  { id: 'A01', date: '2026-03-12', employee: 'Adam Lewandowski', description: 'Potknięcie na schodach, skręcenie kostki', severity: 'Minor', investigation: 'Closed',      location: 'Klatka schodowa' },
  { id: 'A02', date: '2026-04-28', employee: 'Piotr Nowak',      description: 'Uderzenie w krawędź biurka, powierzchowne skaleczenie', severity: 'Minor', investigation: 'Closed', location: 'Biuro' },
  { id: 'A03', date: '2026-05-07', employee: 'Tomasz Wiśniewski',description: 'Upadek z drabiny (~1.2m), złamanie nadgarstka', severity: 'Major', investigation: 'In Progress', location: 'Hala' },
];

const EQUIPMENT: Equipment[] = [
  { id: 'EQ01', name: 'Kask ochronny',        category: 'Ochrona głowy',  quantity: 20, assigned: 8,  assignedTo: ['Tomasz W.', 'Adam L.', '+6'], expiryDate: '2028-01-01' },
  { id: 'EQ02', name: 'Rękawice robocze',     category: 'Ochrona dłoni',  quantity: 50, assigned: 15, assignedTo: ['Wielu'],                       expiryDate: '2026-12-31' },
  { id: 'EQ03', name: 'Kamizelka odblaskowa', category: 'Widoczność',     quantity: 30, assigned: 10, assignedTo: ['Magazyn', 'Hala'],              expiryDate: '2029-01-01' },
  { id: 'EQ04', name: 'Ochronniki słuchu',    category: 'Ochrona słuchu', quantity: 25, assigned: 6,  assignedTo: ['Hala prod.'],                   expiryDate: '2027-06-01' },
  { id: 'EQ05', name: 'Buty robocze S3',      category: 'Ochrona stóp',   quantity: 15, assigned: 15, assignedTo: ['Cały magazyn'],                 expiryDate: '2027-09-01' },
  { id: 'EQ06', name: 'Okulary ochronne',     category: 'Ochrona wzroku', quantity: 40, assigned: 12, assignedTo: ['Laboratorium', '+4'],            expiryDate: '2028-03-01' },
];

const AUDITS: Audit[] = [
  { id: 'AU01', name: 'Audyt BHP Q1 2026',         date: '2026-03-28', auditor: 'Zewnętrzny Inspektor PIP', score: 87, status: 'Completed', findings: 3 },
  { id: 'AU02', name: 'Inspekcja p.poż',            date: '2026-04-15', auditor: 'Straż Pożarna',            score: 92, status: 'Completed', findings: 1 },
  { id: 'AU03', name: 'Audyt wewnętrzny BHP Q2',   date: '2026-06-30', auditor: 'Jan BHP',                  score: 0,  status: 'Scheduled', findings: 0 },
  { id: 'AU04', name: 'Certyfikacja ISO 45001',     date: '2026-09-10', auditor: 'TÜV SÜD',                 score: 0,  status: 'Scheduled', findings: 0 },
  { id: 'AU05', name: 'Przegląd gaśnic',            date: '2026-04-01', auditor: 'Serwis techniczny',        score: 0,  status: 'Overdue',   findings: 0 },
];

const TABS: { id: BhpTab; label: string; icon: React.ReactNode }[] = [
  { id: 'trainings',  label: 'Szkolenia BHP',       icon: <ShieldCheck size={14} /> },
  { id: 'medical',    label: 'Badania Lekarskie',    icon: <Stethoscope size={14} /> },
  { id: 'risk',       label: 'Ocena Ryzyka',         icon: <ClipboardList size={14} /> },
  { id: 'accidents',  label: 'Wypadki',              icon: <AlertTriangle size={14} /> },
  { id: 'equipment',  label: 'Sprzęt BHP',           icon: <HardHat size={14} /> },
  { id: 'audits',     label: 'Audyty',               icon: <CalendarCheck size={14} /> },
];

const STATUS_TRAINING: Record<TrainingStatus, string> = {
  Valid:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  Expiring: 'bg-amber-50 text-amber-600 border-amber-200',
  Expired:  'bg-rose-50 text-rose-600 border-rose-200',
};

const SEV_CONFIG: Record<AccidentSeverity, string> = {
  Minor: 'bg-amber-50 text-amber-600 border-amber-200',
  Major: 'bg-rose-50 text-rose-600 border-rose-200',
  Fatal: 'bg-slate-900 text-white border-slate-700',
};

const INV_CONFIG: Record<InvestigationStatus, string> = {
  Open: 'bg-rose-50 text-rose-600',
  'In Progress': 'bg-amber-50 text-amber-600',
  Closed: 'bg-emerald-50 text-emerald-600',
};

const RISK_CONFIG: Record<string, string> = {
  Low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200',
  High: 'bg-rose-50 text-rose-600 border-rose-200',
};

const AUDIT_STATUS: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Scheduled: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  Overdue:   'bg-rose-50 text-rose-600 border-rose-200',
};

export default function BhpModule() {
  const [activeTab, setActiveTab] = useState<BhpTab>('trainings');

  const expiringCount = TRAININGS.filter(t => t.status === 'Expiring' || t.status === 'Expired').length;
  const medicalUrgent = MEDICAL_EXAMS.filter(m => m.daysLeft < 30).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Alert banner */}
      {(expiringCount > 0 || medicalUrgent > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-600 rounded-[2rem] p-6 text-white flex items-center gap-4 shadow-2xl shadow-rose-200"
        >
          <div className="bg-white/20 p-3 rounded-xl flex-shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <div className="text-sm font-black uppercase italic tracking-tighter">Alerty BHP</div>
            <div className="text-[10px] font-black text-rose-100 uppercase tracking-widest">
              {expiringCount} szkoleń wymaga odnowienia &nbsp;|&nbsp; {medicalUrgent} badań lekarskich pilnie do wykonania
            </div>
          </div>
          <ChevronRight size={20} className="ml-auto opacity-60" />
        </motion.div>
      )}

      {/* Tab navigation */}
      <div className="flex overflow-x-auto p-2 bg-slate-100 rounded-[2.5rem] w-full gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[9px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-2xl scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Szkolenia BHP */}
      {activeTab === 'trainings' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Szkolenia BHP</h4>
            <div className="flex gap-3">
              {(['Valid', 'Expiring', 'Expired'] as TrainingStatus[]).map(s => (
                <div key={s} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${STATUS_TRAINING[s]}`}>
                  {TRAININGS.filter(t => t.status === s).length} {s === 'Valid' ? 'Ważne' : s === 'Expiring' ? 'Wygasające' : 'Wygasłe'}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {TRAININGS.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${STATUS_TRAINING[t.status]}`}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900 uppercase italic">{t.employee}</div>
                    <div className="text-[9px] font-bold text-slate-400">{t.type} &bull; {t.position}</div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ukończono</div>
                    <div className="text-[10px] font-black text-slate-700">{t.completedDate}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Wygasa</div>
                    <div className="text-[10px] font-black text-slate-700">{t.expiryDate}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${STATUS_TRAINING[t.status]}`}>
                    {t.status === 'Valid' ? 'Ważne' : t.status === 'Expiring' ? 'Wygasa wkrótce' : 'Wygasłe'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Badania Lekarskie */}
      {activeTab === 'medical' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Badania Lekarskie</h4>
          <div className="space-y-3">
            {MEDICAL_EXAMS.map((m, i) => {
              const urgent = m.daysLeft < 30;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center justify-between p-5 rounded-[2rem] border transition-all ${
                    urgent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${urgent ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase italic">{m.employee}</div>
                      <div className="text-[9px] font-bold text-slate-400">{m.examType}</div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-6">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ostatnie</div>
                      <div className="text-[10px] font-black text-slate-700">{m.lastExam}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Następne</div>
                      <div className="text-[10px] font-black text-slate-700">{m.nextExam}</div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                      m.daysLeft < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                      m.daysLeft < 30 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)} dni temu` : `${m.daysLeft} dni`}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: Ocena Ryzyka */}
      {activeTab === 'risk' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Ocena Ryzyka Zawodowego</h4>
          <div className="space-y-3">
            {RISK_ASSESSMENTS.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${RISK_CONFIG[r.riskLevel]}`}>
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900 uppercase italic">{r.name}</div>
                    <div className="text-[9px] font-bold text-slate-400">{r.area} &bull; Oceniający: {r.assessor}</div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data oceny</div>
                    <div className="text-[10px] font-black text-slate-700">{r.date}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Przegląd</div>
                    <div className="text-[10px] font-black text-slate-700">{r.reviewDate}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${RISK_CONFIG[r.riskLevel]}`}>
                    {r.riskLevel}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Wypadki */}
      {activeTab === 'accidents' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Rejestr Wypadków</h4>
            <div className="flex gap-3">
              {(['Minor', 'Major', 'Fatal'] as AccidentSeverity[]).map(s => (
                <div key={s} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${SEV_CONFIG[s]}`}>
                  {ACCIDENTS.filter(a => a.severity === s).length} {s}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {ACCIDENTS.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${SEV_CONFIG[a.severity]}`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{a.employee}</div>
                      <div className="text-[9px] font-bold text-slate-600 max-w-md leading-relaxed">{a.description}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{a.location} &bull; {a.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${SEV_CONFIG[a.severity]}`}>
                      {a.severity}
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${INV_CONFIG[a.investigation]}`}>
                      {a.investigation}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Sprzęt BHP */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Sprzęt BHP / Środki Ochrony Osobistej</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EQUIPMENT.map((eq, i) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-slate-50 rounded-[2rem] border border-slate-100 p-6 hover:bg-white hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
                    <HardHat size={18} />
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Przydzielono</div>
                    <div className="text-lg font-black text-slate-900 italic">{eq.assigned}/{eq.quantity}</div>
                  </div>
                </div>
                <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{eq.name}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-3">{eq.category}</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${(eq.assigned / eq.quantity) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-[8px] font-black text-slate-400 uppercase">Wygasa: {eq.expiryDate}</div>
                  <div className="flex gap-1">
                    {eq.assignedTo.slice(0, 2).map((name, j) => (
                      <span key={j} className="text-[7px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{name}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Audyty */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Audyty BHP</h4>
          <div className="space-y-3">
            {AUDITS.map((au, i) => (
              <motion.div
                key={au.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${AUDIT_STATUS[au.status]}`}>
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900 uppercase italic">{au.name}</div>
                    <div className="text-[9px] font-bold text-slate-400">{au.auditor} &bull; {au.date}</div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  {au.score > 0 && (
                    <div className="text-right">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Wynik</div>
                      <div className={`text-xl font-black italic ${au.score >= 90 ? 'text-emerald-600' : au.score >= 75 ? 'text-amber-500' : 'text-rose-600'}`}>
                        {au.score}%
                      </div>
                    </div>
                  )}
                  {au.findings > 0 && (
                    <div className="text-right">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Niezgodności</div>
                      <div className="text-xl font-black text-rose-600 italic">{au.findings}</div>
                    </div>
                  )}
                  <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${AUDIT_STATUS[au.status]}`}>
                    {au.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
