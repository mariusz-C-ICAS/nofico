/**
 * Data: 2026-05-12
 * Zmiany: Lista pracowników z profilami i statusami.
 * Ścieżka: /src/modules/hr/EmployeeList.tsx
 */
import React from 'react';
import { 
  Briefcase, Mail, Phone, MoreVertical, 
  CheckCircle2, Clock, ShieldCheck, 
  GraduationCap, Calendar, User
} from 'lucide-react';
import { motion } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  type: 'UoP' | 'B2B' | 'UZ/UD';
  salary: number;
  status: 'active' | 'leave' | 'onboarding';
  avatar?: string;
  email: string;
}

export default function EmployeeList() {
  const employees: Employee[] = [
    { id: 'EMP-001', name: 'Adam Kowalski', role: 'Senior Developer', department: 'IT', type: 'B2B', salary: 22000, status: 'active', email: 'adam@example.com' },
    { id: 'EMP-002', name: 'Anna Nowak', role: 'HR Manager', department: 'Admin', type: 'UoP', salary: 12500, status: 'active', email: 'anna@example.com' },
    { id: 'EMP-003', name: 'Marek Zając', role: 'Business Analyst', department: 'Sales', type: 'UoP', salary: 9800, status: 'leave', email: 'marek@example.com' },
    { id: 'EMP-004', name: 'Katarzyna Wilk', role: 'Junior Designer', department: 'Design', type: 'UZ/UD', salary: 6500, status: 'onboarding', email: 'kasia@example.com' },
  ];

  const getStatusStyle = (status: Employee['status']) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'leave': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'onboarding': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {employees.map(emp => (
            <motion.div 
              key={emp.id}
              whileHover={{ y: -10 }}
              className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative group overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-8">
                  <button className="text-slate-200 hover:text-slate-900 transition-colors">
                     <MoreVertical size={20} />
                  </button>
               </div>

               <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-slate-50 border-4 border-white shadow-xl rounded-[2.5rem] mb-6 flex items-center justify-center p-2">
                     <User className="text-slate-300" size={48} />
                  </div>
                  
                  <h4 className="text-xl font-black text-slate-900 uppercase italic leading-tight mb-1">{emp.name}</h4>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">{emp.role}</div>
                  
                  <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase italic tracking-widest mb-8 ${getStatusStyle(emp.status)}`}>
                     {emp.status === 'active' ? 'Aktywny' : emp.status === 'leave' ? 'URLOP' : 'Onboarding'}
                  </div>

                  <div className="w-full space-y-4 text-left bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Kontrakt</span>
                        <span className="text-xs font-black text-slate-900 italic">{emp.type}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Dział</span>
                        <span className="text-xs font-black text-slate-900 italic">{emp.department}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Wynagrodzenie</span>
                        <span className="text-xs font-black text-slate-900 italic">{emp.salary.toLocaleString()} PLN</span>
                     </div>
                  </div>

                  <div className="flex gap-4 w-full">
                     <button className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                        <Mail size={18} />
                     </button>
                     <button className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                        <Briefcase size={18} />
                     </button>
                     <button className="flex-1 bg-slate-900 text-white p-4 rounded-2xl hover:bg-rose-600 transition-all">
                        <Calendar size={18} />
                     </button>
                  </div>
               </div>
            </motion.div>
          ))}
       </div>
    </div>
  );
}
