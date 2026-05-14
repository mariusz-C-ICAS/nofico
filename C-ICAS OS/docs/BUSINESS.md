# Dokumentacja Biznesowa - FieldTime Work OS

## 1. Wartość Biznesowa (Business Value)
System całkowicie cyfryzuje dokumentację pracy w terenie (B2B, brygady, inżynierowie). Zmniejsza straty z przepalania budżetu (tracking zasobów) i oszustwa czasowe, dając przejrzysty dowód realizacji (GPS + Zdjęcie). Umożliwia precyzyjne fakturowanie na klienta. Nowy moduł dokumentów (DMS) gwarantuje niezmienność danych (WORM) i bezpieczeństwo dla audytorów.

## 2. Multi-Tenancy (Wiele Firm) i Monolit Dostawcy
*   System pozwala na to, aby jeden "Konto Pracownika" (np. mail Google) należał do kilku firm/podwykonawców.
*   Użytkownik zyskuje możliwość przełączania profilu firmowego (Workspace Context).
*   **Jednolity Dostawca (Google):** Celem optymalizacji kosztów oraz ułatwienia zarządzania środowiskiem odrzucono architekturę multi-cloud (np. Azure). Cała aplikacja realizowana jest w obrębie usług Google (Firebase, Cloud Functions, Google AI), co redukuje narzut administracyjny o 40%.

## 3. Zgodność z RODO (GDPR Compliance)
*   **Zero Data Retention i Auto-Blur:** Chroniąc pracowników, którzy zmuszeni są wykorzystać prywatne rachunki dla spraw firmowych, system wdrożył Prywatną Kieszeń (Offline). Dopiero świadomy wybór wyzwala analizę (Vision AI), która w locie zamalowuje prywatne dane finansowe na czarno i nie zapisuje żadnych plików u dostawcy modelu.
*   **Anonimizacja i "Zapomnij mnie":** Administrator lub System po zadanym czasie retencyjnym, twardo lub miękko usuwa wszystkie historyczne logi GPS, a także kasuje profil pracownika.
*   **Eksport danych:** Pracownik ma dostęp do przycisku eksportu własnej paczki raportów i wrażliwych danych osobowych (CSV/PDF).

## 4. Środowisko bazy danych
*   MVP: Praca w modelu na bazy NoSQL (Firebase z racji optymalizacji kosztów na start i wbudowanej autoryzacji).
*   Abstrakcja Adaptera: Możliwość zapisywania tymczasowego na poziomie IndexedDB (Offline-First) - istotne na terenach bez internetu lub w celach przechowywania stricte prywatnych zasobów RODO. 

## 5. Identyfikacja Ryzyk
*   **Ryzyko baterii:** Zbyt częste próbkowanie lokalizacji może pożerać baterię. *Rozwiązanie:* Adaptacyjne próbkowanie.
*   **Pracownicy anty-cyfrowi:** *Rozwiązanie:* Asystent AI i super czysty, wręcz jednoprzyciskowy UX z minimalnymi fontami kontrastowymi.
*   **Prywatność:** Strach przed ciągłym śledzeniem i wyciekami faktur. *Rozwiązanie:* Wyraźny komunikat, że tracking działa _tylko_ na punch-in. Dane wrażliwe (skany) ukrywane są poprzez AI Auto-Blur.

## Czeklista do decyzji właściciela (Po Wdrożeniu 1.0):
- [ ] Potwierdzenie struktury organizacyjnej ról (Admin, Kierownik, Pracownik, Gość).
- [ ] Określenie DPO (Inspektora Ochrony Danych) dla wymogów RODO i wpisanie go do klauzul rejestracyjnych.
- [ ] Akceptacja rezygnacji z Azure na rzecz kompleksowego stacku od Google w logice finansowej całego Data Center.

