# GasStrom – Entwicklungsplan

Die Aufgaben sind nach Risiko und Abhängigkeiten priorisiert. Sicherheitsrelevante Grundlagen kommen zuerst; Architektur-, Funktions- und Betriebsverbesserungen bauen darauf auf.

## Meilenstein 1: Sicherheit und Datenintegrität

### 1. Sicherheits- und Betriebsmodell festlegen ✅

- [x] Unterstützte Betriebsarten dokumentieren: lokal, Heimnetz und öffentlich erreichbar.
- [x] Benutzer-, Rollen- und Vertrauensgrenzen beschreiben.
- [x] Schutzbedarf für Zählerstände, Einstellungen, API-Schlüssel und Backups festhalten.
- [x] Für jede Betriebsart sichere Standardwerte definieren.

**Akzeptanzkriterium:** Bedrohungsmodell und sichere Deployment-Vorgaben sind in der Projektdokumentation nachvollziehbar.

### 2. Gemini-Zugriff ins Backend verlagern ✅

- [x] Gemini-Schlüssel ausschließlich aus Umgebungsvariablen beziehungsweise Docker-Secrets lesen.
- [x] Schlüssel nicht mehr in SQLite speichern oder über `/api/settings` ausliefern.
- [x] Bildanalyse und Modellabfrage über begrenzte Backend-Endpunkte führen.
- [x] Dateityp, Dateigröße und Antwortformat validieren.

**Akzeptanzkriterium:** Der Browser erhält den Gemini-Schlüssel zu keinem Zeitpunkt; bestehende gespeicherte Schlüssel werden ignoriert oder entfernt.

### 3. API vollständig absichern ✅

- [x] Optionalen Zugriffsschutz für nicht-lokale Deployments implementieren.
- [x] CORS auf konfigurierte Origins begrenzen.
- [x] Security-Header, Request-Größenlimit und Rate-Limits ergänzen.
- [x] Einheitliche JSON-Fehlerantworten und sicheres Logging einführen.

**Akzeptanzkriterium:** Schreibende und sensible Endpunkte sind geschützt; unsichere Produktionskonfigurationen führen zu einem klaren Startfehler.

### 4. Eingaben zentral validieren ✅

- [x] Zählerstände, Einstellungen, Importe, IDs und Backup-Dateinamen validieren.
- [x] Ungültige Datumswerte, Typen, Zahlen und unbekannte Felder ablehnen.
- [x] Importgröße begrenzen und Konflikte deterministisch behandeln.
- [x] Datenbank-Constraints als zweite Schutzschicht ergänzen.

**Akzeptanzkriterium:** Fehlerhafte Requests liefern `400` mit strukturierten Details und verändern keine Daten.

### 5. Backup und Restore robust machen ✅

- [x] Backup-Verzeichnis konfigurierbar und im Docker-Volume persistent machen.
- [x] Konsistente SQLite-Backups statt einfacher Dateikopien erstellen.
- [x] Restore gegen Path Traversal schützen und atomar durchführen.
- [x] Vor jedem Restore automatisch ein Sicherheitsbackup erzeugen.
- [x] Backup-Rotation und Recovery-Ablauf testen.

**Akzeptanzkriterium:** Ein automatisierter Test kann sichern, Daten ändern, wiederherstellen und den ursprünglichen Stand bestätigen.

## Meilenstein 2: Architektur

### 6. Datenbank- und Repository-Schicht einführen ✅

- [x] SQL-Zugriffe aus den HTTP-Routen extrahieren.
- [x] Versionierte Migrationen einführen.
- [x] Constraints, Indizes, Transaktionen und WAL-Modus konfigurieren.
- [x] Geregeltes Herunterfahren von HTTP-Server und Datenbank implementieren.

**Akzeptanzkriterium:** Routen enthalten keine direkten SQL-Anweisungen und Migrationen sind wiederholbar getestet.

### 7. Persistenzstrategie vereinheitlichen ✅

- [x] Entscheiden, ob SQLite alleinige Datenquelle bleibt oder Offline-Synchronisation benötigt wird.
- [x] Ungenutzte Dexie-Abhängigkeit und `src/db` entfernen, falls SQLite maßgeblich bleibt.
- [x] Datenfluss und Verantwortlichkeiten dokumentieren.

**Akzeptanzkriterium:** Es gibt genau eine klar definierte führende Datenquelle ohne ungenutzte Persistenzimplementierung.

## Meilenstein 3: Funktionalität und Qualität

### 8. Berechnungslogik fachlich härten und testen ✅

- [x] Tests für Monatsverteilung, Abrechnungsperioden und Prognosen ergänzen.
- [x] Schaltjahre, Zeitzonen, doppelte Datumswerte und Zählerwechsel behandeln.
- [x] Rundungs-, Interpolations- und Preisregeln dokumentieren.
- [x] Negative oder widersprüchliche Verbrauchswerte sichtbar machen.

**Akzeptanzkriterium:** Kritische Rechenpfade besitzen deterministische Grenzfalltests und dokumentierte Fachregeln.

### 9. Frontend-Datenfluss und Bedienung verbessern ✅

- [x] Typisierten API-Client mit konsistenter Fehlerbehandlung einführen.
- [x] Lade-, Leer-, Speicher- und Fehlerzustände sichtbar machen.
- [x] Zählerstände bearbeitbar machen.
- [x] Import-Vorschau mit Validierungs- und Konfliktanzeige ergänzen.

**Akzeptanzkriterium:** Netzwerkfehler bleiben nicht unbemerkt und alle Datenänderungen liefern verständliches Nutzerfeedback.

## Meilenstein 4: Betrieb

### 10. Qualitäts- und Release-Pipeline aufbauen ✅

- [x] Build, ESLint und Tests bei jedem Pull Request ausführen.
- [x] Dependency- und Container-Scans ergänzen.
- [x] Docker-Healthcheck und unveränderliche Image-Tags verwenden.
- [x] Deployment-, Upgrade- und Recovery-Abläufe dokumentieren.

**Akzeptanzkriterium:** Fehlerhafte Builds, Tests und bekannte kritische Sicherheitslücken blockieren ein Release automatisch.
