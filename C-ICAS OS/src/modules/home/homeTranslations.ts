export type HomeLang = 'pl' | 'en';

export const homeT = {
  pl: {
    nav: { howItWorks: 'Jak to działa', modules: 'Moduły', forWhom: 'Dla kogo', sectors: 'Branże', faq: 'FAQ' },
    hero: {
      badge: 'AI Coach & Asystent · ESG/CSRD · KSeF · Multi-Firma',
      h1a: 'Jeden ekosystem',
      h1b: 'dla całej firmy',
      sub: 'C-ICAS OS to modułowy ERP w chmurze — HR, CRM, Finanse, Projekty, Compliance i AI w jednym miejscu. Wszystkie dane połączone. Wszystko można zaimportować i wyeksportować.',
      tags: ['HR · CRM · Finanse', 'Projekty · Compliance', 'Multi-Firma · Multi-Tenant', 'Dane w UE · KSeF · RODO'],
      cta1: 'Zacznij bezpłatnie', cta2: 'Mam już konto',
      sub2: 'Rejestracja bezpłatna · Dane w UE · Pełna kontrola nad danymi',
    },
    ecosystem: {
      h2: 'Jeden ekosystem — wszystko w środku',
      sub: 'Koniec z kopiowaniem danych między systemami. Jeden tenant, pełna widoczność, zero silosów.',
      cards: [
        { title: 'Wszystko połączone', desc: 'HR, CRM, Finanse, Projekty, Dokumenty i AI działają na wspólnej bazie danych. Pracownik to jednocześnie zasób HR, użytkownik i zasoby projektowe.' },
        { title: 'Import danych', desc: 'Importuj dane z Excel, CSV, JPK i innych formatów. REST API umożliwia integrację z zewnętrznymi systemami.' },
        { title: 'Eksport danych', desc: 'Eksportuj do JPK_V7, KSeF, PDF, Excel, CSV, JSON. Twoje dane zawsze dostępne — brak vendor lock-in.' },
      ],
      features: ['Automatyzacja procesów między modułami', 'Synchronizacja w czasie rzeczywistym', 'Własne backupy i eksport pełnej bazy', 'Dane w UE — brak vendor lock-in'],
    },
    howItWorks: {
      h2: 'Jak to działa?',
      sub: 'Wdrożenie w 3 krokach — bez konsultantów, bez miesięcy konfiguracji.',
      steps: [
        { step: '01', title: 'Utwórz workspace', desc: 'Zarejestruj się, podaj dane firmy i wybierz moduły. System jest gotowy do pracy w kilka minut.' },
        { step: '02', title: 'Zaimportuj dane', desc: 'Wczytaj istniejące dane z Excela, CSV, JPK lub innego systemu. Możesz też zacząć od zera.' },
        { step: '03', title: 'Pracuj i eksportuj', desc: 'Zarządzaj firmą w jednym miejscu. Generuj JPK, KSeF, raporty ESG i eksportuj dane w dowolnym momencie.' },
      ],
    },
    forWhom: {
      h2: 'Który wariant dla kogo?',
      sub: 'C-ICAS OS skaluje się od jednoosobowej działalności po wielospółkową grupę kapitałową.',
      cards: [
        { title: 'MŚP — 1–250 pracowników', sub: 'Idealny start dla rosnącej firmy', points: ['Jeden system zamiast 10 narzędzi', 'Szybkie wdrożenie bez konsultantów', 'Niski koszt TCO — cena per-user'], cta: 'Zarejestruj się bezpłatnie' },
        { title: 'Biura rachunkowe & doradcze', sub: 'Multi-tenant dla obsługi wielu klientów', points: ['Osobne workspace dla każdego klienta', 'Centralny pulpit zarządzający', 'Import/eksport do JPK, API'], cta: 'Sprawdź plan dla biur' },
        { title: 'Holding & Grupy kapitałowe', sub: 'Wiele spółek, jeden tenant', points: ['Konsolidacja finansowa w czasie rzeczywistym', 'Wspólna baza kontrahentów i pracowników', 'Raportowanie segmentowe i grupy'], cta: 'Porozmawiaj z ekspertem' },
      ],
      typesH: 'Działa dla każdej formy prawnej',
      typesSub: 'Bez względu na formę organizacyjną — C-ICAS OS obsługuje wymagania każdego podmiotu w Polsce i UE.',
    },
    multiEntity: {
      h2: 'Wiele firm, jeden pulpit',
      sub: 'Zarządzaj wieloma spółkami w jednym tenancie (holding) lub obsługuj wielu klientów z osobnych tenantów (biuro rachunkowe). Przełączanie jednym kliknięciem.',
      points: ['Wspólny rejestr kontrahentów i pracowników między spółkami', 'Konsolidacja bilansów, P&L i cash flow w czasie rzeczywistym', 'Ceny transferowe i rozliczenia inter-company', 'Oddzielne uprawnienia i role dla każdej spółki', 'Biuro rachunkowe: izolowane dane klienta, wspólny panel'],
    },
    sectors: { h2: 'Dla każdej branży i sektora', sub: 'Gotowe konfiguracje branżowe — wdróż w 1 dzień, nie w 3 miesiące.', more: '… i dziesiątki innych sektorów — konfiguracja modułów dopasowana do Twojej branży' },
    modules: { h2: 'Wszystko czego potrzebuje Twoja firma', sub: 'Aktywuj tylko potrzebne moduły. Jeden system zamiast wielu rozproszonych narzędzi.' },
    security: { h2: 'Bezpieczeństwo i zgodność prawna', sub: 'Spełniamy wymagania RODO, KSeF, ESG CSRD, prawa pracy i standardów bezpieczeństwa UE.' },
    cta: { h2: 'Gotowy na zmianę?', sub: 'Zarejestruj się i zacznij korzystać. Dane w UE. Pełna kontrola nad swoimi danymi.', btn1: 'Zarejestruj się bezpłatnie', btn2: 'Mam już konto', contact: 'Potrzebujesz wyceny lub demo? Napisz na' },
    faq: {
      h2: 'Najczęściej zadawane pytania',
      items: [
        { q: 'Czy mogę zarządzać wieloma firmami z jednego konta?', a: 'Tak. W jednym tenancie możesz dodać wiele spółek/oddziałów (holding, grupy kapitałowe). Możesz też zarządzać wieloma tenantami — każdy z osobną izolacją danych (np. biuro rachunkowe obsługujące wielu klientów).' },
        { q: 'Czy dane są przechowywane w Polsce / UE?', a: 'Tak. Wszystkie dane przechowujemy wyłącznie w centrach danych na terenie Unii Europejskiej (Google Cloud EU). Nie przekazujemy danych do krajów trzecich. Pełna zgodność z RODO.' },
        { q: 'Czy mogę wyeksportować swoje dane i zmienić system?', a: 'Tak, w dowolnym momencie. Eksport do CSV, Excel, JSON, XML, JPK i innych formatów. Brak vendor lock-in — Twoje dane zawsze należą do Ciebie.' },
        { q: 'Czy system obsługuje KSeF i JPK?', a: 'Tak. C-ICAS OS jest zintegrowany z KSeF oraz obsługuje JPK: V7M, V7K, FA, CIT. Aktualizacje automatyczne przy zmianach przepisów.' },
        { q: 'Jakie formy prawne firm są obsługiwane?', a: 'Wszystkie polskie formy: JDG, Sp. z o.o., S.A., Sp. j., Sp. k., S.K.A., Sp. p., Fundacja, Stowarzyszenie, Spółdzielnia. Również podmioty zagraniczne działające w Polsce.' },
        { q: 'Jak wygląda dostęp i cennik?', a: 'Rejestracja jest bezpłatna. Skontaktuj się z nami (mc@c-icas.gg), aby omówić warunki dostępu i licencjonowania dla Twojej organizacji.' },
      ],
    },
    footer: {
      desc: 'Modułowy ERP w chmurze dla polskich MŚP i przedsiębiorstw. Jeden ekosystem — HR, CRM, Finanse, Compliance i AI.',
      product: 'Produkt', company: 'Firma', legal: 'Prawo & Prywatność',
      productLinks: ['Moduły', 'Cennik', 'Roadmap', 'Changelog', 'Status systemu'],
      companyLinks: ['O nas', 'Blog', 'Partnerzy', 'Kariera', 'Kontakt'],
      legalLinks: [['Regulamin usługi', '/terms'], ['Polityka prywatności', '/privacy'], ['Polityka cookies', '/cookies'], ['Umowa powierzenia (DPA)', '/dpa'], ['Bezpieczeństwo', '/security'], ['Informacja RODO', '/rodo']],
      copy: 'Wszelkie prawa zastrzeżone.',
      puodo: 'Administratorem danych jest C-ICAS. Organ nadzorczy: Prezes UODO, ul. Stawki 2, 00-193 Warszawa.',
      status: 'Dane w UE · RODO · KSeF · ESG',
    },
  },
  en: {
    nav: { howItWorks: 'How it works', modules: 'Modules', forWhom: 'For whom', sectors: 'Industries', faq: 'FAQ' },
    hero: {
      badge: 'AI Coach & Assistant · ESG/CSRD · e-Invoice · Multi-Entity',
      h1a: 'One ecosystem',
      h1b: 'for your entire company',
      sub: 'C-ICAS OS is a modular cloud ERP — HR, CRM, Finance, Projects, Compliance and AI in one place. All data connected. Everything can be imported and exported.',
      tags: ['HR · CRM · Finance', 'Projects · Compliance', 'Multi-Entity · Multi-Tenant', 'Data in EU · GDPR'],
      cta1: 'Start for free', cta2: 'I have an account',
      sub2: 'Free registration · Data in EU · Full data ownership',
    },
    ecosystem: {
      h2: 'One ecosystem — everything inside',
      sub: 'No more copying data between systems. One tenant, full visibility, zero silos.',
      cards: [
        { title: 'Everything connected', desc: 'HR, CRM, Finance, Projects, Documents and AI operate on a shared database. An employee is simultaneously an HR resource, user and project asset.' },
        { title: 'Data import', desc: 'Import data from Excel, CSV, JPK and other formats. REST API enables integration with external systems.' },
        { title: 'Data export', desc: 'Export to JPK_V7, e-Invoice, PDF, Excel, CSV, JSON. Your data always available — no vendor lock-in.' },
      ],
      features: ['Cross-module process automation', 'Real-time synchronisation', 'Full database backup and export', 'Data in EU — no vendor lock-in'],
    },
    howItWorks: {
      h2: 'How does it work?',
      sub: 'Deployment in 3 steps — no consultants, no months of configuration.',
      steps: [
        { step: '01', title: 'Create your workspace', desc: 'Register, enter company details and select modules. System is ready in minutes.' },
        { step: '02', title: 'Import your data', desc: 'Load existing data from Excel, CSV, JPK or another system. Or start from scratch.' },
        { step: '03', title: 'Work and export', desc: 'Manage your company in one place. Generate tax files, compliance reports and export data anytime.' },
      ],
    },
    forWhom: {
      h2: 'Which plan for whom?',
      sub: 'C-ICAS OS scales from a sole trader to a multi-entity corporate group.',
      cards: [
        { title: 'SMB — 1–250 employees', sub: 'Perfect start for a growing company', points: ['One system instead of 10 tools', 'Quick deployment without consultants', 'Low TCO — per-user pricing'], cta: 'Register for free' },
        { title: 'Accounting & advisory firms', sub: 'Multi-tenant for serving multiple clients', points: ['Separate workspace per client', 'Central management dashboard', 'Import/export to JPK, API'], cta: 'Check firm plan' },
        { title: 'Holdings & corporate groups', sub: 'Multiple entities, one tenant', points: ['Real-time financial consolidation', 'Shared contractor and employee registry', 'Segment and group reporting'], cta: 'Talk to an expert' },
      ],
      typesH: 'Works for every legal form',
      typesSub: 'Regardless of organisational form — C-ICAS OS handles requirements of any entity in Poland and the EU.',
    },
    multiEntity: {
      h2: 'Multiple companies, one dashboard',
      sub: 'Manage multiple entities in one tenant (holding) or serve multiple clients from separate tenants (accounting firm). Switch with one click.',
      points: ['Shared contractor and employee registry across entities', 'Real-time balance sheet, P&L and cash flow consolidation', 'Transfer pricing and inter-company settlements', 'Separate permissions and roles per entity', 'Accounting firm: isolated client data, shared panel'],
    },
    sectors: { h2: 'For every industry and sector', sub: 'Ready industry configurations — deploy in 1 day, not 3 months.', more: '… and dozens of other sectors — module configuration tailored to your industry' },
    modules: { h2: 'Everything your company needs', sub: 'Activate only the modules you need. One system instead of many scattered tools.' },
    security: { h2: 'Security and legal compliance', sub: 'We meet GDPR, e-Invoicing, ESG CSRD, labour law and EU security standard requirements.' },
    cta: { h2: 'Ready for a change?', sub: 'Register and start. Data in EU. Full control over your data.', btn1: 'Register for free', btn2: 'I have an account', contact: 'Need a quote or demo? Write to' },
    faq: {
      h2: 'Frequently asked questions',
      items: [
        { q: 'Can I manage multiple companies from one account?', a: 'Yes. You can add multiple entities/branches in one tenant (holding, corporate groups). You can also manage multiple tenants — each with separate data isolation (e.g. an accounting firm serving multiple clients).' },
        { q: 'Is data stored in the EU?', a: 'Yes. All data is stored exclusively in EU data centres (Google Cloud EU). We do not transfer data to third countries. Full GDPR compliance.' },
        { q: 'Can I export my data and switch systems?', a: 'Yes, at any time. Export to CSV, Excel, JSON, XML, JPK and other formats. No vendor lock-in — your data always belongs to you.' },
        { q: 'Does the system support e-invoicing and tax files?', a: 'Yes. C-ICAS OS integrates with the Polish National e-Invoice System (KSeF) and supports JPK: V7M, V7K, FA, CIT. Automatic updates when regulations change.' },
        { q: 'What legal forms of companies are supported?', a: 'All Polish forms: sole trader (JDG), Sp. z o.o. (Ltd), S.A. (JSC), partnerships, foundations, associations, cooperatives. Also foreign entities operating in Poland.' },
        { q: 'What does access and pricing look like?', a: 'Registration is free. Contact us (mc@c-icas.gg) to discuss access and licensing terms for your organisation.' },
      ],
    },
    footer: {
      desc: 'Modular cloud ERP for SMBs and enterprises. One ecosystem — HR, CRM, Finance, Compliance and AI.',
      product: 'Product', company: 'Company', legal: 'Legal & Privacy',
      productLinks: ['Modules', 'Pricing', 'Roadmap', 'Changelog', 'System status'],
      companyLinks: ['About', 'Blog', 'Partners', 'Careers', 'Contact'],
      legalLinks: [['Terms of service', '/terms'], ['Privacy policy', '/privacy'], ['Cookie policy', '/cookies'], ['Data processing agreement', '/dpa'], ['Security', '/security'], ['GDPR notice', '/rodo']],
      copy: 'All rights reserved.',
      puodo: 'Data controller: C-ICAS. Supervisory authority: President of UODO (Polish DPA), Stawki 2, Warsaw.',
      status: 'Data in EU · GDPR · e-Invoice · ESG',
    },
  },
} as const;

export type HomeTranslations = typeof homeT.pl;
