# Translation Orders Service

This project implements a RESTful backend in Node.js (TypeScript) that lets you create translation orders composed of multiple texts, store them in MySQL, and fulfil them via TranslationOS (TOS).

## Features

* Create an order with name, source & target language.
* Add up to 500‑character texts to the order before submission.
* Submit an order — each text is sent separately to TOS `/translate`.
* Automatic background polling of `/status` keeps text & order state in sync.
* Retrieve aggregated order state at any time.
* Fully stateless API behind an Express server with MySQL for persistence.
* Production‑ready Docker + docker‑compose.
* No ORM. Pure **mysql2/promise** with a connection pool.
* Scales to dozens of concurrent requests – Express is non‑blocking and DB writes are batched; MySQL pool prevents connection exhaustion.
* Queue‑friendly design – if you need even more throughput, wire BullMQ/Redis inside `jobs/` without touching the HTTP layer.

## Quick start (local)

```bash
# clone and cd
docker compose up --build
# The API will be available on http://localhost:3000/