/**
 * Data: 2026-05-12
 * Zmiany: Inicjalizacja Centralnego Rejestru Modułów dla Wariantu 1
 * Ścieżka: /src/core/modules/types.ts
 */

export type ModuleCategory = 'technical' | 'operational' | 'system';

export interface SystemModuleDefinition {
  id: string;              // unikalny identyfikator, np. 'hr', 'finance', 'construction'
  name: string;            // nazwa wyświetlana, np. 'Kadry i Płace', 'Budownictwo'
  category: ModuleCategory; // kategoria dla grupowania
  iconName: string;        // nazwa ikony z lucide-react, np. 'Users', 'Hammer'
  path: string;            // trasa routingu, np. '/hr'
  description?: string;
  defaultActive?: boolean; // czy domyślnie włączony przy utworzeniu firmy
  requiredPermissions?: string[]; // np. 'hr.view'
}
