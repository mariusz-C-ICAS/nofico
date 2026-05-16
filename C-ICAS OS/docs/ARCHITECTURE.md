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

## 6. Strategia Targetów (Cross-Platform)
*   **PWA = jeden codebase dla 5 platform:** (Web, Android, iOS, Windows, macOS). Budujemy jeden spójny rdzeń za pomocą React.
*   **Capacitor:** Doklejony jedynie jako wrapper dla iOS i Android tam, gdzie potrzebny jest dostęp do ścisłych, natywnych API telefonu niedostępnych dla PWA (geofencing background, API biometryczne, native push notifications).
*   **Tauri:** Wykorzystywany dla wersji desktopowej. Generuje natywny, ekstremalnie wydajny pakiet, dając plik wyjściowy około 10× mniejszy niż Electron i mniejsze zużycie pamięci RAM.
*   **Zyski biznesowe:** Zero kompromisów funkcjonalnych względem Fluttera czy React Native, przy jednoczesnym obniżeniu kosztów utrzymania codebase'u i zatrudnienia o ok. 40%.

## 7. Infrastructure Layer — Wdrożone komponenty (2026-05-16)

### 7.1 Shared Libraries (`src/shared/lib/`)

| Biblioteka | Ścieżka | Opis |
|-----------|---------|------|
| Secrets Vault | `secrets-vault/services/vault.ts` | AES-256-GCM, PBKDF2 key derivation, Web Crypto API |
| Event Bus | `event-bus/services/eventBus.ts` | TypedEventBus extends EventTarget, typed AppEventMap |
| Validators | `validators/services/validators.ts` | NIP, PESEL, REGON, IBAN (mod97), KRS, kod pocztowy |
| Validator UI | `validators/components/` | NIPInput, IBANInput (auto-spacje), PESELInput, REGONInput |
| Remote Config | `remote-config/index.ts` | Firebase Remote Config, useRemoteFlag hook, 1h cache |
| Offline Sync | `offline-sync/services/syncQueue.ts` | Dexie.js queue, retry 5×, Firestore flush |
| Geolocation | `geolocation/services/geoService.ts` | Google Maps reverse geocode + haversine distance |
| AI — Gemini | `ai/gemini.ts` | generateText, streamText, chat, analyzeDocument (multimodal) |
| AI — Document AI | `ai/documentAi.ts` | CF proxy: OCR faktur, NIP/PESEL extraction |
| AI — Speech-to-Text | `ai/speechToText.ts` | CF proxy + MediaRecorder browser recording |
| AI — Cloud DLP | `ai/cloudDlp.ts` | CF proxy + quickScanPii heuristic (regex PESEL/NIP/IBAN) |
| Analytics — BigQuery | `analytics/bigquery.ts` | triggerBqExport, getBqJobStatus; 3 datasets |
| Pub/Sub (client) | `pubsub/index.ts` | In-process bus + CF proxy publisher, AppTopic union type |
| Hotkeys | `hotkeys/` | Global keydown registry, useHotkey/useHotkeyList hooks |
| FCM Topics | `fcm/topics.ts` | subscribe/unsubscribe/broadcast CF proxies + Firestore prefs |
| MediaPipe | `mediapipe/index.ts` | Lazy face/object detection, WASM CDN, dynamic import |
| Payments — PayU | `payments/payuClient.ts` | createPayuOrder, getPayuOrderStatus |
| Payments — Tink | `payments/tinkClient.ts` | PSD2 bank accounts + transactions |
| Notification Service | `notification-service/index.ts` | sendNotification + bulk, Firestore write |

### 7.2 Shared Components (`src/shared/components/`)

| Komponent | Opis |
|-----------|------|
| `ErrorBoundary.tsx` | React class, Firebase Analytics `app_error`, dark fallback UI |
| `HotkeyProvider.tsx` | Global app hotkeys: Alt+D/W/F/H/C, Ctrl+N/K/S |

### 7.3 Cloud Functions (`functions/src/`)

| Funkcja | Plik | Opis |
|---------|------|------|
| `sendEmailOnNotification` | `index.ts` | Trigger: nowe powiadomienie → email (nodemailer) |
| `checkSlaReminders` | `index.ts` | Scheduled: co 4h sprawdź przekroczone SLA |
| `validateVIES` | `integrations/viesProxy.ts` | EC VIES REST API |
| `validateBialaLista` | `integrations/bialaListaProxy.ts` | MF Biała Lista API |
| `validateGUSBIR` | `integrations/gusBirProxy.ts` | GUS BIR1 SOAP proxy |
| `checkZusInsured` | `integrations/zusProxy.ts` | ZUS PUE status ubezpieczenia |
| `checkZusContributions` | `integrations/zusProxy.ts` | ZUS PUE zaległości składkowe |
| `kmsWrap` / `kmsUnwrap` | `integrations/kmsVault.ts` | Cloud KMS envelope encrypt/decrypt z AAD |
| `vertexSearchDocuments` | `integrations/vertexSearch.ts` | Vertex AI Search: wyszukiwanie dokumentów |
| `vertexIndexDocument` | `integrations/vertexSearch.ts` | Vertex AI Search: indeksowanie dokumentów |
| `publishEvent` | `pubsub/eventBridge.ts` | Cloud Pub/Sub publisher z @google-cloud/pubsub |
| `enqueueTask` | `tasks/cloudTasks.ts` | Cloud Tasks enqueue z opóźnieniem |
| `deleteTask` | `tasks/cloudTasks.ts` | Cloud Tasks usuwanie zakolejkowanego zadania |
| `fcmTopicSubscribe` | `fcm/topicManager.ts` | FCM: subskrypcja tematu |
| `fcmTopicUnsubscribe` | `fcm/topicManager.ts` | FCM: wypisanie z tematu |
| `fcmTopicBroadcast` | `fcm/topicManager.ts` | FCM: broadcast do tematu |
| `healthCheck` | `health/healthCheck.ts` | Ping Firestore, latencyMs, 503 jeśli degraded |

### 7.4 Middleware (`functions/src/_shared/`)

| Middleware | Opis |
|-----------|------|
| `withAuth` | Firebase ID token verify |
| `withAuthAndAudit` | Jak wyżej + audit log |
| `requireRole(...roles)` | Role-based access control |
| `withTenant` | Tenant membership check (X-Tenant-Id header) |

### 7.5 Google-First Policy

- Zakaz: `@sentry/react`, `leaflet`, `react-leaflet`, `resend`, `stripe`
- Audyt: `npm run audit:google-first` (skrypt `scripts/audit-google-first.mjs`)
- Husky pre-commit: automatyczny audit przed każdym commitem
- Płatności: PayU / Tpay / P24 (lokalne polskie procesory zamiast Stripe)

## 8. Workflow i Organizacja Dokumentacji
*   **Struktura dokumentu (OneNote Ready):** Wszystkie zadania oraz czeklisty typu `- [ ]` w plikach `.md` są automatycznie optymalizowane pod konwersję na interaktywne tagi "To Do" w OneNote. Sekcje markdown mają wymuszoną, ścisłą hierarchię (H1/H2/H3) odpowiadającą drzewu nawigacji w OneNote.
*   **Granulacja Zadań:** Zadania są atomizowane na małe pule implementacyjne wykorzystujące ID. Każde zejściowe ID zadania (np. `AUTH-IMP-03`) jest z założenia pojedynczą zmianą rzutującą na jeden Pull Request (PR) -> z ograniczeniem limitowym do max ≤ 200 linii kodu dla sprawniejszego przeglądu (Code Review) i wycenianym na zaledwie ≤ 4h pracy agenta lub inżyniera AI.
*   **Biznesowe EPIC-i:** EPIC-i grupują te drobne zmiany i są atomowe z biznesowego punktu widzenia — tzn. po ukończeniu cyklu przypisanego EPIC-a moduł docelowy staje się sam w sobie w pełni funkcjonalny.
