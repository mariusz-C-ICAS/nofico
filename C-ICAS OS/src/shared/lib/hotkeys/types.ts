export interface HotkeyDef {
  id: string;
  keys: string[];       // e.g. ['ctrl', 'shift', 'n']
  label: string;
  description: string;
  group: string;
  action: () => void;
}

export type HotkeyGroup =
  | 'Navigation'
  | 'Documents'
  | 'CRM'
  | 'Finance'
  | 'HR'
  | 'System';
