import React, { useState, useEffect } from 'react';
import {
  GitBranch, Plus, Bell, Settings, ArrowLeft, ShieldCheck,
  X, RefreshCw, WifiOff, AlertTriangle,
} from 'lucide-react';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { syncPendingDrafts, createOnlineListener, isOnline } from './services/offlineDraftStorage';
import WorkflowInbox from './components/WorkflowInbox';
import SubmitDocumentFlow from './components/SubmitDocumentFlow';
import KsefStatusPanel from './components/KsefStatusPanel';
import AttachmentPreview from './components/AttachmentPreview';
import ApprovalPanel from './components/ApprovalPanel';
import DocumentTimeline from './components/DocumentTimeline';
import NotificationPrefsModal from './components/NotificationPrefsModal';
import WorkflowTemplateEditor from './admin/WorkflowTemplateEditor';
import { getDocumentHistory } from './services/workflowEngine';
import type { DocumentInstance, WorkflowStepRecord, WorkflowNotification } from './types';
import { markAsRead, markAllAsRead } from './services/notificationService';
import DocumentAiPanel from './components/DocumentAiPanel';
import VoiceNoteRecorder from './components/VoiceNoteRecorder';
import SettlementPanel from './components/SettlementPanel';
import DamageClaimPanel from './components/DamageClaimPanel';
import BhpDispatchPanel from './components/BhpDispatchPanel';
import QualityNcrPanel from './components/QualityNcrPanel';
import ExpenseAdvancePanel from './components/ExpenseAdvancePanel';
import DocumentArchive from './components/DocumentArchive';
import WorkflowDashboard from './components/WorkflowDashboard';
import SlaAdminPanel from './components/SlaAdminPanel';
import type { DocumentComment } from './components/DocumentTimeline';

type MainView = 'inbox' | 'submit' | 'detail' | 'admin' | 'archive' | 'dashboard';
type TopView = 'inbox' | 'archive' | 'dashboard';

export default function WorkflowModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<MainView>('inbox');
  const [prevTopView, setPrevTopView] = useState<TopView>('inbox');
  const [selectedDoc, setSelectedDoc] = useState<DocumentInstance | null>(null);
  const [docHistory, setDocHistory] = useState<WorkflowStepRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [docComments, setDocComments] = useState<DocumentComment[]>([]);

  // Load comments for selected document
  useEffect(() => {
    if (!selectedDoc || !activeTenantId) { setDocComments([]); return; }
    const q = query(
      collection(db, `tenants/${activeTenantId}/documentComments`),
      where('documentId', '==', selectedDoc.id),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      setDocComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentComment)));
    });
  }, [selectedDoc?.id, activeTenantId]);

  // Real-time in-app notifications
  useEffect(() => {
    if (!user || !activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/notifications`),
      where('recipientId', '==', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkflowNotification);
      notifs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setNotifications(notifs.slice(0, 20));
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return unsub;
  }, [user, activeTenantId]);

  const handleSelectDocument = async (doc: DocumentInstance) => {
    if (view === 'inbox' || view === 'archive' || view === 'dashboard') {
      setPrevTopView(view as TopView);
    }
    setSelectedDoc(doc);
    setView('detail');
    setHistoryLoading(true);
    try {
      const history = await getDocumentHistory(activeTenantId!, doc.id);
      setDocHistory(history);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBack = () => {
    setView(prevTopView);
    setSelectedDoc(null);
    setDocHistory([]);
  };

  const handleActionComplete = async () => {
    if (!selectedDoc || !activeTenantId) return;
    setHistoryLoading(true);
    const history = await getDocumentHistory(activeTenantId, selectedDoc.id);
    setDocHistory(history);
    setHistoryLoading(false);
  };

  // Online/offline detection + auto-sync on reconnect
  useEffect(() => {
    if (!user || !activeTenantId) return;
    return createOnlineListener(
      async () => {
        setOnline(true);
        const { synced } = await syncPendingDrafts(activeTenantId, user.uid, user.email ?? '');
        if (synced > 0) setPendingSyncCount(0);
      },
      () => setOnline(false)
    );
  }, [user, activeTenantId]);

  if (!user || !activeTenantId) return null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            {(view === 'detail' || view === 'submit') && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest mb-4 transition-colors"
              >
                <ArrowLeft size={14} />
                {prevTopView === 'archive' ? 'Powrót do archiwum' : prevTopView === 'dashboard' ? 'Powrót do dashboard' : 'Powrót do skrzynki'}
              </button>
            )}
            <div className="flex items-center gap-2 mb-4 bg-slate-800/50 w-fit px-4 py-1.5 rounded-full border border-slate-700/50">
              <GitBranch className="text-violet-400" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-200">
                Document Workflow Engine
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">
              Obieg <span className="text-violet-500">&</span> Zatwierdzenia
            </h1>
            <p className="text-slate-400 font-medium max-w-xl text-sm italic leading-relaxed">
              E2E cykl życia dokumentu — od skanowania do archiwizacji WORM.
              Historia niezmienialana, zgodna z GoBD / GDPR.
            </p>
          </div>

          <div className="flex gap-3 items-end">
            <IdesGenerateButton moduleKey="workflow" />
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-colors border border-slate-700"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 top-16 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-900 uppercase">Powiadomienia</span>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead(activeTenantId, user.uid)}
                          className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                        >
                          Zaznacz wszystkie
                        </button>
                      )}
                      <button onClick={() => setShowNotifPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                        <X size={14} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-slate-300 text-xs font-bold uppercase">
                        Brak powiadomień
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            markAsRead(activeTenantId, n.id);
                            setShowNotifPanel(false);
                          }}
                          className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}
                        >
                          <p className="text-xs font-bold text-slate-800 mb-0.5">{n.message}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{n.documentTitle}</p>
                          {!n.read && <span className="inline-block mt-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t border-slate-100">
                    <button
                      onClick={() => { setShowNotifPrefs(true); setShowNotifPanel(false); }}
                      className="w-full text-[9px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest flex items-center justify-center gap-1"
                    >
                      <Settings size={10} /> Konfiguruj powiadomienia
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setView(view === 'admin' ? 'inbox' : 'admin')}
              className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-colors border border-slate-700"
            >
              <Settings size={20} />
            </button>

            {(view === 'inbox' || view === 'archive' || view === 'dashboard') && (
              <button
                onClick={() => { setPrevTopView(view as TopView); setView('submit'); }}
                className="bg-white text-slate-900 hover:bg-violet-50 font-black px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl transition-all uppercase tracking-widest text-xs"
              >
                <Plus size={18} /> Nowy dokument
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compliance badge + offline status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            GoBD · GoBS · GDPR · KSeF · WORM · Offline-Ready
          </span>
        </div>
        {!online && (
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl animate-in fade-in">
            <WifiOff size={13} className="text-amber-600" />
            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
              Tryb offline — dokumenty zapisywane lokalnie
            </span>
          </div>
        )}
      </div>

      {/* Top navigation tabs */}
      {(view === 'inbox' || view === 'archive' || view === 'dashboard') && (
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
          {([
            { id: 'inbox', label: 'Skrzynka' },
            { id: 'archive', label: 'Archiwum' },
            { id: 'dashboard', label: 'Dashboard KPI' },
          ] as { id: TopView; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 min-h-[500px]">
        {view === 'inbox' && (
          <WorkflowInbox
            tenantId={activeTenantId}
            userId={user.uid}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {view === 'submit' && (
          <SubmitDocumentFlow
            onComplete={() => setView(prevTopView)}
            onCancel={() => setView(prevTopView)}
          />
        )}

        {view === 'detail' && selectedDoc && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <ApprovalPanel
                document={selectedDoc}
                actorId={user.uid}
                actorEmail={user.email ?? ''}
                onActionComplete={handleActionComplete}
                onRecall={handleBack}
              />

              {/* KSeF verification status */}
              <KsefStatusPanel document={selectedDoc} docHistory={docHistory} />

              {/* Attachment preview + AI analysis */}
              {selectedDoc.attachments.length > 0 && (
                <>
                  <AttachmentPreview attachment={selectedDoc.attachments[0]} />
                  <DocumentAiPanel
                    tenantId={activeTenantId}
                    documentInstanceId={selectedDoc.id}
                    attachmentId={selectedDoc.attachments[0].id}
                    attachmentUrl={selectedDoc.attachments[0].storageRef}
                  />
                </>
              )}

              {/* Damage claim + vehicle incident panel — identical insurance flow */}
              {(selectedDoc.type === 'DAMAGE_CLAIM' || selectedDoc.type === 'VEHICLE_INCIDENT') && (
                <DamageClaimPanel
                  document={selectedDoc}
                  actorId={user.uid}
                  actorEmail={user.email ?? ''}
                  onActionComplete={handleActionComplete}
                />
              )}

              {/* BHP dispatch panel — all BHP_INCIDENT stages */}
              {selectedDoc.type === 'BHP_INCIDENT' && (
                <BhpDispatchPanel
                  document={selectedDoc}
                  actorId={user.uid}
                  actorEmail={user.email ?? ''}
                  onActionComplete={handleActionComplete}
                />
              )}

              {/* NCR quality panel */}
              {selectedDoc.type === 'QUALITY_NCR' && (
                <QualityNcrPanel
                  document={selectedDoc}
                  actorId={user.uid}
                  actorEmail={user.email ?? ''}
                  onActionComplete={handleActionComplete}
                />
              )}

              {/* Expense advance panel */}
              {selectedDoc.type === 'EXPENSE_ADVANCE' && (
                <ExpenseAdvancePanel
                  document={selectedDoc}
                  actorId={user.uid}
                  actorEmail={user.email ?? ''}
                  onActionComplete={handleActionComplete}
                />
              )}

              {/* Settlement panel — show when pending/settled */}
              {(selectedDoc.status === 'PENDING_SETTLEMENT' || selectedDoc.status === 'SETTLED') && (
                <SettlementPanel
                  tenantId={activeTenantId}
                  document={selectedDoc}
                  actorId={user.uid}
                />
              )}
            </div>

            <div className="lg:w-96 space-y-6">
              <div className="bg-slate-50 rounded-[2rem] p-6">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-6 flex items-center gap-2">
                  <GitBranch size={16} className="text-violet-500" />
                  Historia obiegu
                </h3>
                {historyLoading ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw className="animate-spin text-slate-300" size={20} />
                  </div>
                ) : (
                  <DocumentTimeline
                    records={docHistory}
                    tenantId={activeTenantId}
                    documentId={selectedDoc.id}
                    actorId={user.uid}
                    actorEmail={user.email ?? ''}
                    comments={docComments}
                  />
                )}
              </div>

              {/* Voice notes & AI comments */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-6">
                <VoiceNoteRecorder
                  tenantId={activeTenantId}
                  documentInstanceId={selectedDoc.id}
                  documentTitle={selectedDoc.metadata.title}
                  authorId={user.uid}
                  authorEmail={user.email ?? ''}
                />
              </div>
            </div>
          </div>
        )}

        {view === 'archive' && (
          <DocumentArchive
            tenantId={activeTenantId}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {view === 'dashboard' && (
          <WorkflowDashboard
            tenantId={activeTenantId}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {view === 'admin' && (
          <div className="space-y-8">
            <WorkflowTemplateEditor />
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-6 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                SLA Monitor — Eskalacje
              </h3>
              <SlaAdminPanel />
            </div>
          </div>
        )}
      </div>

      {showNotifPrefs && (
        <NotificationPrefsModal
          userId={user.uid}
          tenantId={activeTenantId}
          onClose={() => setShowNotifPrefs(false)}
        />
      )}
    </div>
  );
}
