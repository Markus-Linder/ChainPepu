"""Dünne Hülle um das MetaApi-SDK: verbindet das MT5-Konto und liefert Kontodaten.

Alle Methoden sind lesend. Handelsfunktionen sind bewusst nicht enthalten, damit
ein Investor-Passwort (nur lesen) für den Betrieb ausreicht.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from metaapi_cloud_sdk import MetaApi

log = logging.getLogger(__name__)


class MT5Client:
    def __init__(self, token: str, account_id: str, region: str | None = None):
        opts: dict[str, Any] = {}
        if region:
            opts["region"] = region
        self._api = MetaApi(token, opts or None)
        self._account_id = account_id
        self._account = None
        self._conn = None

    async def connect(self) -> None:
        """Stellt sicher, dass das Konto deployed ist, und öffnet eine RPC-Verbindung."""
        account = await self._api.metatrader_account_api.get_account(self._account_id)
        if account.state not in ("DEPLOYING", "DEPLOYED"):
            log.info("MetaApi-Konto wird deployed ...")
            await account.deploy()
        log.info("Warte auf Broker-Verbindung ...")
        await account.wait_connected()
        conn = account.get_rpc_connection()
        await conn.connect()
        log.info("Warte auf Synchronisation ...")
        await conn.wait_synchronized()
        self._account = account
        self._conn = conn
        log.info("MT5-Konto %s (%s) verbunden", account.login, account.server)

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    @property
    def conn(self):
        if self._conn is None:
            raise RuntimeError("MT5Client ist nicht verbunden. Zuerst connect() aufrufen.")
        return self._conn

    async def account_info(self) -> dict:
        return await self.conn.get_account_information()

    async def positions(self) -> list[dict]:
        return await self.conn.get_positions()

    async def orders(self) -> list[dict]:
        return await self.conn.get_orders()

    async def deals(self, start: datetime, end: datetime) -> list[dict]:
        result = await self.conn.get_deals_by_time_range(start, end)
        return list(result.get("deals", []))

    async def deals_for_position(self, position_id: str) -> list[dict]:
        result = await self.conn.get_deals_by_position(str(position_id))
        return list(result.get("deals", []))
