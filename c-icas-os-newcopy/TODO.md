# Project TODOs

## Aktywne
<<<<<<< HEAD
- [ ] **Moduł HR - Skanowanie Dokumentów (DMS)**: Zintegrować mockupowe przyciski dodawania skanów na formularzu HR0024 oraz certyfikatów z modułem DMS (Document Management System), pozwalając na faktyczny bezpieczny zapis wielostronicowych dokumentów (dyplomów, medycyny pracy, zaświadczeń BHP).
- [ ] **Moduł HR - Słownik Umiejętności**: Zapisać i wczytywać dynamiczny słownik "Znajomości Specjalistycznych" u pracownika w dedykowanej kolekcji konfiguracyjnej HR w Firestore, umożliwiając szybkie rozszerzanie bez modyfikacji UI.
=======
>>>>>>> origin/master
- [ ] **Skróty klawiszowe (Web)**: Przypisać globalne skróty klawiszowe do poszczególnych akcji systemowych. Rozważyć ergonomię dla wersji webowej.

## Zrealizowane
- [x] **Konfiguracja Sentry (Error Tracking)**: Gdy projekt będzie gotowy do produkcji, dodaj `VITE_SENTRY_DSN` do sekretów i odkomentuj kod w `src/main.tsx` oraz `src/app/App.tsx`.
- [x] **Performance Monitoring**: Zweryfikować działanie Firebase Performance Monitoring w środowisku produkcyjnym.
- [x] **Płace & KSeF**: Dokończyć integrację z bramką płatności w module `PaymentsModule`.
- [x] Konfiguracja Vitest + Testing Library
- [x] Struktura modułowa aplikacji
- [x] Layout Dashboardu (Lejek Operacyjny)
