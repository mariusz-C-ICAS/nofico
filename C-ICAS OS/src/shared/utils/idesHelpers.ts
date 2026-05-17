import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LogFn = (msg: string) => void;

export function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
export function rndInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function ts(daysBack: number): Timestamp { return Timestamp.fromDate(new Date(Date.now() - daysBack * 86400000)); }
export function dateStr(daysBack: number): string { return new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0]; }
export function futureDateStr(daysAhead: number): string { return new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]; }
export function pesel(): string {
  const y = rndInt(70, 95), m = rndInt(1, 12), d = rndInt(1, 28);
  return `${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}${rndInt(10000,99999)}`;
}
export function nip(): string { return String(rndInt(1000000000, 9999999999)); }
export function bankAccount(): string {
  return `PL${rndInt(10,99)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)}`;
}

export const FM = ['Jan','Piotr','Tomasz','Andrzej','Michał','Marcin','Jakub','Adam','Krzysztof','Stanisław','Łukasz','Kamil','Marek','Paweł','Robert'];
export const FF = ['Anna','Maria','Katarzyna','Agnieszka','Małgorzata','Krystyna','Barbara','Ewa','Elżbieta','Zofia','Monika','Natalia','Karolina','Joanna','Marta'];
export const LN = ['Nowak','Kowalski','Wiśniewski','Lewandowski','Wójcik','Zieliński','Mazur','Kowalczyk','Dąbrowski','Szymański','Woźniak','Kozłowski','Jankowski','Wojciechowski','Kwiatkowski'];
export const CITIES = ['Warszawa','Kraków','Wrocław','Poznań','Gdańsk','Łódź','Szczecin','Katowice','Lublin','Bydgoszcz'];
export const STREETS = ['Główna','Lipowa','Słoneczna','Polna','Leśna','Kwiatowa','Parkowa','Wiśniowa','Różana','Jesionowa'];

export class BatchWriter {
  private batch = writeBatch(db);
  private count = 0;
  private total = 0;

  set(ref: ReturnType<typeof doc>, data: object): void {
    this.batch.set(ref, data);
    this.count++;
    this.total++;
  }

  setM(ref: ReturnType<typeof doc>, data: object): void {
    this.batch.set(ref, data, { merge: true });
    this.count++;
    this.total++;
  }

  async maybeFlush(): Promise<void> {
    if (this.count >= 490) {
      await this.batch.commit();
      this.batch = writeBatch(db);
      this.count = 0;
    }
  }

  async commit(): Promise<number> {
    if (this.count > 0) await this.batch.commit();
    return this.total;
  }
}
