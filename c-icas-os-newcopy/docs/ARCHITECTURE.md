# Dokumentacja Architektoniczna - FieldTime Work OS

## 1. Założenia Architektoniczne
System budowany jest w oparciu o architekturę **Modularnego Monolitu (Modulith) na Front-endzie** z użyciem **React.js** oraz **Vite**. Głównym wektorem izolacji są "Moduły" (np. `TimeTrackingModule`, `ProjectsModule`, `DMSModule`), które są wczytywane leniwie (Lazy Loading). Takie podejście pozwala na niezależny rozwój, testowanie oraz wymienność każdego z elementów bez ryzyka uszkodzenia rdzenia systemu.

Jako nadrzędna reguła ekosystemowa obowiązuje **Jednolita Architektura Dostawcy (Unified Google Cloud)**. Wszystkie usługi backendowe, funkcje serwerowe, autoryzacja oraz przechowywanie danych opierają się wyłącznie na środowisku Google (Firebase, Google Cloud Functions, Google Cloud Storage, Google Gemini). Z systemu usunięto integracje z innymi dostawcami (np. Azure).

## 2. Stos Technologiczny
*   **Web/PWA (Mobile & Desktop):** React 19, TypeScript, Vite. PWA umożliwia działanie jak natywna aplikacja na Androidzie i iOS.
*   **Stylizacja:** Tailwind CSS w połączeniu z `clsx` i `tailwind-merge` (szablon responsywny, Mobile-First).
*   **Routing i Stan:** `react-router-dom` dla nawigacji, wielokontekstowe zarządzanie stanem uwzględniające ustawienia użytkownika (np. tryb programisty dla nazw technicznych).
*   **Baza Danych i Backend (Google Cloud Only):** Firebase Firestore (NoSQL) z regułami bezpieczeństwa. Firebase Auth (Google Login).
*   **Usługi Serwerowe API:** Google Cloud Functions (zastąpienie np. Azure Functions dla usług zewnętrznych takich jak CalSyncPro).
*   **Wielojęzyczność:** `i18next` z `react-i18next`.

## 3. Izolacja Funkcjonalna (Zasada Izolacji)
*   **Katalog główny `/src/modules/`:** Każdy dział (np. `timeTracking`, `projects`, `admin`, `dms`, `finance`) to w pełni odizolowany folder. Posiada własne widoki, logikę biznesową, kontrolery i połączenie do bazy. Nie współdzieli stanu z innymi modułami poza ścisłymi interfejsami (API klienta).
*   **Brak ukrytych referencji:** Edycja logiki kalendarza nigdy nie wpłynie na dokumenty, ponieważ ich granice ładowania.

## 4. Dodatkowe Rozwiązania Architektoniczne
1.  **PWA, Offline-First i Device Edge:** Wykorzystanie IndexedDB do buforowania danych lokalnych i skanów (np. "Prywatna Kieszeń" w DMS). Pliki skanowane z chronionymi danymi RODO mogą pozostawać wyłącznie na urządzeniu użytkownika bez synchronizacji w chmurze, do czasu explicit transferu z cenzurą.
2.  **Geofencing i Automatyzacja:** Algorytm detekcji oparty na GPS API przeglądarki, weryfikujący automatyczne powiadomienia o wejściu/wyjściu ze strefy projektu, odciążający manualne działanie.
3.  **Modularny Storage z AI (WORM):** Integracja autoryzowanych repozytoriów danych obsługujących mechanikę WORM (Write Once Read Many). Wszelkie operacje zapisu i klasyfikacji mogą wykorzystywać Google Vision LLM z "Zero Data Retention" - dane przetwarzane są w pamięci bez ich magazynowania na modelach przed cenzurą (Auto-Blur).
4.  **Bezpieczeństwo (AES-256):** Symulacja transparentnego szyfrowania załączników. Każda synchronizacja danych powiązanych z firmą wywoływana jest poprzez ścisłe mechanizmy weryfikujące.

## 5. Przepływ Danych (Data Flow)
Zdarzenie UI -> Logika Modułu -> Autoryzacja i Parametry UI (ustawienia techniczne) -> Adapter DB -> Baza Danych Firestore / Edge (Local) -> Aktualizacja UI. Tryb Offline jest pełnoprawnym środowiskiem wykorzystującym IndexedDB.

### Obługa Multi-Tab i Multi-Window (Synchronizacja)
System jest z założenia zaprojektowany do jednoczesnej pracy w wielu kartach przeglądarki (Multi-Tab) oraz w przyszłości w wielu oknach aplikacji desktopowej Tauri (Multi-Window). 
*   **Architektura stanu:** Wykorzystujemy natywną funkcjonalność Firestore (uruchomiono `persistentMultipleTabManager`), która koordynuje dostęp do bazy IndexedDB z wielu kart. Oznacza to, że karty "nie walczą" ze sobą o zasoby, a tworzą wspólną sieć komunikacji lokalnej.
*   **Synchronizacja w czasie rzeczywistym:** Zmiana dokonana na fakturze w "Karcie 1" za pomocą nasłuchu `onSnapshot` w ułamku sekundy automatycznie odświeży stan widoku w "Karcie 2". 
*   **Bezkonfliktowość:** Gwarantuje to ominięcie problemu stale rozsynchronizowanych stanów sesji. Użytkownik może edytować pracownika w jednym oknie, a w drugim obserwować koszty projektu bez utraty danych.

## 6. Strategia Targetów (Cross-Platform)
*   **PWA = jeden codebase dla 5 platform:** (Web, Android, iOS, Windows, macOS). Budujemy jeden spójny rdzeń za pomocą React.
*   **Capacitor:** Doklejony jedynie jako wrapper dla iOS i Android tam, gdzie potrzebny jest dostęp do ścisłych, natywnych API telefonu niedostępnych dla PWA (geofencing background, API biometryczne, native push notifications).
*   **Tauri:** Wykorzystywany dla wersji desktopowej. Generuje natywny, ekstremalnie wydajny pakiet, dając plik wyjściowy około 10× mniejszy niż Electron i mniejsze zużycie pamięci RAM.
*   **Zyski biznesowe:** Zero kompromisów funkcjonalnych względem Fluttera czy React Native, przy jednoczesnym obniżeniu kosztów utrzymania codebase'u i zatrudnienia o ok. 40%.

## 7. Workflow i Organizacja Dokumentacji
*   **Struktura dokumentu (OneNote Ready):** Wszystkie zadania oraz czeklisty typu `- [ ]` w plikach `.md` są automatycznie optymalizowane pod konwersję na interaktywne tagi "To Do" w OneNote. Sekcje markdown mają wymuszoną, ścisłą hierarchię (H1/H2/H3) odpowiadającą drzewu nawigacji w OneNote.
*   **Granulacja Zadań:** Zadania są atomizowane na małe pule implementacyjne wykorzystujące ID. Każde zejściowe ID zadania (np. `AUTH-IMP-03`) jest z założenia pojedynczą zmianą rzutującą na jeden Pull Request (PR) -> z ograniczeniem limitowym do max ≤ 200 linii kodu dla sprawniejszego przeglądu (Code Review) i wycenianym na zaledwie ≤ 4h pracy agenta lub inżyniera AI.
*   **Biznesowe EPIC-i:** EPIC-i grupują te drobne zmiany i są atomowe z biznesowego punktu widzenia — tzn. po ukończeniu cyklu przypisanego EPIC-a moduł docelowy staje się sam w sobie w pełni funkcjonalny.
