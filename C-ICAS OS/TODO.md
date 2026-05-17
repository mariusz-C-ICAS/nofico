# Project TODOs

## Aktywne

### Infrastructure Layer — B5 (pozostałe)
- [ ] **B5** — FCM topic subscriptions + grupowe powiadomienia push

### Workflow / DMS
- [ ] **2026-05-15 `firebase deploy --only firestore:indexes`** — wdrożyć `firestore.indexes.json` na projekt Firebase (`documentInstances`, `workflowSteps`, `notifications`). Bez tego zapytania workflow zwrócą błąd Firestore "requires an index". BLOCKED: SSL error w środowisku — uruchomić ręcznie: `! npx firebase-tools deploy --only firestore:indexes`
- [ ] **Więcej typów dokumentów** — VENDOR_INVOICE, CONTRACT, TIMESHEET flows z dedykowanymi szablonami.

### Inne
- [ ] **Skróty klawiszowe (Web)**: Przypisać globalne skróty klawiszowe do poszczególnych akcji systemowych. Rozważyć ergonomię dla wersji webowej.
- [ ] **Konfiguracja Sentry (Error Tracking)**: Gdy projekt będzie gotowy do produkcji, dodaj `VITE_SENTRY_DSN` do sekretów i odkomentuj kod w `src/main.tsx` oraz `src/app/App.tsx`.
- [ ] **Performance Monitoring**: Zweryfikować działanie Firebase Performance Monitoring w środowisku produkcyjnym.
- [ ] **Płace & KSeF**: Dokończyć integrację z bramką płatności w module `PaymentsModule`.

## Zrealizowane

- [x] **2026-05-17** Firestore finał — AiGuardianModule (rename AI_ANALYSIS_ZONES), HrService (pełny Firestore: employees/orgUnits/payrollRecords), MultimailSettings (tenant name z Firestore) `ea03683`
- [x] **2026-05-17** Firestore P3 — ostatnia 5-ka: SettingsModule (usunięto dead-code UzytkownicySection), SwipeMatchModule (bankTransactions), Iso20022Import (importHistory + persist), ExportDistribution (exportHistory), KsefOffline24 (ksefOfflineQueue + ksefHistory) `bd29e33`
- [x] **2026-05-17** Firestore P2 — 6 plików compliance: ConsentManager, DataSubjectRequests, DpiaManager, RiskRegister, SecurityPolicies, LegalVaultModule — pełna integracja Firestore, usunięto wszystkie MOCK_ `ba60d03`
- [x] **2026-05-17** Firestore P0–P3 batch — zastąpiono mock data Firestore w kolejnych modułach finance/HR/compliance (faza M-phase: 8 modułów) `8326f44`
- [x] **2026-05-16** Infrastructure E — Tink/Nordigen client, notification-service, ErrorBoundary (Firebase Analytics)
- [x] **2026-05-16** Infrastructure F — healthCheck Cloud Function (/health), ErrorBoundary
- [x] **2026-05-16** Infrastructure D — VIES/BL/GUS Cloud Functions proxy, PayU REST client
- [x] **2026-05-16** Infrastructure C — Gemini streaming, Document AI, STT Chirp2, Cloud DLP, BigQuery export
- [x] **2026-05-16** Infrastructure B — middleware withAuth/withAudit, Remote Config, Dexie offline queue, geolocation
- [x] **2026-05-16** Infrastructure A0 — usunięto @sentry/react, leaflet, react-leaflet, resend; audit:google-first skrypt + husky hook
- [x] **2026-05-16** Infrastructure A1 — secrets-vault: AES-256-GCM envelope encryption (Web Crypto API + PBKDF2)
- [x] **2026-05-16** Infrastructure A2 — event-bus: TypedEventBus (EventTarget + AppEventMap generics)
- [x] **2026-05-16** Infrastructure A3 — validators: NIP/PESEL/REGON/IBAN/KRS + VIES/BL/GUS API stubs
- [x] **2026-05-16** Infrastructure A4 — AuditLogViewer: paginowana tabela w /admin/audit

- [x] **2026-05-16** Payroll Online — PayslipGenerator + PayslipDocument (ZUS/PIT, PDF print, e-mail via Firebase Trigger Email)
- [x] **2026-05-16** HR Analytics — ChurnPredictor (5-czynnikowy scoring, Gemini AI rekomendacje retencyjne, heatmapa działów)
- [x] **2026-05-16** KSeF — weryfikacja: moduł już istniał (`/src/modules/finance/ksef/`)
- [x] **2026-05-16** Public API (D) — API Key management (SHA-256, zakresy, expiry), Webhooki wychodzące (HMAC secret), dokumentacja REST z parametrami + przykładami, logi wywołań. Global Admin panel (`/admin/api`) + tenant self-service (`Ustawienia → API & Webhooki`)
- [x] **2026-05-16** KSeF Token UI — dedykowany modal konfiguracji w IntegrationsAdmin: env toggle (test/prod), NIP, token, simulation mode, ostrzeżenie prod. Zapis do `tenants/{id}/integrations/ksef`.
- [x] **2026-05-16** Push Notifications (FCM) — `public/firebase-messaging-sw.js` (background handler + notificationclick), `fcmService.ts` (requestPushPermission, onForegroundMessage), banner FCM w Ustawieniach → Powiadomienia.
- [x] **2026-05-16** ShopModule `/shop` — produkty CRUD (`shop_products`), zamówienia (`shop_orders`) z przejściami statusu, statystyki, platform selector (Allegro/Shopify/Amazon/WooCommerce).
- [x] **2026-05-16** Settlement Tracker — zakładka "Rozliczenia" w ExpensesModule: grupowanie zatwierdzonych wydatków per pracownik, przycisk "Wypłać", badge z liczbą oczekujących rozliczeń.
- [x] **2026-05-16** Firestore rules — naprawiono luki Dirty Dozen: `/payments` było otwarte dla wszystkich zalogowanych, `/users` list ograniczono do admin-only; dodano reguły dla api_keys, webhooks, api_logs, shop_products, shop_orders, reimbursements, fcmTokens.
- [x] **2026-05-16** CalSyncPro integration — dodano providera w IntegrationService + dedykowany modal konfiguracji (CSP API URL, API Key, toggles: MS Exchange / Google Calendar / Kanban sync). Zapis do `tenants/{id}/integrations/calsyncpro`.
- [x] **2026-05-16** UC#16 Leads to Cash — widok orchestracji 6-etapowej ścieżki klienta: Lead → Oferta → Kontrakt → Realizacja → Faktura → Wpłata. Live Firestore counts, conversion rate bars, recent deals table. Route `/leads-to-cash`, link w sidebar.
- [x] Konfiguracja Vitest + Testing Library
- [x] Struktura modułowa aplikacji
- [x] Layout Dashboardu (Lejek Operacyjny)
- [x] **2026-05-12** CommandMenu (Ctrl+K) z nawigacją i szybkimi akcjami
- [x] **2026-05-12** AI Guardian Module (4-state upload, Firebase save)
- [x] **2026-05-12** Swipe & Match Module (3D card stack, drag+keyboard)
- [x] **2026-05-12** Expenses Module (4 tabs, voice recording, optimistic updates)
- [x] **2026-05-12** KSeF Offline24 (tryb offline z E2E encryption)
- [x] **2026-05-12** ISO 20022 Import (drag-drop, XML camt.053 parser)
- [x] **2026-05-12** Legal Vault KSH (Art.210, ContractGenerator)
- [x] **2026-05-12** Multi-Email OAuth2 Settings
- [x] **2026-05-12** Export & Distribution Module (6 formatów, 4 kanały)
- [x] **2026-05-12** i18n PL/EN/DE (I18nProvider, LangSwitcher)
- [x] **2026-05-14** OrgStructureModule — pełna hierarchia org z Firestore (onSnapshot), drag&drop, licencje PRO/ENTERPRISE
- [x] **2026-05-15** PayrollModule — aktualizacja do wersji z c-icas-os-newcopy (170KB, pełna kartoteka pracownika HR0001-ZHR001, ZUS KEDU XML, PIT-11 XML, AI compliance check)
- [x] **2026-05-15** HrModule — uproszczenie do 2 zakładek: "Kadry i Płace" + "Struktura Organizacyjna"
