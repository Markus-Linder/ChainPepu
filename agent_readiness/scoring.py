"""Gewichtet die Kategorien zu einem Gesamtwert von 0 bis 100."""

from __future__ import annotations

from .models import CategoryResult


def total_score(categories: list[CategoryResult]) -> int:
    active = [c for c in categories if not c.skipped]
    weight_sum = sum(c.weight for c in active)
    if weight_sum == 0:
        return 0
    return round(sum(c.score * c.weight for c in active) / weight_sum)


def grade(score: int) -> str:
    if score >= 85:
        return "A – agentenfähig"
    if score >= 70:
        return "B – gut, mit Lücken"
    if score >= 50:
        return "C – teilweise sichtbar"
    if score >= 30:
        return "D – für Agenten schwer nutzbar"
    return "E – praktisch unsichtbar"
