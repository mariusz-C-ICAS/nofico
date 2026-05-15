# Project TODOs

## Aktywne
- [ ] **Skróty klawiszowe (Web)**: Przypisać globalne skróty klawiszowe do poszczególnych akcji systemowych. Rozważyć ergonomię dla wersji webowej.
- [ ] **Konfiguracja Sentry (Error Tracking)**: Gdy projekt będzie gotowy do produkcji, dodaj `VITE_SENTRY_DSN` do sekretów i odkomentuj kod w `src/main.tsx` oraz `src/app/App.tsx`.
- [ ] **Performance Monitoring**: Zweryfikować działanie Firebase Performance Monitoring w środowisku produkcyjnym.
- [ ] **Płace & KSeF**: Dokończyć integrację z bramką płatności w module `PaymentsModule`.

## Zrealizowane
- [x] Konfiguracja Vitest + Testing Library
- [x] Struktura modułowa aplikacji
- [x] Layout Dashboardu (Lejek Operacyjny)
- [x] **2026-05-12** CommandMenu (Ctrl+K) z nawigacją i szybkimi akcjami
- [x] **2026-05-12** AI Guardian Module (4-state upload, Firebase save)
- [x] **2026-05-12** Swipe & Match Module (3D card stack, drag+keyboard)
- [x] **2026-05-12** Expenses Module (4 tabs, voice recording, optimistic updates)
- [x] **2026-05-12** KSeF Offline24 (tryb offline z E2E encryption)
- [x] **2026-05-12** ISO 20022 Import (drag-drop, XML camt.053 parser)
- [x] **2026-05-12** Legal Vault KSH (Art.210, ContractGenerator)
- [x] **2026-05-12** Multi-Email OAuth2 Settings
- [x] **2026-05-12** Export & Distribution Module (6 formatów, 4 kanały)
- [x] **2026-05-12** i18n PL/EN/DE (I18nProvider, LangSwitcher)
- [x] **2026-05-14** OrgStructureModule — pełna hierarchia org z Firestore (onSnapshot), drag&drop, licencje PRO/ENTERPRISE
- [x] **2026-05-15** PayrollModule — aktualizacja do wersji z c-icas-os-newcopy (170KB, pełna kartoteka pracownika HR0001-ZHR001, ZUS KEDU XML, PIT-11 XML, AI compliance check)
- [x] **2026-05-15** HrModule — uproszczenie do 2 zakładek: "Kadry i Płace" + "Struktura Organizacyjna"
