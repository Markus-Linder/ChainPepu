"""Zustandsvergleich: erkennt eröffnete/geschlossene Positionen und Drawdown."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PositionDiff:
    opened: list[dict] = field(default_factory=list)
    closed: list[dict] = field(default_factory=list)


def diff_positions(previous: dict[str, dict], current: list[dict]) -> tuple[PositionDiff, dict[str, dict]]:
    """Vergleicht die vorherige Positions-Map mit der aktuellen Liste.

    Gibt den Unterschied und die neue Map (id -> position) zurück.
    """
    current_map = {str(p["id"]): p for p in current}
    diff = PositionDiff()
    for pid, pos in current_map.items():
        if pid not in previous:
            diff.opened.append(pos)
    for pid, pos in previous.items():
        if pid not in current_map:
            diff.closed.append(pos)
    return diff, current_map


def drawdown_percent(info: dict) -> float:
    balance = info.get("balance") or 0.0
    equity = info.get("equity") or 0.0
    if balance <= 0:
        return 0.0
    return max(0.0, (balance - equity) / balance * 100)


class DrawdownWatcher:
    """Löst genau einmal aus, wenn die Schwelle überschritten wird, und setzt sich
    zurück, sobald der Drawdown wieder unter die Hälfte der Schwelle fällt."""

    def __init__(self, threshold_percent: float):
        self.threshold = threshold_percent
        self._active = False

    def check(self, info: dict) -> float | None:
        if self.threshold <= 0:
            return None
        dd = drawdown_percent(info)
        if not self._active and dd >= self.threshold:
            self._active = True
            return dd
        if self._active and dd < self.threshold / 2:
            self._active = False
        return None


def realized_from_deals(deals: list[dict]) -> float | None:
    out = [d for d in deals if d.get("entryType") in ("DEAL_ENTRY_OUT", "DEAL_ENTRY_OUT_BY", "DEAL_ENTRY_INOUT")]
    if not out:
        return None
    return sum(
        (d.get("profit", 0.0) or 0.0) + (d.get("swap", 0.0) or 0.0) + (d.get("commission", 0.0) or 0.0)
        for d in out
    )
