# Changelog — NoFiCo / C-ICAS OS

---

## [Sprint FI-03] — 2026-05-16

### FI-ITEM-1 — KSeF MF OAuth2, GUS BIR, Biała Lista, Workflow Engine

#### Nowe pliki

| Plik | Opis |
|------|------|
| `src/modules/finance/services/ksefService.ts` | KSeF API v2.0 (fetch, bez axios): `initKsefSession` (OAuth2 Bearer + TTL 55min Firestore), `sendInvoicesToKsef` (FA(2) XML base64 + batch z Session-Token), `buildFA2Xml` (pełny schemat FA(2) v1-0E z escXml), `getUPO` (polling z KsefUPOPendingError), `fetchReceivedInvoices` (sync → Firestore), `terminateSession`, `getKsefStatus`. Custom errors: `KsefAuthError`, `KsefUPOPendingError`, `KsefApiError`. |
| `src/modules/finance/ksef/KsefAuthModal.tsx` | Modal autoryzacji KSeF: NIP + API Token (password) + env (sandbox/prod), test połączenia `initKsefSession`, zapis `tokenHash = btoa(token)` do Firestore. AnimatePresence. |
| `src/modules/finance/services/gusBirService.ts` | GUS BIR v1.1 dual-path: Firestore cache 7d → Cloud Function `/api/gus/search` → SOAP fallback `DOMParser`. `GusCompanyData`, `GusSearchResult`, `clearGusCache`. |
| `src/modules/finance/services/bialaListaService.ts` | Biała Lista MF REST: `checkNipOnBialaLista` (GET BL + cache globalny 24h), `checkBankAccount` (26 cyfr clean), `batchCheckNips` (chunki po 30). CORS graceful fallback — brak throw przy błędzie sieciowym. |
| `src/modules/finance/components/NipLookupPanel.tsx` | Wyszukiwarka NIP: auto-format XXX-XXX-XX-XX, `Promise.all([searchByNip, checkNipOnBialaLista])`, badge VAT czynny/brak, lista rachunków BL, "Użyj danych". AnimatePresence. |
| `src/modules/finance/services/workflowEngine.ts` | Firestore-based Workflow Engine (zamiast Temporal Cloud): `Workflow`, `WorkflowStep` interfaces, `createWorkflow`, `updateWorkflowStep`, `subscribeToWorkflow`, `runKsefBatchWorkflow` (5 kroków, retry 3x, polling UPO 10 prób/2s), `runGusLookupWorkflow` (4 kroki, 10 równoległych GUS + BL). |
| `src/modules/finance/components/WorkflowProgressModal.tsx` | Modal postępu: onSnapshot real-time, auto-close 3s po completed, ikony Clock/Loader2/CheckCircle2/XCircle/RefreshCw per krok, progress bar processedItems/totalItems. |
| `src/functions/bigQueryExport/index.ts` | Cloud Function (europe-west3, 512MiB, 300s): POST `/api/bigquery/export`, auth `X-Internal-Key`, dynamiczny import BigQuery z graceful fallback, limit 5000 docs. |

#### Zmodyfikowane pliki

| Plik | Zmiany |
|------|--------|
| `src/modules/finance/ksef/KsefStatusBanner.tsx` | Realny status `getKsefStatus()`, 3 stany (Połączono/Brak sesji/Offline), przycisk "Autoryzuj KSeF" → KsefAuthModal. |
| `src/modules/finance/ksef/KsefModule.tsx` | Tab settings: konfiguracja NIP/token/env + pobieranie faktur. Tab sent: wybór faktur + wysyłka batch. Spinner + toast. |
| `src/modules/finance/expenses/ExpenseScanner.tsx` | Po walidacji NIP: BL check asynchroniczny, banner VAT czynny (emerald) / Sprawdź status (amber) / Nie znaleziono (rose). |
| `src/modules/finance/bureau/BureauModule.tsx` | Sekcja `WorkflowSection` z listą ostatnich 10 workflow, status badges, WorkflowProgressModal. |

#### TODO zaktualizowane

- `[FI-ITEM-1]` — ZREALIZOWANE w Sprint FI-03

---

## [Sprint FI-02] — 2026-05-16

### AI Dekretacja + BigQuery ML + PWA Mobile (Item 6)

#### Nowe pliki

| Plik | Opis |
|------|------|
| `src/modules/finance/services/aiPostingService.ts` | AI Dekretacja (Gemini 2.0 Flash): `suggestPosting()` — pobiera historyczne dekrety + plan kont, buduje prompt, parsuje JSON WN/MA, weryfikuje bilans. `autoPostDocument()` — `runTransaction` w Firestore (journal entry + update sald kont + flagi `isBooked`). `getPostingPatterns()` — analiza top par kont z 200 ostatnich dekretów. |
| `src/modules/finance/core/AutoPostingPanel.tsx` | Panel AI Dekretacji: lista niezaksięgowanych dokumentów (invoices/purchaseInvoices/expenses), przycisk "AI Sugestia" ze spinnerem, expandable karty WN/Ma z kolorem, "Zaksięguj" (disabled jeśli niezbalansowany), batch "Sugeruj dla wszystkich" (chunki 5 równoległych), sekcja Wzorce kont. |
| `src/modules/finance/services/bigQueryService.ts` | BigQuery ML z fallbackiem lokalnym: `forecastSpending()` — regresja liniowa na 12-mies. historii Firestore, zwraca `SpendingForecast[]` na 3 mies. `detectTransactionAnomalies()` — Isolation Forest-like (odchylenie σ + podejrzane wzorce). `getBudgetVariances()` — budget vs actuals. `generateMLInsights()` — agreguje wszystko, zapisuje do `mlInsights/latest`. |
| `src/modules/finance/reporting/MLInsightsModule.tsx` | Dashboard ML Insights: karty prognoz wydatków na 3 mies. (CSS bar chart), top 5 anomalii z kolorowaniem score, tabela Budget Variance (emerald/amber/rose), timeline cashflow. Dane z `onSnapshot` na `mlInsights/latest`. |
| `src/shared/utils/offlineQueue.ts` | Offline Queue (Dexie.js/IndexedDB): `OfflineQueueDB` z tabelą `receipts`, `QueuedReceipt` interface. Funkcje: `addToQueue`, `getPendingReceipts`, `updateReceiptStatus`, `getQueueStats`, `clearDoneReceipts`, `processQueue`. |
| `src/modules/finance/expenses/MobileCapturePage.tsx` | Mobile-first strona uploadu paragonów: kamera (capture="environment") + gallery, karta kolejki offline z `getQueueStats`, "Przetwórz online" → `processQueue`, auto-process przy `navigator.onLine`. |

#### Zmodyfikowane pliki

| Plik | Zmiany |
|------|--------|
| `vite.config.ts` | VitePWA manifest: name "NoFiCo — Smart Financial Controller", skróty "Skanuj Paragon"+"Nowa Faktura", screenshots, workbox `skipWaiting`/`clientsClaim`, `runtimeCaching` dla Firestore (NetworkFirst 5s) + Storage (CacheFirst 30d) + Gemini (NetworkOnly). |
| `src/modules/finance/reporting/ReportingModule.tsx` | Dodano tab "AI & ML Insights" (BrainCircuit icon) jako domyślny, import `MLInsightsModule`. |
| `src/modules/finance/core/FinanceCoreModule.tsx` | Dodano taby "AI Dekretacja" (Brain) + "Mobilny Upload" (QrCode), import `AutoPostingPanel` + `MobileCapturePage`. |

#### TODO zaktualizowane

- `[FI-ITEM-6]` — ZREALIZOWANE w Sprint FI-02

---

## [Sprint FI-01] — 2026-05-16

### Moduł FI — Implementacja Produkcyjna (Items 2–6)

#### Nowe pliki

| Plik | Opis |
|------|------|
| `src/modules/finance/services/jpkService.ts` | Generator XML JPK_V7M i JPK_KR z danych Firestore. Funkcje: `generateJpkV7M`, `generateJpkKr`, `saveJpkReport`, `downloadXml`. Sanityzacja znaków specjalnych XML, formatowanie kwot `0.00`. |
| `src/modules/finance/services/taxEngine.ts` | Silnik podatkowy 2026: PIT (skala 12/32%, liniowy 19%, ryczałt 8.5/12%), ZUS (standard/preferencyjny/mały ZUS+), składka zdrowotna kwotowa. `calculateTax()`, `calculateOptimalForm()`, `formatTaxBreakdown()`. |
| `src/modules/finance/services/aiDocumentService.ts` | AI Document Intelligence: `checkDuplicate()` (matching heurystyczny wg kwoty+daty+NIP), `detectAnomalies()` (walidacja NIP, analiza statystyczna 2.5σ, rozbieżność VAT), `autoCategorizeBatch()` (batch Gemini), `compressImage()` (canvas resize do 1280px dla mobile). |
| `src/modules/finance/bureau/BureauModule.tsx` | Panel Biura Rachunkowego: real-time lista klientów, task board 3-kolumnowy (Todo/W toku/Gotowe), AddTaskModal, statystyki biura z `useMemo`. Firestore: `bureauClients`, `bureauTasks`. |

#### Zmodyfikowane pliki

| Plik | Zmiany |
|------|--------|
| `src/modules/finance/core/Journal.tsx` | Selektor okresu (Firestore `where` date range), statystyki z danych, filtr statusu, export CSV, Zamknij Miesiąc (batch draft→posted). |
| `src/modules/finance/core/ChartOfAccounts.tsx` | Edit modal (updateDoc), 30 kont seed UoR, wyświetlanie sald Wn/Ma, filtr kategorii, Import XLS placeholder. |
| `src/modules/finance/core/GeneralLedger.tsx` | Selektor okresu, drill-down konta (lista dekretów powiązanych), grupowanie AKTYWA/PASYWA/KAPITAŁ/PRZYCHODY/KOSZTY, export CSV. |
| `src/modules/finance/tax/JpkGenerator.tsx` | Selektor okresu+typu JPK, wywołanie `jpkService`, stats po generacji, historia z Firestore, download XML, dane podatnika z `settings/general`. |
| `src/modules/finance/tax/TaxCalculator.tsx` | Inputy numeryczne, `useMemo` → `calculateTax()`, breakdown z `taxEngine`, Tax Burn, analityka dynamiczna. |
| `src/modules/finance/tax/TaxSimulator.tsx` | 5 form opodatkowania z `calculateOptimalForm()`, rekomendacja dynamiczna, breakdown table, alerty z `result.notes`. |
| `src/modules/finance/expenses/ExpenseModule.tsx` | Przyciski "Wykryj Anomalie AI" + "Auto-Kategoryzuj AI", panel alertów anomalii (severity: info/warning/critical). |
| `src/modules/finance/expenses/ExpenseScanner.tsx` | Kompresja obrazu przed OCR (`compressImage`), weryfikacja duplikatu po OCR (`checkDuplicate`), walidacja NIP (`validateNip`), alerty w UI. |
| `src/modules/finance/core/FinanceCoreModule.tsx` | Dodano tab "Panel Biura" (Building2 icon) z `BureauModule`. |

#### TODO zaktualizowane

Dodane do `TODO.md`:
- `[FI-ITEM-1]` KSeF API pełna integracja MF (OAuth2 + FA(1)/FA(2) XML) + GUS BIR + Biała Lista + Temporal Cloud
- `[FI-ITEM-6]` AI Dekretacja + Anomaly Detection ML (BigQuery) + Mobile PWA upload

#### Status

- TypeScript: 0 błędów w plikach projektu.
- KSeF, GUS BIR, Biała Lista — zaimplementowane w Sprint FI-03 (patrz niżej).

---

## [2026-05-15] — Sprint Podstawowy

- Implementacja `invoiceService.ts`, `transactionService.ts`, `bankImportService.ts` (MT940/ELIXIR/CSV)
- Implementacja `AssetsModule.tsx` — rejestr środków trwałych, amortyzacja SL/DB, AI review
- Implementacja `ExpenseScanner.tsx` — Gemini Vision OCR z batch processing i camera capture
- Implementacja `ExpenseModule.tsx` — lista wydatków, approval flow, bulk approve, AI insights
- Implementacja `KsefModule.tsx`, `KsefStatusBanner.tsx`, `KsefInvoiceList.tsx`
- Implementacja `OpenBankingModule.tsx`, `PaymentInitiator.tsx`, `BatchTransfer.tsx`
- Security: `withAuth` HOF — JWT signature verification na wszystkich protected endpoints
