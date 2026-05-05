# KI-Kernel GPT

Beratungsfähiger Prototyp für Organisationssimulationen mit React, Vite, Node/Express und serverseitiger OpenAI-Anbindung.

## Funktionen

- Ausgangslage und Entscheidungsfrage erfassen
- Simulationsannahmen mit Evidenz und Unsicherheit dokumentieren
- Personas und Stakeholder mit Vorlagen modellieren
- Ressourcenlage abbilden
- Interventionen und Strategien vergleichen
- Beratungsreport nach 14-Punkte-Struktur erzeugen
- Serverroute `/api/simulate` für ChatGPT/OpenAI vorbereitet
- Dockerfile für Coolify-Deployment

## Lokaler Start

```bash
npm install
npm run dev
```

Nur Frontend-Entwicklung:

```bash
npm run dev
```

Produktionsmodus lokal:

```bash
npm run build
OPENAI_API_KEY="sk-..." npm start
```

## Docker lokal testen

```bash
docker build -t ki-kernel-gpt .
docker run -p 3000:3000 \
  -e OPENAI_API_KEY="sk-..." \
  -e OPENAI_MODEL="gpt-5.5" \
  ki-kernel-gpt
```

Dann öffnen:

```text
http://localhost:3000
```

## Coolify

In Coolify als Dockerfile-App deployen.

Erforderliche Umgebungsvariablen:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
PORT=3000
```

Optionaler Zugriffsschutz:

```env
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=ein-langes-sicheres-passwort
```

## Sicherheit

Der OpenAI-Key darf nicht im Frontend gespeichert werden. Die App ruft OpenAI ausschließlich serverseitig über `/api/simulate` auf.

Für produktive Nutzung sollten ergänzt werden:

- echte Authentifizierung oder Cloudflare Access
- Rate Limits
- Audit-Logging ohne sensible Inhalte
- Datenschutzmodus mit PII-Warnung
- Exportfunktionen
- JSON-Schema-Validierung und Tests
