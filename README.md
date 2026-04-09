# soa-project

Minimalni Docker setup za lokalni razvoj `Stakeholders` servisa nalazi se u `stakeholders` folderu.

## Pokretanje

1. Predji u `stakeholders` folder.
2. Kopiraj `.env.example` u `.env`.
3. Po potrebi promeni lozinku i portove.
4. Pokreni `docker compose up -d`.

## Trenutna struktura

- `stakeholders/docker-compose.yml` podize Neo4j bazu za Stakeholders servis.
- `stakeholders/.env.example` sadrzi lokalnu konfiguraciju.

## Napomena

Kasnije mozes imati jedan glavni `docker-compose.yml` u root-u koji ce podizati sve servise i baze, ali za sada je Docker konfiguracija izdvojena uz `Stakeholders` radi lakseg razvoja tog servisa.
