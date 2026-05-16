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
