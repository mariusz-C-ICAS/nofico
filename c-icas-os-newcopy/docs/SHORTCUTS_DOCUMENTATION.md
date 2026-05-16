# Dokumentacja Transakcji i Skrótów Systemowych (C-ICAS.OS)

System udostępnia szybki "Panel transakcji" (Command Menu), który umożliwia natychmiastowe przejście do dowolnego modułu lub funkcjonalności. 
Okienko można wywołać za pomocą ikony w górnym menu (ikona "Command") lub wciskając kombinację klawiszy `Ctrl+K` (na Windows/Linux) lub `Cmd+K` (na Mac).

## Lista dostępnych skrótów transakcyjnych

Poniższa lista zawiera główne skróty ułatwiające błyskawiczną nawigację w systemie:

| Kod Skrótu | Moduł / Transakcja | Opis / Cel | Wymagane Uprawnienia |
|---|---|---|---|
| `/dash` | Główny Pulpit | Uruchamia ekran startowy i podsumowanie wskaźników aktywności dla bieżącego użytkownika (Start). | Brak, dostępne zawsze |
| `/admin` | Panel Admina | Przechodzi do kokpitu administracyjnego C-ICAS.OS dla właściciela lub członków zarządu. | `roles.manage` (lub `*`) |
| `/crm` | Moduł Sprzedaży i CRM | Obsługa szans sprzedaży, klientów B2B oraz B2C, lejków sprzedażowych oraz ofertowania (QuoteEditor). | Domyślnie powiązane z modułem |
| `/hr` | Moduł HR / Płace | Zarządzanie kadrą, teczkami pracowniczymi, listami płac (Payroll) oraz ewidencją czasu pracy. | Domyślnie powiązane z modułem |
| `/finance` | Księgowość & Finanse | Moduł główny operacji finansowych. Dostęp do Ksiąg Głównych, Bankowości, analiz i sprawozdawczości. | Domyślnie powiązane z modułem |
| `/dms` | Skarbiec (DMS) | Dostęp do Archiwum obiegów dokumentów, bezpiecznego sejfu i podpisów elektronicznych (QES). | Domyślnie powiązane z modułem |
| `/settings` | Ustawienia | Umożliwia aktualizację preferencji osobistych użytkownika, motywu, danych profilowych i preferencji powiadomień. | Brak, dostępne zawsze |

> **Uwaga:** Menu reaguje dynamicznie i kontekstowo. Wykrywa wpisywane frazy, nazwy modułów lub fragmenty kodu ułatwiając szybki dostęp. Skróty niewidoczne z powodu braku uprawnień (np. dla ról operacyjnych) nie pojawią się w menu przyporządkowanym danemu użytkownikowi, dbając o bezpieczeństwo "Zero-Trust".

## Rekomendacje dla Globalnych Skrótów Klawiszowych (Ergonomia i UX)

Masz absolutną rację – nawigacja sekwencyjna w stylu `g` > `d` jest wysoce kolizyjna, gdy system operuje na wielu formularzach tekstowych, co mogłoby poważnie zaburzać User Experience (tzw. problem wpisywania "gdziekolwiek"). Aby system był w 100% zorientowany na produktywność i wybaczał błędy kontekstu (np. gdy zapomnisz, że masz wyostrzone pole `<textarea>`), zastosujemy **Podejście "Modifier-First" & "Emergency Brake"**:

1. **Master Key (Wdrożony: `Ctrl/Cmd + K`)**
   - Pozostaje to królem ergonomii. Naciśnięcie `Ctrl+K` powoduje, że niezależnie od tego czy właśnie piszesz maila czy wypełniasz fakturę, na środek ekranu wpada panel poleceń. Typujesz "fin", enter i jesteś w finansach. Płynnie i bezbłędnie.

2. **Nawigacja Modułowa (Lewy Alt / Ctrl+Shift + Cyfry)**
   - Do najczęściej otwieranych miejsc przypisujemy skróty numeryczne z modyfikatorem, np. `Alt + 1` (Pulpit), `Alt + 2` (CRM), `Alt + 3` (Finanse). Omijamy w ten sposób problem wpisywania znaków, nie kolidując zarazem z polskimi znakami diakrytycznymi (Prawy Alt).

3. **Globalny "Emergency Brake" (`Esc`)**
   - Klawisz `Esc` musi spełniać natychmiastową funkcję "wypuść mnie".
   - Krok 1: Wciśnięcie Esc zamazuje (blur) aktywne pole tekstowe.
   - Krok 2: Kolejne wciśnięcie zamyka ewentualne modale, boczne panele lub wyskakujące okna. Kursor wraca na bezpieczny "body element".

4. **Klawisze Ergonomiczne dla Widoków Pracy**
   - `Ctrl/Cmd + S`: Globalny zapis aktywnych formularzy.
   - `Ctrl/Cmd + Enter`: Masowe przesyłanie (zatwierdzenie formularza, wysłanie raportu e-mail).
   - `Strzałki` + `Enter`: Poruszanie się góra/dół po tabelach (jak w KSeF) bez użycia myszy.

Zasada: Klawisze sterujące (modyfikatory) zawsze wygrywają, zapewniając użytkownikowi ostateczną kontrolę nad fokusem wejściowym przeglądarki.
