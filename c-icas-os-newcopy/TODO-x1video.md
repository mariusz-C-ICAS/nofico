# Project TODOs

## Aktywne

### Moduł FI — Roadmapa (2026-05-16)

#### W trakcie implementacji (Tyg 1-6):
- [x] Item 2: Double-entry journal + Plan Kont (production logic)
- [x] Item 3: JPK pełny generator (V7M + KR) + download XML
- [x] Item 4: Panel Biura multi-client + workflow zadań (BureauModule)
- [x] Item 5: Tax Engine (PIT/CIT/ZUS symulator) + TaxSimulator/TaxCalculator

#### Do implementacji — następny sprint:
- [ ] **[FI-ITEM-1] KSeF API — pełna integracja MF** (Tyg 7-8)
  - MF OAuth2 handshake (token endpoint: `https://ksef.mf.gov.pl/api/online/Session/AuthorisationChallenge`)
  - Generacja FA(1)/FA(2) XML zgodnie ze schematem `Faktura(1)` MF
  - Wysyłka batcha faktur (Session/Send), polling statusu (Session/Status)
  - Obsługa korekt (FA(2) z atrybutem KorektaDo)
  - GUS BIR API — walidacja NIP/REGON (https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx)
  - Biała Lista Podatników MF — weryfikacja rachunków bankowych
  - VIES — walidacja numerów VAT UE (https://ec.europa.eu/taxation_customs/vies/)
  - Temporal Cloud workflow dla retry logic (KSeF offline24 vault z AES-256-GCM)

- [ ] **[FI-ITEM-6] AI Dekretacja + Anomaly Detection + Mobile** (Tyg 11-12)
  - Automatyczna dekretacja AI: na podstawie historii biura — Gemini Vertex AI proponuje konta WN/MA
  - Anomaly detection: BigQuery ML — wykrycie podejrzanych transakcji, duplikatów, odchyleń budżetowych
  - Fraud detection: porównanie NIP z bazą MF/CBR, alerty split payment, weryfikacja kontrahentów
  - PWA/Mobile: upload paragonów przez kamerę (MediaDevices API), quick approve flow
  - OCR pipeline: Document AI Invoice Parser (zastąp stubs prawdziwym wywołaniem Vertex AI)
  - Edge AI: auto-blur PII (Cloud DLP), lokalna analiza offline (MLKit/TFLite)

- [ ] **Skróty klawiszowe (Web)**: Przypisać globalne skróty klawiszowe do poszczególnych akcji systemowych. Rozważyć ergonomię dla wersji webowej.

## Zrealizowane
- [x] **Konfiguracja Sentry (Error Tracking)**: Gdy projekt będzie gotowy do produkcji, dodaj `VITE_SENTRY_DSN` do sekretów i odkomentuj kod w `src/main.tsx` oraz `src/app/App.tsx`.
- [x] **Performance Monitoring**: Zweryfikować działanie Firebase Performance Monitoring w środowisku produkcyjnym.
- [x] **Płace & KSeF**: Dokończyć integrację z bramką płatności w module `PaymentsModule`.
- [x] Konfiguracja Vitest + Testing Library
- [x] Struktura modułowa aplikacji
- [x] Layout Dashboardu (Lejek Operacyjny)
