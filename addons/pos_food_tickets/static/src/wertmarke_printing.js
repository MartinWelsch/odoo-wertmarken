/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

/** Inner markup of a single Wertmarke (inline styles so no external CSS needed). */
function wertmarkeMarkup(ticket) {
    return (
        `<div style="font-size:16px; letter-spacing:2px;">Wertmarke</div>` +
        `<div style="border-top:1px dashed #000; margin:6px 0;"></div>` +
        `<div style="font-size:30px; font-weight:bold; line-height:1.2; margin:10px 0;">` +
            `${escapeHtml(ticket.productName)}</div>` +
        `<div style="border-top:1px dashed #000; margin:6px 0;"></div>` +
        (ticket.orderName ? `<div style="font-size:12px;">${escapeHtml(ticket.orderName)}</div>` : "") +
        (ticket.datetime ? `<div style="font-size:12px;">${escapeHtml(ticket.datetime)}</div>` : "")
    );
}

/** Build a detached .pos-receipt element for one Wertmarke. */
function buildWertmarkeEl(ticket) {
    const el = document.createElement("div");
    el.className = "pos-receipt";
    el.style.textAlign = "center";
    el.innerHTML = wertmarkeMarkup(ticket);
    return el;
}

/** One ticket per individual item (qty floored; refund/zero lines skipped). */
function collectTickets(order) {
    const tickets = [];
    const datetime = new Date().toLocaleString();
    const orderName = order.name || "";
    for (const line of order.get_orderlines()) {
        const qty = Math.floor(line.get_quantity());
        if (qty < 1) {
            continue;
        }
        const productName = line.get_product().display_name;
        for (let i = 0; i < qty; i++) {
            tickets.push({ productName, orderName, datetime });
        }
    }
    return tickets;
}

/**
 * Browser-only fallback (no hardware printer): print all tokens in one isolated
 * iframe. Self-contained, so it can't race with the receipt print or corrupt the
 * POS session. No paper cutter here -- page-breaks just separate the pages.
 */
function printInIframe(innerHtml) {
    return new Promise((resolve) => {
        const iframe = document.createElement("iframe");
        Object.assign(iframe.style, {
            position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0",
        });
        document.body.appendChild(iframe);
        let done = false;
        const cleanup = () => {
            if (done) return;
            done = true;
            setTimeout(() => iframe.remove(), 200);
            resolve();
        };
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(
            `<!doctype html><html><head><meta charset="utf-8"/>` +
                `<style>@page{margin:6mm;}body{margin:0;font-family:'Courier New',monospace;}</style>` +
                `</head><body>${innerHtml}</body></html>`
        );
        doc.close();
        const win = iframe.contentWindow;
        win.onafterprint = cleanup;
        setTimeout(() => {
            try { win.focus(); win.print(); } catch (e) { console.error(e); }
            setTimeout(cleanup, 1500);
        }, 50);
    });
}

/**
 * Print one Wertmarke per item bought.
 *
 * - ePOS / IoT printer present -> each token is a separate print job via
 *   printer.printHtml(), so the printer cuts the paper between every Wertmarke.
 *   (printHtml is what printer.print() calls internally; we build the element
 *   ourselves and skip the render step, which hangs for standalone components.)
 * - No hardware printer (browser) -> one combined iframe (preview, no cuts).
 *
 * Idempotent and fully guarded so a printing error can never break the order.
 */
async function printWertmarken(printer, order) {
    if (!order || order._wertmarkenPrinted) {
        return;
    }
    const tickets = collectTickets(order);
    if (!tickets.length) {
        return;
    }
    try {
        if (printer.device) {
            for (const ticket of tickets) {
                const el = buildWertmarkeEl(ticket);
                // htmlToCanvas needs the element laid out in the DOM. Mirror Odoo's
                // own RenderContainer: a normal-flow .pos-receipt inside an
                // off-screen wrapper. Putting position:fixed on the element itself
                // makes html-to-image rasterise it BLANK (the "leere Wertmarke" bug).
                const offscreen = document.createElement("div");
                Object.assign(offscreen.style, { position: "fixed", left: "-1000px", top: "0" });
                offscreen.appendChild(el);
                document.body.appendChild(offscreen);
                try {
                    await printer.printHtml(el, {});
                } finally {
                    offscreen.remove();
                }
            }
        } else {
            const parts = tickets.map((t, i) => {
                const brk = i < tickets.length - 1 ? "always" : "auto";
                return `<div class="pos-receipt" style="text-align:center; page-break-after:${brk};">${wertmarkeMarkup(t)}</div>`;
            });
            await printInIframe(parts.join(""));
        }
        order._wertmarkenPrinted = true;
    } catch (e) {
        console.error("[pos_food_tickets] Wertmarke printing failed:", e);
    }
}

// Manual path: the cashier presses "Print Receipt".
patch(ReceiptScreen.prototype, {
    async printReceipt() {
        await super.printReceipt(...arguments);
        await printWertmarken(this.printer, this.currentOrder);
    },
});

// Automatic path: receipt auto-prints after payment (iface_print_auto).
patch(PaymentScreen.prototype, {
    async afterOrderValidation() {
        const order = this.currentOrder;
        const result = await super.afterOrderValidation(...arguments);
        if (this.pos.config.iface_print_auto) {
            await printWertmarken(this.printer, order);
        }
        return result;
    },
});
