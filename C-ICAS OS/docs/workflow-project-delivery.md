# Workflow: Realizacja projektu i Zgłoszenie szkody

Data: 2026-05-15  
Autor: Agent AI  
Moduł: DMS / Workflow Engine

---

## 1. Typ PROJECT_DELIVERY — Realizacja projektu

### Cel biznesowy

Dokumentuje wykonaną pracę na projekcie za pomocą zdjęć i filmów. Po zatwierdzeniu przez szefa materiały mogą być:
1. **Podstawą do fakturowania klienta** — dowód zrealizowanej pracy (BILLING_READY)
2. **Przekazane do Marketingu** — publikacja na stronie firmowej (MARKETING_REVIEW → MARKETING_APPROVED)

### Use case — dostawa projektu

```
Pracownik robi zdjęcia/filmy z montażu instalacji
   ↓ składa PROJECT_DELIVERY w C-ICAS OS
   ↓ zaznacza: "gotowe do fakturowania" i/lub "zatwierdź do marketingu"
Szef [PUSH]: "Oczekuje zatwierdzenie"
   ↓ przegląda materiały w ApprovalPanel
   ↓ APPROVE → status APPROVED
   ↓ klika "Skieruj do fakturowania"  → BILLING_READY → FI wystawia fakturę
   ↓ klika "Skieruj do Marketingu"   → MARKETING_REVIEW → Marketing publikuje
```

### Maszyna stanów PROJECT_DELIVERY

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED
                                          ├─[isBillable]──────► BILLING_READY ──► ARCHIVED
                                          └─[sendToMarketing]──► MARKETING_REVIEW ──► MARKETING_APPROVED ──► ARCHIVED
```

### Pola metadanych

| Pole            | Opis                                               |
|-----------------|----------------------------------------------------|
| projectId       | ID projektu (np. PROJ-2026-042)                    |
| milestoneId     | Opcjonalny etap (np. M3 — odbiór końcowy)          |
| isBillable      | Praca gotowa do fakturowania klienta               |
| sendToMarketing | Materiały na stronę firmową                        |

### Moduł Marketing Review (`/marketing`)

Dedykowany ekran dla działu marketingu:
- Lista wszystkich dokumentów w statusie `MARKETING_REVIEW`
- Podgląd zdjęć i filmów
- Zatwierdź (→ MARKETING_APPROVED) lub Odrzuć (→ APPROVED)
- Dostępny w nawigacji: **Dokumenty & Logistyka → Marketing Review**

---

## 2. Typ DAMAGE_CLAIM — Zgłoszenie szkody / Roszczenie ubezpieczeniowe

### Cel biznesowy

Obsługuje pełny cykl zgłoszenia szkody odkrytej w trakcie realizacji projektu — od dokumentacji zdjęciowej z notatką głosową z miejsca zdarzenia, przez zatwierdzenie szefa i zgłoszenie do ubezpieczyciela (backoffice), aż do wypłaty odszkodowania i zaksięgowania przez FI.

**Kluczowa wartość biznesowa:** Firma posiada kompletny, niemodyfikowalny log każdego etapu sprawy, co umożliwia obronę przed roszczeniami o opóźnienia oraz szybkie odwołanie się od decyzji ubezpieczyciela.

### Use case — szkoda na budowie

```
1. PRACOWNIK (w terenie, na szybko)
   │  Odkrywa uszkodzenie (np. instalacja elektryczna — poprzedni wykonawca)
   │  Robi zdjęcia + nagrywa notatkę głosową (Whisper AI → transkrypcja)
   │  Składa DAMAGE_CLAIM z opisem: "Nie możemy kontynuować bez naprawy.
   │  Nie jest to wina firmy ani pracownika — konieczne zgłoszenie do ubezpieczyciela."
   ↓  Status: PENDING_APPROVAL

2. SZEF
   │  Otrzymuje powiadomienie push
   │  Przegląda zdjęcia, film, transkrypcję notatki głosowej
   │  Zatwierdza → APPROVED
   │  Klika "Skieruj do backoffice ubezpieczeniowego" → CLAIM_FILED
   ↓  Powiadomienie do pracownika: "Szkoda zgłoszona do ubezpieczyciela"

3. BACKOFFICE
   │  Składa formalny wniosek do ubezpieczyciela
   │  Wpisuje numer referencyjny wniosku (np. PZU-2026/05/12345)
   │  
   │  Ubezpieczyciel ZATWIERDZA:
   │    → CLAIM_APPROVED → "Skieruj do FI — rozliczenie" → PENDING_SETTLEMENT → SETTLED
   │  
   │  Ubezpieczyciel ODRZUCA:
   │    → CLAIM_REJECTED → backoffice składa odwołanie → CLAIM_APPEALED
   │      → Odwołanie uwzględnione → CLAIM_APPROVED → PENDING_SETTLEMENT → SETTLED
   │      → Odwołanie odrzucono   → ARCHIVED (zamknięcie sprawy z pełnym logiem)
   ↓

4. FI (Finanse)
   │  Status PENDING_SETTLEMENT → SETTLED
   │  Ksieguje wpłatę od ubezpieczyciela
   │  Pokrywa koszty pracownika i materiałów
   ↓

5. SZEF PROJEKTU — ochrona przed karami za opóźnienie
   │  Pełny log sprawy: data odkrycia szkody, zdjęcia, notatka głosowa,
   │  korespondencja z ubezpieczycielem, data rozstrzygnięcia
   │  → Dowód że opóźnienie było spowodowane szkodą poza kontrolą firmy
   └─ Firma NIE ponosi odpowiedzialności za opóźnienie
```

### Maszyna stanów DAMAGE_CLAIM

```
DRAFT
  └─SUBMIT──► PENDING_APPROVAL
                └─APPROVE──► APPROVED
                               └─FILE_CLAIM──► CLAIM_FILED
                                                ├─APPROVE──► CLAIM_APPROVED ──► PENDING_SETTLEMENT ──► SETTLED ──► ARCHIVED
                                                └─REJECT──► CLAIM_REJECTED
                                                              └─APPEAL_CLAIM──► CLAIM_APPEALED
                                                                                  ├─APPROVE──► CLAIM_APPROVED ──► ...
                                                                                  └─CLOSE_CLAIM──► ARCHIVED
                └─REJECT──► REJECTED ──► DRAFT
                └─REQUEST_CHANGES──► DRAFT
```

### Nowe statusy — DAMAGE_CLAIM

| Status         | Label                        | Kolor       | Znaczenie                                      |
|----------------|------------------------------|-------------|------------------------------------------------|
| CLAIM_FILED    | Zgłoszono do ubezpieczyciela | sky/błękitny | Backoffice złożył wniosek, oczekiwanie          |
| CLAIM_REJECTED | Ubezpieczyciel odrzucił      | rose/czerwony| Wniosek odrzucony — można się odwołać          |
| CLAIM_APPEALED | Złożono odwołanie            | orange       | Odwołanie w toku                               |
| CLAIM_APPROVED | Ubezpieczyciel zatwierdził   | green        | Wypłata zatwierdzona — do rozliczenia przez FI |

### Notatka głosowa z miejsca zdarzenia

W wizardzie `SubmitDamageClaimWizard`:
- Pracownik klika przycisk mikrofonu → nagrywa opis szkody na miejscu
- Whisper AI transkrybuje nagranie → tekst pojawia się w polu opisu
- Transkrypcja + opis pisemny są dołączane do dokumentu
- Po zapisaniu dokumentu: pełny `VoiceNoteRecorder` w widoku szczegółowym umożliwia dalsze notatki

### Pola metadanych

| Pole         | Opis                                              |
|--------------|---------------------------------------------------|
| projectId    | ID projektu, na którym odkryto szkodę             |
| description  | Opis + transkrypcja notatki głosowej              |
| insuranceRef | Nr referencyjny wniosku u ubezpieczyciela         |
| claimNotes   | Notatki z korespondencji z ubezpieczycielem       |

---

## 3. Statusy wspólne — Marketing Review

### Use case — materiały marketingowe z projektu

```
PROJECT_DELIVERY → APPROVED → MARKETING_REVIEW
                                  ↓
                          Dział Marketingu w /marketing
                                  ├─APPROVE──► MARKETING_APPROVED ──► ARCHIVED
                                  └─REJECT──► APPROVED (powrót do szefa)
```

Moduł `/marketing` jest **osobnym widokiem** dedykowanym dla działu marketingu. Nie wymaga dostępu do pełnego workflow — tylko do dokumentów w statusie MARKETING_REVIEW.

---

## 4. Pliki implementacji

| Plik | Opis |
|------|------|
| `src/modules/workflow/types.ts` | Wszystkie statusy, typy, notyfikacje, metadane |
| `src/modules/workflow/services/workflowEngine.ts` | VALID_TRANSITIONS — pełna maszyna stanów |
| `src/modules/workflow/services/notificationService.ts` | DEFAULT_PREFS, NOTIF_TITLES, NOTIF_MESSAGES |
| `src/modules/workflow/components/SubmitProjectDeliveryWizard.tsx` | Wizard PROJECT_DELIVERY |
| `src/modules/workflow/components/SubmitDamageClaimWizard.tsx` | Wizard DAMAGE_CLAIM + voice recorder |
| `src/modules/workflow/components/DamageClaimPanel.tsx` | Panel backoffice — wszystkie etapy roszczenia |
| `src/modules/workflow/components/ApprovalPanel.tsx` | ProjectDeliveryRouting po zatwierdzeniu |
| `src/modules/workflow/components/SubmitDocumentFlow.tsx` | Siatka typów — sekcja "W terenie" |
| `src/modules/workflow/WorkflowModule.tsx` | DamageClaimPanel w widoku szczegółów |
| `src/modules/marketing/MarketingModule.tsx` | Samodzielny moduł Marketing Review |
| `src/app/App.tsx` | Route /marketing |
| `src/app/AppLayout.tsx` | Nawigacja: Marketing Review |

## 5. Notyfikacje

| Zdarzenie              | Typ notyfikacji    | Odbiorca          |
|------------------------|--------------------|-------------------|
| → BILLING_READY        | BILLING_READY      | Pracownik         |
| → MARKETING_APPROVED   | MARKETING_APPROVED | Pracownik         |
| → CLAIM_FILED          | CLAIM_FILED        | Pracownik         |
| → CLAIM_REJECTED       | CLAIM_REJECTED     | Pracownik         |
| → CLAIM_APPROVED       | CLAIM_APPROVED     | Pracownik         |

## 6. Zgodność GoBD / WORM / GDPR

- Wszystkie przejścia stanów: **append-only** w `tenants/{id}/workflowSteps`
- Nagrania audio: przechowywane w Firebase Storage, referencja w DocumentNote
- Log audytu ubezpieczeniowego: każdy krok backoffice zapisany z `actorId`, `timestamp`, `note`
- Pełna ścieżka audytu → podstawa prawna do obrony przed roszczeniami o opóźnienia

## 7. Uprawnienia (docelowe — ADR-010)

| Rola          | Uprawnienie                              |
|---------------|------------------------------------------|
| employee      | submit, add voice notes                  |
| manager       | approve, reject, route billing/marketing/claim |
| backoffice    | FILE_CLAIM, APPEAL_CLAIM, CLOSE_CLAIM, set insuranceRef |
| marketing     | MARKETING_REVIEW → MARKETING_APPROVED    |
| finance       | CLAIM_APPROVED → PENDING_SETTLEMENT → SETTLED |

Aktualnie kontrola ról odbywa się na poziomie UI. Docelowo: Firebase Custom Claims + Firestore Rules.
