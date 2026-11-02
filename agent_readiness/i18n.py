"""Minimal translation layer. English strings are the keys in the code,
`translations.de` holds the German versions. Default language is German
because the first customers are German-speaking; `--lang en` switches."""

from __future__ import annotations

_LANG = "de"
_TABLES: dict[str, dict[str, str]] = {}


def set_language(lang: str) -> None:
    global _LANG
    lang = (lang or "de").lower()[:2]
    if lang not in ("de", "en"):
        raise ValueError(f"Unsupported language: {lang}")
    _LANG = lang


def get_language() -> str:
    return _LANG


def _table(lang: str) -> dict[str, str]:
    if lang not in _TABLES:
        if lang == "de":
            from .translations import de

            _TABLES[lang] = de.STRINGS
        else:
            _TABLES[lang] = {}
    return _TABLES[lang]


def _(text: str) -> str:
    """Translate an English source string into the active language."""
    return _table(_LANG).get(text, text)
