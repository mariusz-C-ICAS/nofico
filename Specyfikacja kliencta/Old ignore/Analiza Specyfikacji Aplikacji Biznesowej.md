# **Kompleksowa Specyfikacja Systemu: NoFiCo (Smart Financial Controller)**

Poniższy dokument stanowi kompletne źródło prawdy (Single Source of Truth) dla procesu deweloperskiego aplikacji NoFiCo. Zawiera Wizję Produktu (PRD), Architekturę, Wytyczne UI/UX oraz Historie Użytkownika.

## ---

**DOKUMENT 1: Product Requirements Document (PRD)**

### **1\. Wizja Produktu**

NoFiCo to innowacyjna aplikacja SaaS (Web, Windows, macOS, iOS, Android) pełniąca rolę inteligentnego asystenta rozrachunków właścicielskich i controllingu. Oparta o otwartą bankowość (PSD2) i zaawansowane modele AI, eliminuje chaos w wydatkach mieszanych, zabezpiecza przedsiębiorcę od strony prawno-skarbowej i dostarcza biurom rachunkowym bezbłędne, ustrukturyzowane paczki danych.

### **2\. Architektura Ról i Wielofirmowość (Multi-tenant)**

System opiera się na architekturze RBAC (Role-Based Access Control). Użytkownik loguje się jednym kontem (SSO) i ma dostęp do wielu "Przestrzeni Roboczych" (np. 3 różne spółki z o.o. i 1 JDG).

* **Właściciel (Owner):** Pełen dostęp. Autoryzuje PSD2, tworzy projekty, posiada możliwość konfiguracji wielu skrzynek e-mail do komunikacji (np. wysyłanie powiadomień z jan@firma1.pl i jan@firma2.com).  
* **Administrator:** Zarządza integracjami, KSeF, API oraz zewnętrznymi repozytoriami (np. serwery NAS).  
* **Manager:** Akceptuje wydatki pracowników, zarządza budżetem projektów.  
* **Pracownik:** Zgłasza wydatki z kart firmowych oraz wnioskuje o zwroty za płatności z kont prywatnych (Out-of-pocket).  
* **Księgowość (Read Only / API):** Posiada dostęp w trybie tylko do odczytu lub dostęp przez API do pobierania paczek księgowych. Osoba ta może pełnić rolę Księgowej w 20 firmach i Administratora we własnej.

### **3\. Kluczowe Moduły**

#### **A. Agregacja i Import Danych Finansowych**

* **PSD2 (Open Banking):** Automatyczne pobieranie transakcji na żywo.  
* **Import plików:** Obsługa formatów CSV, PDF (parser wyciągów) oraz nadchodzącego standardu bankowości korporacyjnej ISO 20022 (pliki XML, np. camt.053).  
* **Zrzuty ekranu (Screenshots) z AI Guardian:** Moduł pozwalający wgrać zrzut ekranu z telefonu. Model AI (Vision) analizuje obraz pod kątem wymogów prawa dowodowego (sprawdza obecność daty, kwoty, stron transakcji i przedmiotu). **Auto-Blur:** AI automatycznie rozpoznaje i proponuje rozmycie/zamazanie danych nadmiarowych (np. ogólne saldo konta, inne przelewy), pozostawiając decyzję o zatwierdzeniu cenzury użytkownikowi, co chroni tajemnicę bankową przed księgowością.

#### **B. Inteligentna Kategoryzacja i Rozrachunki**

* **Swipe & Match:** Interfejs karciany. Rozwinięcie karty pokazuje dane z KSeF lub OCR. Użytkownik "odrzuca" transakcje prywatne i "zatwierdza" firmowe, korygując ewentualne sugestie AI.  
* **Voice Notes & Whisper AI:** Pracownik zamiast pisać powód wydatku, nagrywa notatkę głosową. System wykorzystuje lokalny lub bezpieczny model Whisper AI (zero data retention) do niemal natychmiastowej transkrypcji na tekst, co pozwala uniknąć naruszeń RODO i wycieku tajemnic finansowych.  
* **Rozrachunki Out-of-Pocket:** Jeśli pracownik lub właściciel płaci prywatnie za firmową fakturę, system automatycznie generuje wniosek o zwrot (polecenie księgowania / notę obciążeniową), łącząc go ze zrzutem ekranu lub fakturą.

#### **C. Śledzenie Kosztów (Split & Cost Centers)**

* **Import MPK:** Bezpośredni import struktury Miejsc Powstania Kosztów (słowników, projektów, budów) w formatach XML/CSV z systemów ERP takich jak Comarch Optima, Symfonia, wFirma.  
* **Split Invoice:** Możliwość rozbicia jednej faktury asortymentowej z KSeF na różne projekty i tagi (np. przypisanie 50m rur do Projektu A i 100m do Projektu B).

#### **D. Legal & Compliance Vault (Zabezpieczenie Prawne)**

* **Generator Umów i Rachunków:** Tworzenie umów najmu prywatnego lokalu dla własnej spółki (uwzględniające podatek ryczałtowy 8,5%) i automatyczne generowanie comiesięcznych rachunków za czynsz i media.  
* **Strażnik Art. 210 KSH:** System blokuje/ostrzega przed wygenerowaniem umowy pomiędzy członkiem zarządu a spółką z o.o., jeśli w repozytorium (Vault) nie znajduje się skan uchwały zgromadzenia wspólników o powołaniu pełnomocnika, chroniąc przed nieważnością umów w świetle prawa.

#### **E. Moduł Księgowy i Dystrybucja**

* Księgowa może pobrać dane jako plik ZIP, CSV, XML lub zestawienie XLSX.  
* **Dystrybucja:** API dla zewnętrznych programów księgowych, eksport bezpiecznymi linkami e-mail (Token URL), wysyłka na chmury (Google Drive/OneDrive) oraz integracja z prywatnymi serwerami NAS.1  
* **Usługi Konsultingowe:** System oferuje użytkownikom płatne pakiety wdrożeniowe (mapowanie kont, ustawienie MPK) jako dodatkowe źródło monetyzacji B2B.  
* **Gotowość Międzynarodowa:** Pełna wielojęzyczność interfejsu (UI) z myślą o unijnej dyrektywie ViDA 2, standardach archiwizacyjnych GoBD (Niemcy) 1 oraz eksporcie plików FEC (Francja).3

## ---

**DOKUMENT 2: Architektura Systemu i Baza Danych**

### **1\. Architektura Aplikacji**

* **Podejście:** Architektura Mikrousług (Microservices) pozwalająca na niezależne skalowanie modułów (np. oddzielny serwis dla OCR, oddzielny dla PSD2).  
* **Frontend:** Wieloplatformowy framework (Flutter lub React Native) umożliwiający kompilację jednej bazy kodu do aplikacji Web, Windows, macOS, iOS oraz Android.  
* **Backend:** Środowisko kontenerowe (Docker/Kubernetes).

### **2\. Bezpieczeństwo i Archiwizacja (Audytowalność)**

* **Rezygnacja z Blockchaina:** Z uwagi na bezpośredni konflikt łańcuchów bloków (trwały zapis) z art. 17 RODO (prawo do bycia zapomnianym), system nie używa publicznych rejestrów DLT.4  
* **Trwały Nośnik (WORM):** Logi audytowe oraz archiwum dokumentów oparte są na chmurowej technologii WORM (Write Once, Read Many). Zapewnia to absolutną zgodność z wymogami niezmienności i trwałości narzucanymi przez UoR oraz niemieckie zasady GoBD.  
* **Szyfrowanie:** AES-256 (w spoczynku) oraz TLS 1.3 (w locie).

### **3\. Baza Danych (Data Model)**

* **Typ:** Relacyjna Baza Danych (RDBMS, np. PostgreSQL) oparta na podwójnym zapisie (Double-entry).  
* **Kluczowe Encje:** Tenant (Firma), User (Użytkownik z rolą per Tenant), Transaction (pobrana z banku), Document (Faktura/Paragon KSeF/OCR), CostCenter (MPK), LegalDocument (Uchwały/Umowy).

## ---

**DOKUMENT 3: Wytyczne UI/UX (User Interface & Experience)**

### **1\. Założenia Główne**

* **Minimalizm Finansowy:** Interfejs musi być pozbawiony szumu informacyjnego. Użytkownik widzi tylko to, co wymaga akcji.  
* **Aplikacja Gestów (Tinder-like):** Główny panel rozrachunków na telefonie obsługiwany kciukiem – przesunięcie karty w lewo/prawo w celu szybkiej kategoryzacji wydatków na prywatne/firmowe.  
* **Akordeon (Accordion UI):** Każda transakcja może zostać rozwinięta, ujawniając podgląd zgranego paragonu lub pozycje z KSeF przed podjęciem decyzji.

### **2\. Moduł AI Guardian (Cenzura Zrzutów Ekranu)**

* **Proces UX:**  
  1. Użytkownik ładuje zrzut ekranu z aplikacji bankowej.  
  2. Ekran ładowania (Processing AI).  
  3. Zrzut ekranu pojawia się z podświetlonymi na zielono wymaganymi polami (Data, Kwota, Odbiorca).  
  4. Czerwone lub zamazane na etapie podglądu pola wskazują sugerowane przez AI dane do ukrycia (np. kwota ogólnego salda konta, lista innych przelewów).  
  5. Użytkownik zatwierdza cenzurę pojedynczym kliknięciem "Akceptuj rozmycie i zapisz", zdejmując z siebie i z księgowości odpowiedzialność za procedowanie nadmiarowych danych.

### **3\. Dostępność i Autoryzacja**

* Wielojęzyczny interfejs zmieniany w locie (PL/EN/DE).  
* Logowanie biometryczne (FaceID / Fingerprint) na urządzeniach mobilnych z obsługą systemowego MFA.

## ---

**DOKUMENT 4: Historie Użytkownika (User Stories)**

### **Role: Właściciel i Seryjny Przedsiębiorca**

1. **Wielofirmowość:** "Jako seryjny przedsiębiorca, chcę za pomocą jednego loginu mieć dostęp do panelu mojej JDG i dwóch Spółek z o.o., abym nie musiał zapamiętywać wielu haseł."  
2. **Multimail:** "Jako Właściciel, chcę podpiąć różne adresy e-mail pod różne spółki w systemie, aby księgowość firmy A dostawała wiadomości z jan@firma-a.pl, a firmy B z jan@firma-b.com."  
3. **Zrzuty Ekranu z AI:** "Jako Właściciel wgrywający zrzut ekranu przelewu jako dowód księgowy, chcę aby AI samo zasugerowało i zamazało na zdjęciu stan mojego prywatnego konta, abym nie musiał tego robić ręcznie w edytorze zdjęć i nie udostępniał księgowej wrażliwych informacji."  
4. **Art. 210 KSH:** "Jako Właściciel Spółki z o.o., chcę wygenerować umowę najmu mojego prywatnego pokoju, a system ma zablokować proces i zażądać wgrania pełnomocnictwa ze zgromadzenia wspólników, abym uniknął podpisania nieważnej z mocy prawa umowy."  
5. **Podział Kosztów (Split):** "Jako Właściciel firmy budowlanej, chcę kliknąć w dużą fakturę pobraną z KSeF i rozdzielić poszczególne pozycje (np. worki cementu) przypisując je do różnych Projektów (MPK), których listę system zaimportował wcześniej z programu księgowego Optima."

### **Role: Pracownik Liniowy i Manager**

6. **Out-of-Pocket & Whisper:** "Jako Pracownik w trasie, który zapłacił za paliwo własną kartą, chcę zrobić zdjęcie faktury, nacisnąć 'Wydatek prywatny na rzecz firmy' i nagrać krótką notatkę głosową, aby system sam zamienił mój głos na tekst uzasadnienia i wygenerował wniosek o zwrot środków na moje konto."  
7. **Akceptacja mobilna:** "Jako Manager, chcę otrzymywać natychmiastowe powiadomienia o nowych wnioskach moich pracowników i móc je akceptować lub odrzucać jednym przyciskiem w aplikacji."

### **Role: Księgowa (Zewnętrzne Biuro Rachunkowe)**

8. **Import Bankowy (ISO 20022):** "Jako Administrator konta klienta, który odmawia integracji API bankowego, chcę móc zaimportować ręcznie plik XML (camt.053) lub PDF z historią konta, aby zaktualizować bazę rozrachunków."  
9. **Dystrybucja Danych:** "Jako Księgowa, nie chcę logować się codziennie do systemu – chcę otrzymywać raz w miesiącu paczkę plików wyeksportowaną prosto na dysk sieciowy NAS mojego biura lub generować dane przez bezpośrednie połączenie API do mojego programu Symfonia."

#### **Works cited**

1. GoBD \- Principles for electronic accounting \- TeamDrive, accessed April 8, 2026, [https://teamdrive.com/en/knowledge/german-gobd/](https://teamdrive.com/en/knowledge/german-gobd/)  
2. VAT in the Digital Age (ViDA) \- Taxation and Customs Union, accessed April 8, 2026, [https://taxation-customs.ec.europa.eu/taxation/vat/vat-digital-age-vida\_en](https://taxation-customs.ec.europa.eu/taxation/vat/vat-digital-age-vida_en)  
3. France \- Sovos Docs, accessed April 8, 2026, [https://docs.sovos.com/en/indirect-tax/indirect-tax-products/data-and-analytics/saf-t/country-requirements/france](https://docs.sovos.com/en/indirect-tax/indirect-tax-products/data-and-analytics/saf-t/country-requirements/france)  
4. Ultimate Guide to Blockchain and GDPR Compliance \- Phoenix Strategy Group, accessed April 8, 2026, [https://www.phoenixstrategy.group/blog/ultimate-blockchain-gdpr-compliance-guide](https://www.phoenixstrategy.group/blog/ultimate-blockchain-gdpr-compliance-guide)