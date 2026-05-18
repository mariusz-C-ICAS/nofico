import React, { useEffect, useState } from 'react';
import { useCompany } from '../../core/auth/CompanyContext';
import { getPlugin } from './pluginRegistry';
import { IndustryPlugin } from './types';
import { Settings, CheckCircle2, ExternalLink, AlertTriangle, FileText } from 'lucide-react';

export default function IndustryPluginPanel() {
  const { currentCompany } = useCompany();
  const [plugin, setPlugin]   = useState<IndustryPlugin | undefined>();
  const [industry, setIndustry] = useState<string>('');

  useEffect(() => {
    const ind = currentCompany?.industry;
    if (!ind) return;
    setIndustry(ind);
    setPlugin(getPlugin(ind as any));
  }, [currentCompany?.industry]);

  if (!plugin) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Brak wtyczki branżowej</p>
          <p className="text-xs mt-1">Ustaw branżę w Ustawienia → Firma.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Wtyczka branżowa: {plugin.namePL}</h2>
          <p className="text-xs text-gray-400">{plugin.description}</p>
        </div>
      </div>

      {(plugin.complianceFlags?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Wymogi compliance
          </h3>
          <div className="space-y-2">
            {plugin.complianceFlags!.map(f => (
              <div key={f.regulation} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.regulation}</p>
                  <p className="text-xs text-gray-500">{f.description}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    Retencja: {f.retentionYears} lat{f.requiresDPIA ? ' · DPIA wymagana' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(plugin.customFields?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Pola branżowe</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Pole</th>
                <th className="px-4 py-2 text-left">Encja</th>
                <th className="px-4 py-2 text-left">Typ</th>
                <th className="px-4 py-2 text-left">Etykieta PL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plugin.customFields!.map(f => (
                <tr key={`${f.entity}-${f.field}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{f.field}</td>
                  <td className="px-4 py-2 text-gray-600">{f.entity}</td>
                  <td className="px-4 py-2 text-gray-500">{f.type}</td>
                  <td className="px-4 py-2 text-gray-700">{f.labelPL}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(plugin.externalIntegrations?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Integracje zewnętrzne</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {plugin.externalIntegrations!.map(i => (
              <div key={i.name} className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                <ExternalLink className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{i.name}</p>
                  <p className="text-xs text-gray-500">{i.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(plugin.documentTypeExtensions?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Dodatkowe typy dokumentów
          </h3>
          <div className="flex flex-wrap gap-2">
            {plugin.documentTypeExtensions!.map(ext => (
              <span key={ext.type} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg">
                {ext.labelPL}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
