{
    "name": "POS Food Tickets",
    "version": "17.0.1.0.0",
    "category": "Sales/Point of Sale",
    "summary": "Add one food-ticket page per item bought to the POS receipt",
    "description": """
POS Food Tickets
================
Extends the Point of Sale receipt so that, after the normal receipt, it prints
one page per individual food item bought (a '3 x Burger' line produces 3 ticket
pages). Each page is a redeemable paper food token.

- One ticket page per unit (quantity is honoured, fractions floored).
- Refund / zero / negative lines are skipped.
- A single print job covers both automatic and manual receipt printing,
  because it extends the shared OrderReceipt component (no screen patches).
- No backend models, no scanning, no recurring license.
""",
    "author": "Custom",
    "license": "LGPL-3",
    "depends": ["point_of_sale"],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_food_tickets/static/src/**/*",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
