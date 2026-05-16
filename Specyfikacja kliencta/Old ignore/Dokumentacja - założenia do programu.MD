\# Specyfikacja Funkcjonalna Aplikacji do Zarządzania Fakturami i Wydatkami



\## 1. Cel Systemu i Grupa Docelowa

1.1. Celem systemu jest stworzenie bezobsługowego, wysoce zautomatyzowanego środowiska do skanowania dowodów zakupu (faktur, paragonów), ekstrakcji danych, zarządzania zwrotami kosztów (reimbursement) oraz inteligentnego eksportu do systemów księgowych.

1.2. System funkcjonuje jako bezpieczny (odporny na audyty) "kurier danych" pomiędzy pracownikiem a księgowością, działający w wielu jurysdykcjach prawnych i językach.

1.3. Głównymi klientami docelowymi w Polsce są:

1.3.1. Software House'y i Agencje Marketingowe (wysoka kultura cyfrowa, płatności kartami prywatnymi/Revolut, subskrypcje, systemy zaliczkowe).

1.3.2. Firmy z rozbudowaną flotą i przedstawicielami handlowymi (praca w trasie, trudne warunki skanowania).

1.3.3. Organizacje pracujące w modelu całkowicie lub częściowo zdalnym (remote work), wymagające asynchronicznego obiegu dokumentów.

1.4. Klientami globalnymi są przedsiębiorstwa MŚP (SME) poszukujące zwinnej alternatywy dla ciężkich systemów korporacyjnych typu SAP Concur.



\## 2. Ekstrakcja Danych (OCR i Integracje)

2.1. System pobiera absolutnie wszystkie informacje z dokumentu: kwoty (brutto/netto), stawki VAT, daty (wystawienia, płatności), numer dowodu zakupu, dane sprzedawcy/nabywcy, szczegółowe pozycje (opis, ilość, cena), walutę, kody EAN.

2.2. Optyczne rozpoznawanie znaków (OCR) rejestruje i zachowuje w bazie wizualne pieczątki i odręczne dopiski jako tagi informacyjne.

2.3. Automatyczne zarządzanie bazą sprzedawców: system samodzielnie definiuje, dodaje i aktualizuje dane kontrahentów w wewnętrznej bazie.

2.4. Obsługa trudnych warunków skanowania: aplikacja umożliwia zrobienie serii zdjęć lub zszywanie bardzo długich dokumentów (np. 250-centymetrowych paragonów fiskalnych) w celu optymalizacji odczytu.

2.5. Weryfikacja czytelności: niezbyt wyraźne pola (np. rozmyte przez kroplę wody) są natychmiast podświetlane na czerwono. Użytkownik musi podjąć akcję: ręczna poprawa w locie, zignorowanie błędu lub ponowne skanowanie.

2.6. Integracja z hubami e-paragonów: bezpośrednie, cyfrowe zasysanie elektronicznych paragonów (B2C) z pominięciem procesu skanowania papieru.

2.7. Obsługa walut: backend systemu codziennie pobiera i aktualizuje w swojej bazie tabele kursów walut z NBP (oraz EBC dla innych rynków). System wykonuje przeliczenia wewnętrznie, uniezależniając się od przerw w działaniu zewnętrznych API w momencie skanowania.

2.8. Moduł AI ds. kategorii podatkowych: sztuczna inteligencja automatycznie taguje i sugeruje kategorie kosztowe (np. Koszty Reprezentacji - NKUP, Materiały biurowe - KUP) jako podpowiedź dla programu księgowego. Domyślne ustawienie: Włączone.



\## 3. Weryfikacja Duplikatów

3.1. System w czasie rzeczywistym weryfikuje bazę pod kątem duplikatów (analiza korelacji numeru, kwoty, daty i NIP/danych sprzedawcy).

3.2. Po wykryciu potencjalnego duplikatu system kategorycznie blokuje procesowanie dokumentu.

3.3. Interfejs wymusza obsługę błędu: wyświetla oba dokumenty (nowy i istniejący) obok siebie, wymagając od użytkownika ręcznego potwierdzenia odrzucenia lub wymuszenia akceptacji z podaniem powodu.



\## 4. Zarządzanie Wydatkami, Zwrotami Kosztów i Zaliczkami

4.1. System śledzi identyfikację płatnika: oznacza, czy koszt pokryto ze środków prywatnych pracownika, z konta prywatnego właściciela, czy kartą firmową.

4.2. Automatyzacja zwrotów: system domyślnie inicjuje proces przypisania kwoty do zwrotu natychmiast po ostatecznej weryfikacji i zatwierdzeniu dokumentu przez osobę upoważnioną. Domyślne ustawienie: Włączone.

4.3. Zarządzanie zaliczkami: pracownik ma możliwość wpisania pobranej fizycznie zaliczki. System automatycznie pomniejsza saldo zaliczki o kolejne zatwierdzone wydatki pracownika.

4.4. Anulowanie operacji: interfejs rozdziela anulowanie zwrotu od anulowania samego dokumentu księgowego (dwie niezależne funkcje).

4.5. Powiadomienia o zwrotach: śledzenie i transparentna komunikacja do pracownika informująca, kiedy i w jaki sposób odzyska środki.

4.6. Certyfikat Zwrotu: automatyczne generowanie PDF w formie "Certyfikatu zatwierdzenia zwrotu" (zawierającego kwotę i przewidywany termin), dostępnego dla pracownika po decyzji menedżera.

4.7. Integracja Payroll: opcja bezpośredniego przesłania paczki danych ze zwrotami do systemu kadrowo-płacowego w celu doliczenia kwoty do najbliższej wypłaty. Domyślne ustawienie: Wyłączone (wymaga ręcznej konfiguracji API z systemem HR).



\## 5. Autoryzacja, Workflow i Ścieżki Akceptacji

5.1. Dwuetapowa autoryzacja hybrydowa na podstawie progów kwotowych (Default limits):

5.1.1. Próg "Lekkiego Zatwierdzania" (Domyślnie: do 100 PLN / 50 EUR): Menedżer może zatwierdzić wydatek bezpośrednio na urządzeniu pracownika, używając kodu PIN, biometrii (wymaga wsparcia sprzętowego) lub skanując unikalny kod QR. Wydatek natychmiast zyskuje status "Zatwierdzony".

5.1.2. Próg "Wysokiego Ryzyka" (Domyślnie: powyżej 100 PLN / 50 EUR): Zastosowanie PIN-u na telefonie pracownika nadaje jedynie status "Wstępnie zweryfikowany". Ostateczne zatwierdzenie musi nastąpić z poziomu osobistej, zalogowanej aplikacji menedżera.

5.2. Akceptacja zbiorcza: Menedżer w swojej aplikacji posiada widok listy i może zatwierdzać wydatki pojedynczo, masowo dla wybranego pracownika lub zbiorczo dla całego zespołu.

5.3. Zastępstwa (Delegation): Możliwość czasowego przekazania uprawnień akceptacyjnych na innego pracownika tego samego lub wyższego szczebla (np. z powodu urlopu). Domyślny czas trwania: określany manualnie kalendarzem.

5.4. Ścieżki Eskalacji (Escalation Path) i przypomnienia:

5.4.1. Przypomnienie poziomu 1: Jeśli wydatek czeka na akceptację, system wysyła powiadomienie do menedżera po zdefiniowanym czasie. Domyślne ustawienie: po 3 dniach roboczych.

5.4.2. Eskalacja poziomu 2: Jeśli menedżer nie reaguje, dokument zostaje przekierowany "piętro wyżej" (np. do Dyrektora Finansowego/COO). Domyślne ustawienie: po 7 dniach roboczych.

5.5. Wielopoziomowa Akceptacja: Możliwość ustawienia reguły, gdzie zakupy przekraczające limit kapitałowy (Domyślnie: 10 000 PLN) po akceptacji menedżera automatycznie trafiają do akceptacji zarządu/CFO.



\## 6. Eksport, Integracje i KSeF

6.1. Złota reguła eksportu: system jest w stanie wysłać każdą zebraną zmienną, pełniąc rolę bezpiecznego kuriera danych. To docelowy program księgowy decyduje o uznaniu kosztu.

6.2. Konfiguracja mapowania: użytkownik posiada interfejs do precyzyjnego decydowania, które z zebranych pól (np. kody EAN, dopiski) mają być aktywnie przesyłane do danego systemu zewnętrznego. Domyślne ustawienie mapowania: Wysyłaj wszystkie standardowe pola księgowe, ignoruj tagi EAN/pieczątki.

6.3. Harmonogram eksportu:

6.3.1. Domyślne ustawienie dla MŚP: Zbiorczo, raz w miesiącu (1. dnia kolejnego miesiąca).

6.3.2. Opcje dodatkowe: w locie (po każdym dokumencie) lub paczkami na żądanie.

6.4. Formaty integracji: obsługa uniwersalnych plików CSV, XML oraz bezpośrednia integracja API z wiodącymi systemami rynkowymi.

6.5. Odwrotna integracja KSeF: system nie wysyła danych do KSeF. Zamiast tego posiada moduł pobierania faktur ustrukturyzowanych z rządowego API KSeF, aby "zmatchować" je z historią wydatków z kont i zautomatyzować zwroty dla pracowników.

6.6. Monitorowanie i blokady przesyłu: całkowita blokada eksportu dla dokumentów oznaczonych błędem, statusem duplikatu lub nieposiadających pełnej akceptacji.



\## 7. Interfejs Użytkownika i Komunikacja

7.1. Dynamiczny UX/UI: interfejs adaptuje swoje moduły na podstawie aktualnie zalogowanej roli (pracownik widzi tylko aparat i swoje zwroty, księgowość widzi moduł mapowania pól i eksportów).

7.2. Konfiguracja powiadomień dla Menedżera (po "lekkim" zatwierdzeniu u pracownika):

7.2.1. Domyślne ustawienie: Agresywny, widoczny Pop-up w centralnej aplikacji menedżera, wymagający odkliknięcia.

7.2.2. Opcje do wyboru: Dyskretny push w tle lub całkowite wyłączenie powiadomień (zapis tylko w logach).



\## 8. Bezpieczeństwo, Role i Odporność na Audyt

8.1. Zarządzanie Rolami (RBAC):

8.1.1. Predefiniowane role: Administrator (pełen dostęp), Dyrektor Finansowy (wgląd, eskalacje, zatwierdzenia kapitałowe), Księgowość (eksporty, mapowanie), Menedżer (zatwierdzanie zespołu), Pracownik (skanowanie, podgląd własnych zwrotów).

8.1.2. Możliwość tworzenia ról hybrydowych na podstawie granulacji uprawnień (np. Pracownik z uprawnieniem skanowania dla całego działu).

8.2. Audit Trail i technologia WORM:

8.2.1. Każda akcja transakcyjna, zmiana konfiguracji i logowanie jest bezwzględnie rejestrowana.

8.2.2. Niezmienność logów jest gwarantowana kryptograficznie poprzez integrację z technologią WORM (Write Once Read Many) lub prywatnym rejestrem blockchain. Żaden użytkownik (nawet root/administrator) nie ma fizycznej możliwości wymazania lub cichej modyfikacji historii.

8.3. Szyfrowanie: pełne szyfrowanie danych dokumentowych i osobowych AES-256 w spoczynku (at rest) oraz TLS 1.3 w transmisji (in transit).



\## 9. Internacjonalizacja (i18n) i Skalowalność

9.1. Architektura systemu od pierwszego dnia uwzględnia wdrażanie dla różnych krajów (separacja warstwy logiki biznesowej od warstwy podatkowej).

9.2. Pełne wsparcie dla zmiany języków interfejsu (słowniki dynamiczne).

9.3. Gotowość na wdrożenie odpowiedników e-fakturowania (ViDA / zagraniczne systemy typu KSeF) poprzez wtyczkowe moduły integracyjne dla danego regionu.



\## 10. Scenariusze Użycia (Use Cases)

10.1. UC1: Obsługa zaliczki i ręczna korekta (Pracownik).

Pracownik pobiera 1000 PLN zaliczki na wyjazd. Skanuje w złym oświetleniu fakturę za hotel (800 PLN). AI oznacza zamazany NIP na czerwono. Pracownik koryguje to ręcznie. System akceptuje dokument i automatycznie obniża wirtualne saldo zaliczki pracownika do 200 PLN, blokując wysyłkę zwrotu na konto.

10.2. UC2: Dwuetapowa akceptacja z przekroczeniem progu (Menedżer).

Pracownik kupuje sprzęt na targach za 500 PLN ze swoich pieniędzy. Prosi o PIN menedżera na swoim telefonie. Ponieważ kwota przekracza domyślne 100 PLN, system nadaje status "Wstępnie zatwierdzone". Menedżer wraca do hotelu, otwiera swoją aplikację, widzi powiadomienie, zatwierdza ostatecznie jednym kliknięciem. W logach WORM zapisują się obie akcje (PIN i ostateczny klik). Pracownik otrzymuje PDF z Certyfikatem Zwrotu.

10.3. UC3: Automatyczna kategoryzacja i eksport miesięczny (Księgowość).

Pierwszego dnia miesiąca Księgowość uruchamia eksport. AI już wcześniej otagowało faktury z restauracji jako "Koszty Reprezentacji". Księgowość zaznacza w mapowaniu, że program zewnętrzny nie obsługuje kodów EAN. Paczka z danymi trafia przez API do systemu finansowego bez błędów.

10.4. UC4: Eskalacja opóźnień i zastępstwo (Dyrektor Finansowy).

Menedżer zapomniał ustawić zastępstwa i zachorował. Wydatki jego zespołu wiszą. Po 3 dniach włącza się przypomnienie. Po 7 dniach działa "Eskalacja Poziomu 2" – powiadomienia trafiają do Dyrektora Finansowego, który używa akceptacji zbiorczej, aby odblokować zwroty dla całego działu, minimalizując frustrację pracowników.
## 11. GDPR
11.1 Każdy klient i pracownik oraz nawet użytkownik musi mieć możliwość całkowitego i nieodwracalnego usunięcia swoich danych.
11.2 W ramach "instancji" (firmy, organizacji, rodziny, budżetu) użytkownicy (pracownicy) mogą być usuwani ale gdy instancja pozostaje (np. po zwolnieniu pracownika) dane osobowe takiego pracownika/użytkownika muszą być bezpowrotnie zanonimizowane.

