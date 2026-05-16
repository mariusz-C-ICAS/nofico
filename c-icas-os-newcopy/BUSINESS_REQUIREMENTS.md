# Dokumentacja Biznesowa i Architektoniczna C-ICAS.OS

*Utworzono: 2026-05-10*

## Opis Projektu
System "FieldTime Manage" (C-ICAS.OS) to zaawansowany "Work OS" (System Operacyjny Pracy) przeznaczony dla firm budowlanych, ogrodniczych i sprzątających, wymagających ścisłej kontroli w terenie, wsparcia AI, logowania czasu pracy i rejestracji zdarzeń. Cechuje się konstrukcją kafelkową i w 100% modularną architekturą - poszczególne działy są od siebie całkowicie odizolowane (Code Splitting, rygorystyczne reguły bezpieczeństwa bazy danych).

## Wykaz Use-Case'ów (Zgłoszonych przez Weryfikatora)

### Podstawowe i Wdrożone
1. **Rejestracja Czasu Pracy (Geofencing)** - pracownik loguje rozpoczęcie, typ (praca, trasa, przerwa) oraz czas zakończenia z pobraniem koordynatów GPS (zabezpieczenie). Może wrzucać notatki głosowe/tekstowe lub zdjęcia jako dowód.
2. **Moduł Projektów (Kanban) + RODO** - tworzenie tablic Kanban, przeciąganie zadań. Wprowadzono politykę RODO z automatyczną retencją czasową danych. System śledzi dokładnie każdy ruch "utworzenia/przesunięcia/usunięcia" logując go do tabeli audytów.
3. **Izolacja Działów (Dynamiczne Moduły)** - managerowie mają własne wirtualne pod-systemy. System porzucił twarde linkowanie. Administrator z poziomu panelu aktywuje/deaktywuje moduły a cała nawigacja na Dashboardzie renderuje się dynamicznie.
4. **Asystent AI (FieldTime AI)** - chat dla inżynierów pomagający robić proste estymacje, odpowiadający uwarunkowaniach budowlanych bazując na modelu Google Gemini 3. Dla administratorów pełni funkcję Doradcy Wdrożeniowego (analizuje stronę www i podpowiada licencję i architekturę modułów).
5. **Panel Admina z zarządzaniem modułami** - administrator może włączać / wyłączać potężne moduły z poziomu UI. Deaktywacja wiąże się ze zwolnieniem licencji po stronie aplikacji klienckiej, logując przy tym decyzje audytowe do tabeli System Audit. Widoki i uprawnienia dopasowują się do stanu bazy.
6. **Integracja CalSyncPro (Zewnętrzne Kalendarze API)** - autorskie rozwiązanie oparte o Azure Functions podpinające webhooki, które przysłuchują się zmianom w MS Exchange/Google Calendar i zrzucają taski Kanban. Moduł C-ICAS pinguje CSP API.

### Nowe / W trakcie wdrożenia
7. **Śledzenie Trasy i Rejestracja Kroków (Użytek Prywatny / Zdrowie)** - opcjonalny tryb prywatny, w którym użytkownik pozwala apce zbierać metryki chodu z krokomierza czy weryfikować trasę do własnych rąk (bez zgłaszania przełożonym do audytu, jako benefit/aplikacja prozdrowotna "Wellness" dla pracowników).
8. **Smartwatch Companion App (Zegarki typu Wear OS / Apple Watch)** - System ma być gotowy na osobną mikro-apkę. Możliwość aktywacji "Pracy" na zegarku. Odhaczanie zadań Kanban. Szybkie nagrywanie notatek głosowych (WearOS Voice input).
9. **Licencjonowanie i Modularyzacja Sprzedaży (Stripe / Google Cloud Billing)** - C-ICAS może sprzedawać instancje systemu w modelu SaaS podmiotom trzecim, uzależniając uprawnienia do włączenia modułu AI od poziomu zakupionego planu, płatności Stripe bilingów itd. Właściciel/dystrybutor może kontrolować czy subskrypcja wygasła.
10. **Zarządzanie Flotą i Sprzętem (Fleet Management)** - Ewidencja pojazdów, maszyn budowlanych, rezerwacje i harmonogram przeglądów.
11. **BHP i Jakość (Safety & Quality)** - Kreator formularzy offline (BHP checklist, ocena ryzyka) wypełniany przez kierowników na placu budowy.
12. **Raportowanie Głosowe AI** - Pracownik nagrywa na smartwatchu lub smartfonie "notatkę z dnia", a AI przekształca ją na formalny dziennik budowy.
13. **Moduł Szkoleń i Bazy Wiedzy (LMS)** - Platforma e-learningowa. Tworzenie kursów, podłączanie zewnętrznych formatów, przeprowadzanie egzaminów (wiele opcji: do skutku, jedna próba). Automatyczna certyfikacja uprawniająca do pracy. Firmowe FAQ.
14. **Moduł HR i Płac (Payroll & Reporting)** - Import i definicja pasków płacowych generowanych na bazie logów przepracowanych godzin (praca, trasa) według projektów. Zaawansowane mechanizmy uprawnień: pasek widzi tylko HR i Pracownik. Manager widzi jedynie części raportu, do których dostał wyłączne uprawnienie przez HR w danym projekcie.
15. **Multi-Tenancy (Środowisko Wielofirmowe)** - Użytkownicy (w tym back-office i wykonawcy) mogą należeć do wielu organizacji i płynnie się między nimi przełączać. Rozwiązanie to skaluje aplikację na bycie globalnym systemem SaaS (B2B2C).
16. **Proces Kompleksowej Obsługi Biznesowej (Leads to Cash)** - Ścieżka klienta: Zapytanie (integracja skrzynek email) -> Wygenerowanie Oferty -> Potwierdzenie Umowy -> Realizacja Projektu (z logowaniem multimediów) -> Fakturowanie i Import Płatności (integracja z bankiem/plikami CSV) -> Przejście w tryb Abonamentu / Utrzymania.
17. **Cykliczne i Inteligentne Rekomendacje dla Back-Office** - AI stale monitoruje czynniki zewnętrzne (np. pogodę, suszę, wilgotność dla ogrodnictwa, termin farbowania dla salonów kosmetycznych) i automatycznie podpowiada opiekunowi klienta optymalny termin realizacji usługi i inicjuje kontakt.
18. **Warsztat Mechaniczny i Zaawansowane AI Vision** - Fotografowanie poszczególnych napraw w czasie rzeczywistym, gdzie model sprawdza m.in., czy zdjęcie ukazuje szeroki kontekst uwiarygodniający (np. wyraźna tablica rejestracyjna + naprawiana część w jednym kadrze wideo). AI automatycznie analizuje wideo ze smartfona i wyciąga odpowiednią rzetelną klatkę dla klienta jako niezbity dowód zrealizowania usługi.
19. **Salony Beauty / Fryzjerstwo** - Wsparcie powiadomień opartych na cyklach, np. AI automatycznie tworzy drafty wiadomości SMS dla klientek z propozycją korekty odrostów wspierając "Customer Retention", integracja profilu usługowego z rezerwacjami kalendarzowymi.

## Uniwersalność i Skalowalność Branżowa (SME 100% Coverage)
Architektura jest generyczna (Core primitives: Entities, Lifecycle, Interactions). Nie ogranicza się do usług terenowych.
Niezależnie od branży obsługiwane są następujące podmioty:
- **Agencje Marketingowe / Software Houses** (Leady -> Umowy NDA -> Zarządzanie Zespołem -> Fakturowanie)
- **Branża Medyczna / Fizjoterapia** (Przedrostki RODO / HIPAA -> Dokumentacja Pacjenta -> Rezerwacje Wizyt -> Powiadomienia)
- **Zarządzanie Nieruchomościami (Real Estate / Property Management)**
- **Kancelarie Prawne**, **Firmy Eventowe** czy **Logistyka / Flota**.

Dążymy do pokrycia 100% procesów firm MSP (SME) opierając się na 8 filarach:
* **Sales / CRM** (Leady, Negocjacje, Zamknięcia)
* **Operations / Service Delivery** (Zadania, Projekty, Abonent i Praca w Terenie)
* **Finance** (Integracje Bankowe, Faktury, Płatności cykliczne)
* **HR / Workforce** (Czas Pracy, Szkolenia LMS, Uprawnienia RODO)
* **Assets** (Inwentarz, Flota, Magazyn)
* **Customer Engagement** (AI Rekomendacje, Portale Klienta)
* **BI / Analytics** (Raportowanie, Audyty)
* **Ecosystem / Integrations** (Zewnętrzne Bramki)

### Zewnętrzny Obieg Dokumentów i Bramki API
Aplikacja operacyjna ("Work OS") w wielu firmach nie służy jako hurtownia plików. Zostaną wdrożone **bramki API/Webhooks (Integracje Zewnętrzne)** pozwalające podpiąć zewnętrzny system Obiegu Dokumentów (DMS - Document Management System). Zamiast wymyślać koło na nowo, platforma wystawia złącza, przez które wpada np. zeskanowana umowa przypisana do powiązanego z nią CRMu lub wysyłana jest wystawiona faktura do zewnętrznej księgowości.

## Unikalne Cechy (Konkurencyjność na rynku)
Standardowe aplikacje (jak Connecteam czy ClockShark) oferują sztywne frameworki. C-ICAS OS wyróżnia:
- **Zmiennokształtna Architektura** - AI analizuje profil klienta B2B (jego branżę) i samo buduje i uruchamia mu system kafelków. Firma wiertnicza otrzyma inny układ niż sprzątająca.
- **Privacy-First (Izolacja)** - Rozdział bazy danych, retencja RODO, dedykowany tryb prozdrowotny nienaruszający praw pracowniczych.
- **Asystent na Placu (Vision)** - Zamiast tabel, inżynier robi zdjęcie zniszczonej rury i uploaduje, a Asystent Gemini wyciąga typ awarii i tworzy zadanie w rejestrze.

---
Dokument stanowi "Single Source of Truth" wyznaczników do aktualizacji przez system AI.

## Zaktualizowane Koncepcje (Compliance & Audit)
1. **Dynamiczny Compliance Score**: Zaimplementowany centralny algorytm (`ComplianceScoreService`) dynamicznie weryfikujący poziom zgodności w oparciu o szablony audytów, dokumenty legalne oraz logowanie otwartych incydentów. Wyniki posiadają track historyczny w kolekcji bazy (`complianceScoreHistory`), umożliwiając precyzyjne odnalezienie regresji w zgodności operacyjnej SOC2 / ISO27001. Algorytm jest używany m.in. w Dashboardzie Bezpieczeństwa oraz widokach Zgodności.
2. **Zaawansowane, Warstwowe Logowanie Audytowe**: System zapisuje historię dla wszystkich wrażliwych modułów ("kto, co, kiedy", ewentualne `details` i kategoria) via zmodyfikowany `auditService.logAction`. Wprowadzono konfigurację na poziomie Tenanta - można dynamicznie regulować poziom gadatliwości (`CRITICAL_ONLY`, `STANDARD`, `VERBOSE`, lub `NONE`) i filtrować per moduł/kategoria, umożliwiając redukcję kosztów bazy i szumu informacyjnego przy jednoczesnym zachowaniu standardów kontroli wymaganych w korporacjach.

