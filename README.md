# 🎄 Nikolaus gegen Weihnachtsmann – Tischtennis 🏓

Ein kleines Weihnachts-Pong-Spiel, umgesetzt nach einer Spielidee meines Kindes.
Läuft als reine HTML/CSS/JavaScript-Webapp direkt im Browser – auf dem PC und
auf dem Handy.

## Spielidee

- **Startbildschirm:** 1 Spieler (gegen den Computer) oder 2 Spieler
- **Figurenauswahl:** Nikolaus (Bischofsmütze) oder Weihnachtsmann (Zipfelmütze),
  im 2-Spieler-Modus wählt jeder Spieler seine eigene Figur
- **Spielprinzip:** Tischtennis/Pong von oben – der Ball fliegt hin und her,
  man bewegt seine Figur nach oben/unten, um ihn zurückzuspielen
- **Steuerung:**
  - Spieler 1: `W` / `S` oder Finger auf der linken Bildschirmhälfte ziehen
  - Spieler 2: Pfeiltaste `↑` / `↓` oder Finger auf der rechten Bildschirmhälfte
- Wer den Ball verpasst, der Gegner bekommt einen Punkt. **Wer zuerst 5 Punkte
  hat, gewinnt!**
- Punktestand oben, Ball wird nach jedem Treffer etwas schneller, "Pling"-Sound
  bei jedem Treffer, Siegesmeldung am Ende.

Alle Figuren und Grafiken werden direkt im Browser mit `<canvas>` gezeichnet –
es werden keine fremden Bilder, Logos oder Markenzeichen (z. B. von LEGO)
verwendet, nur eigene, einfache Zeichnungen der klassischen Nikolaus-/
Weihnachtsmann-Figuren.

## Lokal spielen

Einfach `index.html` in einem beliebigen lokalen Webserver öffnen, z. B.:

```bash
npx serve .
# oder
python -m http.server 8080
```

und dann im Browser `http://localhost:8080` (bzw. den angezeigten Port)
öffnen.

## Auf GitHub Pages veröffentlichen

Dieses Repository enthält einen GitHub-Actions-Workflow
(`.github/workflows/pages.yml`), der die Seite bei jedem Push auf `main`
automatisch auf GitHub Pages veröffentlicht.

Einmalig aktivieren:

1. Im Repository zu **Settings → Pages** gehen.
2. Bei **Source** die Option **GitHub Actions** auswählen.
3. Nach dem nächsten Push auf `main` läuft der Workflow automatisch und die
   Seite ist unter `https://<benutzername>.github.io/<repo-name>/` erreichbar.

## Technik

- Reines Vanilla JavaScript, kein Build-Schritt, keine Abhängigkeiten
- `index.html` – Struktur & Bildschirme (Menü, Figurenauswahl, Spiel)
- `style.css` – responsives, mobilfreundliches Layout
- `game.js` – Spiellogik, Zeichnen der Figuren, Ton-Effekte (Web Audio API)
