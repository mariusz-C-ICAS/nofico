# Moduł Workflow — Obieg Dokumentów (C-ICAS OS)

**Wersja:** 1.0.0  
**Data:** 2026-05-15  
**Status:** Production-ready MVP (flow Out-of-Pocket)

---

## Spis treści

1. [Architektura ogólna](#architektura)
2. [Struktura plików](#struktura)
3. [Maszyna stanów](#maszyna-stanów)
4. [Firestore — schemat kolekcji](#firestore)
5. [Serwisy](#serwisy)
6. [Komponenty UI](#komponenty)
7. [Reguły bezpieczeństwa Firestore](#security-rules)
8. [Integracja KSeF](#ksef)
9. [Offline & synchronizacja](#offline)
10. [Powiadomienia](#powiadomienia)
11. [Rejestracja modułu](#rejestracja)
12. [Zgodność regulacyjna](#compliance)
13. [Kolejne kroki](#kolejne-kroki)

---

## Architektura ogólna {#architektura}

Moduł `src/modules/workflow/` implementuje kompletny E2E obieg dokumentów — od momentu zgłoszenia dokumentu przez pracownika, przez wieloetapowe zatwierdzenia, weryfikację KSeF, zaksięgowanie, rozliczenie, aż po archiwizację WORM.

```
SubmitExpenseWizard
      │  (draft/submit)
      ▼
WorkflowEngine (state machine)
      │  DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED
      │                                          │
      │                              KsefVerificationService (async)
      │                                          │
      │                              KSEF_VERIFIED → BOOKED
      │                                          │
      │                              PENDING_SETTLEMENT → SETTLED → ARCHIVED
      │
WorkflowInbox (onSnapshot real-time)
ApprovalPanel (approve/reject/request_changes)
DocumentTimeline (immutable audit trail, GoBD)
```

**Stos technologiczny:**
- React 19 + TypeScript
- Firebase Firestore 12 (real-time, multi-tenant)
- Dexie 4 (IndexedDB, offline drafts)
- Tailwind CSS 4
- lucide-react (ikony)
- date-fns (formatowanie dat)

---

## Struktura plików {#struktura}

```
src/modules/workflow/
├── types.ts                          # Domenowe typy TypeScript
├── WorkflowModule.tsx                # Główny kontener modułu
├── services/
│   ├── workflowEngine.ts             # State machine + Firestore CRUD
│   ├── notificationService.ts        # 3-kanałowe powiadomienia
│   ├── roleResolutionService.ts      # Rozwiązywanie ról → userId
│   ├── ksefVerificationService.ts    # Integracja KSeF API
│   └── offlineDraftStorage.ts        # Dexie offline storage + sync
├── components/
│   ├── WorkflowInbox.tsx             # Skrzynka (Pending/Moje/Wszystkie)
│   ├── ApprovalPanel.tsx             # Panel zatwierdzeń
│   ├── DocumentTimeline.tsx          # Audit trail (GoBD)
│   ├── SubmitExpenseWizard.tsx       # Wizard zgłoszenia wydatku
│   └── NotificationPrefsModal.tsx    # Konfiguracja powiadomień
└── admin/
    └── WorkflowTemplateEditor.tsx    # Edytor szablonów kroków
```

---

## Maszyna stanów {#maszyna-stanów}

### Stany dokumentu (`DocumentStatus`)

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → KSEF_VERIFIED → BOOKED → PENDING_SETTLEMENT → SETTLED → ARCHIVED
                                     ↘ REJECTED ↗ DRAFT
```

| Status | Opis |
|--------|------|
| `DRAFT` | Dokument w trakcie tworzenia / wersja robocza |
| `SUBMITTED` | Zgłoszony — czeka na przypisanie do approvals |
| `PENDING_APPROVAL` | W kolejce do zatwierdzenia przez approver(ów) |
| `APPROVED` | Zatwierdzony — trigger KSeF auto-weryfikacji |
| `REJECTED` | Odrzucony — wraca do DRAFT lub idzie do ARCHIVED |
| `KSEF_VERIFIED` | Faktura zweryfikowana w KSeF |
| `BOOKED` | Zaksięgowany w systemie finansowym |
| `PENDING_SETTLEMENT` | Oczekuje na fizyczny przelew/rozliczenie |
| `SETTLED` | Rozliczony — środki przekazane |
| `ARCHIVED` | Zarchiwizowany WORM — brak możliwości edycji |

### Dozwolone przejścia (`VALID_TRANSITIONS`)

```typescript
DRAFT: ['SUBMITTED', 'ARCHIVED'],
SUBMITTED: ['PENDING_APPROVAL', 'REJECTED', 'DRAFT'],
PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'SUBMITTED'],
APPROVED: ['KSEF_VERIFIED', 'BOOKED'],
REJECTED: ['DRAFT', 'ARCHIVED'],
KSEF_VERIFIED: ['BOOKED'],
BOOKED: ['PENDING_SETTLEMENT'],
PENDING_SETTLEMENT: ['SETTLED'],
SETTLED: ['ARCHIVED'],
```

### Akcje (`StepAction`)

`CREATE | SUBMIT | APPROVE | REJECT | REQUEST_CHANGES | VERIFY | BOOK | SETTLE | ARCHIVE | RESUBMIT | CANCEL`

---

## Firestore — schemat kolekcji {#firestore}

### `tenants/{tenantId}/documentInstances/{docId}`

Żywy dokument — aktualizowany przy każdym przejściu stanu.

```typescript
interface DocumentInstance {
  id: string;
  tenantId: string;
  type: DocumentType;           // 'OUT_OF_POCKET' | 'VENDOR_INVOICE' | ...
  templateId: string;
  status: DocumentStatus;
  currentStepId: string;
  submittedBy: string;          // userId — IMMUTABLE
  submittedByEmail: string;
  assignedTo: string[];         // userIds aktualnych approverów
  metadata: DocumentMetadata;   // title, amount, currency, description, ...
  attachments: DocumentAttachment[];
  createdAt: Timestamp;         // IMMUTABLE
  updatedAt: Timestamp;
}
```

### `tenants/{tenantId}/workflowSteps/{stepId}` ⚠️ IMMUTABLE

Append-only rejestr kroków — **nigdy `updateDoc` ani `deleteDoc`** (GoBD/GoBS).

```typescript
interface WorkflowStepRecord {
  id: string;
  documentInstanceId: string;
  tenantId: string;
  stepDefId: string;
  stepType: 'APPROVAL' | 'NOTIFICATION' | 'VERIFICATION' | 'BOOKING' | 'SETTLEMENT' | 'ARCHIVE' | 'NOTIFY';
  action: StepAction;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  previousStatus: DocumentStatus;
  newStatus: DocumentStatus;
  note?: string;
  timestamp: Timestamp;
  deviceInfo?: string;          // navigator.userAgent
  isOffline?: boolean;
  syncedAt?: Timestamp;
}
```

### `tenants/{tenantId}/workflowTemplates/{templateId}`

Szablony flow per typ dokumentu.

```typescript
interface WorkflowTemplate {
  id: string;
  tenantId: string;
  documentType: DocumentType;
  name: string;
  steps: WorkflowStepDefinition[];  // { id, name, requiredRoles, autoAdvance? }
  isDefault: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `tenants/{tenantId}/notifications/{notifId}`

In-app powiadomienia.

```typescript
interface WorkflowNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  message: string;
  documentId: string;
  documentTitle: string;
  actorEmail: string;
  read: boolean;
  createdAt: Timestamp;
}
```

### `tenants/{tenantId}/memberRoles/{roleId}`

Denormalizowany indeks ról → userIds (dla wydajnych zapytań do `assignedTo`).

```typescript
interface RoleIndex {
  userIds: string[];
  updatedAt: Timestamp;
}
```

### `users/{uid}/notificationPrefs/{tenantId}`

Preferencje powiadomień per user per tenant.

```typescript
interface NotificationPrefs {
  preferences: Record<NotificationType, { inApp: boolean; push: boolean }>;
  // auditLog jest zawsze włączony — nie podlega konfiguracji
}
```

### Wymagane indeksy Firestore (do utworzenia w konsoli)

```
Collection                               Fields
─────────────────────────────────────────────────────────────────────
tenants/*/documentInstances              assignedTo ASC, status ASC
tenants/*/documentInstances              submittedBy ASC, createdAt DESC
tenants/*/workflowSteps                  documentInstanceId ASC, timestamp ASC
tenants/*/notifications                  recipientId ASC, createdAt DESC
```

---

## Serwisy {#serwisy}

### `workflowEngine.ts`

Główny silnik workflow. Eksportowane funkcje:

| Funkcja | Opis |
|---------|------|
| `canTransition(from, to)` | Sprawdza poprawność przejścia stanów |
| `createDocumentInstance(...)` | Tworzy instancję + pierwszy krok SYSTEM_CREATE |
| `transitionDocument(...)` | Zmienia status + appendStepRecord + auditLog + trigger KSeF |
| `getDocumentInstance(tenantId, docId)` | Pobiera instancję |
| `getDocumentHistory(tenantId, docId)` | Historia kroków (ordered by timestamp) |
| `getPendingForUser(tenantId, userId)` | Dokumenty pending dla usera |
| `getMySubmissions(tenantId, userId)` | Dokumenty zgłoszone przez usera |
| `getDefaultTemplate(tenantId, type)` | Domyślny template per typ |
| `listTemplates(tenantId)` | Wszystkie templates tenanta |
| `saveTemplate(tenantId, userId, template)` | Zapisuje template |

### `notificationService.ts`

| Funkcja | Opis |
|---------|------|
| `dispatchNotification(tenantId, recipientId, type, docId, ...)` | Wysyła notifikację przez wszystkie skonfigurowane kanały |
| `markAsRead(tenantId, notifId)` | Oznacza jako przeczytane |
| `markAllAsRead(tenantId, userId)` | Oznacza wszystkie jako przeczytane (batch) |
| `getUserNotificationPrefs(userId, tenantId)` | Pobiera preferencje |
| `saveNotificationPrefs(userId, tenantId, prefs)` | Zapisuje preferencje |

Kanały powiadomień:
- **auditLog** — zawsze zapisywany (niewyłączalny, GoBD)
- **inApp** — Firestore `notifications` → real-time w UI
- **push** — Firebase Cloud Messaging (jeśli prefs włączone)

### `roleResolutionService.ts`

| Funkcja | Opis |
|---------|------|
| `resolveAssignees(tenantId, roles)` | Rozwiązuje role na listę userIds |
| `getUsersByRoles(tenantId, roles)` | Pobiera userIds z indeksu ról |
| `addUserToRole(tenantId, roleId, userId)` | Dodaje usera do roli |
| `removeUserFromRole(tenantId, roleId, userId)` | Usuwa usera z roli |
| `seedRoleIndexFromMembership(tenantId)` | Odbudowuje indeks z `tenantMemberships` |

**Ważne:** `seedRoleIndexFromMembership()` należy wywołać w invite flow przy dodawaniu nowego członka tenanta.

### `ksefVerificationService.ts`

| Funkcja | Opis |
|---------|------|
| `runKsefWorkflowStep(tenantId, docInstance, actorId, actorEmail)` | Auto-trigger po APPROVED |
| `verifyInvoiceWithKsef(ksefNumber, token, apiUrl)` | HTTP call do KSeF API |
| `getKsefConfig(tenantId)` | Pobiera konfigurację KSeF z Firestore |

Konfiguracja KSeF w Firestore: `tenants/{tenantId}/integrations/ksef`
```typescript
{ apiUrl: string; token: string; enabled: boolean; simulationMode: boolean }
```

Gdy brak tokenu lub `simulationMode=true` → auto-pass (symulacja pozytywnej weryfikacji).  
Typ dokumentu inny niż `VENDOR_INVOICE` i brak `ksefNumber` → auto-skip (przejście bezpośrednio do KSEF_VERIFIED).

### `offlineDraftStorage.ts`

| Funkcja | Opis |
|---------|------|
| `saveDraftOffline(draft)` | Zapisuje szkic w IndexedDB (Dexie) |
| `updateDraftOffline(localId, changes)` | Aktualizuje szkic |
| `getPendingDrafts(tenantId, userId)` | Pobiera niezasynchronizowane szkice |
| `getAllDrafts(tenantId, userId)` | Wszystkie szkice usera |
| `deleteDraft(localId)` | Usuwa szkic |
| `syncPendingDrafts(tenantId, userId, userEmail)` | Synchronizuje pending → Firestore |
| `createOnlineListener(onOnline, onOffline)` | Listener online/offline events |
| `isOnline()` | `navigator.onLine` |

Schema Dexie: `WorkflowOfflineDB` v1, tabela `drafts` z indeksami `tenantId, userId, syncStatus, createdAt`.

---

## Komponenty UI {#komponenty}

### `WorkflowModule.tsx`

Główny kontener. Zarządza:
- Routingiem widoków (inbox/submit/detail/admin)
- Real-time subskrypcją powiadomień (`onSnapshot`)
- Panelem dzwonka z listą powiadomień
- Offline/online detection + auto-sync przy reconnect
- Odznaką GoBD/GoBS/GDPR/KSeF/WORM/Offline-Ready

### `WorkflowInbox.tsx`

Skrzynka dokumentów. Funkcje:
- 3 zakładki: **Pending** (wymaga akcji, z licznikiem), **Moje** (zgłoszone przeze mnie), **Wszystkie**
- Real-time `onSnapshot` — natychmiastowe aktualizacje
- `DocumentRow` z badge statusu, datą, kwotą, "Twoja akcja" indicator
- Klik na dokument → `onSelectDocument` → widok `detail`

### `ApprovalPanel.tsx`

Panel akcji dla approverów. Obsługuje:
- **Zatwierdź** — `APPROVE` → PENDING_APPROVAL → APPROVED
- **Odrzuć** — `REJECT` → PENDING_APPROVAL → REJECTED (wymaga notatki)
- **Poproś o zmiany** — `REQUEST_CHANGES` (wymaga notatki)
- Po akcji: `dispatchNotification()` do submitter + `onActionComplete()` callback

### `DocumentTimeline.tsx`

Immutable audit trail (GoBD-compliant). Każdy krok wyświetla:
- Ikona + kolor per akcja (ACTION_CONFIG map)
- Aktor (email + rola)
- Data i czas (date-fns `dd MMM yyyy HH:mm`)
- Nota (jeśli dostępna)
- Device info (skrócony user agent)
- Badge "GoBD — niezmienialny" na ostatnim wpisie

### `SubmitExpenseWizard.tsx`

3-etapowy wizard zgłaszania wydatku Out-of-Pocket:
1. **Szczegóły** — tytuł, kwota, waluta, opis, data
2. **Załącznik** — upload pliku (URL)
3. **Podgląd** — review przed wysłaniem

Offline support:
- Gdy `!navigator.onLine` → `saveDraftOffline()` zamiast Firestore
- Żółty banner informacyjny w offline mode
- Przycisk "Zapisz szkic (offline)" zamiast "Wyślij"

### `NotificationPrefsModal.tsx`

Modal konfiguracji powiadomień. Siatka:
- Wiersze: typy zdarzeń (DOCUMENT_SUBMITTED, APPROVED, REJECTED, ...)
- Kolumny: In-App | Push
- auditLog — toggle zawsze disabled (wymagany przez GoBD)
- Zapisuje via `saveNotificationPrefs()`

### `WorkflowTemplateEditor.tsx` (admin)

Edytor szablonów workflow. Funkcje:
- Wybór typu dokumentu
- Definiowanie kroków (stepId, nazwa, requiredRoles, autoAdvance)
- Domyślny szablon Out-of-Pocket z 5 krokami
- Zapis via `saveTemplate()`
- Dostępny tylko dla adminów tenanta

---

## Reguły bezpieczeństwa Firestore {#security-rules}

Plik: `firestore.rules`

### Kluczowe zasady

```javascript
// workflowSteps — append-only (GoBD)
match /workflowSteps/{stepId} {
  allow read: if isTenantMember(tenantId);
  allow create: if isTenantMember(tenantId) && isValidWorkflowStep(request.resource.data);
  allow update: if false;   // NEVER — GoBD immutability
  allow delete: if false;   // NEVER — GoBD immutability
}

// documentInstances — immutable core fields on update
match /documentInstances/{docId} {
  allow read: if isTenantMember(tenantId);
  allow create: if isTenantMember(tenantId) && isValidDocumentInstance(request.resource.data);
  allow update: if isDocumentActor(resource.data) && isValidDocumentInstanceUpdate(request.resource.data, resource.data);
  allow delete: if false;
}
```

### Funkcje walidacji

| Funkcja | Co sprawdza |
|---------|-------------|
| `isValidDocumentInstance(data)` | Wymagane pola, typ, status = DRAFT |
| `isValidDocumentInstanceUpdate(new, old)` | Immutability: tenantId, submittedBy, type, createdAt niezmienne |
| `isValidWorkflowStep(data)` | Wymagane pola step record |
| `isValidWorkflowTemplate(data)` | Wymagane pola template |
| `isValidWorkflowNotification(data)` | Wymagane pola notif |
| `isDocumentActor(data)` | Czy user jest assignedTo lub submittedBy |

---

## Integracja KSeF {#ksef}

KSeF (Krajowy System e-Faktur) — polskie API e-faktur.

### Auto-trigger

Po każdym przejściu do statusu `APPROVED` w `workflowEngine.ts`:
```typescript
if (targetStatus === 'APPROVED') {
  const { runKsefWorkflowStep } = await import('./ksefVerificationService');
  runKsefWorkflowStep(tenantId, updatedInstance, actorId, actorEmail)
    .catch(err => console.warn('KSeF auto-verify failed (non-blocking):', err));
}
```
KSeF działa asynchronicznie — błąd nie blokuje zatwierdzenia dokumentu.

### Logika weryfikacji

```
ksefNumber brak AND type != VENDOR_INVOICE → auto-skip → KSEF_VERIFIED
ksefNumber brak AND type == VENDOR_INVOICE → skip z notatką
ksefNumber obecny:
  token brak lub simulationMode → auto-pass (symulacja)
  token obecny → HTTP call do KSeF API → jeśli valid → KSEF_VERIFIED
```

### Konfiguracja KSeF UI

Do zaimplementowania w przyszłości: panel w `admin/IntegrationsSettings` z polami:
- API URL (default: `https://ksef.mf.gov.pl/api`)
- Token autoryzacyjny
- Simulation mode toggle

---

## Offline & synchronizacja {#offline}

### Architektura offline-first

```
User action → isOnline()?
  YES → createDocumentInstance() → Firestore
  NO  → saveDraftOffline() → IndexedDB (Dexie)

window 'online' event → syncPendingDrafts() → createDocumentInstance() + transitionDocument(SUBMIT)
```

### Schemat Dexie `WorkflowOfflineDB`

```
drafts table:
  ++localId (PK)
  tenantId, userId          (compound index)
  syncStatus                (pending|syncing|synced|error)
  createdAt                 (timestamp ms)
  firestoreId               (set after sync)
  syncError                 (last error message)
```

### Synchronizacja

`syncPendingDrafts()` iteruje `syncStatus='pending'` drafts:
1. Ustawia `syncStatus='syncing'`
2. `createDocumentInstance()` → Firestore
3. `transitionDocument(SUBMIT)` → PENDING_APPROVAL
4. Ustawia `syncStatus='synced'` + `firestoreId`
5. W razie błędu: `syncStatus='error'` + `syncError`

Zwraca `{ synced: number, failed: number }`.

---

## Powiadomienia {#powiadomienia}

### Typy zdarzeń (`NotificationType`)

```typescript
'DOCUMENT_SUBMITTED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_REJECTED' |
'DOCUMENT_CHANGES_REQUESTED' | 'DOCUMENT_KSEF_VERIFIED' |
'DOCUMENT_BOOKED' | 'DOCUMENT_SETTLED' | 'DOCUMENT_ARCHIVED'
```

### Kanały

| Kanał | Zachowanie | Wyłączalny |
|-------|-----------|------------|
| `auditLog` | Zawsze zapisywany do Firestore audit log | NIE (GoBD) |
| `inApp` | Dokument w `notifications` → real-time w UI | TAK |
| `push` | Firebase Cloud Messaging | TAK |

### Real-time w UI

`WorkflowModule` subskrybuje `onSnapshot` na `notifications` filtrując `recipientId == user.uid`.
Limit: 20 ostatnich, sortowane od najnowszych.
Badge na dzwonku: count nieprzeczytanych (max "9+").

---

## Rejestracja modułu {#rejestracja}

### `src/core/modules/ModuleRegistry.ts`

```typescript
{
  id: 'workflow',
  name: 'Obieg Dokumentów',
  category: 'system',
  iconName: 'GitBranch',
  path: '/workflow',
  description: 'E2E obieg dokumentów z GoBD/GDPR compliance, offline support i integracją KSeF.',
  defaultActive: true,
}
```

### `src/app/App.tsx`

```typescript
const WorkflowModule = lazy(() => import('../modules/workflow/WorkflowModule'));
// Route:
<Route path="/workflow" element={<Lazy component={WorkflowModule} />} />
```

---

## Zgodność regulacyjna {#compliance}

| Standard | Implementacja |
|----------|--------------|
| **GoBD** (DE) | workflowSteps append-only; Firestore rules `update/delete: false`; pełna historia z timestamp + deviceInfo |
| **GoBS** (DE) | Niezmienialność danych księgowych; WORM archiwizacja |
| **GDPR/RODO** | Data minimization; użytkownik ma dostęp tylko do swoich danych; notificationPrefs pod `/users/{uid}` |
| **KSeF** (PL) | Auto-weryfikacja faktur po zatwierdzeniu; obsługa numeru KSeF |
| **Offline** | Dexie IndexedDB; auto-sync; tryb offline z informacją wizualną |
| **Audit trail** | Każda zmiana statusu = nowy niezmieniany dokument w workflowSteps |

---

## Kolejne kroki {#kolejne-kroki}

### Wysoki priorytet

1. **Indeksy Firestore** — utworzyć w Firebase Console (patrz sekcja [Wymagane indeksy](#firestore))
2. **seedRoleIndexFromMembership()** — wywołać w invite flow (`src/modules/members/`)
3. **KSeF Token UI** — panel konfiguracji w admin integrations

### Średni priorytet

4. **Push notifications** — Firebase Cloud Messaging setup (FCM token storage + service worker)
5. **Więcej typów dokumentów** — VENDOR_INVOICE, CONTRACT, TIMESHEET flows
6. **Bulk approval** — zatwierdzanie wielu dokumentów jednocześnie
7. **Limity uprawnień** — approval tylko do określonej kwoty

### Niski priorytet

8. **Export PDF** — historia dokumentu jako PDF (GoBD archiwum)
9. **E-mail notifikacje** — kanał emailowy w `notificationService`
10. **Mobile PWA** — dedykowane widoki dla approvala na mobile
