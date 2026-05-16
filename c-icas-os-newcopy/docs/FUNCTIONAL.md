# Dokumentacja Funkcjonalna - FieldTime Work OS

## 1. Główny Cel i Przeznaczenie
Aplikacja ma na celu dokładne, elastyczne i zautomatyzowane rejestrowanie czasu pracy oraz powiązanych działań projektowych (notatki, zdjecia) dla pracowników terenowych. Udostępnia również potężne narzędzia backend-office, zintegrowane zarządzanie dokumentacją (DMS) oraz rygorystyczne przestrzeganie procedur RODO i WORM.

## 2. Moduły i Ich Funkcje

### 2.1. Moduł Rejestracji Czasu (`timeTracking`)
*   **Start/Stop z detekcją miejsca:** Manualne i automatyczne (geo-bazowane) rejestrowanie pobytu, trasy z projektu do projektu.
*   **Dowody cyfrowe:** Dodawanie zdjęć, dodawanie notatek oraz zdjęć rachunków, przypisywane do konkretnego bloku czasu.
*   **Edycja manualna:** Możliwość poprawy logu czasu przez pracownika (z obligatoryjnym oflagowaniem "*edytowano manualnie*").

### 2.2. Moduł Zarządzania Projektami i Zespołami (`projects`)
*   **Tablice Kanban i Zadania:** Przydział zadań z terminami, estymacją (AI wpierające planowanie), tablice publiczne/prywatne.
*   **Zasoby i Budżetowanie:** Kontrola zasobów międzydziałowych i współdzielonych, weryfikacja stopnia wykorzystania budżetu projektu.

### 2.3. Cyfrowy Skarbiec i Zarządzanie Dokumentami (`dms`)
*   **Archiwum WORM:** Niezmienne w czasie (Write Once Read Many) archiwizowanie dowodów i faktur bez możliwości ich usunięcia i ominięcia w procesach audytowych.
*   **Prywatna Kieszeń (Offline / Edge):** Przestrzeń przechowująca skany zrzutów lokalnie na telefonie pracownika chroniąca przed nieautoryzowanym udostępnieniem do chmury firmowej (RODO), zapewniając wsparcie działania w trybie braku sieci (Offline Scanning).
*   **Skaner AI & Auto-Blur:** Możliwość inteligentnego skanowania i obróbki dokumentów (np. rachunków prywatnych z zakupami dla firmy). Wykorzystuje Google Gemini Vision LLM do weryfikacji i naniesienia "czarnych prostokątów" na dane poufne (np. saldo konta) przed przeniesieniem z Prywatnej Kieszeni do przestrzeni dyskowej firmy.

### 2.4. Ustawienia Systemowe i Personalizacja UI (`settings`)
*   **Tryb analityczny (Tech Names UI):** W sekcji ustawień interfejsu (UI) użytkownik/administrator posiada opcję "Pokaż techniczne nazwy pól", co wyzwala globalne dopisywanie nazw propertisów lub metod (np. `(_addDoc)`, `(isPrivate)`) obok etykiet interfejsu dla sprawniejszego debugowania logiki tworzenia dokumentów i encji API.

### 2.5. Moduł Komunikacyjny i Przepływu (W planach)
*   **Komunikacja:** Czat jedno i wieloosobowy, dedykowane kanały komunikacji.
*   **Powiadomienia:** Moduł konfigurowanych, profilowanych notyfikacji z regułami Administratora.

### 2.6. Integracja i AI Asystent
*   **Asystent AI:** Odpowiada na pytania proceduralne HR, doradza w logowaniu tras.
*   **Ujednolicone Google Cloud:** Całkowite bazowanie na spójnym ekosystemie Cloud Functions, Gemini oraz Firebase (porzucono API zewnętrzne z innych chmur).
*   **Wielojęzyczność:** PL / EN uogólnione w aplikacji.

### 2.7 Dodatkowe funkcje wspierające
*   **Zarządzanie Offline:** Ostrzeganie o braku zasięgu, obsługa zapisu dokumentów oraz logowania akcji (bufor) i re-synchronizacja w momencie wykrycia sieci.
*   **Elektroniczne Podpisy:** Generowany dowód protokołowy (pdf) na koniec dnia podbijany cyfrowo.
