# CRM Module — Dokumentacja techniczna

**Data:** 2026-05-16  
**Wersja:** 4.2 (B2B + B2C + Booking Premium — 39 ficzorow CRM + 19 komponentów Booking)  
**Ostatnia aktualizacja:** 2026-05-16

---

## Architektura

### Kolekcje Firestore

| Kolekcja | Ścieżka | Opis |
|----------|---------|------|
| customers | `/customers` (flat) | Klienci (istniejąca, wielotenantowa) |
| deals | `/deals` (flat) | Deale pipeline |
| crmActivities | `/tenants/{t}/crmActivities` | Timeline aktywności CRM |
| crmTasks | `/tenants/{t}/crmTasks` | Zadania & follow-upy |
| npsResponses | `/tenants/{t}/npsResponses` | Odpowiedzi NPS |
| automationRules | `/tenants/{t}/automationRules` | Reguły automatyzacji |
| salesTargets | `/tenants/{t}/salesTargets` | Cele sprzedażowe |
| esignRequests | `/tenants/{t}/esignRequests` | Żądania e-podpisu |
| customerAttachments | `/tenants/{t}/customerAttachments` | Metadane załączników |
| emailQueue | `/tenants/{t}/emailQueue` | Kolejka emaili (Trigger Email) |
| products | `/tenants/{t}/products` | Katalog produktów/usług (#23) |
| contracts | `/tenants/{t}/contracts` | Kontrakty i odnowienia (#25) |
| slaTickets | `/tenants/{t}/slaTickets` | Zgłoszenia SLA (#26) |
| gdprConsents | `/tenants/{t}/gdprConsents` | Zgody RODO (#28) |
| webhooks | `/tenants/{t}/webhooks` | Konfiguracje webhooków (#32) |
| webhookLogs | `/tenants/{t}/webhookLogs` | Logi wykonań webhooków |
| settings/crm | `/tenants/{t}/settings/crm` | Konfiguracja CRM (#34) |
| transactions | `/tenants/{t}/transactions` | Historia transakcji B2C/B2B |
| loyaltyAccounts | `/tenants/{t}/loyaltyAccounts` | Konta programu lojalnościowego |
| loyaltyCoupons | `/tenants/{t}/loyaltyCoupons` | Kupony rabatowe |
| campaigns | `/tenants/{t}/campaigns` | Kampanie email/SMS/push |
| bookingServices | `/tenants/{t}/bookingServices` | Usługi do rezerwacji |
| bookingStaff | `/tenants/{t}/bookingStaff` | Personel (godziny, dni) |
| bookings | `/tenants/{t}/bookings` | Rezerwacje klientów |
| bookingSettings/main | `/tenants/{t}/bookingSettings/main` | Konfiguracja Booking |
| bookingWaitlist | `/tenants/{t}/bookingWaitlist` | Lista oczekujących (waiting→notified→booked/cancelled) |
| bookingPackages | `/tenants/{t}/bookingPackages` | Definicje pakietów wizyt (5/10/20×) |
| customerPackages | `/tenants/{t}/customerPackages` | Zakupione pakiety (used/total tracking) |
| bookingVouchers | `/tenants/{t}/bookingVouchers` | Vouchery podarunkowe (kwotowe lub per usługa) |
| bookingReviews | `/tenants/{t}/bookingReviews` | Recenzje po wizycie (rating 1-5, reply, visible) |
| bookingResources | `/tenants/{t}/bookingResources` | Zasoby: gabinety, sprzęt (CRUD, toggle active) |
| invoices | `/tenants/{t}/invoices` | Faktury auto-generowane z rezerwacji (VAT 23%) |

### Firebase Storage

```
tenants/{tenantId}/customers/{customerId}/{timestamp}_{filename}
```
Max 20 MB per plik. Upload przez `uploadBytesResumable` z progress bar.

---

## Komponenty (src/modules/crm/components/)

### Widoki główne (tabs w ClientCrmModule)

| Tab | Komponent | Funkcja |
|-----|-----------|---------|
| Pipeline | `DealsPipeline` | Kanban dealów |
| Klienci | `CustomerList` | Lista z lead score badge + onSelectCustomer |
| Mapa | `CustomerMapView` | Leaflet map, 30+ miast PL, klik→CustomerCard |
| Segmenty | `SegmentView` | Filtry: status/score/przychód/tag/branża |
| Zadania | `TaskManager` | CRUD zadań: overdue/dziś/nadchodzące |
| Prognoza | `ForecastView` | Pipeline KPI + deal health score |
| Oferty | `QuoteEditor` | Edytor ofert |
| NPS | `NpsPanel` | NPS score, promotorzy/pasywni/krytycy |
| Upsell | `UpsellBoard` | Auto-detekcja szans (3+ wizyty) |
| Automatyzacje | `AutomationRules` | Trigger→akcja, CRUD reguł |
| Import/Export | `CustomerImportExport` | CSV eksport (UTF-8 BOM) + import |
| Duplikaty | `DuplicateDetector` | NIP exact + nazwa normalizowana |
| Cele | `SalesTargets` | Monthly/quarterly target vs actual |
| E-Sign | `QuoteESign` | Token link do podpisu oferty |
| Aktywność | `SalesActivityReport` | Per-user ranking aktywności CRM |
| Churn AI | `ChurnPredictor` | Scoring ryzyka 0-100, rekomendacje |
| Kanban | `CustomerKanban` | Drag & drop statusów klientów |
| Dashboard | `CrmDashboard` | 8 KPI, pipeline velocity, alerty |
| Cennik | `ProductCatalog` | CRUD produktów/usług, VAT, modele cenowe |
| Win/Loss | `WinLossAnalysis` | Analiza powodów wygranych/przegranych dealów |
| Kontrakty | `ContractRenewal` | Kontrakty z alertami wygaśnięcia 30/60/90d |
| SLA | `SlaTracker` | Zgłoszenia SLA: critical(4h)/high(8h)/medium/low |
| Prowizje | `CommissionTracker` | Ranking handlowców, tabela progresywna, CSV |
| RODO | `GdprConsent` | Rejestr zgód RODO, podstawy prawne, eksport |
| AI Coach | `AiCoaching` | Next Best Action: 6 typów akcji, scoring 0-100 |
| Funnel | `FunnelAnalysis` | Konwersja per etap, bottleneck detector |
| Cohort | `CohortAnalysis` | LTV i retencja per miesiąc pozyskania |
| Webhooks | `WebhookOutbound` | Integracja Zapier/Make, test endpoint, logi |
| Historia | `UnifiedTimeline` | Unified timeline: aktywności + zadania + NPS + deale |
| Ustawienia | `CrmSettings` | Konfiguracja: pipeline stages, SLA, prowizje, VAT |
| Transakcje | `TransactionLedger` | Historia zakupów B2C/B2B, eksport CSV, KPI |
| Lojalność | `LoyaltyProgram` | Punkty, tiery Bronze/Silver/Gold/Platinum, kupony |
| Kampanie | `CampaignManager` | Masowe kampanie email/SMS/push, segmentacja |
| Branże | `IndustryTemplates` | 10 szablonów branżowych (salon→IT→logistyka) |

### Moduł Booking (src/modules/booking/)

#### Komponenty główne (13 tabów w BookingModule)

| Tab | Komponent | Funkcja |
|-----|-----------|---------|
| Kalendarz | `BookingCalendarView` | Widok tygodniowy, dodawanie wizyt + detekcja konfliktu + override |
| Rezerwacje | `BookingsList` | Pełna lista, zmiana statusu → auto-sync finansów na `completed` |
| Oczekujący | `WaitlistManager` | Lista oczekujących: powiadom email / konwertuj / anuluj |
| Usługi | `BookingServiceConfig` | CRUD usług (cena, czas, kolor) |
| Personel | `BookingStaffConfig` | CRUD pracowników (godziny, dni) |
| Grupowe | `GroupBookingConfig` | Toggle isGroup/maxParticipants per usługa, dashboard terminów |
| Zasoby | `BookingResourceConfig` | CRUD zasobów: gabinety/sprzęt/inne, toggle active |
| Cykliczne | `RecurringBooking` | Generowanie serii rezerwacji (weekly/biweekly/monthly) |
| Pakiety | `VisitPackages` | Definicje pakietów + klienci (used/total, progress bar) |
| Vouchery | `GiftVouchers` | Generowanie, wysyłka, panel realizacji (code lookup) |
| Opinie | `PostVisitReview` | Rating 1-5, rozkład, odpowiedzi salonu, toggle publiczne |
| Analityka | `BookingAnalytics` | KPI, trend, top usługi, revenue |
| Ustawienia | `BookingSettings` | Link publiczny, approve, timezone |

#### Strony publiczne (bez auth)

| Ścieżka | Komponent | Funkcja |
|---------|-----------|---------|
| `/book/:tenantId` | `BookingPublicPage` | Samorezerwacja: wybór usługi→daty→slotu→danych→potwierdzenie; sloty z detekcją konfliktu, inline waitlist |
| `/review/:tenantId/:token` | `BookingReviewPage` | Publiczna recenzja po wizycie: gwiazdki + komentarz, idempotentna |

### Karta klienta (CustomerCard)

7 tabów po kliknięciu "Karta Klienta":

| Tab | Opis |
|-----|------|
| Timeline | Aktywności CRM + wizyty Field Service |
| Zadania | Lista otwartych zadań przypisanych |
| Lead Score | Breakdown 5 czynników (0-100) |
| Serwis | Historia wizyt serwisowych |
| Rezerwacje | `CustomerBookingHistory` — historia rezerwacji Booking per klient |
| Email | Szablony emaili (5) → emailQueue |
| Pliki | Upload/download załączników Firebase Storage |

---

## Serwisy Booking (src/modules/booking/services/)

### bookingConflictService.ts

```typescript
getBookedIntervals(tenantId, date, staffId | null) → Promise<BookedInterval[]>
// Pobiera zajęte sloty; filtruje cancelled/no_show; JS-filter po staffId

isSlotOccupied(slotStart, slotEnd, intervals) → boolean
// Overlap: timeToMins(aStart) < timeToMins(bEnd) && timeToMins(bStart) < timeToMins(aEnd)

getAvailableSlots(allSlots, durationMin, intervals) → { slot, available }[]
isSlotInPast(date, slot) → boolean
isSlotTooSoon(date, slot, noticeHours) → boolean
```

### bookingNotificationService.ts

```typescript
queueConfirmationEmail(tenantId, booking, service, settings?) → Promise<void>
queueReminderEmail(tenantId, booking, service, settings?) → Promise<void>
queueReviewRequest(tenantId, booking, service, reviewToken) → Promise<void>
// reviewUrl = /review/{tenantId}/{reviewToken}
queueWaitlistNotification(tenantId, entry, service, publicUrl) → Promise<void>
// Wszystkie → emailQueue (template field), status: 'pending'|'scheduled'
```

### bookingFinanceBridge.ts

```typescript
syncCompletedBookingToFinance(tenantId, booking, service?) → Promise<string | null>
// Tworzy transactions (type: 'booking_income'), updateDoc booking.syncedToFinance=true
// Zwraca null jeśli price=0

generateInvoiceFromBooking(tenantId, booking, service?) → Promise<void>
// Tworzy invoices (VAT 23%), numer: INV-BK-YYYYMM-XXXXX
// updateDoc booking.invoiceGenerated=true
```

### bookingCrmBridge.ts

```typescript
syncBookingToActivity(tenantId, booking, service) → Promise<void>
// Tworzy crmActivity type='visit'

subscribeAndBridgeCompletedBookings(tenantId) → unsubscribe
// onSnapshot: status='completed' && bridgedToCrm=false → syncBookingToActivity
```

---

## Serwisy (src/modules/crm/services/)

### crmService.ts

```typescript
subscribeCustomerActivities(tenantId, customerId, cb) → unsubscribe
addActivity(tenantId, activity) → Promise<void>
subscribeAllTasks(tenantId, cb) → unsubscribe
subscribeCustomerTasks(tenantId, customerId, cb) → unsubscribe
addTask(tenantId, task) → Promise<void>
completeTask(tenantId, taskId) → Promise<void>
deleteTask(tenantId, taskId) → Promise<void>
addNpsResponse(tenantId, response) → Promise<void>
subscribeNpsResponses(tenantId, cb) → unsubscribe
subscribeAutomationRules(tenantId, cb) → unsubscribe
saveAutomationRule(tenantId, rule) → Promise<void>
toggleAutomationRule(tenantId, ruleId, isActive) → Promise<void>
deleteAutomationRule(tenantId, ruleId) → Promise<void>
getCustomerServiceEvents(tenantId, clientId) → Promise<ServiceEvent[]>
getDealsForForecast(tenantId) → Promise<Deal[]>
```

### leadScoringService.ts

```typescript
computeLeadScore(params) → LeadScoreBreakdown
// Recency:         <7d=25, <30d=18, <90d=8, <180d=3
// Revenue:         ≥100k=30, ≥50k=22, ≥10k=15, ≥1k=7
// Pipeline:        negotiation=25, quote=20, meeting=15
// ServiceFreq:     ≥10=15, ≥5=12, ≥3=8, ≥1=4
// Engagement:      min(5, activityCount30Days×2)

scoreLabel(score) → { label: 'Gorący'|'Ciepły'|'Chłodny'|'Zimny', color, bg }

computeDealHealth(params) → number  // 0-100
// health = probability - (stalePeriods×4) + min(15, activityCount×3) + valueBonus

healthLabel(health) → { label, color, dot }

detectUpsellOpportunity(params) → { shouldFlag, reason, suggestedAction, estimatedValue }
// Trigger: serviceEventCount≥3 && !hasActiveContract
```

---

## Import CSV — Format

Nagłówki (separator: przecinek, tagi: separator średnik):

```
name,nip,email,phone,city,address,industry,status,tags,totalRevenue,currency,website
Acme Sp. z o.o.,1234567890,biuro@acme.pl,+48123456789,Warszawa,,IT,active,vip;kluczowy,50000,PLN,
```

Status: `prospect | active | churned | blocked`

---

## Churn Scoring — Algorytm

| Warunek | Punkty |
|---------|--------|
| Brak aktywności >180 dni | +40 |
| Brak aktywności >90 dni | +25 |
| Brak aktywności >60 dni | +15 |
| Brak wizyty serwisowej >365 dni | +30 |
| Brak wizyty >180 dni | +20 |
| Status `churned` | +20 |
| Status `blocked` | +10 |
| Zerowy przychód + ≥3 wizyty | +10 |
| Tag: churned/inactive/at-risk | +10 |

Próg alarmu: domyślnie 30 (przestawialny: 20/30/50/70).

---

## E-Sign — Flow

1. Handlowiec generuje żądanie → token = `crypto.getRandomValues(16 bytes hex)`
2. Link: `{origin}/sign/{token}` → kopiuj i wyślij klientowi
3. Klient otwiera link → potwierdza podpisanie (wymaga route `/sign/[token]`)
4. Firestore: `status: 'pending' → 'signed'`, `signedAt`

---

## Mapa klientów — Lokalizacja

Priorytet: pola `lat`/`lng` w dokumencie customer Firestore.  
Fallback: słownik 30+ miast polskich (lowercase match na `city`).  
Jitter: deterministyczny offset per indeks aby rozdzielić piny w tym samym mieście.

---

## AutomationRules — Uwaga

Reguły są **zapisywane w Firestore** ale **nie są uruchamiane w przeglądarce**.  
Wymagają Cloud Function lub cyklicznego procesu serwerowego.

---

## Wymagania Storage (Firebase)

```
// firestore.rules
match /tenants/{t}/customerAttachments/{doc} {
  allow read, write: if request.auth.uid != null && 
    request.auth.token.tenantId == t;
}

// storage.rules
match /tenants/{t}/customers/{cid}/{file} {
  allow read, write: if request.auth.uid != null &&
    request.auth.token.tenantId == t;
}
```

---

## Booking — Nowe pola w dokumencie bookings

Każda nowa rezerwacja (manual + online) zawiera:

| Pole | Typ | Opis |
|------|-----|------|
| `bridgedToCrm` | boolean | `false` → bridgowany do CRM Activity |
| `syncedToFinance` | boolean | `false` → zsynchronizowany do transactions |
| `invoiceGenerated` | boolean | `false` → faktura wygenerowana |
| `reviewToken` | string? | Token do strony recenzji (generowany opcjonalnie) |
| `isRecurring` | boolean? | Rezerwacja cykliczna |
| `recurringPattern` | string? | `'weekly'|'biweekly'|'monthly'` |

---

## Status wdrożenia — v4.2 (2026-05-16)

### Zrealizowane

| Feature | Status |
|---------|--------|
| Detekcja konfliktów (double-booking) | ✅ bookingConflictService + CalendarView + PublicPage |
| Powiadomienia email | ✅ bookingNotificationService → emailQueue |
| Sync finansów (completed→transaction+faktura) | ✅ bookingFinanceBridge + BookingsList auto-trigger |
| Lista oczekujących | ✅ WaitlistManager (powiadom/konwertuj/anuluj) |
| Rezerwacje grupowe | ✅ GroupBookingConfig (toggle + dashboard terminów) |
| Pakiety wizyt | ✅ VisitPackages (katalog + klienci, used/total) |
| Vouchery podarunkowe | ✅ GiftVouchers (generuj/kopiuj/realizuj) |
| Recenzje po wizycie | ✅ PostVisitReview + BookingReviewPage (publiczna) |
| Zasoby (gabinety/sprzęt) | ✅ BookingResourceConfig (CRUD) |
| Cykliczne rezerwacje | ✅ RecurringBooking (weekly/biweekly/monthly, preview) |
| Strona publiczna premium | ✅ BookingPublicPage (slot status, inline waitlist, 3-step) |
| Bridge CRM ↔ Booking | ✅ bookingCrmBridge + CustomerBookingHistory |

### Do zrobienia (backlog)

| Feature | Priorytet | Opis |
|---------|-----------|------|
| **Firestore Security Rules** | 🔴 Krytyczny | Dodać rules dla: bookingWaitlist, bookingPackages, customerPackages, bookingVouchers, bookingReviews, bookingResources |
| **Firestore Indexes** | 🔴 Krytyczny | Composite index: `bookings(date, staffId)`, `bookingReviews(tenantId, token)` |
| **Email templates HTML** | 🟠 Wysoki | 4 szablony do Firebase Trigger Email: booking_confirmation, booking_reminder, review_request, waitlist_notify |
| **Online płatności** | 🟠 Wysoki | Stripe Checkout przy rezerwacji online + zakup voucherów/pakietów |
| **Reminder Cloud Function** | 🟡 Średni | Scheduled Function: procesuje emailQueue status='scheduled' (dzień przed wizytą) |
| **Multi-location** | 🟡 Średni | bookingLocations, filtr lokalizacji w slotach i publicznej stronie |
| **Przypomnienia SMS** | 🟡 Średni | Twilio/SMS API dla queueReminderSms (obok email) |
| **Wbudowany review trigger** | 🟡 Średni | Auto-generuj reviewToken i kolejkuj queueReviewRequest gdy status→completed |
| **Zasoby w kalendarzu** | 🟢 Niski | Widok zasobów w CalendarView (kolumna per gabinet) |
| **Pakiety w publicznej stronie** | 🟢 Niski | Opcja opłacenia pakietem przy samorezerwacji |
| **Testy automatyczne** | 🟢 Niski | Unit testy dla bookingConflictService (overlap edge cases) |
