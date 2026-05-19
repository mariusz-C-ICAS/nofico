# C-ICAS OS — Backlog Integracji

> Ostatnia aktualizacja: 2026-05-19 (sesja wieczorna)

## Tier 1 — Zrealizowane

| ID | Integracja | Moduł | Status |
|----|---|---|---|
| T1-01 | GUS REGON → CRM | CRM (auto-fill firmy) | ✅ Gotowe |
| T1-02 | Slack → Workflow | Workflow (powiadomienia) | ✅ Gotowe |
| T1-03 | CalSyncPro → Booking + Kanban | Booking, Kanban | ✅ Gotowe |
| T1-04 | Nordigen → FI | Finance (import wyciągów) | ✅ Gotowe |
| T1-05 | MS365 + Google Workspace → DMS | DMS (cloud storage) | ✅ Gotowe |
| T1-06 | Allegro → FI + CRM | Finance + CRM | ✅ Gotowe |

---

## Tier 2 — Zrealizowane

| ID | Integracja | Moduł | Status |
|----|---|---|---|
| T2-01 | inFakt → FI | Finance (eksport faktur do biura) | ✅ Gotowe |
| T2-02 | Comarch Optima → FI | Finance (eksport do FK) | ✅ Gotowe |
| T2-03 | Symfonia → FI | Finance (eksport do FK) | ✅ Gotowe |
| T2-04 | Shopify → FI + CRM + Logistics | Zamówienia online → faktury + WMS | ✅ Gotowe |
| T2-05 | Multisport → HR | HR (benefity → payslip) | ✅ Gotowe |
| T2-06 | PPK PZU → HR Payroll | HR (składki PPK → payroll auto) | ✅ Gotowe |
| T2-07 | e-Deklaracje → FI | Finance (wysyłka JPK/VAT/CIT z systemu) | ✅ Gotowe |
| T2-08 | e-KRS Pro → CRM | CRM (dane KRS do auto-fill) | ✅ Gotowe |
| T2-09 | Nordigen deep reconciliation | Finance (pełna rekoncyliacja wyciąg ↔ faktury) | ✅ Gotowe |
| T2-10 | Amazon SP-API → FI + CRM | Finance + CRM (zamówienia Amazon → faktury) | ✅ Gotowe |

---

## Tier 3 — Zrealizowane

| ID | Integracja | Moduł | Status |
|----|---|---|---|
| T3-01 | Dropbox → DMS | DMS (cloud storage sync) | ✅ Gotowe |
| T3-02 | OneDrive (personal) → DMS | DMS | ✅ Gotowe (T1-05) |
| T3-03 | Google Drive (personal) → DMS | DMS | ✅ Gotowe (T1-05) |
| T3-04 | DocuSign / Adobe Sign → DMS | DMS + Kontrakty (e-podpis w obiegu) | ✅ Gotowe |
| T3-05 | InPost API → Logistics | Logistics (paczkomaty, śledzenie) | ✅ Gotowe |
| T3-06 | DPD / DHL / GLS → Logistics | Logistics (etykiety, tracking) | ✅ Gotowe |
| T3-07 | Zoom / Teams → Booking | Booking (auto-link video po rezerwacji) | ✅ Gotowe |
| T3-08 | ZUS PUE API → HR | HR (deklaracje ZUS auto) | ✅ Gotowe |
| T3-09 | WhatsApp Business → CRM | CRM (komunikacja z klientami) | ✅ Gotowe |
| T3-10 | Google Maps / HERE → Field Service + Logistics | Routing, ETA, mapa serwisantów | ✅ Gotowe |
| T3-11 | Xero / QuickBooks → FI | Finance (klienci zagraniczni) | ✅ Gotowe |
| T3-12 | HubSpot / Pipedrive → CRM | CRM (import z istniejącego CRM) | ✅ Gotowe |
| T3-13 | Poczta Polska API → Logistics | Logistics (śledzenie przesyłek PP) | ✅ Gotowe |
| T3-14 | Twilio deeper → CRM + Workflow | CRM (SMS z historią), Workflow (SMS trigger) | ✅ Gotowe |
| T3-15 | GUS REGON deep → CRM | CRM (pełne dane REGON: PKD, KRS, PESEL) | ✅ Gotowe |

---

## AI / LLM — Zrealizowane (2026-05-19)

| ID | Integracja | Opis | Status |
|----|---|---|---|
| AI-01 | OpenAI (GPT-4o / o1 / Whisper) | Completions, vision, transkrypcja — klucz API | ✅ Gotowe |
| AI-02 | Anthropic (Claude Sonnet/Opus/Haiku) | Analiza dokumentów, asystent — klucz API | ✅ Gotowe |
| AI-03 | Azure OpenAI | GPT przez Azure — zgodność RODO, dane w EU — URL + klucz | ✅ Gotowe |
| AI-04 | Google Gemini Pro/Flash | Multimodalny AI Google — klucz API | 🔜 Coming soon |
| AI-05 | Mistral AI (Large/Small) | Modele europejskie — klucz API | 🔜 Coming soon |

---

## Bugfixes integracji — 2026-05-19

| # | Problem | Rozwiązanie |
|---|---|---|
| B-01 | Kafelek CalSyncPro zielony mimo failed test | `testCsp` catch zapisuje `lastTest={ok:false}` do state + Firestore; `effectivelyConnected` sprawdza `cspApiOk` |
| B-02 | Brak feedbacku po zapisie CSP | Przycisk "Zapisano!" (zielony 2.5s) + `toast.error` gdy brak `activeTenantId` |
| B-03 | "Brak ID najemcy" przy pierwszym logowaniu | AuthContext: natychmiastowe przywrócenie z localStorage + fallback query ownerId/ownerEmail |
| B-04 | Logi api_logs nie pojawiają się w UI | `console.error` w catch logApiActivity/getApiLogs — błędy Firestore teraz widoczne w F12 |
| B-05 | Crash `active.id` przy disconnect | Zmieniono na `active?.id` + `disabled={!active \|\| ...}` |
| B-06 | configNote widoczna gdy provider connected | `{p.configNote && !isConnected && ...}` |
| B-07 | Przycisk "Edytuj" dla oauth2/certificate gdy connected | Ukryto dla `configurationType !== 'oauth2' && !== 'certificate'` |
