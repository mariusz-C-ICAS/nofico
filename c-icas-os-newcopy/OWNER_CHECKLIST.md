# Checklista Wdrożeniowa C-ICAS.OS (Wariant 1 - Modular Monolith)

Poniższa checklista stanowi wykaz najważniejszych aspektów do odfajkowania przed startem produkcyjnym w trybie wielu modułów (Samo-obsługa Modułowa).

## 1. Zgodność z Przetwarzaniem Danych (RODO / GDPR)
- [ ] **Polityka Prywatności i Regulamin (Może wymagać modułu prawnego w systemie):** C-ICAS loguje położenie (GPS) w `TimeTrackingModule`. Pracownicy muszą wyrazić pisemną / elektroniczną zgodę.
- [ ] **Prawa Pracownicze:** Zgodnie z założeniami biznesowymi "Tryb prywatny" (Wellness) i zbieranie kroków jest "Opt-In" (dobrowolne). Należy dopisać klauzulę o nieprzetwarzaniu tych danych w ocenach pracowniczych.
- [ ] **Retencja Danych (Polityka usunięć):** Skrypty RODO muszą cyklicznie czyścić tabelę w `Firestore` dla zadań oznaczonych jako `retentionPeriodDays` gdy minie termin zapomnienia.

## 2. Inicjalizacja Modułów w ModuleRegistry.ts
- [ ] Sprawdzić w pliku `/src/core/modules/ModuleRegistry.ts` poprawne flagi `defaultActive` dla nowych najemców (np. czy wszystkie nowe firmy powinny startować z darmowym `CRM`).
- [ ] Sprawdzić trasy (`path`) – upewnić się, że `App.tsx` ma `Route` pod ścieżką zdefiniowaną w Rejestrze Modułów (Musi być synchronizacja 1-do-1).
- [ ] Dodać zabezpieczenia ról w rejestrze (`requiredPermissions: ['hr.view']`), dzięki czemu zwykły pracownik nie zobaczy kafli na lewym pasku.

## 3. Zarządzanie Bilingiem i Infrastrukturą (SaaS)
- [ ] Moduły można włączać z poziomu `admin/tenants` edytując dokument Firestore `tenants/{companyId}` i tablice `activeModules`. Przed pobraniem opłaty upewnij się, że Stripe / Integracja dodaje ten moduł przez Webhook lub zrób to manualnie.
- [ ] **API Koszty:** Pamiętaj, że aktywacja "AiAssistant" zużyje środki w OpenAI / Google Gemini C-ICAS.

## 4. UI / RWD i SEO
- [ ] Nawigacja została przepięta na model renderowania z pętli mapującej tablice udostępnionych przez `ModuleContext` działów. Skontroluj widok mobilny, ponieważ długa tablica ułamie się w `AppLayout` albo zniknie jeśli została ukryta via `hidden`.
- [ ] Mobile bottom nav: Trzeba uzależnić jej istnienie od aktywnych modułów. Obecnie wyświetla zawsze "Projekty, AI, Czas". Zmodyfikuj ją względem nowo dodanych modułów.

## 5. Dane Startowe i Autoryzacja
- [ ] Sprawdź plik `src/shared/hooks/AuthContext.tsx` - upewnij się, że w tablicy adminów systemowych znajduje się Twój email (ustawi domyślną rolę).
- [ ] Zwróć uwagę, że w momencie stworzenia nowej relacji system szuka "default" w kolekcji tenants - dla środowisk demo można stworzyć sztucznego Custom Tenanta o nazwie "C-ICAS (Domyślna)" o ID `"default"` w bazie danych.
