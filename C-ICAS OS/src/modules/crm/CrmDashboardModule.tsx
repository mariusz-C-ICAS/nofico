import React from 'react';
import ClientCrmModule from './ClientCrmModule';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

export default function CrmDashboardModule() {
  return (
    <div className="relative">
      <div className="absolute top-4 right-6 z-20">
        <IdesGenerateButton moduleKey="crm" />
      </div>
      <ClientCrmModule />
    </div>
  );
}
