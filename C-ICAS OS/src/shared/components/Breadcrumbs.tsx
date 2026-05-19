import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbMap: Record<string, string> = {
    'dashboard': t('breadcrumb.dashboard'),
    'admin': t('breadcrumb.admin'),
    'crm': t('breadcrumb.crm'),
    'projects': t('breadcrumb.projects'),
    'time': t('breadcrumb.time'),
    'hr': t('breadcrumb.hr'),
    'lms': t('breadcrumb.lms'),
    'voice': t('breadcrumb.voice'),
    'settings': t('breadcrumb.settings'),
    'construction': t('breadcrumb.construction'),
    'gardening': t('breadcrumb.gardening'),
    'cleaning': t('breadcrumb.cleaning'),
    'integrations': t('breadcrumb.integrations'),
    'tenants': t('breadcrumb.tenants'),
    'modules': t('breadcrumb.modules'),
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
