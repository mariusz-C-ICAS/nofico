/**
 * CrossCompanyModule.tsx
 * Główny moduł dla Doradcy i Asystenta Zarządu (Cross-Company).
 */
import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Globe, Key, FileText, ChevronRight,
  TrendingUp, BarChart3, Settings, ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import GlobalDashboard from './components/GlobalDashboard';
import TokenVault from './components/TokenVault';
import TransferPricingGenerator from './components/TransferPricingGenerator';

export default function CrossCompanyModule() {
  const location = useLocation();

  const navItems = [
    { path: '', label: 'Global Dashboard', icon: LayoutDashboard },
    { path: 'vault', label: 'OAuth Secret Vault', icon: Key },
    { path: 'tp-generator', label: 'AI TP Generator', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-[#FDFDFD]">
      {/* Sidebar - Local Module Navigation */}
      <div className="w-64 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-6">
          <div className="flex items-center gap-3 text-indigo-600 mb-8">
            <Globe size={24} />
            <span className="font-bold text-lg tracking-tight">Cross-Company</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.endsWith(item.path) || (item.path === '' && location.pathname.endsWith('cross-company'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight size={14} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
             <div className="p-2 bg-white rounded-lg shadow-sm">
                <ShieldCheck className="text-emerald-500" size={16} />
             </div>
             <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Bezpieczeństwa</div>
                <div className="text-xs font-bold text-gray-700">Audit-Ready</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto bg-[#FDFDFD]">
        <div className="max-w-6xl mx-auto p-8">
          <Routes>
            <Route index element={<GlobalDashboard />} />
            <Route path="vault" element={<TokenVault />} />
            <Route path="tp-generator" element={<TransferPricingGenerator />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
