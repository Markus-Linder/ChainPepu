"""Telegram-Bot: Befehle, Positions-Alerts und Tagesbericht."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from . import formatting as fmt
from .alerts import DrawdownWatcher, diff_positions, realized_from_deals
from .config import Settings
from .mt5 import MT5Client

log = logging.getLogger(__name__)

HELP = (
    "<b>ChainPepu MT5-Monitor</b>\n"
    "/status – Balance, Equity, Drawdown\n"
    "/positions – offene Positionen\n"
    "/orders – Pending-Orders\n"
    "/today – Tagesbericht\n"
    "/week – Wochenbericht\n"
    "/alerts on|off – Push-Alerts für diesen Chat\n"
    "/help – diese Hilfe"
)


class Monitor:
    def __init__(self, settings: Settings, mt5: MT5Client, app: Application):
        self.settings = settings
        self.mt5 = mt5
        self.app = app
        self.tz = ZoneInfo(settings.timezone)
        self.alert_chats: set[int] = set(settings.allowed_chat_ids)
        self._positions: dict[str, dict] | None = None
        self._drawdown = DrawdownWatcher(settings.drawdown_alert_percent)
        self._last_report_date = None

    # ---------- Hilfsfunktionen ----------
    def allowed(self, update: Update) -> bool:
        chat = update.effective_chat
        return chat is not None and chat.id in self.settings.allowed_chat_ids

    async def broadcast(self, text: str) -> None:
        for chat_id in list(self.alert_chats):
            try:
                await self.app.bot.send_message(chat_id, text, parse_mode=ParseMode.HTML)
            except Exception:  # noqa: BLE001
                log.exception("Senden an Chat %s fehlgeschlagen", chat_id)

    async def _report(self, title: str, start: datetime, end: datetime) -> str:
        info, deals = await asyncio.gather(self.mt5.account_info(), self.mt5.deals(start, end))
        return fmt.format_report(title, fmt.summarize_deals(deals), info)

    def _day_bounds(self, day: datetime) -> tuple[datetime, datetime]:
        start = datetime.combine(day.date(), time.min, tzinfo=self.tz)
        return start.astimezone(timezone.utc), (start + timedelta(days=1)).astimezone(timezone.utc)

    # ---------- Befehle ----------
    async def cmd_start(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        chat = update.effective_chat
        if not self.allowed(update):
            await update.message.reply_text(
                f"Dieser Chat ist nicht freigeschaltet.\nDeine Chat-ID: {chat.id}\n"
                "Trage sie in TELEGRAM_ALLOWED_CHAT_IDS ein und starte den Bot neu."
            )
            return
        await update.message.reply_text(HELP, parse_mode=ParseMode.HTML)

    async def cmd_help(self, update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
        await self.cmd_start(update, ctx)

    async def cmd_status(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        info, positions = await asyncio.gather(self.mt5.account_info(), self.mt5.positions())
        await update.message.reply_text(fmt.format_status(info, positions), parse_mode=ParseMode.HTML)

    async def cmd_positions(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        info, positions = await asyncio.gather(self.mt5.account_info(), self.mt5.positions())
        await update.message.reply_text(
            fmt.format_positions(positions, info.get("currency", "")), parse_mode=ParseMode.HTML
        )

    async def cmd_orders(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        await update.message.reply_text(fmt.format_orders(await self.mt5.orders()), parse_mode=ParseMode.HTML)

    async def cmd_today(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        now = datetime.now(self.tz)
        start, end = self._day_bounds(now)
        text = await self._report(f"📅 Tagesbericht {now:%d.%m.%Y}", start, end)
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)

    async def cmd_week(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        now = datetime.now(self.tz)
        monday = now - timedelta(days=now.weekday())
        start, _ = self._day_bounds(monday)
        text = await self._report(f"🗓 Wochenbericht ab {monday:%d.%m.%Y}", start, datetime.now(timezone.utc))
        await update.message.reply_text(text, parse_mode=ParseMode.HTML)

    async def cmd_alerts(self, update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
        if not self.allowed(update):
            return
        chat_id = update.effective_chat.id
        arg = (ctx.args[0].lower() if ctx.args else "").strip()
        if arg == "on":
            self.alert_chats.add(chat_id)
            await update.message.reply_text("🔔 Alerts für diesen Chat sind an.")
        elif arg == "off":
            self.alert_chats.discard(chat_id)
            await update.message.reply_text("🔕 Alerts für diesen Chat sind aus.")
        else:
            state = "an" if chat_id in self.alert_chats else "aus"
            await update.message.reply_text(f"Alerts sind {state}. Nutze /alerts on oder /alerts off.")

    # ---------- Hintergrund ----------
    async def poll_loop(self) -> None:
        while True:
            try:
                await self._poll_once()
            except Exception:  # noqa: BLE001
                log.exception("Fehler beim Abfragen des Kontos")
            await asyncio.sleep(self.settings.poll_interval_seconds)

    async def _poll_once(self) -> None:
        info, positions = await asyncio.gather(self.mt5.account_info(), self.mt5.positions())
        cur = info.get("currency", "")
        diff, current_map = diff_positions(self._positions or {}, positions)
        first_run = self._positions is None
        self._positions = current_map
        if not first_run:
            for p in diff.opened:
                await self.broadcast(fmt.format_opened(p, cur))
            for p in diff.closed:
                realized = None
                try:
                    realized = realized_from_deals(await self.mt5.deals_for_position(str(p["id"])))
                except Exception:  # noqa: BLE001
                    log.warning("Deals für Position %s nicht abrufbar", p.get("id"))
                await self.broadcast(fmt.format_closed(p, realized, cur))
        dd = self._drawdown.check(info)
        if dd is not None:
            await self.broadcast(fmt.format_drawdown(dd, info))
        await self._maybe_daily_report(info)

    async def _maybe_daily_report(self, info: dict) -> None:
        now = datetime.now(self.tz)
        if now.hour < self.settings.daily_report_hour or self._last_report_date == now.date():
            return
        self._last_report_date = now.date()
        start, end = self._day_bounds(now)
        deals = await self.mt5.deals(start, end)
        text = fmt.format_report(f"📅 Tagesbericht {now:%d.%m.%Y}", fmt.summarize_deals(deals), info)
        await self.broadcast(text)


def build_application(settings: Settings, mt5: MT5Client) -> Application:
    app = Application.builder().token(settings.telegram_bot_token).build()
    monitor = Monitor(settings, mt5, app)
    app.bot_data["monitor"] = monitor
    for name, handler in (
        ("start", monitor.cmd_start),
        ("help", monitor.cmd_help),
        ("status", monitor.cmd_status),
        ("positions", monitor.cmd_positions),
        ("orders", monitor.cmd_orders),
        ("today", monitor.cmd_today),
        ("week", monitor.cmd_week),
        ("alerts", monitor.cmd_alerts),
    ):
        app.add_handler(CommandHandler(name, handler))

    async def post_init(application: Application) -> None:
        await mt5.connect()
        application.create_task(monitor.poll_loop())
        await monitor.broadcast("🚀 ChainPepu-Monitor ist online. /status für den Kontostand.")

    async def post_shutdown(_: Application) -> None:
        await mt5.close()

    app.post_init = post_init
    app.post_shutdown = post_shutdown
    return app
