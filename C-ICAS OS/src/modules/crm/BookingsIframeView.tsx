import React from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export default function BookingsIframeView() {
  const { configId } = useParams();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-amber-300 shadow-xl max-w-lg w-full">
         <div className="mx-auto w-16 h-16 bg-amber-100 flex items-center justify-center rounded-2xl mb-6">
            <Calendar className="text-amber-600" size={32} />
         </div>
         <h1 className="font-black text-amber-700 text-2xl mb-2">Bookings CRM w przygotowaniu</h1>
         <p className="text-amber-600 text-sm mb-8">Moduł umawiania wizyt jest obecnie wdrażany przez dział IT.</p>
         
         <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-3 rounded-lg text-left">
            Config ID: {configId}
         </div>
      </div>
    </div>
  );
}
