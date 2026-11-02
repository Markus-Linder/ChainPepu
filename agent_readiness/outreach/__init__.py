"""Personal first-contact emails based on an audit result.

The point is authenticity: every email quotes two or three concrete findings
from the prospect's own website instead of a generic pitch. Drafts are written
to disk for review; sending is a separate, explicit step via SMTP.
"""

from .draft import build_email, run_outreach
from .sender import SmtpConfig, send_email

__all__ = ["build_email", "run_outreach", "SmtpConfig", "send_email"]
