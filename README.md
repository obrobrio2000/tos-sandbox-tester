# TranslationOS Sandbox Tester

This project implements a RESTful backend in Node.js (TypeScript) that lets you create translation orders composed of multiple texts, store them in MySQL, and fulfil them via TranslationOS (TOS).

## Features

* Create an order with name, source & target language.
* Add up to 500‑character texts to the order before submission.
* Submit an order — each text is sent separately to TOS `/translate`.
* Automatic background polling of `/status` keeps text & order state in sync.
* Retrieve aggregated order state at any time.
* Automatic tunnel creation with ngrok.
* Fully stateless API behind an Express server with MySQL for persistence.
* Production‑ready Docker + docker‑compose.
* No ORM. Pure **mysql2/promise** with a connection pool.
* Scales to dozens of concurrent requests – Express is non‑blocking and DB writes are batched; MySQL pool prevents connection exhaustion.
* Queue‑friendly design – if you need even more throughput, wire BullMQ/Redis inside `jobs/` without touching the HTTP layer.

## Usage

```bash
# clone and cd
npm install # install dependencies
# create and populate .env file
docker compose up --build -d # build and start containers
# populate test.sh file
chmod +x test.sh # give appropriate permissions to test script
./test.sh # run test script
docker compose down -v # stop containers and clean volumes
```