/**
 * Data: 2026-05-12 20:17
 * Opis: Serwis Dexie do buforowania logów RCP w trybie offline.
 */
import Dexie, { Table } from 'dexie';

export interface OfflineTimeEntry {
  id?: number;
  userId: string;
  projectId: string;
  type: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'synced';
  note?: string;
  evidence?: any[];
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  manualEdit?: boolean;
}

export interface PrivateDocument {
  id?: number;
  name: string;
  blob: Blob;
  type: string;
  createdAt: number;
  blurred: boolean;
  ocrText?: string;
}

export class TimeTrackingDB extends Dexie {
  entries!: Table<OfflineTimeEntry>;
  privatePocket!: Table<PrivateDocument>;

  constructor() {
    super('TimeTrackingDB');
    this.version(2).stores({
      entries: '++id, userId, status, projectId',
      privatePocket: '++id, name, type'
    });
  }
}

export const offlineDB = new TimeTrackingDB();
