# **Kompleksowa Specyfikacja Systemu: NoFiCo (Smart Financial Controller)**

Poniższy dokument stanowi kompletne źródło prawdy (Single Source of Truth) dla procesu deweloperskiego aplikacji NoFiCo. Zawiera Wizję Produktu (PRD), Architekturę, Wytyczne UI/UX oraz Historie Użytkownika.

## ---

**DOKUMENT 1: Product Requirements Document (PRD)**

### **1\. Wizja Produktu**

NoFiCo to innowacyjna aplikacja SaaS (Web, Windows, macOS, iOS, Android) pełniąca rolę inteligentnego asystenta rozrachunków właścicielskich i controllingu. Oparta o otwartą bankowość w ramach dyrektywy PSD2 (usługi AIS \- Account Information Service) i zaawansowane modele AI, eliminuje chaos w wydatkach mieszanych, zabezpiecza przedsiębiorcę od strony prawno-skarbowej i dostarcza biurom rachunkowym bezbłędne, ustrukturyzowane paczki danych.

### **2\. Architektura Ról i Wielofirmowość (Multi-tenant)**

System opiera się na architekturze RBAC (Role-Based Access Control). Użytkownik loguje się jednym kontem (SSO) i ma dostęp do wielu "Przestrzeni Roboczych" (np. 3 różne spółki z o.o. i 1 JDG).

* **Właściciel (Owner):** Pełen dostęp. Autoryzuje PSD2, tworzy projekty, posiada możliwość konfiguracji wielu skrzynek e-mail do komunikacji dla różnych podmiotów (np. wysyłanie powiadomień z jan@firma1.pl dla jednej spółki i jan@firma2.com dla drugiej).  
* **Administrator:** Zarządza integracjami, KSeF, API oraz zewnętrznymi repozytoriami (np. serwery NAS).  
* **Manager:** Akceptuje wydatki pracowników, zarządza budżetem projektów.  
* **Pracownik:** Zgłasza wydatki z kart firmowych oraz wnioskuje o zwroty za płatności z kont prywatnych na rzecz firmy (Out-of-pocket).  
* **Księgowość (Read Only / API):** Posiada dostęp w trybie tylko do odczytu lub dostęp przez API do pobierania paczek księgowych. Możliwe jest łączenie ról – np. Księgowa ma dostęp "Read Only" w 20 firmach swoich klientów, a we własnym biurze rachunkowym jest Administratorem.

### **3\. Kluczowe Moduły**

#### **A. Agregacja i Import Danych Finansowych**

* **PSD2 (Open Banking):** Automatyczne pobieranie transakcji na żywo za zgodą użytkownika.  
* **Import plików bankowych:** Obsługa formatów CSV, PDF (parser wyciągów) oraz nowego standardu bankowości korporacyjnej ISO 20022, w tym ustrukturyzowanych plików XML wyciągów camt.053.  
* **Zrzuty ekranu (Screenshots) z Proaktywnym AI Cenzorem:** Zgodnie z prawem, zrzut ekranu może być dowodem księgowym, jeśli zawiera datę, kwotę, strony i przedmiot operacji. Moduł pozwala wgrać zrzut z telefonu, a model AI analizuje go pod kątem kompletności tych danych.  
  * *Auto-Blur (Ochrona Tajemnicy):* Asystent AI automatycznie wykrywa i proponuje zamazanie danych nadmiarowych (np. ogólne saldo konta, inne prywatne przelewy). Użytkownik musi ręcznie zatwierdzić lub skorygować te sugestie przed zapisaniem pliku, dzięki czemu przejmuje pełną i świadomą odpowiedzialność za ostateczny kształt dokumentu, a księgowa nie ma dostępu do wrażliwych danych finansowych.

#### **B. Inteligentna Kategoryzacja i Rozrachunki**

* **Swipe & Match:** Interfejs karciany. Rozwinięcie karty pokazuje szczegóły z faktur ustrukturyzowanych lub OCR. Użytkownik "odrzuca" transakcje prywatne i "zatwierdza" firmowe.  
* **Voice Notes & Whisper AI:** Pracownik, zamiast pisać powód wydatku, nagrywa notatkę głosową. System wykorzystuje model Whisper AI do błyskawicznej transkrypcji mowy na tekst (STT).  
* **Rozrachunki "Out-of-Pocket":** Jeśli pracownik lub właściciel płaci prywatnie za firmową fakturę, system automatycznie generuje dowód wewnętrzny (wniosek o zwrot / polecenie księgowania).

#### **C. Śledzenie Kosztów (Split & Cost Centers)**

* **Import struktury MPK:** Bezpośredni import słowników, Miejsc Powstania Kosztów (MPK) i projektów za pomocą plików XML/CSV bezpośrednio z systemów ERP takich jak Comarch Optima czy Symfonia.  
* **Split Invoice:** Możliwość rozbicia jednej faktury pobranej z KSeF na różne projekty (np. przypisanie 50m rur z jednej pozycji na fakturze do Projektu A, a reszty do Projektu B).

#### **D. Legal & Compliance Vault (Zabezpieczenie Prawne)**

* **Generator Umów i Rachunków:** Tworzenie umów najmu prywatnego lokalu (np. pokoju na biuro) dla własnej spółki, uwzględniające limitowaną stawkę ryczałtu 8,5% od przychodów do 100 tys. zł. System generuje też comiesięczne rachunki za czynsz i media.  
* **Strażnik Art. 210 KSH:** Przy umowach między spółką z o.o. a jej członkiem zarządu, system alertuje i blokuje wygenerowanie dokumentu, dopóki w repozytorium nie znajdzie się skan uchwały zgromadzenia wspólników powołującej specjalnego pełnomocnika, co chroni umowę przed bezwzględną nieważnością. W przypadku spółek jednoosobowych informuje o wymogu aktu notarialnego.

#### **E. Eksport Księgowy, Dystrybucja i Skalowanie**

* **API i NAS:** Księgowa może pobierać dane przez dedykowane API, jako pliki ZIP/CSV/XML, linkiem wysyłanym na e-mail, lub system może automatycznie eksportować paczki na prywatne serwery NAS klienta.  
* **Wielojęzyczność i Gotowość Międzynarodowa:** Pełne tłumaczenie interfejsu (UI) na wiele języków z myślą o ekspansji na rynki zagraniczne (np. obsługa niemieckich standardów archiwizacyjnych GoBD dla oddziałów zagranicznych 1).  
* **Usługi Konsultingowe:** System oferuje płatne pakiety wdrożeniowe z pełną konfiguracją jako usługa premium.

## ---

**DOKUMENT 2: Architektura Systemu i Baza Danych**

### **1\. Architektura Aplikacji**

* **Wieloplatformowość:** Wykorzystanie frameworka (np. Flutter lub React Native) do obsługi wersji Web, Windows, macOS, iOS oraz Android z jednej bazy kodu.  
* **Backend i API:** Architektura oparta o mikrousługi (Microservices), oddzielająca logikę PSD2, integrację KSeF, model Whisper AI oraz silnik wizyjny (OCR/Auto-Blur) od rdzenia bazy danych.

### **2\. Bezpieczeństwo, Archiwizacja i RODO**

* **Zgodność RODO (Prawo do bycia zapomnianym):** System celowo NIE korzysta z technologii publicznego blockchaina do przechowywania danych operacyjnych. Zapis na łańcuchu bloków jest trwałym, nieodwracalnym procesem, który stoi w bezpośrednim konflikcie z Art. 17 RODO nakazującym usunięcie danych osobowych na żądanie.2  
* **WORM Storage:** Zamiast tego archiwum dowodów księgowych oparte jest o chmurową pamięć WORM (Write Once, Read Many). Spełnia to wymogi trwałości i niezmienności nakładane przez ustawę o rachunkowości, pozwalając jednocześnie na zgodne z prawem niszczenie papierowych oryginałów.  
* **AI Compliance:** Wykorzystane modele AI (np. Whisper do transkrypcji notatek) muszą być hostowane lokalnie lub opierać się o licencje Enterprise z klauzulą "Zero Data Retention", co oznacza, że prywatne i finansowe dane nie są wykorzystywane do trenowania zewnętrznych modeli.

### **3\. Struktura Bazy Danych**

* **Typ:** Relacyjna baza danych (PostgreSQL) zapewniająca rygor transakcyjny ACID, połączona z obiektową pamięcią masową (S3) na zaszyfrowane pliki zrzutów ekranu i PDF.  
* **Centralne Encje:** Modele obejmują wielopoziomowe powiązania m.in. dla Tenant (Firma), UserRole (obsługa wielu uprawnień), BankAccount (wraz z historią PSD2), Transaction, Document (Faktura KSeF / Paragon / Zrzut ekranu), CostCenter (MPK zaciągnięte z ERP) oraz LegalVault (repozytorium uchwał).

## ---

**DOKUMENT 3: Wytyczne UI/UX (User Interface & Experience)**

### **1\. Założenia Główne**

* **Nawigacja wokół zadań:** Menu pozbawione finansowego żargonu, oparte na intencjach (np. "Do rozliczenia", "Zwroty", "Dokumenty Prawne").  
* **Szybka Kategoryzacja (Swipe):** Moduł mobilny oparty na kartach transakcji. Przesunięcie karty (Swipe) szybko oddziela prywatne wydatki z firmowego konta, a podgląd typu "akordeon" rozwija się w dół, by ukazać szczegóły asortymentu powiązanej faktury KSeF.

### **2\. Ścieżka Użytkownika dla "AI Guardian" (Zrzuty Ekranu)**

1. Użytkownik wgrywa zrzut ekranu z telefonu.  
2. Wyświetlany jest ekran skanowania ("AI analizuje poprawność dowodu...").  
3. Interfejs wyświetla zrzut ekranu z **zaznaczonymi na zielono** wymaganymi prawem polami (Data, Kwota, Strony transakcji).  
4. Interfejs **podświetla i wstępnie nakłada efekt rozmycia (blur)** na dane zbędne/wrażliwe (np. saldo całkowite rachunku bankowego).  
5. Użytkownik otrzymuje jasny komunikat z prośbą o działanie: *"Zatwierdź zamazane pola lub skoryguj je ręcznie"*. Użytkownik dopasowuje maskę palcem/myszką i zatwierdza widok, biorąc na siebie odpowiedzialność za ostateczny dowód przekazywany księgowości.

### **3\. Wielofirmowość (Switcher)**

* Globalne rozwijane menu (Dropdown) na górze aplikacji pozwalające na bezproblemowe przełączanie się między spółką A, spółką B a JDG, bez konieczności wylogowywania się z systemu.

## ---

**DOKUMENT 4: Historie Użytkownika (User Stories)**

### **1\. Rozrachunki, Kategoryzacja i Rozbijanie Kosztów (Split)**

* **Pracownik (Out-of-Pocket \+ Whisper):** "Jako pracownik, który opłacił fakturę na stacji paliw z prywatnej karty, chcę zrobić jej zdjęcie, oznaczyć jako wydatek firmowy i nagrać krótką notatkę głosową, aby AI automatycznie ją transkrybowało i wygenerowało wniosek o zwrot środków, oszczędzając mój czas w trasie."  
* **Właściciel (Split Invoice & MPK):** "Jako właściciel, po pobraniu ustrukturyzowanej e-faktury z KSeF, chcę podzielić ją na poszczególne pozycje towarowe i przypisać je do różnych Miejsc Powstania Kosztów (MPK), których słownik wcześniej zaimportowałem z Optimy, aby precyzyjnie śledzić budżet każdego projektu."

### **2\. Ochrona Prawna i Tajemnica Bankowa (Compliance & Privacy)**

* **Właściciel (AI Blur na zrzucie ekranu):** "Jako przedsiębiorca wgrywający zrzut ekranu z banku jako dowód opłaty za subskrypcję, chcę, aby asystent AI zasugerował zamazanie mojego ogólnego salda konta i innych przelewów. Chcę mieć możliwość zatwierdzenia tego rozmycia, aby moja księgowa widziała tylko to, co jest wymagane prawnie, a moje finanse pozostały poufne."  
* **Właściciel (Art. 210 KSH):** "Jako jedyny wspólnik i prezes zarządu, chcę zawrzeć umowę najmu biura ze swoją spółką, a system ma mnie poinformować o wymogu zachowania formy aktu notarialnego i poprosić o wgranie tego dokumentu do bezpiecznego repozytorium, abym uniknął sankcji za podpisanie nieważnej umowy."

### **3\. Ustawienia Multitenant (Wielofirmowość i Komunikacja)**

* **Seryjny Przedsiębiorca:** "Jako osoba posiadająca trzy firmy, chcę z jednego pulpitu zarządzać nimi wszystkimi i mieć możliwość ustawienia innej skrzynki e-mail nadawcy dla powiadomień każdej z nich, aby zachować pełen profesjonalizm komunikacji z kontrahentami i księgowymi poszczególnych spółek."

### **4\. Interfejs Księgowości i Dystrybucja**

* **Księgowy (API, NAS, ISO 20022):** "Jako obsługujący firmę księgowy, chcę na koniec miesiąca automatycznie pobrać pliki wyeksportowane z aplikacji klienta wprost na mój serwer NAS lub zaciągnąć je do mojego ERP przez udostępnione API. Jeśli aplikacja generuje paczki przelewów, oczekuję ich w formacie ISO 20022 (XML), ponieważ mój bank nie obsługuje już starych plików."

#### **Works cited**

1. Germany Updates GoBD Rules to Reflect Mandatory E-Invoicing \- Comarch, accessed April 8, 2026, [https://www.comarch.com/trade-and-services/data-management/legal-regulation-changes/germany-updates-gobd-rules-to-reflect-mandatory-e-invoicing/](https://www.comarch.com/trade-and-services/data-management/legal-regulation-changes/germany-updates-gobd-rules-to-reflect-mandatory-e-invoicing/)  
2. Ultimate Guide to Blockchain and GDPR Compliance \- Phoenix Strategy Group, accessed April 8, 2026, [https://www.phoenixstrategy.group/blog/ultimate-blockchain-gdpr-compliance-guide](https://www.phoenixstrategy.group/blog/ultimate-blockchain-gdpr-compliance-guide)  
3. When Blockchain Immutability Meets the GDPR Article 17 Right to be Forgotten \- Secure Privacy, accessed April 8, 2026, [https://secureprivacy.ai/blog/blockchain-immutability-vs-gdpr-article-17-right-to-be-forgotten](https://secureprivacy.ai/blog/blockchain-immutability-vs-gdpr-article-17-right-to-be-forgotten)