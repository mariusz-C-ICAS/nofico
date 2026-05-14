# Instrukcje dla Agenta AI

## Ergonomia i UX
Zgodnie z poleceniem właściciela (Mariusz.Czaja@gmail.com):
Pamiętaj, że aplikacja ma być ERGONOMICZNA. Zawsze wdrażając nowe funkcje zastanów się, czy nie wymuszają one na użytkowniku dodatkowych, niepotrzebnych kliknięć.
Przykład z wdrożenia: Jeżeli używamy narzędzia takiego jak komendy i skróty (Command Menu), po wybraniu/uruchomieniu skrótu (z historii lub z wyszukiwarki) menu ma "się chować, znikać", tak by użytkownik mógł natychmiast wrócić do pracy, bez konieczności ręcznego zamykania elementu. Skróty są po to, aby przyspieszać pracę, a nie ją opóźniać.
Stosuj to podejście do wszystkich przyszłych komponentów (np. auto-focus na odpowiednie pola, czyszczenie inputów po sukcesie, minimalizacja modal-i jeśli to nie jest konieczne).

## Zasady ogólne i język
- Język komunikacji z użytkownikiem: POLSKI.
- ZAKAZ ZMIANY ISTNIEJĄCEJ FUNKCJONALNOŚCI: Moduły biznesowe potrafią działać niezależnie.
- ZASADA IZOLACJI, ZASADA ZGODY - zawsze pytaj o pozwolenie na zastępowanie plików.
