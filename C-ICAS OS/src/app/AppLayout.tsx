/**
 * Data: 2026-05-14
 * Zmiany: Pełna nawigacja v2 - wszystkie moduły C-ICAS.OS z grupowaniem.
 * Ścieżka: /src/app/AppLayout.tsx
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../shared/lib/firebase';
import { CommandMenu } from '../shared/components/CommandMenu';
import {
  LayoutDashboard, Clock, Kanban, LogOut, Settings,
  Users, ShieldCheck, Landmark, GraduationCap, UserSearch,
  Building2, Truck, BrainCircuit, Briefcase, PenTool,
  Globe, BarChart3, CreditCard, MessageSquare, Heart,
  Leaf, Hammer, Sparkles, Menu, X, Bell, Search,
  ChevronDown, ChevronRight, FileText, Shield, CreditCard as SwipeIcon,
  Receipt, Scale, Download, Languages, ImageIcon, ShieldAlert, ClipboardList, CalendarDays,
  TrendingUp, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../core/theme/ThemeContext';
import { auth } from '../core/firebase/config';
import { useTenant } from '../core/auth/TenantContext';
import { useAuth } from '../core/auth/AuthContext';
import { useRole } from '../core/auth/useRole';
import { TenantSwitcher } from '../shared/components/TenantSwitcher';
import { CompanySwitcher } from '../shared/components/CompanySwitcher';

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

// navGroups are built inside the component to access `t()`
// See buildNavGroups() below

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
                isActive ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700/50 hover:text-slate-700 dark:hover:text-zinc-200'
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
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${hasActive ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
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
                    ? 'bg-brand-600/10 dark:bg-brand-600/15 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700/30'
                }`}
              >
                <item.icon size={15} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-zinc-500'} />
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

function buildNavGroups(t: (key: string) => string): NavGroup[] {
  return [
    {
      label: t('navGroup.pulpit'),
      defaultOpen: true,
      items: [
        { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard, exact: true },
        { name: t('nav.ai_assistant'), path: '/ai-copilot', icon: BrainCircuit, badge: 'AI' },
        { name: t('nav.communication'), path: '/communication', icon: MessageSquare },
      ]
    },
    {
      label: t('navGroup.operacje'),
      defaultOpen: true,
      items: [
        { name: t('nav.time'), path: '/time', icon: Clock },
        { name: t('nav.kanban'), path: '/kanban', icon: Kanban },
        { name: t('nav.crm'), path: '/crm', icon: Building2 },
        { name: t('nav.leads_to_cash'), path: '/leads-to-cash', icon: TrendingUp, badge: 'UC16' },
        { name: t('nav.expenses'), path: '/expenses', icon: Receipt },
      ]
    },
    {
      label: t('navGroup.finanse'),
      defaultOpen: false,
      items: [
        { name: t('nav.finance'), path: '/finance', icon: Landmark },
        { name: t('nav.controlling'), path: '/controlling', icon: BarChart3 },
        { name: t('nav.payments'), path: '/payments', icon: CreditCard },
        { name: t('nav.ai_guardian'), path: '/ai-guardian', icon: Shield, badge: 'AI' },
        { name: t('nav.swipe'), path: '/swipe', icon: SwipeIcon },
        { name: t('nav.export'), path: '/export', icon: Download },
      ]
    },
    {
      label: t('navGroup.kadry'),
      defaultOpen: false,
      items: [
        { name: t('nav.hr'), path: '/hr', icon: Users },
        { name: t('nav.recruitment'), path: '/hr/recruitment', icon: UserSearch },
        { name: t('nav.lms'), path: '/lms', icon: GraduationCap },
        { name: t('nav.wellbeing'), path: '/wellness', icon: Heart },
      ]
    },
    {
      label: t('navGroup.zgodnosc'),
      defaultOpen: false,
      items: [
        { name: t('nav.compliance'), path: '/compliance', icon: ShieldCheck, badge: '!' },
        { name: t('nav.legal_vault'), path: '/legal-vault', icon: Scale },
        { name: t('nav.esg'), path: '/esg', icon: Leaf },
        { name: t('nav.quality'), path: '/quality', icon: ClipboardList },
      ]
    },
    {
      label: t('navGroup.serwisy'),
      defaultOpen: false,
      items: [
        { name: t('nav.field_service'), path: '/field-service', icon: CalendarDays, badge: 'NEW' },
        { name: t('nav.booking'), path: '/booking', icon: CalendarDays },
      ]
    },
    {
      label: t('navGroup.dokumenty'),
      defaultOpen: false,
      items: [
        { name: t('nav.dms'), path: '/dms', icon: Briefcase },
        { name: t('nav.esignature'), path: '/esignature', icon: PenTool },
        { name: t('nav.logistics'), path: '/logistics', icon: Truck },
        { name: t('nav.marketing'), path: '/marketing', icon: ImageIcon },
      ]
    },
    {
      label: t('navGroup.system'),
      defaultOpen: false,
      items: [
        { name: t('nav.cross_company'), path: '/cross-company', icon: Globe },
        { name: t('nav.admin'), path: '/admin', icon: Settings },
        { name: t('nav.settings'), path: '/settings', icon: FileText },
      ]
    },
  ];
}

export function AppLayout() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { userData } = useAuth();
  const { canAccess } = useRole();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const navGroups = buildNavGroups(t);
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
    <div className="flex h-screen bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} transition-[width] duration-200 bg-white dark:bg-zinc-800/70 border-r border-slate-200 dark:border-zinc-700/40 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'justify-between py-4 px-4'} border-b border-slate-200 dark:border-zinc-700/40`}>
          {!collapsed && (
            <div className="text-base font-black text-slate-800 dark:text-zinc-100 tracking-tighter italic leading-none flex-shrink-0">C-ICAS.OS</div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors flex-shrink-0"
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Tenant switcher */}
        <div className={`border-b border-slate-200 dark:border-zinc-700/40 ${collapsed ? 'py-2 px-1' : 'py-2 px-2'}`}>
          <TenantSwitcher collapsed={collapsed} />
          <CompanySwitcher collapsed={collapsed} />
        </div>

        {/* Search hint */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-slate-200 dark:border-zinc-700/30">
            <button onClick={() => setCmdOpen(true)} className="w-full flex items-center gap-2 bg-slate-100 dark:bg-zinc-700/30 rounded-lg px-2.5 py-1.5 text-slate-500 dark:text-zinc-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700/50 transition-colors">
              <Search size={12} />
              <span className="text-[11px]">{t('layout.search_placeholder')}</span>
              <span className="ml-auto text-[9px] bg-slate-200 dark:bg-zinc-600/50 px-1.5 py-0.5 rounded font-mono">⌘K</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-600">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => canAccess(item.path));
            if (visibleItems.length === 0) return null;
            return (
              <NavGroupSection key={group.label} group={{ ...group, items: visibleItems }} collapsed={collapsed} />
            );
          })}
        </nav>

        {/* User & logout */}
        <div className={`p-2 border-t border-slate-200 dark:border-zinc-700/40 space-y-1`}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700/40 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-brand-600/15 border border-brand-600/25 flex items-center justify-center text-[9px] font-black text-brand-600 flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{userData?.displayName || t('layout.user_fallback')}</div>
                <div className="text-[9px] text-zinc-500 dark:text-zinc-600 truncate">{userData?.email}</div>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowBellPanel(v => !v)}
                  className="relative p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  <Bell size={13} className={unreadCount > 0 ? 'text-brand-600' : 'text-zinc-600'} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-600 text-white text-[7px] font-black rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showBellPanel && (
                  <div className="absolute bottom-8 left-0 w-72 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t('layout.notifications')}</span>
                      {unreadCount > 0 && (
                        <span className="bg-brand-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{t('layout.notifications_new', { count: unreadCount })}</span>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {recentNotifs.length === 0 ? (
                        <div className="py-8 text-center text-zinc-600 text-[10px] font-bold uppercase">{t('layout.notifications_empty')}</div>
                      ) : recentNotifs.map((n: any) => (
                        <div key={n.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-100 dark:border-zinc-800/50 last:border-0">
                          <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">{n.message}</p>
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-600 mt-0.5 uppercase font-bold truncate">{n.documentTitle}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowBellPanel(false); navigate('/communication'); }}
                      className="flex items-center justify-center w-full py-3 text-[9px] font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 uppercase tracking-widest border-t border-gray-100 dark:border-zinc-800 transition-colors"
                    >
                      {t('layout.notifications_all')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className={`flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center gap-2'}`}>
            <button onClick={toggleTheme} title={theme === 'dark' ? t('layout.theme_light') : t('layout.theme_dark')}
              className={`flex items-center gap-2 ${collapsed ? 'justify-center w-9 h-9' : 'flex-1 px-2 py-2'} rounded-xl text-zinc-500 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors`}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {!collapsed && <span className="text-[11px]">{theme === 'dark' ? t('layout.theme_light') : t('layout.theme_dark')}</span>}
            </button>
            <button onClick={handleLogout}
              className={`flex items-center gap-2 ${collapsed ? 'justify-center w-9 h-9' : 'flex-1 px-2 py-2'} rounded-xl text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors`}
            >
              <LogOut size={14} />
              {!collapsed && <span className="text-[11px]">{t('layout.logout')}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-900">
        <Outlet />
      </main>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
