import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export enum AuditEventType {
  TENANT_SWITCHED = 'tenant.switched',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  DATA_CREATE = 'data.create',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  PERMISSION_DENIED = 'permission.denied',
  SECURITY_SENSITIVE = 'security.sensitive',
  MANUAL_TIME_EDIT = 'manual.time.edit',
  TRANSACTION_CREATE = 'transaction.create',
  DOCUMENT_VIEW = 'document.view',
}

export interface AuditConfig {
  logLevel: 'NONE' | 'CRITICAL_ONLY' | 'STANDARD' | 'VERBOSE';
  logCategories?: string[]; // e.g. ['documents', 'users', 'master_data', 'transactions']
}

const cachedConfigs: Record<string, AuditConfig> = {};

export const loadAuditConfig = async (tenantId: string): Promise<AuditConfig> => {
  if (cachedConfigs[tenantId]) return cachedConfigs[tenantId];
  try {
    const snap = await getDoc(doc(db, 'system_config', `audit_${tenantId}`));
    if (snap.exists()) {
      cachedConfigs[tenantId] = snap.data() as AuditConfig;
      return cachedConfigs[tenantId];
    }
  } catch (err: unknown) {
    // Config doesn't exist or no permission, proceed with defaults
    console.debug('No audit config found for tenant, using default', err);
  }
  
  // Domyślna konfiguracja jeśli brak w bazie
  const def: AuditConfig = { logLevel: 'STANDARD', logCategories: ['documents', 'users', 'transactions', 'master_data', 'system'] };
  cachedConfigs[tenantId] = def;
  return def;
};

export const shouldLog = async (tenantId: string | null, type: string, category?: string): Promise<boolean> => {
  if (!tenantId) return true; // always log system level
  const config = await loadAuditConfig(tenantId);
  
  if (config.logLevel === 'NONE') return false;
  if (config.logLevel === 'CRITICAL_ONLY') {
    return type.includes('security') || type.includes('permission');
  }
  
  if (config.logLevel === 'STANDARD') {
    if (type.includes('view') || type.includes('read')) return false; // Nie loguj odczytów w STANDARD
  }
  
  if (category && config.logCategories && !config.logCategories.includes(category)) {
    return false;
  }
  
  return true;
};

export interface AuditLog {
  userId: string;
  userEmail?: string;
  type: string;
  tenantId: string | null;
  details: any;
  timestamp: any;
  ip?: string;
  userAgent?: string;
  category?: string;
}

export const logAudit = async (userId: string, email: string, type: AuditEventType | string, tenantId: string | null, details: any = {}, category?: string) => {
  try {
    const canLog = await shouldLog(tenantId, type as string, category);
    if (!canLog) return;

    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, {
      userId,
      userEmail: email,
      type,
      tenantId,
      category: category || 'general',
      details,
      timestamp: serverTimestamp(),
      userAgent: window.navigator.userAgent,
    });
  } catch (error) {
    console.warn('Failed to log audit event:', error);
  }
};

export const auditService = {
  async logAction(userId: string, type: string, targetId: string | null, details: any = {}, category: string = 'general') {
    try {
      const tenantId = details.tenantId || null;
      const canLog = await shouldLog(tenantId, type, category);
      if (!canLog) return;
      
      const logsRef = collection(db, 'auditLogs');
      await addDoc(logsRef, {
        userId,
        type,
        targetId,
        tenantId,
        category,
        details,
        timestamp: serverTimestamp(),
        userAgent: window.navigator.userAgent,
        source: 'auditService'
      });
    } catch (error) {
      console.warn('auditService log failed:', error);
    }
  }
};
