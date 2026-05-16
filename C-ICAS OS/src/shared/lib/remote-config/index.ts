import { getRemoteConfig, fetchAndActivate, getValue, getAll } from 'firebase/remote-config';
import { getApp } from 'firebase/app';
import { useState, useEffect, useCallback } from 'react';

let _rc: ReturnType<typeof getRemoteConfig> | null = null;

function rc() {
  if (!_rc) {
    _rc = getRemoteConfig(getApp());
    _rc.settings.minimumFetchIntervalMillis = 3600_000; // 1h in production
    _rc.defaultConfig = {
      maintenance_mode: false,
      ai_copilot_enabled: true,
      max_file_upload_mb: 20,
      feature_shop_module: true,
      feature_ksef_prod: false,
    };
  }
  return _rc;
}

export async function initRemoteConfig(): Promise<void> {
  await fetchAndActivate(rc());
}

export function getFlag(key: string): boolean {
  return getValue(rc(), key).asBoolean();
}

export function getString(key: string): string {
  return getValue(rc(), key).asString();
}

export function getNumber(key: string): number {
  return getValue(rc(), key).asNumber();
}

export function getAllFlags(): Record<string, boolean> {
  const all = getAll(rc());
  return Object.fromEntries(
    Object.entries(all).map(([k, v]) => [k, v.asBoolean()])
  );
}

export function useRemoteFlag(key: string, defaultValue = false): boolean {
  const [value, setValue] = useState(defaultValue);
  const refresh = useCallback(async () => {
    try {
      await fetchAndActivate(rc());
      setValue(getValue(rc(), key).asBoolean());
    } catch { /* network error — keep default */ }
  }, [key]);
  useEffect(() => { refresh(); }, [refresh]);
  return value;
}
