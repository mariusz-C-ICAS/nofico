# Field Service Module — Dokumentacja techniczna

**Data:** 2026-05-15  
**Wersja:** 2.0 (iFrame + Client Portal + GPS + Email)

---

## Architektura ogólna

Moduł Field Service (`src/modules/fieldService/`) zarządza pełnym cyklem wizyty serwisowej: od zaplanowania, przez dojazd i realizację, po archiwizację i rozliczenie kosztów.

### Struktura katalogów

```
fieldService/
├── components/
│   ├── CalendarEmbedConfig.tsx      # Konfiguracja iFrame + branding
│   ├── CalendarView.tsx             # Widok kalendarza (manager)
│   ├── ClientReschedulePortal.tsx   # Publiczny portal klienta (token)
│   ├── CostEstimatePanel.tsx        # Kalkulacja kosztów/zysku
│   ├── DirectorDashboardView.tsx    # Dashboard dyrektora — KPI
│   ├── EventCreateWizard.tsx        # Kreator zdarzenia (4 kroki)
│   ├── EventDetailPanel.tsx         # Panel szczegółów + akcje
│   ├── GpsConsentModal.tsx          # RODO — zgoda na GPS
│   ├── PendingChangeRequests.tsx    # Prośby zmian od klientów
│   └── WorkerTodayView.tsx          # Widok serwisanta — dzisiaj
├── services/
│   ├── availabilityService.ts       # Sprawdzanie dostępności + Haversine
│   ├── calendarService.ts           # CRUD zdarzeń Firestore
│   ├── clientTokenService.ts        # Tokeny portalu klienta
│   ├── costEstimationService.ts     # Kalkulacja kosztów
│   ├── emailService.ts              # Kolejka emaili klienta
│   ├── gpsService.ts                # GPS, ETA, zgody
│   └── recurrenceService.ts         # Generator zdarzeń cyklicznych
├── types.ts                         # Interfejsy TypeScript
└── FieldServiceModule.tsx           # Root + nawigacja
```

---

## Maszyna stanów zdarzenia

```
DRAFT → SCHEDULED → CONFIRMED → IN_TRANSIT → ON_SITE → COMPLETED → ARCHIVED
                 ↘ CANCELLED ←────────────────────────────────────────
```

Dozwolone przejścia zdefiniowane w `EventDetailPanel.tsx:VALID_TRANSITIONS`.

---

## Portal klienta (token-based)

### Jak działa

1. Manager klika **"Generuj link dla klienta"** w `EventDetailPanel`.
2. Tworzony jest dokument `tenants/{t}/clientEventTokens/{tokenId}` (ważny 14 dni).
3. URL: `/client-event/{tenantId}/{tokenId}` — publiczny, bez logowania.
4. Jeśli podano email klienta → dokument trafia do `emailQueue` i jest wysyłany.
5. Klient może: zmienić termin, zmienić adres (w zależności od konfiguracji `CalendarBrandConfig`).
6. Prośba ląduje w `eventChangeRequests` ze statusem `PENDING`.
7. Manager akceptuje/odrzuca w widoku **"Prośby"** (`PendingChangeRequests`).

### Tokeny (`clientTokenService.ts`)

| Firestore ścieżka | Dokument |
|---|---|
| `tenants/{t}/clientEventTokens/{id}` | `{ eventId, clientEmail, expiresAt, isRevoked }` |
| `tenants/{t}/eventChangeRequests/{id}` | `{ requestType, proposedStart, proposedLocation, status, feasibilityOk, warnings }` |

### Sprawdzanie dostępności (`availabilityService.ts`)

- Haversine (R=6371 km) → odległość → czas dojazdu (@40 km/h + 15 min bufor)
- Okno zapytania: ±6h od proponowanego terminu
- Weryfikuje: konflikty zdarzeń + czas dojazdu z poprzedniego miejsca

---

## Email do klienta (`emailService.ts`)

### Wzorzec kolejki

Maile nie są wysyłane bezpośrednio — trafiają do kolekcji Firestore obsługiwanej przez **Firebase Trigger Email extension**:

```
tenants/{tenantId}/emailQueue/{docId}
```

Dokument:
```json
{
  "to": "klient@firma.pl",
  "subject": "Wizyta serwisowa: Strzyżenie trawy — środa, 20 maja...",
  "html": "<pełny HTML>",
  "bodyText": "wersja tekstowa",
  "type": "CLIENT_PORTAL_INVITE",
  "eventId": "abc123",
  "status": "pending",
  "createdAt": "<timestamp>"
}
```

Extension zmienia `status` na `sent` lub `error` po przetworzeniu.

### Wymagana konfiguracja Firebase

```
Firebase Console → Extensions → Install "Trigger Email"
→ SMTP_CONNECTION_URI: smtp://user:pass@smtp.host:587
→ Default FROM: noreply@twojadomena.pl
→ Collection: {tenantId} — UWAGA: każdy tenant ma swoją kolekcję
```

**Alternatywnie** — konfiguruj wspólny email queue i filtruj po `tenantId` w Cloud Function.

---

## iFrame — publiczny kalendarz

Konfiguracja w widoku **"Integracja"** (`CalendarEmbedConfig`).

Dokument konfiguracji: `tenants/{t}/config/calendarBrand`

| Pole | Typ | Opis |
|---|---|---|
| `companyName` | string | Nazwa firmy (nagłówek emaila) |
| `primaryColor` | hex | Kolor wiodący |
| `allowReschedule` | bool | Czy klient może zmienić termin |
| `allowLocationChange` | bool | Czy klient może zmienić adres |
| `maxRescheduleDaysAhead` | int | Max. dni naprzód przy zmianie |
| `maxRescheduleDaysBefore` | int | Ile dni przed wizytą można zmienić |

Snippet do osadzenia:
```html
<iframe src="https://app.c-icas.gg/embed/{tenantId}"
        width="100%" height="700" frameborder="0"
        allow="geolocation">
</iframe>
```

---

## GPS i śledzenie (`gpsService.ts`)

### Zgoda RODO

Zgoda przechowywana w `tenants/{t}/gpsConsents/{uid}`:
```json
{ "hasConsent": true, "consentDate": "<timestamp>" }
```

`GpsConsentModal` pokazuje się przy pierwszym uruchomieniu `WorkerTodayView` gdy brak wpisu.

### Pozycja serwisanta

Jednorazowy zapis pozycji: `tenants/{t}/workerPositions/{uid}`.

Real-time śledzenie (planowane): Cloud Function + Firestore listener.

### ETA

```
estimateTravelTime(lat1, lng1, lat2, lng2) → minuty
= haversineDist(km) / 40 * 60 + 15
```

### Alert o wyjeździe (`WorkerTodayView`)

```
leaveBy = scheduledStart - estimatedTravelMinutes - 15 min
if (now >= leaveBy) → pulsujący baner "Czas wyruszyć!"
```

---

## Kalkulacja kosztów (`costEstimationService.ts`)

| Składnik | Domyślna stawka |
|---|---|
| Paliwo | 0,65 PLN/km (trasa × 2) |
| Praca | 45 PLN/h × liczba pracowników |
| Amortyzacja sprzętu | 15 PLN/h |
| Opłaty drogowe | 0 PLN |

`CostEstimatePanel` wyświetlany w `EventDetailPanel` — gear icon otwiera edytor stawek.

---

## Zdarzenia cykliczne (`recurrenceService.ts`)

Generator tworzy konkretne zdarzenia `ServiceEvent` na podstawie `RecurrenceRule`:

| Typ | Logika |
|---|---|
| `daily` | Co 1 dzień |
| `weekly` | Dni tygodnia z `daysOfWeek[]` |
| `biweekly` | Co 2 tygodnie, wybrane dni |
| `monthly` | Ten sam dzień miesiąca |

Limit bezpieczeństwa: 365 wystąpień.

---

## Indeksy Firestore (`firestore.indexes.json`)

```json
[
  serviceEvents: (scheduledStart ASC),
  serviceEvents: (status ASC, scheduledStart ASC),
  eventChangeRequests: (status ASC, createdAt DESC),
  clientEventTokens: (isRevoked ASC, expiresAt ASC),
  workerTimeLogs: (eventId ASC, startTime ASC)
]
```

Deploy: `firebase deploy --only firestore:indexes`

---

## Trasy aplikacji

| Ścieżka | Komponent | Auth |
|---|---|---|
| `/field-service` | `FieldServiceModule` | wymagana |
| `/client-event/:tenantId/:tokenId` | `ClientReschedulePortal` | brak (token) |

---

## Widoki nawigacji w module

| ID | Label | Komponent |
|---|---|---|
| `calendar` | Kalendarz | `CalendarView` |
| `mywork` | Mój dzień | `WorkerTodayView` |
| `team` | Zespół | `WorkerLoadView` |
| `catalog` | Katalog usług | `ServiceTypeCatalog` |
| `analytics` | Dyrektor | `DirectorDashboardView` |
| `pending` | Prośby | `PendingChangeRequests` |
| `embed` | Integracja | `CalendarEmbedConfig` |
