# Hilfe zur App KI-Kernel GPT

## Zweck der App

KI-Kernel GPT ist ein Simulations- und Reflexionswerkzeug für Organisationsentscheidungen. Die App unterstützt dabei, Veränderungsvorhaben, KI-Einführungen, Workshops, Beteiligungsprozesse und Risiken vorab strukturiert durchzudenken.

Die App ist keine empirische Organisationsdiagnose. Sie erzeugt plausible Hypothesen auf Basis deiner Eingaben.

## Grundprinzip

Die App arbeitet nach dieser Logik:

1. Ausgangslage beschreiben
2. Annahmen sichtbar machen
3. Personas und Stakeholder modellieren
4. Ressourcenlage einschätzen
5. Interventionen planen
6. Strategien vergleichen
7. Report erzeugen
8. Ergebnisse mit realen Beteiligten prüfen

## Schnelleinstieg

### 1. Ausgangslage

Beschreibe das Vorhaben möglichst konkret.

Beispiele:

- Einführung einer KI-Richtlinie
- Planung eines KI-Workshops
- Vorbereitung eines Beteiligungsprozesses
- Prüfung eines Konfliktrisikos
- Entscheidung zwischen Top-down-Rollout und Pilotgruppe

Wichtig ist die Entscheidungsfrage. Sie steuert die Qualität der Simulation.

### 2. Annahmen

Trage ein, was du über die Situation vermutest.

Beispiel:

> Mitarbeitende sind interessiert, aber wegen Datenschutz und Mehrbelastung verunsichert.

Bewerte jede Annahme:

- Evidenz: niedrig, mittel, hoch
- Unsicherheit: niedrig, mittel, hoch
- Sensibilität: unkritisch, intern, vertraulich, personenbezogen vermeiden

Je mehr Annahmen unsicher sind, desto vorsichtiger muss der Report gelesen werden.

### 3. Personas

Modelliere keine echten Personen. Verwende Rollen oder Archetypen.

Geeignet:

- Skeptische Fachkraft
- Pragmatische Teamleitung
- Datenschutzrolle
- MAV / Interessenvertretung
- Qualitätsmanagement
- KI-Stabsstelle

Nicht geeignet:

- echte Namen
- reale Mitarbeitendenprofile
- verdeckte Bewertung einzelner Personen
- Prognosen über individuelles Verhalten

### 4. Ressourcen

Ressourcen beschreiben den Systemzustand.

Typische Ressourcen:

- Vertrauen
- Klarheit
- Aufmerksamkeit
- Energie
- Zeitdruck
- Konfliktspannung
- psychologische Sicherheit

Bei jeder Ressource wird eingeschätzt:

- aktueller Wert
- Zielwert
- Trend
- Engpass oder Kipprisiko
- wer die Ressource beobachten oder stabilisieren sollte

### 5. Interventionen

Interventionen sind Maßnahmen, die du testen möchtest.

Beispiele:

- Datenschutz-FAQ vor dem Workshop
- freiwillige Pilotgruppe
- Einwandrunde vor Entscheidung
- Führung hält sich in Diskussion bewusst zurück
- Moderation trennt Sorgen, Nutzen und Entscheidung

Wichtig: Jede Intervention sollte auch Nebenwirkungen enthalten.

### 6. Strategien

Strategien sind alternative Vorgehensweisen.

Beispiele:

- Governance-first
- Pilot-first
- Top-down-Rollout

Die Werte 1 bis 5 sind nur Verdichtung. Entscheidend sind die Begründungen:

- Warum ist die Strategie schnell oder langsam?
- Warum ist die Akzeptanz hoch oder niedrig?
- Wie stark ist die Governance-Kontrolle?
- Wo entsteht Innovation?
- Welche Risiken und Nebenwirkungen gibt es?

### 7. Report

Der Report folgt dieser Struktur:

1. Executive Summary
2. Ausgangslage
3. Simulationsannahmen
4. Persona- und Stakeholderanalyse
5. Ressourcen- und Risikolage
6. Phasenanalyse
7. Konflikt- und Koalitionsmuster
8. Kritische Kipppunkte
9. Interventionsoptionen
10. Entscheidungsmatrix
11. Maßnahmenplan
12. Offene Fragen
13. Datenschutz-/Governance-Hinweise
14. Grenzen der Simulation

## Lokaler Report und GPT-Report

Die App erzeugt immer einen lokalen heuristischen Report.

Wenn OpenAI korrekt eingerichtet ist, kannst du zusätzlich den Button „GPT-Backend testen“ nutzen. Dann erzeugt das serverseitige GPT-Backend einen ausführlicheren strukturierten Report.

## Häufige Fehler

### 429 insufficient_quota

Bedeutung: Dein OpenAI-API-Konto hat kein verfügbares Guthaben oder ein Limit ist erreicht.

Lösung:

- OpenAI Platform Billing prüfen
- Zahlungsmethode hinzufügen
- Credits kaufen
- Modell ggf. günstiger setzen

### OPENAI_API_KEY fehlt

Bedeutung: In Coolify ist kein API-Key als Environment Variable gesetzt.

Lösung:

In Coolify unter Environment Variables setzen:

```env
OPENAI_API_KEY=sk-...
```

Danach Redeploy.

### Backend nicht erreichbar

Mögliche Ursachen:

- App wurde nicht neu deployed
- Port ist falsch
- Container läuft nicht
- Fehler im Build
- Environment Variables fehlen

Prüfe in Coolify die Logs.

## Datenschutz und Governance

Verwende keine echten personenbezogenen Profile.

Die App ist geeignet für:

- Rollen
- Archetypen
- hypothetische Szenarien
- anonymisierte Stakeholdergruppen
- Workshopplanung
- Risikoreflexion

Die App ist nicht geeignet für:

- Leistungsbewertung
- Verhaltenskontrolle
- individuelle Widerstandsprognosen
- vertrauliche Konfliktakten
- personenbezogene Diagnosen

## Gute Eingaben

Gute Eingaben sind konkret, aber anonymisiert.

Schlecht:

> Frau Müller blockiert das Projekt.

Besser:

> Eine erfahrene Fachkraft mit informellem Einfluss reagiert skeptisch, weil sie Kontroll- und Qualitätsrisiken sieht.

Schlecht:

> Das Team will nicht.

Besser:

> Ein Teil des Teams ist überlastet und befürchtet, dass KI zusätzliche Dokumentationsanforderungen erzeugt.

## Empfohlener Arbeitsablauf

Für einen realen Beratungs- oder Workshopfall:

1. Szenario anonymisiert vorbereiten
2. Annahmen mit Evidenzgrad markieren
3. 4 bis 6 Personas modellieren
4. 5 bis 8 Ressourcen bewerten
5. 3 bis 5 Interventionen testen
6. 2 bis 4 Strategien vergleichen
7. Report erzeugen
8. Kritische Annahmen real validieren
9. Maßnahmenplan überarbeiten
10. Nach Durchführung Retrospektive ergänzen

## Merksatz

Die App liefert keine Wahrheit. Sie macht Denkgrundlagen, Risiken, Zielkonflikte und mögliche nächste Schritte sichtbar.
