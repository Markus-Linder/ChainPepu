"""Technische Prüfungen. Jede Prüfung liefert ein CategoryResult."""

from .crawlers import check_crawlers
from .discovery import check_discovery
from .structured_data import check_structured_data
from .content import check_content
from .interfaces import check_interfaces

ALL_CHECKS = [
    check_crawlers,
    check_discovery,
    check_structured_data,
    check_content,
    check_interfaces,
]

__all__ = ["ALL_CHECKS"]
