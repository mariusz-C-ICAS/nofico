import React, { useState, lazy, Suspense } from 'react';
import { Award, FolderOpen, FileCheck, Banknote } from 'lucide-react';

const GrantProjectList = lazy(() => import('./components/GrantProjectList'));
const GrantCostPanel   = lazy(() => import('./components/GrantCostPanel'));
const DeMinimisPanel   = lazy(() => import('./components/DeMinimisPanel'));

type GTab = 'projects' | 'costs' | 'deminimis';

const TABS: { id: GTab; label: string; Icon: React.ElementType }[] = [
  { id: 'projects',  label: 'Projekty grantowe',    Icon: FolderOpen },
  { id: 'costs',     label: 'Koszty kwalifikowane', Icon: FileCheck },
  { id: 'deminimis', label: 'De Minimis',           Icon: Banknote },
];

export default function GrantsModule() {
  const [tab, setTab] = useState<GTab>('projects');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Award className="w-7 h-7 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dotacje i granty</h1>
          <p className="text-sm text-gray-500">Projekty grantowe, koszty kwalifikowane i de minimis</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Ładowanie…</div>}>
        {tab === 'projects'  && <GrantProjectList />}
        {tab === 'costs'     && <GrantCostPanel />}
        {tab === 'deminimis' && <DeMinimisPanel />}
      </Suspense>
    </div>
  );
}
