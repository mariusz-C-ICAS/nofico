import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Package, Tag, Plus, Search, RefreshCw,
  TrendingUp, DollarSign, BarChart3, Edit2, Trash2,
  CheckCircle2, XCircle, Eye, ExternalLink, Download,
} from 'lucide-react';
import AllegroImportPanel from '../ecommerce/components/AllegroImportPanel';
import { db } from '../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  platform?: string;
  createdAt?: any;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  platform: string;
  createdAt?: any;
}

const STATUS_COLOR: Record<string, string> = {
  active:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive:     'bg-slate-50 text-slate-500 border-slate-200',
  out_of_stock: 'bg-rose-50 text-rose-700 border-rose-200',
  pending:      'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped:      'bg-sky-50 text-sky-700 border-sky-200',
  delivered:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:    'bg-rose-50 text-rose-500 border-rose-200',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny', inactive: 'Nieaktywny', out_of_stock: 'Brak w magazynie',
  pending: 'Oczekuje', confirmed: 'Potwierdzone', shipped: 'Wysłane',
  delivered: 'Dostarczone', cancelled: 'Anulowane',
};

const TABS = [
  { id: 'products', label: 'Produkty',   icon: Package },
  { id: 'orders',   label: 'Zamówienia', icon: ShoppingCart },
  { id: 'allegro',  label: 'Allegro',    icon: Download },
  { id: 'stats',    label: 'Statystyki', icon: BarChart3 },
] as const;

const PLATFORMS = ['Allegro', 'Shopify', 'Amazon', 'WooCommerce', 'Własny sklep'];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={16} className="opacity-60" />
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}

export default function ShopModule() {
  const { activeTenantId } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]['id']>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '', category: '', platform: 'Własny sklep' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeTenantId) return;
    setLoading(true);
    const [pSnap, oSnap] = await Promise.all([
      getDocs(query(collection(db, 'shop_products'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'shop_orders'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'))),
    ]);
    setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    setLoading(false);
  }, [activeTenantId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveProduct = async () => {
    if (!activeTenantId || !form.name || !form.price) return;
    setSaving(true);
    await addDoc(collection(db, 'shop_products'), {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock || '0'),
      status: parseInt(form.stock || '0') > 0 ? 'active' : 'out_of_stock',
      tenantId: activeTenantId,
      createdAt: serverTimestamp(),
    });
    setForm({ name: '', sku: '', price: '', stock: '', category: '', platform: 'Własny sklep' });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Usunąć produkt?')) return;
    await deleteDoc(doc(db, 'shop_products', id));
    load();
  };

  const handleOrderStatus = async (id: string, status: Order['status']) => {
    await updateDoc(doc(db, 'shop_orders', id), { status });
    load();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    active: products.filter(p => p.status === 'active').length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><ShoppingCart size={130} /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">E-commerce</h3>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Sklep</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">Zarządzanie produktami, zamówieniami i integracjami z platformami sprzedażowymi (Allegro, Shopify, Amazon, WooCommerce).</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Produkty"         value={stats.totalProducts} icon={Package}      color="bg-white border-slate-200 text-slate-800" />
        <StatCard label="Aktywne"          value={stats.active}        icon={CheckCircle2} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
        <StatCard label="Zamówienia"       value={stats.pendingOrders} icon={ShoppingCart} color="bg-amber-50 border-amber-200 text-amber-800" />
        <StatCard label="Przychód (PLN)"   value={stats.revenue.toLocaleString('pl-PL')} icon={DollarSign} color="bg-indigo-50 border-indigo-200 text-indigo-800" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj po nazwie lub SKU..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              <Plus size={12}/> Nowy produkt
            </button>
            <button onClick={load} className="text-slate-400 hover:text-slate-700 transition-colors"><RefreshCw size={14}/></button>
          </div>

          {showForm && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Nazwa produktu *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 col-span-2 md:col-span-1" />
              <input placeholder="SKU / kod" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input placeholder="Cena PLN *" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input placeholder="Stan magazynowy" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input placeholder="Kategoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
              <div className="col-span-2 md:col-span-3 flex gap-2">
                <button onClick={handleSaveProduct} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
                  {saving ? 'Zapisuję...' : 'Dodaj produkt'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl">Anuluj</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs">Brak produktów. Dodaj pierwszy.</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Produkt', 'SKU', 'Cena', 'Stan', 'Platforma', 'Status', ''].map(h => (
                      <th key={h} className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{p.name}</td>
                      <td className="p-3 font-mono text-slate-400">{p.sku || '—'}</td>
                      <td className="p-3 font-bold text-slate-700">{p.price?.toLocaleString('pl-PL')} PLN</td>
                      <td className="p-3 text-slate-600">{p.stock}</td>
                      <td className="p-3 text-slate-400">{p.platform || '—'}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={13}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs">Brak zamówień.</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Nr', 'Klient', 'Platforma', 'Pozycje', 'Kwota', 'Status', 'Akcja'].map(h => (
                      <th key={h} className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-700">{o.orderNumber}</td>
                      <td className="p-3 font-bold text-slate-800">{o.customerName}</td>
                      <td className="p-3 text-slate-400">{o.platform}</td>
                      <td className="p-3 text-slate-600">{o.items}</td>
                      <td className="p-3 font-bold text-slate-700">{o.total?.toLocaleString('pl-PL')} PLN</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                      </td>
                      <td className="p-3">
                        {o.status === 'pending' && (
                          <button onClick={() => handleOrderStatus(o.id, 'confirmed')}
                            className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800">Potwierdź</button>
                        )}
                        {o.status === 'confirmed' && (
                          <button onClick={() => handleOrderStatus(o.id, 'shipped')}
                            className="text-[9px] font-black uppercase text-sky-600 hover:text-sky-800">Wyślij</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Allegro Tab */}
      {tab === 'allegro' && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <AllegroImportPanel />
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
          Statystyki sprzedaży — integracja z modułem Controlling (BI). Dostępne po połączeniu platformy e-commerce.
        </div>
      )}
    </div>
  );
}
