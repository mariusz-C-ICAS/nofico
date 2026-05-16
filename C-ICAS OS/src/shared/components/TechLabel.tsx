/**
 * Data: 2026-05-12 20:11
 * Opis: Komponent etykiety wspierający Tryb Deweloperski (Tech Names).
 */
import React from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';

interface TechLabelProps {
  label: string;
  fieldName?: string;
  className?: string;
}

export function TechLabel({ label, fieldName, className = "" }: TechLabelProps) {
  const { userData } = useAuth();
  const showTech = userData?.showTechnicalNames;

  return (
    <label className={`block text-sm font-semibold text-slate-700 mb-1 ${className}`}>
      {label}
      {showTech && fieldName && (
        <span className="ml-1 text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1 rounded">
          ({fieldName})
        </span>
      )}
    </label>
  );
}
