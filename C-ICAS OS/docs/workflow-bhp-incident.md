# BHP_INCIDENT — Wypadek przy pracy / Incydent BHP

## Cel

Moduł BHP obsługuje pełen cykl życia incydentu wypadkowego zgodnie z Kodeksem Pracy (art. 234–237) oraz GoBD/GoBS. Wszystkie dowody (foto, wideo, nagrania audio, transkrypcje AI) są przechowywane w sposób WORM (append-only) — niepodważalne, niezmieniane, z pełnym logiem audytowym.

---

## Use Case: Wypadek pracownika

### Scenariusz

1. Pracownik ulega wypadkowi przy pracy.
2. Szef/świadek nagrywa wideo z monitoringu lub robi film miejsca zdarzenia, nagrywa notatkę audio z opisem.
3. System Whisper AI transkrybuje dźwięk z wideo i notatki głosowej — tekst wchodzi do protokołu.
4. Szef tworzy protokół BHP, dołącza dowody, zaznacza wymagane działania.
5. Dokument trafia do zatwierdzenia.
6. Po zatwierdzeniu — dispatchowanie do BeHaPowca, ubezpieczyciela, zarządu (obowiązkowe) oraz opcjonalnie HR, policji (zewnętrzna), obsługi prawnej.
7. Każdy odbiorca dostaje powiadomienie in-app + push.
8. BeHaPowiec prowadzi dochodzenie, sprawa jest zamykana z notatką.

---

## Workflow — maszyna stanów

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → BHP_DISPATCHED → BHP_CLOSED → ARCHIVED
```

### Przejścia

| Od | Do | Akcja | Kto |
|----|----|-------|-----|
| DRAFT | SUBMITTED | SUBMIT | Pracownik / szef |
| SUBMITTED | PENDING_APPROVAL | (auto) | System |
| PENDING_APPROVAL | APPROVED | APPROVE | Menedżer |
| APPROVED | BHP_DISPATCHED | DISPATCH | BeHaPowiec / menedżer |
| BHP_DISPATCHED | BHP_CLOSED | CLOSE_CLAIM | BeHaPowiec |
| BHP_CLOSED | ARCHIVED | ARCHIVE | System |

---

## Formularz — SubmitBhpIncidentWizard (4 kroki)

### Krok 1: Incydent
- Tytuł (wymagany)
- Data i godzina zdarzenia (`datetime-local`)
- Lokalizacja
- Imię i stanowisko poszkodowanego
- Typ urazu (selektor: upadek, skaleczenie, poparzenie, potrącenie, porażenie prądem, inne)
- Część ciała

### Krok 2: Dowody
- **Notatka głosowa** — inline recorder → Whisper AI transkrypcja w j. polskim
- **Zdjęcia i wideo** — upload do Firebase Storage
  - Dla każdego pliku wideo: przycisk **"Transkrybuj"** — Whisper AI wyciąga dźwięk i transkrybuje
  - Transkrypcja wideo dołączona do protokołu
- Hash SHA każdego pliku zapisany przy uploadzie (nieodwołalne)

### Krok 3: Protokół
- Świadkowie zdarzenia
- Bezpośrednia przyczyna wypadku
- Przyczyna źródłowa
- Działania naprawcze
- Pierwsza pomoc udzielona (opis)
- Checkboxy: karetka wezwana, policja wymagana, wstrzymanie prac

### Krok 4: Przegląd i wyślij
- Podsumowanie wszystkich danych
- Informacja o WORM — po wysłaniu dowody są niezmieniane

---

## Panel dyspozycji — BhpDispatchPanel

Wyświetlany dla dokumentów `type === 'BHP_INCIDENT'` w widoku detali.

### Odbiorcy (RECIPIENTS)

| ID | Etykieta | Wymagane | Role query |
|----|----------|----------|------------|
| bhp_officer | BeHaPowiec (BHP) | TAK | bhp_officer |
| insurance | Ubezpieczyciel / Backoffice | TAK | backoffice |
| management | Zarząd | TAK | management |
| hr | HR / Kadry | nie | hr |
| police | Policja (zewnętrzna) | nie | — (email) |
| legal | Obsługa prawna | nie | legal |

**Wymagani odbiorcy są wstępnie zaznaczeni i nie można ich odznaczyć.**

### Mechanizm dyspozycji

1. `transitionDocument` → `BHP_DISPATCHED`
2. Dla każdego zaznaczonego odbiorcy z `roleQuery`:
   - Zapytanie Firestore: `tenants/{id}/userRoles` gdzie `role == roleQuery`
   - `dispatchToMany(recipientIds, { type: 'BHP_DISPATCHED', ... })`
3. Każdy odbiorca dostaje powiadomienie in-app + push (zgodnie z preferencjami)
4. Zewnętrzna policja — email queue (Firestore `emailQueue`)

### Stany panelu

- `APPROVED` → lista odbiorców + notatka + przycisk "Wyślij do N odbiorców — zabezpiecz dowody"
- `BHP_DISPATCHED` → potwierdzenie wysłania + lista dispatchedTo + formularz zamknięcia
- `BHP_CLOSED` → widok archiwalny (WORM lock)

---

## Dowody WORM — niezmienialność

- `workflowSteps` — wyłącznie `addDoc`, nigdy `updateDoc` (GoBD/GoBS)
- Hasz pliku: `${file.size}_${file.lastModified}` zapisany przy uploadzie
- Timestamp: `serverTimestamp()` — nie modyfikowalny przez klienta
- `deviceInfo`: `navigator.userAgent` — identyfikacja urządzenia
- Wszystkie przejścia stanów logowane w niezmienialnym logu audytowym

---

## Powiadomienia

| Zdarzenie | Typ | Push | In-app |
|-----------|-----|------|--------|
| Dyspozycja wysłana | BHP_DISPATCHED | TAK | TAK |
| Sprawa zamknięta | BHP_CLOSED | NIE | TAK |

---

## Pliki

| Plik | Opis |
|------|------|
| `src/modules/workflow/components/SubmitBhpIncidentWizard.tsx` | Wizard 4-krokowy (zgłoszenie) |
| `src/modules/workflow/components/BhpDispatchPanel.tsx` | Panel dyspozycji + zamknięcia |
| `src/modules/workflow/services/workflowEngine.ts` | Maszyna stanów (BHP_DISPATCHED, BHP_CLOSED) |
| `src/modules/workflow/services/notificationService.ts` | Powiadomienia BHP_DISPATCHED, BHP_CLOSED |
| `src/modules/workflow/types.ts` | DocumentStatus, NotificationType, DocumentMetadata |

---

## Wymagania prawne (Kodeks Pracy)

- Art. 234 KP: obowiązek niezwłocznego zawiadomienia BeHaPowca i PIP
- Art. 235 KP: rejestracja wypadku, protokół powypadkowy
- Art. 237 KP: prowadzenie rejestru wypadków

Moduł spełnia te wymagania przez:
- Obowiązkowe wysłanie do BeHaPowca przy dyspozycji
- Pełen, niezmienialny log audytowy (workflowSteps)
- Przechowywanie dowodów w Firebase Storage z hashami

---

## Transkrypcja audio z wideo

Whisper API akceptuje pliki wideo (mp4, mov, webm) bezpośrednio — wyciąga ścieżkę audio i transkrybuje. W C-ICAS OS funkcja `transcribeAudio(blob: Blob, tenantId: string)` przyjmuje dowolny `Blob`, w tym `File` z wideo.

Przykład zastosowania: szef pobiera nagranie z kamer CCTV, dołącza do protokołu, klika "Transkrybuj" — opis słowny incydentu pojawia się w protokole automatycznie.
