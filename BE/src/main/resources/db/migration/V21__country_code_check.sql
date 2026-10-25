-- US-F2-12 (#207): the transport specialist adds countries in the app, so the code is checked here too:
-- ISO 3166-1 alpha-2, two capital letters ("US"). The seeded VN, KH, TH, LA, MY and HK already are.
alter table countries
    add constraint countries_code_check check (code ~ '^[A-Z]{2}$');
