"""Weights the categories into a total score from 0 to 100."""

from __future__ import annotations

from .i18n import _
from .models import CategoryResult


def total_score(categories: list[CategoryResult]) -> int:
    active = [c for c in categories if not c.skipped]
    weight_sum = sum(c.weight for c in active)
    if weight_sum == 0:
        return 0
    return round(sum(c.score * c.weight for c in active) / weight_sum)


def grade(score: int) -> str:
    if score >= 85:
        return _("A – agent-ready")
    if score >= 70:
        return _("B – good, with gaps")
    if score >= 50:
        return _("C – partially visible")
    if score >= 30:
        return _("D – hard for agents to use")
    return _("E – practically invisible")
