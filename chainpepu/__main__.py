import logging

from .bot import build_application
from .config import Settings
from .mt5 import MT5Client


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    settings = Settings.from_env()
    mt5 = MT5Client(settings.metaapi_token, settings.metaapi_account_id, settings.metaapi_region)
    app = build_application(settings, mt5)
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
