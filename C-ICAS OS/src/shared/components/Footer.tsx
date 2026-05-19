import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Copyright, Github, Globe } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-white border-t border-slate-200 py-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold tracking-tight">
            <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[10px]">OS</span>
            C-ICAS Operating System
          </div>
          <p className="text-xs text-slate-500">{t('shared.footer_tagline')}</p>
        </div>

        <div className="flex gap-8 text-xs font-medium text-slate-600">
          <a href="#" className="hover:text-blue-600 transition-colors">{t('shared.footer_api_docs')}</a>
          <a href="#" className="hover:text-blue-600 transition-colors">{t('shared.footer_help')}</a>
          <a href="#" className="hover:text-blue-600 transition-colors">{t('shared.footer_privacy')}</a>
          <a href="#" className="hover:text-blue-600 transition-colors">{t('shared.footer_terms')}</a>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
           <div className="flex items-center gap-1.5 text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-600 font-bold">
             <Shield size={12} className="text-emerald-500" />
             {t('shared.footer_iso')}
           </div>
           <div className="flex items-center gap-2">
             <Globe size={16} className="hover:text-slate-600 cursor-pointer transition-colors" />
             <Github size={16} className="hover:text-slate-600 cursor-pointer transition-colors" />
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-100 mt-6 pt-6 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-1">
          <Copyright size={10} /> 2026 C-ICAS OS by Global Innovations Group
        </div>
        <div>v2.1.0-Google-Unified</div>
      </div>
    </footer>
  );
}
