/**
 * Data: 2026-05-14
 * Zmiany: Pełna nawigacja v2 - wszystkie moduły C-ICAS.OS z grupowaniem.
 * Ścieżka: /src/app/AppLayout.tsx
 */
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Clock, LayoutKanban, LogOut, Settings,
  Users, ShieldCheck, Landmark, GraduationCap, UserSearch,
  Building2, Truck, BrainCircuit, Briefcase, PenTool,
  Globe, BarChart3, CreditCard, MessageSquare, Heart,
  Leaf, Hammer, Sparkles, Menu, X, Bell, Search,
  ChevronDown, ChevronRight, FileText
} from 'lucide-react';
import { auth } from '../core/firebase/config';
import { useTenant } from '../core/auth/TenantContext';
import { useAuth } from '../core/auth/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: 'Pulpit',
    defaultOpen: true,
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
      { name: 'AI Copilot', path: '/ai-copilot', icon: BrainCircuit, badge: 'AI' },
      { name: 'Komunikacja', path: '/communication', icon: MessageSquare },
    ]
  },
  {
    label: 'Operacje',
    defaultOpen: true,
    items: [
      { name: 'Czas Pracy', path: '/time', icon: Clock },
      { name: 'Projekty & Kanban', path: '/kanban', icon: LayoutKanban },
      { name: 'Sprzedaż & CRM', path: '/crm', icon: Building2 },
    ]
  },
  {
    label: 'Finanse',
    defaultOpen: false,
    items: [
      { name: 'Finanse (FI)', path: '/finance', icon: Landmark },
      { name: 'Controlling (CO)', path: '/controlling', icon: BarChart3 },
      { name: 'Płatności', path: '/payments', icon: CreditCard },
    ]
  },
  {
    label: 'Kadry & Szkolenia',
    defaultOpen: false,
    items: [
      { name: 'HR & Płace', path: '/hr', icon: Users },
      { name: 'eRekrutacja', path: '/hr/recruitment', icon: UserSearch },
      { name: 'Szkolenia (LMS)', path: '/lms', icon: GraduationCap },
      { name: 'Wellbeing', path: '/wellness', icon: Heart },
    ]
  },
  {
    label: 'Zgodność & ESG',
    defaultOpen: false,
    items: [
      { name: 'Compliance / RODO', path: '/compliance', icon: ShieldCheck, badge: '!' },
      { name: 'ESG Reporting', path: '/esg', icon: Leaf },
    ]
  },
  {
    label: 'Dokumenty & Logistyka',
    defaultOpen: false,
    items: [
      { name: 'Skarbiec (DMS)', path: '/dms', icon: Briefcase },
      { name: 'E-Podpis', path: '/esignature', icon: PenTool },
      { name: 'Logistyka & Flota', path: '/logistics', icon: Truck },
    ]
  },
  {
    label: 'System',
    defaultOpen: false,
    items: [
      { name: 'Multi-Firma', path: '/cross-company', icon: Globe },
      { name: 'Administracja', path: '/admin', icon: Settings },
    ]
  },
];

function isPathActive(itemPath: string, locationPath: string, exact?: boolean) {
  if (exact || itemPath === '/') return locationPath === itemPath;
  return locationPath.startsWith(itemPath);
}

function NavGroupSection({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const location = useLocation();
  const hasActive = group.items.some(item => isPathActive(item.path, location.pathname, item.exact));
  const [open, setOpen] = useState(group.defaultOpen ?? hasActive);

  if (collapsed) {
    return (
      <div className="space-y-1 py-1">
        {group.items.map(item => {
          const isActive = isPathActive(item.path, location.pathname, item.exact);
          return (
            <Link key={item.path} to={item.path} title={item.name}
              className={`flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all relative ${
                isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <item.icon size={17} />
              {item.badge && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${hasActive ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'}`}
      >
        <span className="text-[9px] font-black uppercase tracking-widest">{group.label}</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>

      {open && (
        <div className="space-y-0.5 mb-2">
          {group.items.map(item => {
            const isActive = isPathActive(item.path, location.pathname, item.exact);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <item.icon size={15} className={isActive ? 'text-indigo-400' : 'text-zinc-600'} />
                <span className="flex-1 text-[12px] font-medium">{item.name}</span>
                {item.badge && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none ${
                    item.badge === 'AI' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'
                  }`}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { currentTenant } = useTenant();
  const { userData } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => auth.signOut();

  const initials = userData?.displayName
    ? userData.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CI';

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} transition-[width] duration-200 bg-zinc-900/95 border-r border-zinc-800/50 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'justify-between py-4 px-4'} border-b border-zinc-800/50`}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base font-black text-white tracking-tighter italic leading-none">C-ICAS.OS</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold truncate mt-0.5">{currentTenant?.name ?? 'Workspace'}</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-600 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Search hint */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-zinc-800/30">
            <div className="flex items-center gap-2 bg-zinc-800/40 rounded-lg px-2.5 py-1.5 text-zinc-500 cursor-pointer hover:bg-zinc-800 transition-colors">
              <Search size={12} />
              <span className="text-[11px]">Szukaj...</span>
              <span className="ml-auto text-[9px] bg-zinc-700/60 px-1.5 py-0.5 rounded font-mono">⌘K</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          {navGroups.map(group => (
            <NavGroupSection key={group.label} group={group} collapsed={collapsed} />
          ))}
        </nav>

        {/* User & logout */}
        <div className={`p-2 border-t border-zinc-800/50 space-y-1`}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-[9px] font-black text-indigo-400 flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-zinc-300 truncate">{userData?.displayName || 'Użytkownik'}</div>
                <div className="text-[9px] text-zinc-600 truncate">{userData?.email}</div>
              </div>
              <Bell size={13} className="text-zinc-600 hover:text-zinc-300 flex-shrink-0" />
            </div>
          )}
          <button onClick={handleLogout}
            className={`flex items-center gap-2 ${collapsed ? 'justify-center w-9 h-9 mx-auto' : 'w-full px-2 py-2'} rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-900/10 transition-colors`}
          >
            <LogOut size={14} />
            {!collapsed && <span className="text-[11px]">Wyloguj</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <Outlet />
      </main>
    </div>
  );
}
