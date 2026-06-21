# POS Food Tickets

Prints a redeemable **Wertmarke** (food token) for **each individual item** bought
in the Odoo 17 Point of Sale (ordering `3 × Burger` prints 3 Burger tokens), in
addition to the normal receipt.

- One token per **unit** (quantity honoured; fractions floored).
- Refund / zero / negative lines are skipped.
- On an **ePOS / IoT printer each token is a separate print job**, so the printer
  **cuts the paper between every token**.
- Paper-only: no scanning, no backend tracking, no recurring license.

## How it works

`static/src/wertmarke_printing.js` patches the two POS print entry points — the
manual "Print Receipt" button (`ReceiptScreen.printReceipt`) and automatic
printing after payment (`PaymentScreen.afterOrderValidation`, when
`iface_print_auto` is on). After the receipt prints, it prints one token per unit:

- **Hardware printer present** → builds each token's HTML and sends it through
  `printer.printHtml(el)` — one print job per token, so the printer cuts between
  each. (We build the element directly instead of going through the POS render
  service, whose `toHtml()` hangs for standalone components.)
- **No printer (browser)** → renders all tokens into one isolated iframe (a
  print preview, one page each — no cutter in a browser).

The whole routine is idempotent and wrapped in `try/catch`, so a printing problem
can never break order finalisation.

## Install

The module lives in the `addons/` folder mounted into the `web` container at
`/mnt/extra-addons`.

```bash
docker compose exec web odoo -d <db> -u pos_food_tickets --stop-after-init
docker compose restart web
```

Or from the UI: Developer Mode → Apps → Update Apps List → install **POS Food Tickets**.

> **After installing/updating you must restart `web` AND reload the POS in the
> browser.** The server caches the add-on's asset file list at startup, and the
> POS caches its JS via a service worker. If changes don't appear:
> `docker compose restart web`, then F12 → Application → Service Workers →
> **Unregister** → Clear site data → reload.

## Test

1. Open a POS session, add e.g. `2 × Fries` and `1 × Burger`, and pay.
2. On an ePOS/IoT printer you get the receipt, then 3 separate cut tokens
   (Fries, Fries, Burger). In a browser without a printer, the tokens appear in a
   print preview (one page each).

## Customise

- **Token layout/text**: edit `wertmarkeMarkup()` in `static/src/wertmarke_printing.js`.
- **Only print tokens for certain products** (e.g. exclude deposits/tips): filter
  inside `collectTickets()` in the same file.
