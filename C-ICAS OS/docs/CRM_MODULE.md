# CRM Module — Dokumentacja techniczna

**Data:** 2026-05-15  
**Wersja:** 3.0 (Full-featured B2B CRM)

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

### Karta klienta (CustomerCard)

6 tabów po kliknięciu "Karta Klienta":

| Tab | Opis |
|-----|------|
| Timeline | Aktywności CRM + wizyty Field Service |
| Zadania | Lista otwartych zadań przypisanych |
| Lead Score | Breakdown 5 czynników (0-100) |
| Serwis | Historia wizyt serwisowych |
| Email | Szablony emaili (5) → emailQueue |
| Pliki | Upload/download załączników Firebase Storage |

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
