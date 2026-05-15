/**
 * Data: 2026-05-14
 * Zmiany: Pełna nawigacja v2 - wszystkie moduły C-ICAS.OS z grupowaniem.
 * Ścieżka: /src/app/AppLayout.tsx
 */
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../shared/lib/firebase';
import { CommandMenu } from '../shared/components/CommandMenu';
import {
  LayoutDashboard, Clock, LayoutKanban, LogOut, Settings,
  Users, ShieldCheck, Landmark, GraduationCap, UserSearch,
  Building2, Truck, BrainCircuit, Briefcase, PenTool,
  Globe, BarChart3, CreditCard, MessageSquare, Heart,
  Leaf, Hammer, Sparkles, Menu, X, Bell, Search,
  ChevronDown, ChevronRight, FileText, Shield, CreditCard as SwipeIcon,
  Receipt, Scale, Download, Languages, ImageIcon, ShieldAlert, ClipboardList,
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
      { name: 'Wydatki & Zwroty', path: '/expenses', icon: Receipt },
    ]
  },
  {
    label: 'Finanse',
    defaultOpen: false,
    items: [
      { name: 'Finanse (FI)', path: '/finance', icon: Landmark },
      { name: 'Controlling (CO)', path: '/controlling', icon: BarChart3 },
      { name: 'Płatności', path: '/payments', icon: CreditCard },
      { name: 'AI Guardian', path: '/ai-guardian', icon: Shield, badge: 'AI' },
      { name: 'Swipe & Match', path: '/swipe', icon: SwipeIcon },
      { name: 'Eksport Danych', path: '/export', icon: Download },
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
      { name: 'Legal Vault (KSH)', path: '/legal-vault', icon: Scale },
      { name: 'ESG Reporting', path: '/esg', icon: Leaf },
      { name: 'Jakość (NCR/CAPA)', path: '/quality', icon: ClipboardList },
    ]
  },
  {
    label: 'Dokumenty & Logistyka',
    defaultOpen: false,
    items: [
      { name: 'Skarbiec (DMS)', path: '/dms', icon: Briefcase },
      { name: 'E-Podpis', path: '/esignature', icon: PenTool },
      { name: 'Logistyka & Flota', path: '/logistics', icon: Truck },
      { name: 'Marketing Review', path: '/marketing', icon: ImageIcon },
    ]
  },
  {
    label: 'System',
    defaultOpen: false,
    items: [
      { name: 'Multi-Firma', path: '/cross-company', icon: Globe },
      { name: 'Administracja', path: '/admin', icon: Settings },
      { name: 'Ustawienia', path: '/settings', icon: FileText },
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [showBellPanel, setShowBellPanel] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const uid = (userData as any)?.uid;
    const tenantId = (currentTenant as any)?.id;
    if (!uid || !tenantId) return;
    const q = query(
      collection(db, `tenants/${tenantId}/notifications`),
      where('recipientId', '==', uid)
    );
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unread = all.filter((n: any) => !n.read);
      setUnreadCount(unread.length);
      setRecentNotifs(unread.slice(0, 5));
    });
  }, [(userData as any)?.uid, (currentTenant as any)?.id]);

  const handleLogout = () => auth.signOut();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
            <button onClick={() => setCmdOpen(true)} className="w-full flex items-center gap-2 bg-zinc-800/40 rounded-lg px-2.5 py-1.5 text-zinc-500 cursor-pointer hover:bg-zinc-800 transition-colors">
              <Search size={12} />
              <span className="text-[11px]">Szukaj...</span>
              <span className="ml-auto text-[9px] bg-zinc-700/60 px-1.5 py-0.5 rounded font-mono">⌘K</span>
            </button>
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
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowBellPanel(v => !v)}
                  className="relative p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Bell size={13} className={unreadCount > 0 ? 'text-indigo-400' : 'text-zinc-600'} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white text-[7px] font-black rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showBellPanel && (
                  <div className="absolute bottom-8 left-0 w-72 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Powiadomienia</span>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{unreadCount} nowych</span>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {recentNotifs.length === 0 ? (
                        <div className="py-8 text-center text-zinc-600 text-[10px] font-bold uppercase">Brak nowych</div>
                      ) : recentNotifs.map((n: any) => (
                        <div key={n.id} className="px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0">
                          <p className="text-[11px] font-semibold text-zinc-300 leading-tight">{n.message}</p>
                          <p className="text-[9px] text-zinc-600 mt-0.5 uppercase font-bold truncate">{n.documentTitle}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowBellPanel(false); navigate('/communication'); }}
                      className="flex items-center justify-center w-full py-3 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest border-t border-zinc-800 transition-colors"
                    >
                      Wszystkie powiadomienia →
                    </button>
                  </div>
                )}
              </div>
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

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
