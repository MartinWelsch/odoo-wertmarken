/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";

/**
 * Expose the list of food tickets to print: one entry per individual item.
 *
 * Built straight from the receipt data (`props.data.orderlines`) so it works in
 * every path that renders OrderReceipt -- the automatic print after payment and
 * the manual "Print Receipt" button alike -- without patching any screen.
 *
 * Fractional/weighed quantities are floored; refund/zero lines are skipped.
 */
patch(OrderReceipt.prototype, {
    get foodTickets() {
        const tickets = [];
        for (const line of this.props.data.orderlines || []) {
            const qty = Math.floor(parseFloat(line.qty)) || 0;
            if (qty < 1) {
                continue;
            }
            for (let index = 1; index <= qty; index++) {
                tickets.push({
                    productName: line.productName,
                    index,
                    total: qty,
                });
            }
        }
        return tickets;
    },
});
