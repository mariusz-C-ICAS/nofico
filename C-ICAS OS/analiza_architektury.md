# Analiza i Krytyka Architektury NoFiCo + C-ICAS OS

Poniżej znajduje się kompleksowa analiza dokumentacji i kodu źródłowego (`CompanyOS`), specyfikacji `NoFiCo V3` oraz `Integration Plan`. 

## 1. Analiza obecnego stanu (Wizja i Architektura)

Projekt ma niezwykle ambitną wizję: stworzenie wszechstronnego, modułowego Systemu Operacyjnego Przedsiębiorstwa (Business OS), łączącego cechy **ERP, CRM, HR, DMS i systemu finansowego (KSeF, PSD2)**. Skupia się na mikrofirmach i MŚP, kładąc ogromny nacisk na sztuczną inteligencję (AI Copilot, AI Guardian) oraz rygorystyczne podejście do prywatności i bezpieczeństwa (Privacy-by-Design, WORM, KSH 210, RODO).

Obecny kod w `CompanyOS` stanowi szkielet frontendowy oparty na **React, Vite, TypeScript i TailwindCSS**. Dokumentacja wskazuje na gigantyczny pivot technologiczny w stronę **Google Cloud Platform (GCP) i Firebase** (migracja z Azure).

## 2. Krytyka i Zagrożenia (Wąskie Gardła)

Mimo doskonałego przygotowania dokumentacji, projekt obarczony jest kilkoma kluczowymi ryzykami technologicznymi i zarządczymi:

> [!WARNING]
> **Limit wielkości Custom Claims w Firebase Auth**
> W architekturze ról (`Integration_Plan.md`) planujesz trzymać przypisania do tenantów w Custom Claims. Firebase Auth ma **twardy limit 1000 bajtów** na payload Custom Claims. Jeśli użytkownik (np. Księgowa, Doradca) będzie miał dostęp do kilkunastu/kilkudziesięciu firm (tenantów), limit ten zostanie błyskawicznie przekroczony, psując proces autoryzacji. Będziesz musiał przenieść sprawdzanie uprawnień do Security Rules bazujących bezpośrednio na kolekcjach Firestore, co podniesie koszty odczytów i skomplikuje architekturę.

> [!CAUTION]
> **Rozdwojenie Bazy Danych (Firestore vs Cloud SQL) - Piekło CQRS**
> Chcesz używać **Cloud SQL (PostgreSQL)** do twardych danych transakcyjnych (podwójny zapis księgowy), a **Firestore** do widoków w czasie rzeczywistym. Synchronizacja dwukierunkowa lub asynchroniczny *Change Data Capture* (CDC) z PostgreSQL do Firestore przy pomocy Eventarc/PubSub to ogromny dług technologiczny i pole do błędów (tzw. *Eventual Consistency* w systemie finansowym). Księgowy nie zaakceptuje faktu, że raport w Firestore aktualizuje się z 3-sekundowym opóźnieniem w stosunku do faktycznego zapisu w księdze głównej.

> [!WARNING]
> **Zakres MVP (Scope Creep)**
> Zakres funkcji opisany na pierwsze miesiące pracy (MVP) – obejmujący pełną integrację PSD2, KSeF, AI Auto-Blur, silnik OCR, i własny framework uprawnień wielofirmowych – jest **nierealistyczny do wdrożenia w 3 miesiące** przez niewielki zespół. Ryzykujesz budowę "wszystkiego po trochu", gdzie żaden moduł nie będzie na tyle dojrzały, by zacząć na nim zarabiać.

## 3. Opinie o wybranych technologiach

- **Temporal Cloud na orkiestrację:** **Strzał w dziesiątkę.** Dla procesów takich jak wysyłka do KSeF (gdzie serwery Ministerstwa Finansów notorycznie padają) lub wieloetapowy onboarding, Temporal ze swoim deterministycznym kodem i polityką *retry* sprawdzi się wyśmienicie.
- **Edge AI (Auto-Blur):** Rewelacyjne podejście do RODO. Zacieranie danych wrażliwych lokalnie (na urządzeniu) przed wysłaniem ich do chmury rozwiązuje setki problemów prawnych i uwiarygadnia aplikację przed audytorami.
- **PWA + Capacitor / Tauri:** Bardzo racjonalny wybór. Z jednej bazy kodu (React) budujemy na wszystkie platformy, unikając pisania osobno w Swift/Kotlin czy C#.
- **Frontend Stack (TanStack Query + Zustand):** Aktualny standard branżowy dla aplikacji React. Idealnie dopasowany do złożonych stanów w aplikacjach ERP.

## 4. Pomysły na dalszą pracę i rekomendacje (Co robimy teraz?)

### A. Ujednolicenie silnika bazy danych (Rozważ Supabase)
Zamiast łączyć GCP Cloud SQL z Firestore, sugeruję rozważyć **Supabase** (lub pozostanie przy GCP, ale z całkowitą rezygnacją z Firestore na rzecz wyłącznie PostgreSQL i nakładki Hasura / Graphile dla powiadomień Realtime). System księgowy i ERP **musi** być silnie relacyjny. PostgreSQL natywnie obsługuje Row-Level Security (RLS) co świetnie pasuje do koncepcji Tenantów.

### B. Zmiana strategii autoryzacji (Multi-Tenancy)
Odejście od trzymania wszystkich ról w Custom Claims tokena JWT. Zamiast tego token JWT powinien identyfikować jedynie użytkownika, a każda prośba (request) powinna weryfikować pozycję użytkownika w tabeli członkostwa w bazie danych (cached w Redis lub w pamięci serwera), co omija limity Firebase Auth.

### C. Faza 0 – Oczyszczenie i Szkielet (Action Item na teraz)
W katalogu `CompanyOS` mamy już jakiś zalążek aplikacji. Powinniśmy:
1. Uporządkować monorepo zgodnie z Twoim planem integracyjnym.
2. Zbudować i wdrożyć fundamentalny, ale w pełni działający system autoryzacji i wyboru Tenanta.
3. Zaślepiać (mockować) zaawansowane moduły AI, a skupić się najpierw na żelaznym działaniu nawigacji, przełączania kontekstu i routingów z ochroną tras.

### D. Wyodrębnienie modułu "Czas Pracy i Kanban" jako MVP
Zostawmy KSeF, PSD2 i skomplikowaną księgowość na później. Sukces "Work OS" można udowodnić najpierw wypuszczając solidny system Geofencing + Rejestracja Czasu Pracy + Kanban. Gdy to zacznie być stabilne, dołożymy moduł faktur. To najbezpieczniejsza i najszybsza ścieżka do walidacji biznesowej.

---
**Czekam na Twoją decyzję.** Od czego zaczynamy? Czy skupiamy się na uporządkowaniu frontendu i budowie szkieletu, czy wolisz najpierw przebudować architekturę bazodanową?
