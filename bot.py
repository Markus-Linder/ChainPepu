"""Persönlicher Assistenz-Bot auf Basis der Claude API.

Der Bot kann Aufgaben am PC erledigen: Bash-Befehle ausführen, Dateien lesen
und schreiben sowie Webseiten abrufen. Gefährliche Operationen werden vor der
Ausführung bestätigt.
"""

from __future__ import annotations

import os
import shlex
import subprocess
import sys
from pathlib import Path

import anthropic
import base64
import httpx
from anthropic import beta_tool
from dotenv import load_dotenv

load_dotenv()

try:
    import pyautogui  # type: ignore
    pyautogui.FAILSAFE = True
    _GUI_AVAILABLE = True
except Exception:  # noqa: BLE001
    pyautogui = None
    _GUI_AVAILABLE = False

WORKDIR = Path.cwd()
AUTO_APPROVE = os.getenv("BOT_AUTO_APPROVE", "0") == "1"

SYSTEM_PROMPT = f"""Du bist ein persönlicher Assistent, der Aufgaben am Computer für den Nutzer erledigt.

Arbeitsverzeichnis: {WORKDIR}
Plattform: {sys.platform}

Verfügbare Werkzeuge:
- run_bash: Shell-Befehle ausführen
- read_file: Dateiinhalt lesen
- write_file: Datei schreiben oder überschreiben
- list_dir: Verzeichnisinhalt auflisten
- fetch_url: Inhalt einer URL abrufen
- take_screenshot: Bildschirmfoto erstellen und an dich zurückgeben
- mouse_click: An Bildschirmkoordinaten klicken
- type_text: Text auf der Tastatur eintippen
- press_key: Eine Taste oder Tastenkombination drücken (z.B. "enter", "ctrl+c")

Arbeitsweise:
- Plane mehrstufige Aufgaben kurz, bevor du Werkzeuge benutzt.
- Bei zerstörerischen Befehlen (rm, git push --force, dd, mkfs, ...) erkläre vorher kurz was passiert.
- Antworte auf Deutsch, prägnant und ohne Floskeln.
- Wenn eine Aufgabe nicht eindeutig ist, frage nach.
"""


def _confirm(action: str) -> bool:
    if AUTO_APPROVE:
        return True
    answer = input(f"\n[Bestätigung] {action}\nAusführen? [y/N] ").strip().lower()
    return answer in {"y", "j", "yes", "ja"}


def _is_dangerous(cmd: str) -> bool:
    danger = ("rm -rf", "mkfs", " dd ", "shutdown", "reboot", ":(){", "> /dev/sd",
              "git push --force", "git push -f", "chmod -R 777 /")
    low = " " + cmd.lower() + " "
    return any(d in low for d in danger)


@beta_tool
def run_bash(command: str) -> str:
    """Führt einen Shell-Befehl im Arbeitsverzeichnis aus und gibt stdout/stderr zurück.

    Args:
        command: Der auszuführende Shell-Befehl.
    """
    if _is_dangerous(command) and not _confirm(f"Potenziell gefährlich: {command}"):
        return "Abgebrochen durch Nutzer."
    try:
        result = subprocess.run(
            command, shell=True, cwd=WORKDIR, capture_output=True,
            text=True, timeout=120,
        )
    except subprocess.TimeoutExpired:
        return "Fehler: Befehl hat 120s Timeout überschritten."
    out = (result.stdout or "")[-8000:]
    err = (result.stderr or "")[-2000:]
    return f"exit={result.returncode}\nstdout:\n{out}\nstderr:\n{err}"


@beta_tool
def read_file(path: str, max_bytes: int = 200_000) -> str:
    """Liest eine Datei und gibt ihren Inhalt zurück.

    Args:
        path: Pfad zur Datei (relativ oder absolut).
        max_bytes: Maximale Anzahl Bytes, die gelesen werden.
    """
    p = Path(path).expanduser().resolve()
    if not p.exists():
        return f"Fehler: {p} existiert nicht."
    try:
        data = p.read_bytes()[:max_bytes]
        return data.decode("utf-8", errors="replace")
    except Exception as e:
        return f"Fehler beim Lesen: {e}"


@beta_tool
def write_file(path: str, content: str) -> str:
    """Schreibt Inhalt in eine Datei. Überschreibt bestehende Dateien.

    Args:
        path: Zielpfad.
        content: Zu schreibender Inhalt.
    """
    p = Path(path).expanduser().resolve()
    if p.exists() and not _confirm(f"Datei {p} überschreiben ({len(content)} Bytes)"):
        return "Abgebrochen durch Nutzer."
    if not p.exists() and not _confirm(f"Datei {p} erstellen ({len(content)} Bytes)"):
        return "Abgebrochen durch Nutzer."
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"OK: {len(content)} Bytes nach {p} geschrieben."


@beta_tool
def list_dir(path: str = ".") -> str:
    """Listet den Inhalt eines Verzeichnisses auf.

    Args:
        path: Verzeichnispfad. Standard: aktuelles Verzeichnis.
    """
    p = Path(path).expanduser().resolve()
    if not p.is_dir():
        return f"Fehler: {p} ist kein Verzeichnis."
    entries = []
    for child in sorted(p.iterdir()):
        kind = "d" if child.is_dir() else "f"
        size = child.stat().st_size if child.is_file() else "-"
        entries.append(f"{kind} {size:>10} {child.name}")
    return "\n".join(entries) or "(leer)"


def _require_gui() -> str | None:
    if not _GUI_AVAILABLE:
        return ("Fehler: GUI-Steuerung nicht verfügbar. pyautogui konnte nicht "
                "geladen werden (kein Display? In Headless-Umgebung Xvfb starten).")
    return None


@beta_tool
def take_screenshot() -> list[dict]:
    """Erstellt ein Bildschirmfoto und gibt es als Bild zurück.

    Nutze dieses Werkzeug, um den aktuellen Zustand des Desktops zu sehen,
    bevor du Maus- oder Tastatureingaben machst.
    """
    err = _require_gui()
    if err:
        return [{"type": "text", "text": err}]
    img = pyautogui.screenshot()
    from io import BytesIO
    buf = BytesIO()
    img.save(buf, format="PNG")
    data = base64.standard_b64encode(buf.getvalue()).decode()
    return [
        {"type": "text", "text": f"Screenshot {img.size[0]}x{img.size[1]}"},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}},
    ]


@beta_tool
def mouse_click(x: int, y: int, button: str = "left", clicks: int = 1) -> str:
    """Klickt mit der Maus an die Bildschirmposition (x, y).

    Args:
        x: X-Koordinate in Pixeln.
        y: Y-Koordinate in Pixeln.
        button: 'left', 'right' oder 'middle'.
        clicks: Anzahl Klicks (1 für einfach, 2 für Doppelklick).
    """
    err = _require_gui()
    if err:
        return err
    if not _confirm(f"Maus-Klick: ({x},{y}) {button} x{clicks}"):
        return "Abgebrochen durch Nutzer."
    pyautogui.click(x=x, y=y, button=button, clicks=clicks)
    return f"OK: geklickt ({x},{y})"


@beta_tool
def type_text(text: str) -> str:
    """Tippt Text auf der Tastatur, als ob ein Mensch ihn eingeben würde.

    Args:
        text: Der einzugebende Text.
    """
    err = _require_gui()
    if err:
        return err
    if not _confirm(f"Text tippen: {text[:80]!r}"):
        return "Abgebrochen durch Nutzer."
    pyautogui.typewrite(text, interval=0.01)
    return f"OK: {len(text)} Zeichen getippt."


@beta_tool
def press_key(keys: str) -> str:
    """Drückt eine Taste oder Tastenkombination.

    Args:
        keys: Tastenname (z.B. 'enter', 'tab', 'esc') oder Kombination
            mit '+' getrennt (z.B. 'ctrl+c', 'alt+tab', 'ctrl+shift+t').
    """
    err = _require_gui()
    if err:
        return err
    parts = [k.strip().lower() for k in keys.split("+")]
    if not _confirm(f"Tasten drücken: {'+'.join(parts)}"):
        return "Abgebrochen durch Nutzer."
    if len(parts) == 1:
        pyautogui.press(parts[0])
    else:
        pyautogui.hotkey(*parts)
    return f"OK: {keys} gedrückt."


@beta_tool
def fetch_url(url: str) -> str:
    """Lädt den Inhalt einer URL (HTTP GET) und gibt den Text zurück.

    Args:
        url: Die abzurufende URL.
    """
    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            r = client.get(url, headers={"User-Agent": "PersonalBot/1.0"})
        return f"status={r.status_code}\n{r.text[:20000]}"
    except Exception as e:
        return f"Fehler: {e}"


def main() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("Fehler: ANTHROPIC_API_KEY nicht gesetzt. Lege eine .env-Datei an "
              "(siehe .env.example) oder exportiere die Variable.")
        sys.exit(1)

    client = anthropic.Anthropic()
    tools = [
        run_bash, read_file, write_file, list_dir, fetch_url,
        take_screenshot, mouse_click, type_text, press_key,
    ]
    history: list[dict] = []

    print("Persönlicher Bot bereit. Gib eine Aufgabe ein. (Strg+D oder 'exit' zum Beenden)")
    print(f"Arbeitsverzeichnis: {WORKDIR}")
    print(f"GUI-Steuerung: {'aktiv' if _GUI_AVAILABLE else 'nicht verfügbar'}")
    if AUTO_APPROVE:
        print("⚠ Auto-Approve aktiv (BOT_AUTO_APPROVE=1)")

    while True:
        try:
            user_input = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not user_input or user_input.lower() in {"exit", "quit"}:
            break

        history.append({"role": "user", "content": user_input})

        runner = client.beta.messages.tool_runner(
            model="claude-opus-4-7",
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            tools=tools,
            messages=history,
        )

        last_message = None
        for message in runner:
            last_message = message
            for block in message.content:
                if block.type == "text" and block.text:
                    print(block.text)
                elif block.type == "tool_use":
                    args = ", ".join(f"{k}={shlex.quote(str(v))[:60]}" for k, v in block.input.items())
                    print(f"  · {block.name}({args})")

        if last_message is not None:
            history.append({"role": "assistant", "content": last_message.content})


if __name__ == "__main__":
    main()
