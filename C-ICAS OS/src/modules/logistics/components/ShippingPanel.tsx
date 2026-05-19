/**
 * Data: 2026-05-19
 * Sciezka: src/modules/logistics/components/ShippingPanel.tsx
 * Opis: Panel tworzenia wysylek — InPost, DPD, DHL, GLS, Poczta Polska.
 */

import React, { useState, useEffect } from 'react';
import { Package, Send, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import {
  createShipment as createInPostShipment,
  type InPostShipmentResult,
} from '../services/inpostService';
import {
  getDpdConfig, getDhlConfig, getGlsConfig,
  createDpdShipment, createDhlShipment, createGlsShipment,
  type CourierShipmentResult,
} from '../services/courierService';
import {
  getPocztaConfig, createShipment as createPocztaShipment,
  type PocztaShipmentResult,
} from '../services/pocztaPolskaService';

// ── Typy ─────────────────────────────────────────────────────────────────────

type Carrier = 'inpost' | 'dpd' | 'dhl' | 'gls' | 'poczta-polska';

interface ShipmentRecord {
  id: string;
  carrier: Carrier;
  trackingNumber: string;
  recipientName: string;
  city: string;
  createdAt: string;
  labelUrl?: string;
}

interface FormState {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  street: string;
  city: string;
  postalCode: string;
  weight: string;
  carrier: Carrier;
  inpostMachineId: string;
  serviceType: string;
}

const CARRIER_LABELS: Record<Carrier, string> = {
  'inpost':         'InPost Paczkomat',
  'dpd':            'DPD Kurier',
  'dhl':            'DHL Express',
  'gls':            'GLS Poland',
  'poczta-polska':  'Poczta Polska',
};

const DEFAULT_SERVICE: Record<Carrier, string> = {
  'inpost':         'parcel_locker_standard',
  'dpd':            '1',
  'dhl':            'N',
  'gls':            'PARCEL',
  'poczta-polska':  'EKP',
};

const SENDER_PLACEHOLDER = {
  name: 'C-ICAS Sp. z o.o.',
  street: 'ul. Przykladowa 1',
  city: 'Warszawa',
  postalCode: '00-001',
  countryCode: 'PL',
};

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function ShippingPanel() {
  const { activeTenantId } = useTenant();

  const [form, setForm] = useState<FormState>({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    street: '',
    city: '',
    postalCode: '',
    weight: '1',
    carrier: 'inpost',
    inpostMachineId: '',
    serviceType: DEFAULT_SERVICE['inpost'],
  });

  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Przy zmianie kuriera ustaw domyslny serviceType
  useEffect(() => {
    setForm(prev => ({ ...prev, serviceType: DEFAULT_SERVICE[prev.carrier] }));
  }, [form.carrier]);

  function field<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenantId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let trackingNumber = '';
      let labelUrl: string | undefined;

      if (form.carrier === 'inpost') {
        const result: InPostShipmentResult = await createInPostShipment(activeTenantId, {
          receiver: {
            name:  form.recipientName,
            email: form.recipientEmail,
            phone: form.recipientPhone,
          },
          parcel:         { template: 'medium' },
          deliveryMethod: 'parcel_locker_standard',
          targetMachineId: form.inpostMachineId || undefined,
        });
        trackingNumber = result.tracking_number;

      } else if (form.carrier === 'dpd') {
        const config = await getDpdConfig(activeTenantId);
        const result: CourierShipmentResult = await createDpdShipment(config, {
          sender:     { ...SENDER_PLACEHOLDER },
          receiver:   {
            name:        form.recipientName,
            street:      form.street,
            city:        form.city,
            postalCode:  form.postalCode,
            countryCode: 'PL',
            phone:       form.recipientPhone,
            email:       form.recipientEmail,
          },
          weight:      parseFloat(form.weight),
          dimensions:  { length: 30, width: 20, height: 15 },
          serviceType: form.serviceType,
        });
        trackingNumber = result.trackingNumber;
        labelUrl       = result.labelUrl;

      } else if (form.carrier === 'dhl') {
        const config = await getDhlConfig(activeTenantId);
        const result: CourierShipmentResult = await createDhlShipment(config, {
          sender:      { ...SENDER_PLACEHOLDER },
          receiver:    {
            name:        form.recipientName,
            street:      form.street,
            city:        form.city,
            postalCode:  form.postalCode,
            countryCode: 'PL',
            phone:       form.recipientPhone,
            email:       form.recipientEmail,
          },
          weight:      parseFloat(form.weight),
          dimensions:  { length: 30, width: 20, height: 15 },
          serviceType: form.serviceType,
        });
        trackingNumber = result.trackingNumber;
        labelUrl       = result.labelUrl;

      } else if (form.carrier === 'gls') {
        const config = await getGlsConfig(activeTenantId);
        const result: CourierShipmentResult = await createGlsShipment(config, {
          sender:      { ...SENDER_PLACEHOLDER },
          receiver:    {
            name:        form.recipientName,
            street:      form.street,
            city:        form.city,
            postalCode:  form.postalCode,
            countryCode: 'PL',
            phone:       form.recipientPhone,
            email:       form.recipientEmail,
          },
          weight:      parseFloat(form.weight),
          dimensions:  { length: 30, width: 20, height: 15 },
          serviceType: form.serviceType,
        });
        trackingNumber = result.trackingNumber;
        labelUrl       = result.labelUrl;

      } else if (form.carrier === 'poczta-polska') {
        const config = await getPocztaConfig(activeTenantId);
        const result: PocztaShipmentResult = await createPocztaShipment(config, {
          sender: {
            name:        SENDER_PLACEHOLDER.name,
            street:      SENDER_PLACEHOLDER.street,
            houseNumber: '1',
            city:        SENDER_PLACEHOLDER.city,
            postalCode:  SENDER_PLACEHOLDER.postalCode,
          },
          receiver: {
            name:        form.recipientName,
            street:      form.street,
            houseNumber: '',
            city:        form.city,
            postalCode:  form.postalCode,
            phone:       form.recipientPhone,
            email:       form.recipientEmail,
          },
          weight:      parseFloat(form.weight) * 1000, // gramy
          serviceType: form.serviceType,
        });
        trackingNumber = result.trackingNumber;
        labelUrl       = result.label || undefined;
      }

      const record: ShipmentRecord = {
        id:            crypto.randomUUID(),
        carrier:       form.carrier,
        trackingNumber,
        recipientName: form.recipientName,
        city:          form.city,
        createdAt:     new Date().toLocaleString('pl-PL'),
        labelUrl,
      };

      setShipments(prev => [record, ...prev]);
      setSuccess(`Przesylka utworzona. Numer: ${trackingNumber}`);
      setForm(prev => ({
        ...prev,
        recipientName: '', recipientEmail: '', recipientPhone: '',
        street: '', city: '', postalCode: '', inpostMachineId: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad tworzenia wysylki');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* Formularz */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Nowa Wysylka</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wypelnij dane odbiorcy i wybierz kuriera</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-6">
            <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-bold">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-6">
            <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700 font-bold">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Wybor kuriera */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Kurier
            </label>
            <div className="flex flex-wrap gap-3">
              {(Object.entries(CARRIER_LABELS) as [Carrier, string][]).map(([id, label]) => (
                <label key={id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="carrier"
                    value={id}
                    checked={form.carrier === id}
                    onChange={field('carrier')}
                    className="sr-only"
                  />
                  <span className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border block ${
                    form.carrier === id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'
                  }`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dane odbiorcy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imie i nazwisko / Firma</label>
              <input
                required
                value={form.recipientName}
                onChange={field('recipientName')}
                placeholder="Jan Kowalski"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
              <input
                type="email"
                value={form.recipientEmail}
                onChange={field('recipientEmail')}
                placeholder="jan@firma.pl"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefon</label>
              <input
                value={form.recipientPhone}
                onChange={field('recipientPhone')}
                placeholder="+48 500 000 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
          </div>

          {form.carrier !== 'inpost' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ulica i numer</label>
                <input
                  required
                  value={form.street}
                  onChange={field('street')}
                  placeholder="ul. Przykladowa 1"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Miasto</label>
                <input
                  required
                  value={form.city}
                  onChange={field('city')}
                  placeholder="Warszawa"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kod pocztowy</label>
                <input
                  required
                  value={form.postalCode}
                  onChange={field('postalCode')}
                  placeholder="00-001"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
                />
              </div>
            </div>
          )}

          {form.carrier === 'inpost' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ID Paczkomatu (opcjonalnie)</label>
              <input
                value={form.inpostMachineId}
                onChange={field('inpostMachineId')}
                placeholder="np. WAW01N"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
          )}

          <div className="flex items-end gap-4">
            <div className="w-32">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waga (kg)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.weight}
                onChange={field('weight')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-slate-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !activeTenantId}
              className="flex items-center gap-2 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-10 py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Tworzenie...</>
                : <><Send size={14} /> Utw&#xF3;rz Wysylke</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Lista ostatnich przesylek */}
      {shipments.length > 0 && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Ostatnie Przesylki</h3>
          <div className="space-y-4">
            {shipments.map(s => (
              <div key={s.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Package size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{CARRIER_LABELS[s.carrier]} • {s.createdAt}</div>
                    <div className="text-sm font-black text-slate-900 italic">{s.recipientName} — {s.city}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">Nr: {s.trackingNumber}</div>
                  </div>
                </div>
                {s.labelUrl && (
                  <a
                    href={s.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink size={12} /> Etykieta
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
