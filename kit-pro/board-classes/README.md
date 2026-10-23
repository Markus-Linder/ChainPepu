# Board-class constraint templates

Each file is a complete `DESIGN-CONSTRAINTS.md` pre-filled with typical values for that class of board.
Copy one to your project, then adjust the numbers to your parts. The values are starting points taken
from common interface specifications and typical PHY/regulator layout guidance; the authoritative numbers
are always in your component datasheets, and the templates say so where it matters.

| File | Use it for |
|---|---|
| `2l-mcu-basic.md` | 2-layer MCU boards: sensors, controllers, simple USB-FS devices |
| `4l-mcu-usb-ethernet.md` | 4-layer MCU boards with USB 2.0 HS, 10/100 Ethernet (RMII PHY), SD card |
| `rf-2.4ghz-module.md` | Boards carrying a 2.4 GHz module (ESP32, nRF52, BLE) with PCB or external antenna |
| `power-dcdc.md` | Buck/boost converter boards, 5 to 60 V input, up to a few amps |
| `sensor-analog.md` | Precision analog front ends: ADC, instrumentation amplifiers, bridge sensors |
