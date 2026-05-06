# KI-Kernel GPT · Datenbankschema-Entwurf

Stand: App 1.7 · Datenbank-Vorbereitung

Dieser Entwurf beschreibt die spätere PostgreSQL-Struktur. Die App verwendet weiterhin LocalStorage als Hauptspeicher. Die Datenbank wird erst in einer späteren Version aktiviert.

## Zielbild

Die Datenbank soll nicht einfach die aktuelle Oberfläche speichern, sondern die fachliche Struktur der App abbilden:

- Projekte als Klammer
- Szenarien als Varianten oder Arbeitsstände
- Szenario-Versionen für Nachvollziehbarkeit
- Annahmen, Personas, Ressourcen, Interventionen und Strategien als Szenario-Bestandteile
- Phasenmodelle und Beziehungsmodelle als Bestandteile der Szenarioakte
- Beratungsfälle als persönliche Arbeitsnotizen
- Reports und Importe als erzeugte Artefakte
- Audit-Log für spätere Nachvollziehbarkeit

## Empfohlene Tabellen

### users

Späterer Benutzerkontext. In der ersten DB-Version kann ein lokaler Einzelbenutzer technisch als Default-User angelegt werden.

Felder:

- id
- email
- display_name
- role
- created_at
- updated_at

### projects

Projektakte als fachliche Klammer.

Felder:

- id
- user_id
- title
- description
- status
- priority
- tags jsonb
- decision_need text
- next_step text
- boundaries text
- notes text
- created_at
- updated_at
- archived_at

### scenarios

Gespeicherte Szenarien.

Felder:

- id
- user_id
- title
- name
- description
- current_version_id
- created_at
- updated_at
- archived_at

### project_scenarios

Zuordnung von Szenarien zu Projekten. Damit kann ein Szenario später mehreren Projekten zugeordnet werden, falls nötig.

Felder:

- id
- project_id
- scenario_id
- relation_type
- sort_order
- created_at

### scenario_versions

Versionierter Zustand eines Szenarios.

Felder:

- id
- scenario_id
- version_number
- source
- state_json jsonb
- created_at
- created_by
- note

Hinweis: Anfangs kann `state_json` als vollständiges JSON gespeichert werden. Später können Annahmen, Personas usw. stärker normalisiert werden.

### assumptions

Optional normalisierte Annahmen.

Felder:

- id
- scenario_version_id
- text
- source
- evidence
- uncertainty
- sensitivity
- source_status
- source_excerpt
- created_at

### personas

Optional normalisierte Persona-/Stakeholder-Modelle.

Felder:

- id
- scenario_version_id
- name
- role
- stance
- influence int
- affectedness int
- trust int
- ai_literacy int
- risk_sense int
- change_energy int
- informal_role
- conflict_style
- trigger
- learning_need
- communication_need
- source_status

### resources

Optional normalisierte Ressourcen.

Felder:

- id
- scenario_version_id
- name
- type
- current int
- target int
- direction
- trend
- bottleneck
- owner
- source_status

### interventions

Optional normalisierte Interventionen.

Felder:

- id
- scenario_version_id
- name
- timing
- target
- benefit
- side_effect
- effort
- source_status

### strategies

Optional normalisierte Strategien.

Felder:

- id
- scenario_version_id
- name
- description
- speed int
- speed_text
- acceptance int
- acceptance_text
- control int
- control_text
- innovation int
- innovation_text
- risk int
- risk_text
- conditions
- failure_mode
- decision_signal
- source_status

### phase_sets

Eigene Phasen-Sets.

Felder:

- id
- user_id
- name
- phases jsonb
- is_builtin boolean
- created_at
- updated_at

### scenario_phases

Konkretes Phasenmodell zu einem Szenario.

Felder:

- id
- scenario_id
- scenario_version_id nullable
- phase_set_id nullable
- phases_json jsonb
- created_at
- updated_at

### scenario_relations

Konkretes Beziehungsmodell zu einem Szenario.

Felder:

- id
- scenario_id
- scenario_version_id nullable
- relations_json jsonb
- created_at
- updated_at

### consulting_cases

Persönliche Beratungsfälle/Fallakten.

Felder:

- id
- user_id
- project_id nullable
- scenario_id nullable
- title
- status
- priority
- mandate text
- decision_need text
- deliverable text
- boundaries text
- consulting_notes text
- reflection text
- todos jsonb
- journal jsonb
- created_at
- updated_at

### reports

Erzeugte Berichte.

Felder:

- id
- user_id
- project_id nullable
- scenario_id nullable
- report_type
- title
- content text
- content_json jsonb
- created_at

### imports

Importierte Dokumente und daraus erzeugte Entwürfe. Rohtexte sollten nur sparsam gespeichert werden.

Felder:

- id
- user_id
- project_id nullable
- filename
- document_type
- analysis_mode
- extracted_text text nullable
- draft_json jsonb
- created_at

### audit_log

Spätere Nachvollziehbarkeit.

Felder:

- id
- user_id
- entity_type
- entity_id
- action
- metadata jsonb
- created_at

## Erste DB-Version: pragmatische Empfehlung

Für die erste Datenbankversion reicht eine hybride Struktur:

1. `projects`
2. `scenarios`
3. `project_scenarios`
4. `scenario_versions` mit vollständigem `state_json`
5. `phase_sets`
6. `consulting_cases`
7. `reports`
8. `imports`
9. `audit_log`

Die stärker normalisierten Tabellen wie `assumptions`, `personas`, `resources`, `interventions` und `strategies` können später ergänzt werden.

## Datenschutznotiz

Vor der Datenbankmigration sollten personenbezogene Inhalte aus LocalStorage-Backups entfernt oder anonymisiert werden. Die Datenbank darf nicht zur Bewertung realer Personen, zur verdeckten Konfliktanalyse oder zur Leistungsdiagnostik genutzt werden.
