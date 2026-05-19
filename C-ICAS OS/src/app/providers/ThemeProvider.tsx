/**
 * Data: 2026-05-18
 * ThemeProvider v2 — light/dark/auto + font-size, radius, density, presets, tenant brand colors.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { PRESETS, type RadiusPreset, type DensityPreset } from '../../core/theme/presets';
import { getTenantTheme } from '../../services/tenantTheme';

type Theme = 'light' | 'dark' | 'auto';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  radius: RadiusPreset;
  setRadius: (r: RadiusPreset) => void;
  density: DensityPreset;
  setDensity: (d: DensityPreset) => void;
  preset: string;
  setPreset: (p: string) => void;
  brandH: number;
  brandS: string;
  setBrand: (h: number, s: string) => void;
  brand2H: number;
  brand2S: string;
  brand3H: number;
  brand3S: string;
  setBrand2: (h: number, s: string) => void;
  setBrand3: (h: number, s: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyVars(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

// Inject a <style> tag that maps all bg-indigo-* / text-indigo-* / border-indigo-*
// to the current brand color so existing Tailwind classes respond to brand changes.
function applyBrandOverride(h: number, s: string, h2: number, s2: string, h3: number, s3: string) {
  let el = document.getElementById('brand-override') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'brand-override';
    document.head.appendChild(el);
  }
  const lv = (pct: number) => `hsl(${h} ${s} ${pct}%)`;
  const lv2 = (pct: number) => `hsl(${h2} ${s2} ${pct}%)`;
  const lv3 = (pct: number) => `hsl(${h3} ${s3} ${pct}%)`;
  el.textContent = `
    /* === PRIMARY brand (replaces indigo) === */
    .bg-indigo-50{background-color:${lv(97)}!important}
    .bg-indigo-100{background-color:${lv(94)}!important}
    .bg-indigo-200{background-color:${lv(88)}!important}
    .bg-indigo-300{background-color:${lv(78)}!important}
    .bg-indigo-400{background-color:${lv(63)}!important}
    .bg-indigo-500{background-color:${lv(52)}!important}
    .bg-indigo-600{background-color:${lv(47)}!important}
    .bg-indigo-700{background-color:${lv(38)}!important}
    .bg-indigo-800{background-color:${lv(30)}!important}
    .bg-indigo-900{background-color:${lv(20)}!important}
    .text-indigo-50{color:${lv(97)}!important}
    .text-indigo-100{color:${lv(94)}!important}
    .text-indigo-200{color:${lv(88)}!important}
    .text-indigo-300{color:${lv(78)}!important}
    .text-indigo-400{color:${lv(63)}!important}
    .text-indigo-500{color:${lv(52)}!important}
    .text-indigo-600{color:${lv(47)}!important}
    .text-indigo-700{color:${lv(38)}!important}
    .text-indigo-800{color:${lv(30)}!important}
    .border-indigo-100{border-color:${lv(94)}!important}
    .border-indigo-200{border-color:${lv(88)}!important}
    .border-indigo-300{border-color:${lv(78)}!important}
    .border-indigo-400{border-color:${lv(63)}!important}
    .border-indigo-500{border-color:${lv(52)}!important}
    .border-indigo-600{border-color:${lv(47)}!important}
    .hover\\:bg-indigo-50:hover{background-color:${lv(97)}!important}
    .hover\\:bg-indigo-100:hover{background-color:${lv(94)}!important}
    .hover\\:bg-indigo-500:hover{background-color:${lv(52)}!important}
    .hover\\:bg-indigo-600:hover{background-color:${lv(47)}!important}
    .hover\\:bg-indigo-700:hover{background-color:${lv(38)}!important}
    .hover\\:text-indigo-500:hover{color:${lv(52)}!important}
    .hover\\:text-indigo-600:hover{color:${lv(47)}!important}
    .hover\\:text-indigo-700:hover{color:${lv(38)}!important}
    .hover\\:border-indigo-200:hover{border-color:${lv(88)}!important}
    .focus\\:border-indigo-400:focus{border-color:${lv(63)}!important}
    .focus\\:ring-indigo-500:focus{--tw-ring-color:${lv(52)}!important}
    .ring-indigo-600{--tw-ring-color:${lv(47)}!important}
    /* === SECONDARY brand (replaces violet) === */
    .bg-violet-50{background-color:${lv2(97)}!important}
    .bg-violet-100{background-color:${lv2(94)}!important}
    .bg-violet-500{background-color:${lv2(52)}!important}
    .bg-violet-600{background-color:${lv2(47)}!important}
    .text-violet-500{color:${lv2(52)}!important}
    .text-violet-600{color:${lv2(47)}!important}
    .text-violet-700{color:${lv2(38)}!important}
    .border-violet-200{border-color:${lv2(88)}!important}
    /* === ACCENT brand (replaces purple) === */
    .bg-purple-50{background-color:${lv3(97)}!important}
    .bg-purple-100{background-color:${lv3(94)}!important}
    .bg-purple-500{background-color:${lv3(52)}!important}
    .bg-purple-600{background-color:${lv3(47)}!important}
    .text-purple-500{color:${lv3(52)}!important}
    .text-purple-600{color:${lv3(47)}!important}
    .text-purple-700{color:${lv3(38)}!important}
    /* === brand-* utilities === */
    .bg-brand-600\\/10{background-color:hsl(${h} ${s} 47% / 0.10)!important}
    .text-brand-600{color:${lv(47)}!important}
  `;
}

function radiusToPx(r: RadiusPreset): string {
  if (r === 'sharp') return '4px';
  if (r === 'pill') return '999px';
  return '12px';
}

function densityToVal(d: DensityPreset): string {
  if (d === 'compact') return '0.75';
  if (d === 'spacious') return '1.25';
  return '1';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { userData, updateUserSettings, activeTenantId } = useAuth() as any;

  const ud = userData as any;
  const [theme, setThemeState] = useState<Theme>(ud?.theme ?? 'auto');
  const [fontSize, setFontSizeState] = useState<number>(ud?.fontSize ?? 14);
  const [radius, setRadiusState] = useState<RadiusPreset>(ud?.radius ?? 'rounded');
  const [density, setDensityState] = useState<DensityPreset>(ud?.density ?? 'comfortable');
  const [preset, setPresetState] = useState<string>(ud?.preset ?? 'corporate');
  const [brandH, setBrandHState] = useState<number>(() => {
    const h = ud?.brandH ?? 239;
    return h;
  });
  const [brandS, setBrandSState] = useState<string>(ud?.brandS ?? '84%');
  const [brand2H, setBrand2HState] = useState<number>(ud?.brand2H ?? 270);
  const [brand2S, setBrand2SState] = useState<string>(ud?.brand2S ?? '60%');
  const [brand3H, setBrand3HState] = useState<number>(ud?.brand3H ?? 160);
  const [brand3S, setBrand3SState] = useState<string>(ud?.brand3S ?? '70%');

  // Load tenant theme defaults (only when user hasn't set their own values)
  useEffect(() => {
    if (!activeTenantId) return;
    getTenantTheme(activeTenantId).then(t => {
      if (!t) return;
      if (t.brandH !== undefined && !ud?.brandH) setBrandHState(t.brandH);
      if (t.brandS !== undefined && !ud?.brandS) setBrandSState(t.brandS);
      if (t.preset && !ud?.preset) setPresetState(t.preset);
      if (t.radius && !ud?.radius) setRadiusState(t.radius);
      if (t.density && !ud?.density) setDensityState(t.density);
      if (t.fontSize && !ud?.fontSize) setFontSizeState(t.fontSize);
    });
  }, [activeTenantId]);

  // Sync when userData loads/changes
  useEffect(() => {
    if (!userData) return;
    if (ud.theme) setThemeState(ud.theme);
    if (ud.fontSize) setFontSizeState(ud.fontSize);
    if (ud.radius) setRadiusState(ud.radius);
    if (ud.density) setDensityState(ud.density);
    if (ud.preset) setPresetState(ud.preset);
    if (ud.brandH) setBrandHState(ud.brandH);
    if (ud.brandS) setBrandSState(ud.brandS);
  }, [userData]);

  // Apply light/dark to <html>
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme === 'auto' ? (mq.matches ? 'dark' : 'light') : theme);
    };
    apply();
    if (theme === 'auto') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Apply CSS vars on every token change
  useEffect(() => {
    applyVars({
      '--brand-h': String(brandH),
      '--brand-s': brandS,
      '--font-size-base': `${fontSize}px`,
      '--radius-base': radiusToPx(radius),
      '--density': densityToVal(density),
    });
    document.documentElement.setAttribute('data-preset', preset);
    applyBrandOverride(brandH, brandS, brand2H, brand2S, brand3H, brand3S);
  }, [brandH, brandS, brand2H, brand2S, brand3H, brand3S, fontSize, radius, density, preset]);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    if (userData) await updateUserSettings({ theme: t });
  };

  const setFontSize = async (n: number) => {
    setFontSizeState(n);
    if (userData) await updateUserSettings({ fontSize: n } as any);
  };

  const setRadius = async (r: RadiusPreset) => {
    setRadiusState(r);
    if (userData) await updateUserSettings({ radius: r } as any);
  };

  const setDensity = async (d: DensityPreset) => {
    setDensityState(d);
    if (userData) await updateUserSettings({ density: d } as any);
  };

  const setPreset = async (p: string) => {
    const tokens = PRESETS[p];
    if (!tokens) return;
    setPresetState(p);
    setFontSizeState(tokens.fontSize);
    setRadiusState(tokens.radius);
    setDensityState(tokens.density);
    setBrandHState(tokens.brandH);
    setBrandSState(tokens.brandS);
    if (userData) {
      await updateUserSettings({
        preset: p,
        fontSize: tokens.fontSize,
        radius: tokens.radius,
        density: tokens.density,
        brandH: tokens.brandH,
        brandS: tokens.brandS,
      } as any);
    }
  };

  const setBrand = async (h: number, s: string) => {
    setBrandHState(h);
    setBrandSState(s);
    if (userData) await updateUserSettings({ brandH: h, brandS: s } as any);
  };

  const setBrand2 = async (h: number, s: string) => {
    setBrand2HState(h);
    setBrand2SState(s);
    if (userData) await updateUserSettings({ brand2H: h, brand2S: s } as any);
  };

  const setBrand3 = async (h: number, s: string) => {
    setBrand3HState(h);
    setBrand3SState(s);
    if (userData) await updateUserSettings({ brand3H: h, brand3S: s } as any);
  };

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      fontSize, setFontSize,
      radius, setRadius,
      density, setDensity,
      preset, setPreset,
      brandH, brandS, setBrand,
      brand2H, brand2S, brand3H, brand3S, setBrand2, setBrand3,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProviderPrimary');
  return ctx;
};
