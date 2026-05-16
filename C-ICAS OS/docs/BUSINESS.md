# Dokumentacja Biznesowa — C-ICAS OS (NoFiCo)
**Wersja:** 3.0 | **Data aktualizacji:** 2026-05-16

---

## 1. Produkt i Wartość Biznesowa

**C-ICAS OS (NoFiCo)** to kompleksowy system ERP klasy enterprise dla firm usługowych zatrudniających od 10 do 500 osób. Eliminuje potrzebę utrzymywania wielu osobnych narzędzi (Comarch HR, Fakturownia, Asana, Freshdesk) — zastępując je jedną zintegrowaną platformą.

**Kluczowe wartości biznesowe:**

| Obszar | Problem | Rozwiązanie |
|--------|---------|-------------|
| Kadry | Ręczna obsługa akt osobowych, ryzyko braków RODO | Cyfrowe infotypy, Compliance Mode, automatyczna retencja |
| Rekrutacja | Rozsiane CV, brak widoku pipeline | ATS z Kanban, Fast Match, 1-Click Hire |
| Kompetencje | Brak modelu kompetencyjnego | AI generuje 60+ kompetencji z opisu firmy w 2 min |
| Struktura org | Brak aktualnego schematu, trudna reorganizacja | Drag-and-drop 3D org-chart, embeddable iFrame |
| Finanse | Wiele narzędzi, ręczny import | JPK auto-generator, AI skan faktur, bank import |
| Projekty | Brak doboru zespołu per kompetencje | AI scoring — kto najbardziej pasuje do projektu |
| Serwis | Brak śledzenia techników, opóźnienia | GPS tracking (opt-in), portal zmiany terminu |

---

## 2. Model Multi-Tenant

- Jeden system obsługuje wiele firm (tenantów) — idealny dla biur rachunkowych, grup kapitałowych lub holdingów
- Izolacja danych: każdy tenant ma osobną przestrzeń w Firestore
- Użytkownik może należeć do wielu firm i przełączać kontekst
- Onboarding Wizard — nowa firma konfigurowana w <5 minut

---

## 3. Moduł HR — Wartość Biznesowa

### Kadry i Płace
Pełna obsługa cyklu życia pracownika: zatrudnienie → eksploatacja → rozwiązanie umowy.

- Obsługa typów umów: UoP, B2B, Zlecenie, Dzieło, Stażysta
- Walidacja PESEL (algorytm suma kontrolna), NIP (B2B), zagraniczne pozwolenia na pracę
- Składniki ZUS/PPK/PIT konfigurowane per tenant — bez konieczności programowania
- Zakładka **Compliance** wykrywa automatycznie pracowników z niekompletnymi danymi prawnymi
- Daty ważności badań lekarskich i szkoleń BHP — alert przed upływem terminu

### Rekrutacja
- Publiczna tablica ogłoszeń osadzana na stronie firmy (bez dostępu do systemu)
- Import kandydatów z agencji zewnętrznych jednym przyciskiem
- Fast Match = skrócenie czasu wstępnej selekcji z godzin do minut
- 1-Click Hire — dane kandydata kopiowane automatycznie do karty pracownika

### Kompetencje
- AI generuje model kompetencyjny na podstawie strony WWW firmy — nie wymaga specjalisty HR
- Matryca biegłości 1–5 z opisem zachowań per poziom — gotowa do audytów ISO
- Integracja z modułem projektów: automatyczny dobór zespołu per kompetencje

---

## 4. Moduł Finansowy — Wartość Biznesowa

### Nowe funkcje od wersji 3.0

**Kontrahenci** — centralna baza firm z historią transakcji eliminuje ręczne wpisywanie danych na fakturach; weryfikacja NIP przez GUS API.

**Środki trwałe** — automatyczne naliczanie amortyzacji eliminuje arkusze Excel prowadzone przez FK; eksport do JPK_ST.

**AI Skan Faktur** — Gemini Vision rozpoznaje dane z obrazu faktury/paragonu w ciągu 3 sekund; redukuje czas wprowadzania danych o 80%.

**Import Bankowy** — wczytanie wyciągu MT940/CSV automatycznie dopasowuje transakcje do faktur (matching algorytm po kwocie/dacie/kontrahencie).

**JPK Generator** — automatyczne generowanie plików JPK_V7 (VAT) i JPK_FA z danych systemowych; eliminuje ręczną pracę księgowego przed 25. każdego miesiąca.

**Faktury Cykliczne** — automatyczne wystawianie faktur abonamentowych/miesięcznych bez interwencji użytkownika.

---

## 5. Zgodność z GDPR/RODO

- **Polityki retencji** — każdy infotyp ma zdefiniowany czas przechowywania (konfigurowalny per tenant)
- **Automatyczna anonimizacja** — po przekroczeniu okresu retencji dane są anonimizowane (nie usuwane — spełnienie wymogów audytowych)
- **Autoryzacja na poziomie pola** — pracownik bez uprawnień nie widzi wynagrodzenia ani PESEL kolegi; rola `recruiter` widzi tylko CV, nie dane płacowe
- **Uprawnienia strukturalne** — SAP-like ścieżki ewaluacyjne: użytkownik widzi tylko swoją gałąź drzewa organizacyjnego
- **Eksport danych** — pracownik może pobrać swoje dane osobowe w PDF/CSV (prawo do dostępu)
- **Audit Trail** — każda operacja na danych wrażliwych zapisywana z timestampem i ID operatora

---

## 6. Integracje i API

| System zewnętrzny | Metoda | Cel |
|-------------------|--------|-----|
| Google Gemini API | REST | Generowanie kompetencji, skan dokumentów, AI copilot |
| Pracuj.pl / Agencje | REST (mock) | Import kandydatów |
| GUS BIR | REST | Weryfikacja NIP kontrahenta |
| Bank (MT940/CSV) | Import pliku | Wyciągi bankowe |
| JPK | Plik XML | Eksport do e-Urzędu Skarbowego |
| Firebase / Google Auth | SDK | Autoryzacja, baza danych, hosting |

---

## 7. Model Licencyjny

| Licencja | Funkcje |
|----------|---------|
| **FREE** | Dashboard, podstawowe HR, CRM (50 kontaktów) |
| **PRO** | Pełny HR, Rekrutacja, Projekty, CRM bez limitu, edycja org-chart |
| **ENTERPRISE** | Wszystko + AI Kompetencje, Autoryzacja granularna, JPK, Środki Trwałe, Multi-tenant zarządzanie |

---

## 8. Ryzyka i Mitigacja

| Ryzyko | Mitigacja |
|--------|-----------|
| Wyciek danych wrażliwych (salary, PESEL) | FieldAuthorization per rola + Audit Trail |
| Niepoprawne dane pracowników (RODO) | Compliance Mode + walidacja PESEL/NIP w UI |
| Zależność od Google/Firebase | Abstrakcja adaptera Firestore; możliwość migracji na Postgres |
| Naruszenie terminów retencji | Automatyczny worker CRON + panel RetentionAdmin |
| Awaria bankowego importu | Manual CSV fallback + walidacja po stronie klienta |

---

## 9. Roadmap (planowane)

- [ ] Mobile app (React Native) — serwis terenowy offline-first
- [ ] Integracja z KSeF (e-faktura obligatoryjna PL od 2026)
- [ ] Moduł payroll online — generowanie i wysyłka pasków płacowych
- [ ] API publiczne (REST/webhook) dla integracji zewnętrznych
- [ ] AI przewidywanie churn pracowników (HR Analytics)
