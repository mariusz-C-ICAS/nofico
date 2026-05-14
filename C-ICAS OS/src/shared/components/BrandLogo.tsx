import React from 'react';

/**
 * Komponent Graficzny Logo - Zgodny z estetyką c-icas.gg (Budownictwo, Ogrodnictwo)
 * Barwy: Ciemny Grafit (Slate 900), Złoto/Pomarańcz (Amber 500) oraz Zieleni (Emerald 600)
 */
export const BrandLogo = () => {
  return (
    <div className="flex items-center gap-3">
      {/* Sygnet / Znak graficzny */}
      <div className="relative flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg shadow-md overflow-hidden border border-slate-700">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-amber-500 opacity-90 transform -skew-y-12 origin-top-left"></div>
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-emerald-600 opacity-90 transform -skew-y-12 origin-bottom-right"></div>
        <span className="relative z-10 text-white font-black text-xl tracking-tighter drop-shadow-md">C</span>
      </div>
      {/* Typografia */}
      <div className="flex flex-col">
        <span className="text-xl font-bold text-slate-900 leading-none tracking-tight">C-ICAS<span className="text-amber-500">.OS</span></span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none mt-1">FieldTime Manage</span>
      </div>
    </div>
  );
};
