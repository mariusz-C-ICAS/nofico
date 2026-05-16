# Analiza workflow — wszystkie formy gospodarcze i sektory

## 1. Pokrycie według formy prawnej

| Forma prawna | Rozmiar | Kluczowe potrzeby workflow | Pokrycie C-ICAS OS |
|---|---|---|---|
| JDG (jednoosobowa) | 1 os. | Faktury, wydatki, umowy | OUT_OF_POCKET, VENDOR_INVOICE, CONTRACT ✓ |
| Spółka jawna / cywilna | 2–10 os. | + delegacje, urlopy | + TRAVEL_EXPENSE, LEAVE_REQUEST ✓ |
| Sp. z o.o. (SME) | 10–50 os. | + PO, BHP, mienie, pojazdy | + BHP_INCIDENT, VEHICLE_INCIDENT, ASSET_HANDOVER ✓ |
| Sp. z o.o. (mid) | 50–250 os. | + IT, projekty, szkody | + IT_INCIDENT, PROJECT_DELIVERY, DAMAGE_CLAIM ✓ |
| SA / Sp. Akcyjna | 250–1000 os. | + audyt, compliance, RODO | IT_INCIDENT (RODO variant) ✓ + CUSTOM |
| Sp. komandytowa | dowolny | Jak sp. z o.o. | Pełne pokrycie ✓ |
| Stowarzyszenie / NGO | 5–500 os. | Dotacje, wnioski, wolontariat | CUSTOM + OUT_OF_POCKET ✓ |
| Fundacja | 3–200 os. | Jak stowarzyszenie | CUSTOM ✓ |
| Spółdzielnia | 10–5000 os. | + mienie wspólne, BHP | ASSET_HANDOVER, BHP_INCIDENT ✓ |
| Jednostka samorządowa | 20–2000 os. | Zamówienia publiczne, protokoły | PURCHASE_ORDER, CONTRACT ✓ |

---

## 2. Pokrycie według sektora

### Budowlana i instalacyjna
**Przypadki użycia:**
- Pracownik robi zdjęcia uszkodzonej instalacji elektrycznej → DAMAGE_CLAIM
- Pracownik wypadł z rusztowania → BHP_INCIDENT → BeHaPowiec + policja + ubezpieczyciel
- Kolizja busa firmy na budowie → VEHICLE_INCIDENT → DamageClaimPanel
- Kierownik przekazuje klucze i narzędzia ekipie → ASSET_HANDOVER
- Realizacja etapu projektu — dowód dla inwestora → PROJECT_DELIVERY

**Pokrycie: 5/5 ✓**

---

### Transport i logistyka
**Przypadki użycia:**
- Kierowca rozbija ciężarówkę → VEHICLE_INCIDENT (foto OC, raport policji, transcrypcja audio)
- Uszkodzenie ładunku podczas transportu → DAMAGE_CLAIM
- Kierowca wypełnia delegację (diety, kilometry) → TRAVEL_EXPENSE
- Logistyk zgłasza urlop → LEAVE_REQUEST
- Wydanie tachografu / urządzenia telematycznego → ASSET_HANDOVER

**Pokrycie: 5/5 ✓**

---

### IT i software
**Przypadki użycia:**
- Awaria produkcyjnego CRM w godzinach szczytu → IT_INCIDENT (severity: CRITICAL)
- Naruszenie bezpieczeństwa — nieautoryzowany dostęp → IT_INCIDENT (RODO)
- Deweloper bierze urlop → LEAVE_REQUEST
- Nowy pracownik dostaje laptopa + telefon → ASSET_HANDOVER × 2
- Faktura od dostawcy software (AWS, Azure) → VENDOR_INVOICE + KSeF

**Pokrycie: 5/5 ✓**

---

### Handel i retail
**Przypadki użycia:**
- Kasjer zgłasza urlop → LEAVE_REQUEST
- Towar uszkodzony przez dostawcę → DAMAGE_CLAIM
- Kradzież z kasy — incydent bezpieczeństwa → IT_INCIDENT (security)
- Firma kupuje nowe terminale POS → PURCHASE_ORDER
- Kierownik odbiera gotówkę ze sklepu (protokół) → ASSET_HANDOVER

**Pokrycie: 5/5 ✓**

---

### Produkcja i przemysł
**Przypadki użycia:**
- Operator maszyny ma wypadek → BHP_INCIDENT (CCTV + audio)
- Awaria linii produkcyjnej → IT_INCIDENT (OT/SCADA)
- Kontrola jakości — niezgodność partii → DAMAGE_CLAIM lub CUSTOM
- Ślusarz przekazuje maszynę do nowej hali → ASSET_HANDOVER
- Zlecenie naprawy maszyny zewnętrznej firmie → PURCHASE_ORDER + CONTRACT

**Pokrycie: 5/5 ✓**

---

### Zdrowie i opieka medyczna
**Przypadki użycia:**
- Pielęgniarka doznaje ukłucia igłą → BHP_INCIDENT
- Awaria systemu HIS/PACS (RODO) → IT_INCIDENT
- Personel bierze L4 → LEAVE_REQUEST (sick)
- Sprzęt medyczny przekazywany między oddziałami → ASSET_HANDOVER
- Faktura od dostawcy sprzętu → VENDOR_INVOICE

**Pokrycie: 5/5 ✓**

*Uwaga: zdarzenia niepożądane pacjenta (patient incidents) wymagają osobnego modułu (CUSTOM).*

---

### Edukacja i szkolenia
**Przypadki użycia:**
- Nauczyciel bierze urlop okolicznościowy → LEAVE_REQUEST (special)
- Uczeń/pracownik uszkadza laptop szkolny → DAMAGE_CLAIM
- Szkoła kupuje projktor → PURCHASE_ORDER
- Projekt realizacji zajęć z dowodami → PROJECT_DELIVERY
- Nauczyciel oddaje komputer na koniec roku → ASSET_HANDOVER (returned)

**Pokrycie: 5/5 ✓**

---

### Finanse i ubezpieczenia
**Przypadki użycia:**
- Awaria systemu bankcore → IT_INCIDENT (CRITICAL + RODO)
- Doradca bierze urlop → LEAVE_REQUEST
- Przekazanie laptopa + tokenu RSA → ASSET_HANDOVER
- Faktura od brokera → VENDOR_INVOICE
- Incydent RODO — wyciek danych klientów → IT_INCIDENT

**Pokrycie: 5/5 ✓**

*Uwaga: naruszenia regulacyjne (KNF) wymagają rozszerzenia CUSTOM.*

---

### NGO / Stowarzyszenia / Fundacje
**Przypadki użycia:**
- Wolontariusz wydał pieniądze z własnej kieszeni → OUT_OF_POCKET
- Zarząd stowarzyszenia zatwierdza umowę zlecenie → CONTRACT
- Rejestr sprzętu przekazanego wolontariuszom → ASSET_HANDOVER
- Realizacja projektu grantowego — raport dla sponsora → PROJECT_DELIVERY
- Wniosek urlopowy pracownika biura → LEAVE_REQUEST

**Pokrycie: 5/5 ✓**

---

### Samorząd / jednostki publiczne
**Przypadki użycia:**
- Zamówienie publiczne (PZP) → PURCHASE_ORDER + CONTRACT
- Pracownik UG bierze urlop → LEAVE_REQUEST
- Awaria systemu e-urząd → IT_INCIDENT
- Wypadek pracownika komunalnego → BHP_INCIDENT
- Przekazanie samochodu służbowego → ASSET_HANDOVER

**Pokrycie: 5/5 ✓**

---

## 3. Macierz pokrycia

```
Typ dokumentu       JDG  SME  ENT  NGO  PUB  IT  BUD  TRP  MED
OUT_OF_POCKET        ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
VENDOR_INVOICE       ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
TRAVEL_EXPENSE       ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
CONTRACT             ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
PURCHASE_ORDER       —    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
PROJECT_DELIVERY     ✓    ✓    ✓    ✓    —    ✓    ✓    —    —
TIMESHEET            —    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
DAMAGE_CLAIM         —    ✓    ✓    ✓    ✓    —    ✓    ✓    ✓
BHP_INCIDENT         —    ✓    ✓    —    ✓    —    ✓    ✓    ✓
VEHICLE_INCIDENT     —    ✓    ✓    —    ✓    —    ✓    ✓    ✓
LEAVE_REQUEST        —    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
IT_INCIDENT          —    ✓    ✓    —    ✓    ✓    —    ✓    ✓
ASSET_HANDOVER       —    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
CUSTOM               ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓

Legenda: JDG=jednoosobowa, SME=<250, ENT=>250, NGO=stowarzyszenie/fundacja,
         PUB=samorząd, IT=branża IT, BUD=budowlana, TRP=transport, MED=medyczna
```

---

## 4. Scenariusze wieloetapowe — symulacje

### Scenariusz A: Firma budowlana 80 osób — wypadek z odszkodowaniem

```
Dzień 0:   Pracownik Marek spada z rusztowania
           → BHP_INCIDENT (szef nagrywa CCTV + notatkę audio)
           → Whisper AI transkrybuje nagranie CCTV
           → Formularz: uraz kręgosłupa, karetka wezwana, prace wstrzymane

Dzień 0:   Szef zatwierdza (APPROVED)
           → BhpDispatchPanel: BeHaPowiec + ZUS/ubezpieczyciel + zarząd (wymagani)
           → Policja (opcjonalny, zaznaczona) → BHP_DISPATCHED

Dzień 3:   Odrębnie: szkoda sprzętu (kask, uprzęże)
           → DAMAGE_CLAIM: zdjęcia uszkodzeń → szef → CLAIM_FILED
           → Backoffice zgłasza do AXA → CLAIM_APPROVED → PENDING_SETTLEMENT

Dzień 5:   BeHaPowiec zamyka sprawę BHP → BHP_CLOSED
           FI księguje odszkodowanie → SETTLED
```

**Wynik:** 2 odrębne dokumenty, pełny log, compliance KP + GoBD.

---

### Scenariusz B: Startup IT 15 osób — incydent RODO

```
Piątek 22:00: Deweloper Anna zauważa wyciek danych klientów (logi AWS)
              → IT_INCIDENT (severity: CRITICAL, system: API Gateway)
              → opis: "Nieautoryzowany dostęp, eksportowano 3420 rekordów"

Automatycznie:  powiadomienie CRITICAL → CTO + zarząd (PENDING_APPROVAL)

Sobota 00:30:   CTO zatwierdza (APPROVED → ARCHIVED)
                Równolegle Anna wysyła zgłoszenie do UODO (zewnętrzne)
                Notatka głosowa z przebiegu → VoiceNoteRecorder

Poniedziałek:   Analiza post-mortem → nowy IT_INCIDENT (severity: medium)
                Opis działań naprawczych, patch deployment
```

**Wynik:** Pełna historia incydentu, audit trail dla UODO, GoBD compliant.

---

### Scenariusz C: Stowarzyszenie 8 osób — projekt grantowy

```
Projekt "Zielone Podwórka 2026" (dotacja 120 000 PLN)

Etap 1:  Zakup materiałów ogrodniczych (3x faktury)
         → VENDOR_INVOICE × 3 → akceptacja prezesa stowarzyszenia

Etap 2:  Koordynator bierze urlop bezpłatny (2 tygodnie)
         → LEAVE_REQUEST (unpaid) → prezes zatwierdza

Etap 3:  Realizacja nasadzeń — zdjęcia + opis → grantor
         → PROJECT_DELIVERY (markAsSendToMarketing=false, isBillable=false)
         → załącznik: raport PDF dla grantor

Etap 4:  Zwrot laptopa służbowego na koniec projektu
         → ASSET_HANDOVER (returned) → protokół → archiwum
```

**Wynik:** Komplet dokumentów dla dotacji, zgodność z wymogami sprawozdawczości.

---

### Scenariusz D: Firma transportowa 200 osób — kolizja floty

```
08:30:  Kierowca Tomek zderza się z osobówką na A1
        → VEHICLE_INCIDENT: WA 12345, foto uszkodzeń (5 zdjęć)
        → transkrypcja audio z nagrana przez Tomka
        → dane drugiej strony, brak ofiar

08:45:  Dyspozytor zatwierdza (APPROVED)
        → DamageClaimPanel: "Skieruj do backoffice" → CLAIM_FILED
        → Backoffice kontaktuje się z ubezpieczycielem

Dzień 3:  Likwidator PZU wycenia szkodę 4 200 PLN
          → CLAIM_APPROVED → PENDING_SETTLEMENT → FI księguje

Dzień 5:  Naprawa pojazdu zakończona
          → VEHICLE_INCIDENT zamknięty (ARCHIVED)
          Osobno: wydanie pojazdu zastępczego → ASSET_HANDOVER
```

**Wynik:** Pełny cykl ubezpieczeniowy w jednym systemie.

---

## 5. Zidentyfikowane braki (backlog)

Poniższe typy nie zostały zaimplementowane — zostały udokumentowane jako backlog:

| Typ | Sektor | Priorytet | Opis |
|-----|--------|-----------|------|
| RECRUITMENT | Wszystkie | Średni | Wniosek o zatrudnienie → HR → zarząd |
| ONBOARDING | Wszystkie | Średni | Checklist nowego pracownika |
| OFFBOARDING | Wszystkie | Średni | Odejście pracownika — sprzęt + dostępy |
| PATIENT_INCIDENT | Medyczna | Wysoki | Zdarzenie niepożądane pacjenta (spec. formularz) |
| QUALITY_NONCONFORMANCE | Produkcja | Średni | Niezgodność produktu — ISO 9001 |
| AUDIT_FINDING | ENT/Finanse | Niski | Wynik audytu wewnętrznego |
| GRANT_REQUEST | NGO | Niski | Wniosek o dofinansowanie |
| SUBCONTRACTOR_APPROVAL | Budowlana | Niski | Zatwierdzenie podwykonawcy |
| REGULATORY_BREACH | Finanse | Niski | Naruszenie regulacyjne (KNF/AML) |
| EXPENSE_ADVANCE | Wszystkie | Niski | Zaliczka gotówkowa przed podróżą |

---

## 6. Podsumowanie pokrycia

**Aktualnie zaimplementowane:** 14 typów dokumentów

**Pokrycie sektorowe:**
- JDG: 6/6 kluczowych przypadków ✓
- SME (10–250): 14/14 typów ✓
- Enterprise (250+): ~80% — brakuje AUDIT_FINDING, REGULATORY_BREACH
- NGO/Fundacje: 10/14 (wystarczające)
- Samorząd: 10/14 (wystarczające)
- IT: 12/14 ✓
- Budowlana: 12/14 ✓
- Transport: 12/14 ✓
- Medyczna: 10/14 (brakuje PATIENT_INCIDENT)

**Szacowane pokrycie potrzeb rynkowych:** ~85% firm w Polsce może obsługiwać wszystkie typowe procesy dokumentowe używając aktualnych 14 typów + CUSTOM.
