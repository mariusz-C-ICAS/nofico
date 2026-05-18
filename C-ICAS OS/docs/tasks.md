# NoFiCo — Backlog Zadań

Ostatnia aktualizacja: 2026-05-18

## TIER 1 — Krytyczne (przed pierwszym klientem produkcyjnym)

### T1-001: Stripe Checkout — integracja płatności
- **Pliki:** `src/modules/admin/LicenseModule.tsx`, `src/modules/payments/services/PaymentService.ts`
- **Problem:** `LicenseModule` używa `setTimeout+alert` zamiast Stripe Checkout Session; `PaymentService.createStripeCheckout()` zwraca `sim_session_123`
- **Do zrobienia:** Wdrożyć Stripe SDK (`@stripe/stripe-js`), backend Cloud Function do tworzenia Checkout Session, webhook handler dla `checkout.session.completed`
- **Szacunek:** 10-14h

### T1-002: BLIK — integracja płatności
- **Pliki:** `src/modules/payments/services/PaymentService.ts:37`
- **Problem:** `processBlikPayment()` hardkoduje `status: 'completed'` bez integracji
- **Do zrobienia:** Wdrożyć PayU lub Tpay BLIK API, obsługa callbacków
- **Szacunek:** 8-12h

## TIER 2 — Ważne (przed go-live z pełnymi funkcjami)

### T2-001: AML Check — WorldCheck/Refinitiv
- **Pliki:** `src/modules/compliance/services/ComplianceService.ts:44`
- **Problem:** `AmlService.performAmlCheck()` to symulacja, komentarz: `// Simulation of Refinitiv / WorldCheck`
- **Do zrobienia:** Wdrożyć LSEG WorldCheck One API lub Complyadvantage API; obsługa false positives
- **Szacunek:** 12-20h + kontrakt z dostawcą

### T2-002: EPU e-Sąd — windykacja elektroniczna
- **Pliki:** `src/modules/crm/services/CollectionService.ts:29`
- **Problem:** `pushToEpu()` — komentarz `// Mock SOAP/REST call`, losowe `sygnatura`
- **Do zrobienia:** Wdrożyć integrację SOAP z e-Sądem Krajowym (epuap.gov.pl lub dedykowany endpoint KRS); obsługa certyfikatów kwalifikowanych
- **Szacunek:** 20-30h + certyfikat kwalifikowany

### T2-003: Generowanie PDF raportów
- **Pliki:** `src/modules/hr/OrgStructureModule.tsx:165`, `src/modules/finance/reporting/FinancialStatements.tsx`
- **Problem:** Przyciski "Raport M-OM" i "Weryfikuj & Eksportuj" wywołują `alert()` lub nie mają `onClick`
- **Do zrobienia:** Wdrożyć `jsPDF` lub `react-pdf`; szablony raportów dla struktury org i P&L
- **Szacunek:** 8-12h

### T2-004: Kurs walut — dynamiczny z NBP
- **Pliki:** `src/modules/payments/services/PaymentService.ts:56`
- **Problem:** `convertCurrency()` hardkoduje `rate = 4.30`
- **Do zrobienia:** Wdrożyć integrację z NBP API (`api.nbp.pl/api/exchangerates/rates/A/{currency}/`), cache dzienny w Firestore
- **Szacunek:** 3-4h

## TIER 3 — Post-MVP

### T3-001: Cash Flow Forecasting ML
- **Pliki:** `src/modules/payments/services/ForecastingService.ts`
- **Problem:** Zwraca hardkodowane `forecastedBalance: 1250000`, komentarz `// Mock ML output`
- **Do zrobienia:** Wdrożyć BigQuery ML (ARIMA_PLUS lub LSTM) na danych transakcji; alternatywnie Vertex AI Forecast
- **Szacunek:** 20-30h + koszt BigQuery

### T3-002: DPIA Generator — AI-powered
- **Pliki:** `src/modules/compliance/services/ComplianceService.ts:12`
- **Problem:** `generateDpia()` zwraca hardkodowaną listę rekomendacji (`// AI analysis simulation`)
- **Do zrobienia:** Wdrożyć Gemini Pro z systemowym promptem RODO/DPIA; integracja z rejestrem przetwarzania
- **Szacunek:** 6-8h

### T3-003: Lead Scoring ML
- **Pliki:** `src/modules/crm/services/CollectionService.ts:44`
- **Problem:** `LeadScoringService.scoreDeal()` używa `Math.random() * 100`
- **Do zrobienia:** Wdrożyć model ML na historii transakcji CRM; Firebase ML lub Vertex AI AutoML
- **Szacunek:** 15-20h

### T3-004: AI Vision Vault — skanowanie dokumentów
- **Pliki:** `src/modules/finance/VaultModule.tsx:147`
- **Problem:** Funkcja AI scan używa `setTimeout(2000ms)` + dummy splits zamiast Gemini Vision
- **Do zrobienia:** Wdrożyć Gemini Vision API do OCR faktur; podpięcie pod istniejący `aiDocumentService.ts`
- **Szacunek:** 6-8h

### T3-005: UX — zamiana alert() na toast notifications
- **Pliki:** ~44 lokalizacje w src/modules/
- **Problem:** `alert()` blokuje UI, wygląda amatorsko
- **Do zrobienia:** Wdrożyć komponent toast (np. `react-hot-toast` lub `sonner`); masowe zastąpienie `alert()` wywołaniami toast
- **Szacunek:** 4-6h

## Zakończone ✅

- KSeF API 2.0 — `ksefService.ts` (2026-05-16)
- GUS BIR SOAP — `gusBirService.ts` (2026-05-16)
- Biała Lista MF REST — `bialaListaService.ts` (2026-05-16)
- TypeScript 0 błędów — `npm run build` EXIT:0 (2026-05-17)
- Podpięcie KSeF w `invoiceService.ts` (2026-05-18)
- Podpięcie GUS BIR + Biała Lista w `contractorService.ts` (2026-05-18)
- VIES REST API w `contractorService.ts` (2026-05-18)
- ZUS e-PUE stub — `PayrollService.ts` (2026-05-18)
- PPK XML generator — `PayrollService.ts` (2026-05-18)
- Naprawiony stub `batchCheckNips` w `workflowEngine.ts` (2026-05-18)
