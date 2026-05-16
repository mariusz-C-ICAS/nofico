# Dokumentacja Funkcjonalna — C-ICAS OS (NoFiCo)
**Wersja:** 3.0 | **Data aktualizacji:** 2026-05-16

---

## 1. Cel i Przeznaczenie Systemu

C-ICAS OS (NoFiCo) to platforma ERP klasy enterprise dla małych i średnich firm usługowych (budownictwo, ogrodnictwo, serwis terenowy, biuro). Łączy zarządzanie zasobami ludzkimi, finansami, projektami, CRM, logistyką i zgodnością GDPR w jednym środowisku multi-tenant opartym na Firebase/Google Cloud.

---

## 2. Architektura i Technologia

- **Frontend:** React 18 + TypeScript, Tailwind CSS, React Router v6 (nested routing)
- **Backend:** Firebase Firestore (real-time), Firebase Auth, Cloud Functions
- **AI:** Google Gemini API (generatywne), AI Guardian (analiza anomalii)
- **Multi-tenant:** każdy tenant (firma) ma izolowaną przestrzeń danych w Firestore
- **Autoryzacja granularna:** uprawnienia na poziomie pola (FieldAuthorization) i struktury org (StructuralPermissions)

---

## 3. Moduły Systemu

### 3.1. HR — Kadry i Płace (`/hr/payroll`)

Pełny system kadrowo-płacowy wzorowany na SAP HR (infotypy PA, Payroll, Contract).

- **Lista pracowników** z trybem Compliance (podświetla brakujące dane: PESEL, NIP B2B)
- **Profil pracownika** — 7 infotypów: HR0002 (dane osobowe), HR0001 (stanowisko/dział), HR0008 (wynagrodzenie), HR0200 (warunki zatrudnienia), HR0024 (kwalifikacje), HR0032 (dokumenty), ZHR001 (custom)
- **Daty ważności** dla danych osobowych i umów (SAP-style `ValidFrom`/`ValidTo`)
- **Swipe mobile** — przeciągnięcie wiersza odsłania kontekstowe menu akcji
- **Przypisanie do projektów** — modalne okno przypisania pracownika do projektu z % alokacji
- **Autoryzacja pola** — rola pracownika decyduje, które pola (wynagrodzenie, PESEL, konto bankowe) są widoczne
- **Słownik kompetencji** — umiejętności pracownika jako tablica z poziomami (1–5)
- **Składniki płacowe** — konfiguracja ZUS (emerytalna, rentowa, zdrowotna), Fundusz Pracy, PPK, progi PIT, kwota wolna, koszty uzyskania
- **Urlopy i nieobecności** — typy urlopów, wnioski, kalendarz
- **Zakładka Retencja** — szybki dostęp do ustawień GDPR z poziomu modułu kadrowego

### 3.2. HR — Struktura Organizacyjna (`/hr/org-structure`)

Interaktywny 3D org-chart z hierarchią jednostek, stanowisk i pracowników.

- **Widok 3D Carousel** — obracalna karuzela z perspektywą CSS 3D, drag myszą/dotyk
- **Drag-and-drop reorganizacja** — jednostki, stanowiska i osoby można przeciągać między węzłami (Firestore aktualizuje `parentId`/`departmentId` natychmiast)
- **Tryb edycji per licencja** — PRO/ENTERPRISE mogą edytować; BASIC — tylko odczyt
- **Drzewo z kodem MPK** — każda jednostka ma `code`, `costCenter`, `parentId`
- **Wbudowany iFrame embed** — publiczny widok org-chart pod `/iframe/om/:configId` bez logowania (konfigurowalny branding: kolor, czcionka, kształty)

### 3.3. HR — Rekrutacja (`/hr/recruitment`)

Kompletny ATS (Applicant Tracking System) z 5 zakładkami.

- **Sourcing & Agencje** — integracja z zewnętrznymi źródłami (Pracuj.pl, Adecco); pula kandydatów
- **Lejek (Kanban)** — pipeline: Rozmowa Techniczna → Weryfikacja HR → Gotowy do zatrudnienia; 1-Click Hire: kandydat → pracownik (zapis bezpośrednio do `employees`)
- **Mass Import** — upload Excel/CSV z walidacją atomowości (albo wszystkie rekordy, albo żaden)
- **Fast Match** — Tinder-style UI: swipe prawo = akceptacja, lewo = odrzucenie (Framer Motion)
- **Oferty pracy (iFrame)** — publiczna tablica ogłoszeń pod `/iframe/careers/:configId`; admin konfiguruje branding i filtrowanie

### 3.4. HR — Kompetencje (`/hr/competencies`)

Model kompetencyjny organizacji z obsługą AI.

- **Słownik kompetencji** — katalog z wyszukiwarką i filtrem kategorii (SOFT, TECHNICAL, LEADERSHIP, DOMAIN); każda kompetencja ma matrycę 5 poziomów biegłości ze wskaźnikami zachowań (Nowicjusz → Mentor)
- **AI Architekt** — 4-krokowy wizard: scraping strony firmy → wywiad z AI → generowanie 60+ kompetencji (Gemini) → batch deploy do Firestore; paginowane wyniki (12/stronę)
- **Konfiguracja** — poziom szczegółowości bazy (SIMPLE/ADVANCED/EXPERT), sync AI toggle, seeding branżowych słowników

### 3.5. HR — Retencja Danych GDPR (`/hr/retention`)

Zarządzanie politykami retencji danych HR zgodnie z RODO.

- Predefiniowane okresy retencji: dane podstawowe (50 lat), ZUS/PIT (10 lat), kandydaci (6 mies.)
- **Automatyczna Czyszczarka** — zabezpieczona OTP, wykonuje anonimizację na żądanie
- Audit trail — tabela z datą zdarzenia, typem operacji i inicjatorem

### 3.6. Finanse — Core (`/finance`)

Główny moduł finansowy z obsługą księgowości i rozliczeń.

### 3.7. Finanse — Kontrahenci (`/finance/contractors`)

Kartoteka kontrahentów z obsługą dokumentów i historią transakcji.

- Formularz kontrahenta (`ContractorForm`) z weryfikacją NIP (GUS)
- Lista kontrahentów (`ContractorList`) z filtrowaniem i statusem
- Usługi: `contractorService.ts` — CRUD, wyszukiwanie, walidacja

### 3.8. Finanse — Środki Trwałe (`/finance/assets`)

Rejestr majątku trwałego z amortyzacją.

- Ewidencja środków trwałych, daty zakupu, wartość nabycia
- Metody amortyzacji (liniowa, degresywna)
- Automatyczne naliczanie odpisów

### 3.9. Finanse — Biuro Rachunkowe (`/finance/bureau`)

Obsługa biura rachunkowego w systemie (dla firm korzystających z zewnętrznego BR).

- Wysyłka dokumentów do BR, potwierdzenia odbioru
- Statusy paczek dokumentów

### 3.10. Finanse — Wydatki (`/finance/expenses`)

Moduł wydatków z AI-skanerem dokumentów.

- **ExpenseModule** — lista wydatków, kategoryzacja, zatwierdzone/odrzucone
- **ExpenseScanner** — AI-skan paragonów/faktur: rozpoznanie kwoty, daty, kontrahenta przez Gemini Vision; auto-blur danych wrażliwych

### 3.11. Finanse — Faktury Cykliczne (`/finance/recurring`)

Automatyzacja wystawiania faktur powtarzalnych.

- Szablony faktur z harmonogramem (dzienne, miesięczne, roczne)
- Historia wygenerowanych dokumentów, statusy wysyłki

### 3.12. Finanse — Zakupy (`/finance/purchasing`)

Obsługa faktur zakupowych i zamówień.

- `PurchaseModule` — rejestr zakupów, zatwierdzanie, mapowanie do MPK
- `PurchaseList` — lista z filtrowaniem po statusie i kontrahencie
- Usługa `purchaseInvoiceService.ts`

### 3.13. Finanse — Usługi (services)

Biblioteka serwisów finansowych:

| Serwis | Opis |
|--------|------|
| `taxEngine.ts` | Kalkulator podatków (VAT, PIT, CIT, ulgi) |
| `bankImportService.ts` | Import wyciągów bankowych (MT940, CSV) |
| `jpkService.ts` | Generator plików JPK_V7, JPK_FA |
| `transactionService.ts` | Zarządzanie transakcjami i matchingiem |
| `aiDocumentService.ts` | AI ekstrakcja danych z dokumentów (Gemini Vision) |
| `invoiceService.ts` | Wystawianie i wysyłka faktur |

### 3.14. Projekty (`/projects`)

Zarządzanie projektami z AI doborem zespołu.

- Tablice Kanban z zadaniami, terminami, etykietami
- **ProjectSkills** — definiowanie wymaganych kompetencji projektu; AI scoring dopasowania pracowników (0–100%); wskazanie luk kompetencyjnych
- Alokacje finansowe pracowników do projektów (% czasu)
- Budżetowanie i kontrola kosztów

### 3.15. CRM (`/crm`)

Zarządzanie relacjami z klientami.

- Pipeline sprzedażowy (Kanban), ofertowanie, e-podpis
- Portal Klienta (`/portal/:token`) — publiczny, tokenowany dostęp
- **BookingsIframeView** (`/iframe/bookings/:configId`) — publiczny widok kalendarza rezerwacji osadzany na stronie klienta
- AI Coaching, Churn Predictor, Segmentacja, NPS, Automatyzacje

### 3.16. Rezerwacje (`/booking`)

System rezerwacji online dla usług B2C.

- Kalendarz dostępności, typy usług, paczki wizyt
- Publiczna strona rezerwacji (`/book/:tenantId`)
- Analityka, vouchery podarunkowe, lista oczekujących
- Integracja z modułem finansowym (faktura po wizycie)

### 3.17. Serwis Terenowy (`/field-service`)

Zarządzanie zleceniami i pracownikami w terenie.

- Zlecenia serwisowe, przypisanie techników, mapy
- Śledzenie GPS w czasie rzeczywistym (opt-in)
- Portal klienta do zmiany terminu (`/client-event/:tenantId/:tokenId`)
- Kosztorysowanie zleceń AI

### 3.18. Panel Administracyjny (`/admin`)

Zarządzanie konfiguracją systemową.

- **IframesAdminModule** — centralne zarządzanie wszystkimi konfiguracjami iFrame (OM, Careers, Bookings)
- **CareersIframeSettings** — konfiguracja tablicy ogłoszeń (branding, pola, layout)
- **OmIframeSettings** — konfiguracja publicznego org-chart
- **BookingsIframeSettings** — konfiguracja widgetu rezerwacji
- **RetentionAdmin** — polityki retencji GDPR, status workera cron
- **TestDataAdminModule** — generowanie danych testowych (5 działów, 13 ról, 30 pracowników, 10 kandydatów)

### 3.19. Autoryzacja Granularna (`/admin` → Security)

System uprawnień na dwóch poziomach.

- **StructuralPermissionsModule** — ścieżki ewaluacyjne SAP-like (O-S-P, O-O, S-P, O-P); głębokość nieskończona (`-1`) lub do N poziomów; per user lub per rola
- **FieldAuthorizationModule** — ukrywanie / blokada edycji konkretnych pól (salary, PESEL, bankAccount) dla wybranych ról; obejmuje infotypy HR, CRM, Finance
- **`useFieldAuth` hook** — gotowy do użycia w każdym komponencie

### 3.20. Compliance i GDPR (`/compliance`)

- Rejestr przetwarzania danych, klauzule RODO
- Legal Vault — niezmienne archiwum dokumentów prawnych (WORM)
- ESG reporting, Quality management

### 3.21. Workflow i DMS (`/workflow`, `/dms`)

- Workflow Module — formularze procesowe (BHP, przekazanie mienia, analiza sektorów)
- DMS — zarządzanie dokumentami z WORM, e-podpis, wersjonowanie

### 3.22. AI Copilot (`/ai-copilot`)

Asystent AI dla całej platformy.

- Odpowiedzi proceduralne, analiza dokumentów, generowanie raportów
- AI Guardian — monitoring anomalii finansowych (SwipeMatch)

### 3.23. Wielojęzyczność i i18n

- Pełna obsługa PL/EN przez `react-i18next`
- Lokalizowane nazwy kompetencji (obiekty `{pl: ..., en: ...}`)
- Automatyczne wykrywanie języka przeglądarki

---

## 4. Publiczne Endpointy (bez logowania)

| URL | Komponent | Opis |
|-----|-----------|------|
| `/iframe/om/:configId` | OmIframeView | 3D org-chart do osadzenia |
| `/iframe/careers/:configId` | CareersIframeView | Tablica ogłoszeń |
| `/iframe/bookings/:configId` | BookingsIframeView | Widget rezerwacji |
| `/portal/:token` | CustomerPortal | Portal klienta CRM |
| `/client-event/:tenantId/:tokenId` | ClientReschedulePortal | Zmiana terminu serwisu |
| `/book/:tenantId` | BookingPublicPage | Strona rezerwacji B2C |

---

## 5. Kolekcje Firestore (główne)

| Kolekcja | Opis |
|----------|------|
| `tenants/{id}/employees` | Pracownicy (per tenant) |
| `tenants/{id}/competencies` | Kompetencje (per tenant) |
| `hr_departments` | Jednostki org (filtrowane przez `tenantId`) |
| `hr_roles` | Stanowiska |
| `structural_permissions` | Uprawnienia strukturalne |
| `field_permissions` | Uprawnienia na poziomie pola |
| `omIframeConfigs` | Konfiguracje iFrame OM |
| `careersIframeConfigs` | Konfiguracje iFrame Oferty |
| `master_competencies` | Wzorcowe kompetencje globalne |
| `industries` | Słownik branż |
