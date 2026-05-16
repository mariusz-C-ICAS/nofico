import React, { useState } from 'react';
import OmIframeSettings from './OmIframeSettings';
import CareersIframeSettings from './CareersIframeSettings';
import BookingsIframeSettings from './BookingsIframeSettings';
import { Monitor } from 'lucide-react';

export default function IframesAdminModule() {
  const [activeTab, setActiveTab] = useState<'om' | 'careers' | 'bookings'>('om');

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-[2rem] border border-slate-200 p-4 flex gap-2 overflow-x-auto shadow-sm">
           <button onClick={() => setActiveTab('om')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'om' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Monitor size={14} className="inline mr-2" /> OM (Struktura)</button>
           <button onClick={() => setActiveTab('careers')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'careers' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Monitor size={14} className="inline mr-2" /> Kariera (Oferty)</button>
           <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'bookings' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Monitor size={14} className="inline mr-2" /> Bookings CRM</button>
       </div>
       
       <div>
         {activeTab === 'om' && <OmIframeSettings />}
         {activeTab === 'careers' && <CareersIframeSettings />}
         {activeTab === 'bookings' && <BookingsIframeSettings />}
       </div>
    </div>
  );
}
