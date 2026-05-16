import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbMap: Record<string, string> = {
    'dashboard': 'Pulpit',
    'admin': 'Panel Admina',
    'crm': 'CRM & Sprzedaż',
    'projects': 'Projekty',
    'time': 'Czas Pracy',
    'hr': 'Kadry i Płace',
    'lms': 'Centrum Szkoleń',
    'voice': 'Asystent AI',
    'settings': 'Ustawienia',
    'construction': 'Budownictwo',
    'gardening': 'Ogrody',
    'cleaning': 'Sprzątanie',
    'integrations': 'Integracje',
    'tenants': 'Konta Firmowe',
    'modules': 'Moduły Systemowe'
  };

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) return null;

  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
      <Link to="/dashboard" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
        <Home size={14} />
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = breadcrumbMap[value] || value;

        return (
          <React.Fragment key={to}>
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
            {last ? (
              <span className="text-slate-900 font-bold">{label}</span>
            ) : (
              <Link to={to} className="hover:text-blue-600 transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
