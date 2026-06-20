# POS Food Tickets

Extends the Odoo 17 Point of Sale **receipt** so it prints the normal receipt
followed by **one page per individual item** bought — each a redeemable paper
food token (ordering `3 × Burger` adds 3 Burger ticket pages after the receipt).

- One ticket page per **unit** (quantity honoured; fractions floored).
- Refund / zero / negative lines are skipped.
- **Single print job** — no second print, no race conditions.
- Paper-only: no scanning, no backend tracking, no recurring license.

## How it works

The module extends the shared `OrderReceipt` OWL component, so it applies to
**every** way a receipt is produced (automatic printing after payment *and* the
manual "Print Receipt" button) without patching any screen:

| File | Purpose |
|------|---------|
| `static/src/order_receipt_inherit.js` | Adds a `foodTickets` getter that expands order-line quantities into one ticket per unit, read from `props.data.orderlines`. |
| `static/src/order_receipt_inherit.xml` | `t-inherit` of `point_of_sale.OrderReceipt` that appends one ticket block per unit, each with `page-break-before: always` so it starts a new page. |

Because everything lives in the single receipt render, there is only one print
job. On thermal/ESC-POS paper the page breaks become continuous strip with the
tickets separated by dashed lines; in browser/PDF printing each ticket is its
own page.

## Install

The module lives in the `addons/` folder mounted into the `web` container at
`/mnt/extra-addons`.

```bash
docker compose up -d
# install (or update) into a database named `test`:
docker compose exec web odoo -d test -u pos_food_tickets --stop-after-init
docker compose restart web
```

Or from the UI: Developer Mode → Apps → Update Apps List → install **POS Food Tickets**.

> **After installing/updating, reload the POS in the browser.** The POS registers
> a service worker that caches its assets. If your changes don't appear:
> F12 → Application → Service Workers → **Unregister**, then Clear site data, then reload.

## Test

1. Open a POS session, add e.g. `2 × Fries` and `1 × Burger`, and pay.
2. On the Receipt screen (or in the print preview) you'll see the normal receipt
   followed by three ticket sections: Fries (Item 1 of 2), Fries (Item 2 of 2),
   Burger. No physical printer required — the sections render on screen too.

## Customise

- **Ticket layout/text**: edit `static/src/order_receipt_inherit.xml`.
- **Only print tokens for certain products** (e.g. exclude deposits/tips): filter
  inside the `foodTickets` getter in `static/src/order_receipt_inherit.js`.
