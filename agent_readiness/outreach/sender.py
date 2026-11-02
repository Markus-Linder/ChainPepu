"""SMTP sending with the headers that keep first-contact mail out of the spam folder:
authenticated submission, List-Unsubscribe, plain text, one message at a time."""

from __future__ import annotations

import os
import smtplib
import ssl
import time
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid


@dataclass
class SmtpConfig:
    host: str
    port: int
    user: str
    password: str
    from_name: str
    from_email: str
    reply_to: str = ""
    use_ssl: bool = False  # True for port 465, False for STARTTLS on 587
    min_interval_s: float = 30.0  # pause between sends, keeps volume human

    @classmethod
    def from_env(cls) -> "SmtpConfig":
        """Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME, SMTP_FROM_EMAIL, SMTP_REPLY_TO."""
        missing = [k for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL") if not os.environ.get(k)]
        if missing:
            raise RuntimeError("Missing environment variables: " + ", ".join(missing))
        port = int(os.environ.get("SMTP_PORT", "587"))
        return cls(
            host=os.environ["SMTP_HOST"],
            port=port,
            user=os.environ["SMTP_USER"],
            password=os.environ["SMTP_PASSWORD"],
            from_name=os.environ.get("SMTP_FROM_NAME", ""),
            from_email=os.environ["SMTP_FROM_EMAIL"],
            reply_to=os.environ.get("SMTP_REPLY_TO", ""),
            use_ssl=port == 465,
        )


def build_message(cfg: SmtpConfig, to: str, subject: str, body: str, unsubscribe_url: str,
                  unsubscribe_mailto: str = "") -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((cfg.from_name, cfg.from_email))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=cfg.from_email.split("@")[-1])
    if cfg.reply_to:
        msg["Reply-To"] = cfg.reply_to
    unsub = [f"<{unsubscribe_url}>"]
    if unsubscribe_mailto:
        unsub.append(f"<mailto:{unsubscribe_mailto}?subject=unsubscribe>")
    msg["List-Unsubscribe"] = ", ".join(unsub)
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg["Precedence"] = "bulk"
    msg.set_content(body)
    return msg


_last_send = 0.0


def send_email(cfg: SmtpConfig, msg: EmailMessage) -> str:
    """Sends one message, respecting the minimum interval. Returns the Message-ID."""
    global _last_send
    wait = cfg.min_interval_s - (time.time() - _last_send)
    if wait > 0:
        time.sleep(wait)
    context = ssl.create_default_context()
    if cfg.use_ssl:
        with smtplib.SMTP_SSL(cfg.host, cfg.port, context=context, timeout=30) as s:
            s.login(cfg.user, cfg.password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(cfg.host, cfg.port, timeout=30) as s:
            s.ehlo()
            s.starttls(context=context)
            s.ehlo()
            s.login(cfg.user, cfg.password)
            s.send_message(msg)
    _last_send = time.time()
    return msg["Message-ID"]
