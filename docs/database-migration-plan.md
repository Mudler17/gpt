# KI-Kernel GPT · Datenbank-Migrationsplan

Stand: App 1.7 · Vorbereitung

Die App bleibt aktuell lokal im Browser speichernd. Dieser Plan beschreibt die nächsten Schritte zur späteren PostgreSQL-Anbindung in Coolify.

## Phase 0: Lokalen Bestand sichern

1. App öffnen.
2. `Backup 1.6` öffnen.
3. Vollbackup exportieren.
4. Datenmodell-Check ausführen.
5. Warnungen prüfen, insbesondere personenbezogene Muster.
6. Projekte anlegen und Szenarien zu Projekten zuordnen.

Ohne sauberes Backup keine Datenbankmigration.

## Phase 1: PostgreSQL in Coolify anlegen

In Coolify:

1. Neues Resource/Service anlegen.
2. PostgreSQL wählen.
3. Datenbanknamen, Benutzer und Passwort erzeugen lassen oder setzen.
4. Interne Connection-URL kopieren.
5. In der App als Environment Variable setzen:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
STORAGE_MODE=local
```

`STORAGE_MODE=local` bleibt zunächst gesetzt, damit die App weiter LocalStorage nutzt.

## Phase 2: Healthcheck prüfen

Nach Redeploy:

```text
/api/health
```

Erwartung in App 1.7:

```json
{
  "ok": true,
  "databaseConfigured": true,
  "storageMode": "local"
}
```

In App 1.7 wird noch keine echte Verbindung geprüft. Das folgt in App 1.8.

## Phase 3: Prisma vorbereiten

Später in App 1.8:

```bash
npm install prisma @prisma/client
npx prisma init
```

Dann `prisma/schema.prisma` nach dem Schema-Entwurf erstellen.

## Phase 4: Erste Migration

Später:

```bash
npx prisma migrate dev --name init
```

Für Produktion/Coolify später:

```bash
npx prisma migrate deploy
```

## Phase 5: LocalStorage-Backup importieren

Migrationslogik:

1. Vollbackup aus `Backup 1.6` hochladen.
2. Projekte importieren.
3. Szenarien importieren.
4. Projekt-Szenario-Verknüpfungen importieren.
5. Phasen-Sets importieren.
6. Beratungsfälle importieren.
7. Import-Entwürfe und Reports nachrangig importieren.

## Phase 6: Hybridbetrieb

Empfohlener Zwischenstand:

```env
STORAGE_MODE=hybrid
```

Bedeutung:

- LocalStorage bleibt Fallback.
- Datenbank wird zusätzlich beschrieben.
- Lesen kann zunächst weiterhin lokal erfolgen.
- Export bleibt möglich.

## Phase 7: Datenbank als Hauptspeicher

Erst wenn Hybridbetrieb stabil ist:

```env
STORAGE_MODE=db
```

Dann:

- Projekte aus DB laden.
- Szenarien aus DB laden.
- Speichern serverseitig.
- LocalStorage nur noch Cache oder Notfall-Export.

## Risiken

### Zu frühe Migration

Wenn das Datenmodell nicht stabil ist, werden spätere Schemaänderungen unnötig aufwendig.

### Personenbezogene Inhalte

Serverseitige Speicherung erhöht die Verantwortung. Vor Migration bereinigen oder anonymisieren.

### Mehrbenutzerfähigkeit

Sobald mehrere Personen dieselbe DB nutzen, brauchst du Authentifizierung, Rollen und Rechte. Nicht nebenbei einbauen.

## Empfehlung

Nächster technischer Schritt nach App 1.7:

1. `DATABASE_URL` in Coolify vorbereiten.
2. Prisma einführen.
3. `prisma/schema.prisma` erstellen.
4. Healthcheck mit echter DB-Prüfung erweitern.
5. Noch keine Hauptspeicher-Umstellung.
