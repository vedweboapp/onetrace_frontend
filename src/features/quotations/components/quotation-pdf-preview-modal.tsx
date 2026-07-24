"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { fetchQuotation, exportQuotation } from "@/features/quotations/api/quotation.api";
import type { QuotationDetail, QuotationQuoteSection } from "@/features/quotations/types/quotation.types";
import { toastApiError } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

/* ─── helpers ─────────────────────────────────────────────── */

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ─── HTML builder ─────────────────────────────────────────── */

interface SiteAny {
  site_name?: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}

interface ContactAny {
  id?: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}

function buildPdfHtml(data: QuotationDetail): string {
  /* ── extract fields ── */
  const customer = (typeof data.customer === "object" && data.customer !== null
    ? data.customer
    : {}) as { name?: string; phone?: string };

  const contact = (typeof data.primary_customer_contact === "object" &&
    data.primary_customer_contact !== null
    ? data.primary_customer_contact
    : {}) as ContactAny;

  const sites = (data.sites ?? []) as SiteAny[];
  const primarySite = sites[0] ?? {};

  const sections: QuotationQuoteSection[] = data.quote_sections ?? [];
  const grandTotalExVat = sections.reduce((s, sec) => s + (sec.section_total ?? 0), 0);
  const vatAmount = grandTotalExVat * 0.2;
  const grandTotalIncVat = grandTotalExVat + vatAmount;

  const quoteNumber = esc(data.quotation_serial_number || data.order_number || "—");
  const quoteDate = esc(fmtDate(data.created_at));
  const validFor = data.due_date ? esc(fmtDate(data.due_date)) : "30 Days";

  /* customer address block */
  const customerName = esc(customer.name ?? "—");
  const customerPhone = esc(customer.phone ?? "—");
  const cAddrLine1 = esc(contact.address_line_1 ?? primarySite.address_line_1 ?? "");
  const cAddrLine2 = esc(contact.address_line_2 ?? primarySite.address_line_2 ?? "");
  const cCity = esc(contact.city ?? primarySite.city ?? "");
  const cState = esc(contact.state ?? primarySite.state ?? "");
  const cPincode = esc(contact.pincode ?? primarySite.pincode ?? "");

  /* site address block */
  const sAddrLine1 = esc(primarySite.address_line_1 ?? "");
  const sAddrLine2 = esc(primarySite.address_line_2 ?? "");
  const sCity = esc(primarySite.city ?? "");
  const sState = esc(primarySite.state ?? "");
  const sPincode = esc(primarySite.pincode ?? "");

  /* ── summary rows ── */
  const summaryRows = sections
    .map(
      (sec) => `
      <tr>
        <td><strong>${esc(sec.name)}</strong></td>
        <td>£${esc(fmtMoney(sec.section_total))}</td>
      </tr>`,
    )
    .join("");

  /* ── section / plot pages ── */
  const sectionPages = sections
    .map((sec) =>
      (sec.plots ?? [])
        .map((plot) => {
          const pins = plot.pins ?? [];
          const itemRows = pins
            .map(
              (pin) => `
            <tr>
              <td>${esc(pin.name || "—")}</td>
              <td>${esc(pin.quantity ?? 1)}</td>
            </tr>`,
            )
            .join("");
          const plotSubtotal = plot.plot_total ?? 0;
          const plotVat = plotSubtotal * 0.2;
          const plotTotal = plotSubtotal + plotVat;

          return `
          <div class="section-page">
            <div class="section-title">${esc(sec.name)} - ${esc(plot.name)}</div>
            <table class="product-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div class="subtotal-box">
              <table>
                <tr><td>Sub-Total ex VAT</td><td>£${esc(fmtMoney(plotSubtotal))}</td></tr>
                <tr><td>VAT (20%)</td><td>£${esc(fmtMoney(plotVat))}</td></tr>
                <tr class="total-row"><td>Total inc VAT</td><td>£${esc(fmtMoney(plotTotal))}</td></tr>
              </table>
            </div>
          </div>`;
        })
        .join(""),
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Customer Estimate</title>
<style>
@page { size: A4; margin: 0; }
@media print {
  body { background: #fff !important; padding: 0 !important; }
  .page-card { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 15mm 14mm 20mm 14mm !important; }
}
html, body {
  background-color: #525659;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Helvetica','Arial',sans-serif;
  font-size: 9pt;
  color: #000;
  line-height: 1.4;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  min-height: 100vh;
  width: 100%;
}
.page-card {
  background-color: #ffffff;
  width: 100%;
  padding: 15mm 14mm 20mm 14mm;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
  border-radius: 2px;
}
.page-header { width: 100%; border-collapse: collapse; margin-bottom: 5mm; border-bottom: 0.5pt solid #eee; background-color: white; }
.header-left { vertical-align: top; width: 50mm; padding-bottom: 2mm; }
.header-right { vertical-align: top; text-align: right; padding-bottom: 2mm; }
.logo-box { width: 42mm; height: 15mm; background-color: #222 !important; border: 0.6mm solid #999; display: table-cell; vertical-align: middle; text-align: center; }
.logo-text { font-size: 32pt; font-weight: bold; color: #999; letter-spacing: -1px; }
.logo-text .bold { font-weight: bold; color: #fff; }
.company-info { text-align: right; font-size: 9pt; }
.company-info .company-name { font-weight: bold; font-size: 10pt; margin-bottom: 2mm; }
.company-info .address { line-height: 1.5; }
.first-page-content { margin-top: 1mm; }
.estimate-title { font-size: 14pt; font-weight: bold; text-align: right; margin-bottom: 5mm; }
.customer-section { display: flex; justify-content: space-between; margin-bottom: 1mm; }
.customer-address { width: 45%; font-size: 9pt; line-height: 1.6; }
.info-box { width: 50%; background-color: #eee; padding: 8pt; font-size: 8pt; border-radius: 8px; }
.info-box table { width: 100%; border-collapse: collapse; }
.info-box td { padding: 2.5pt; vertical-align: top; }
.info-box td:first-child { font-weight: bold; width: 25mm; }
.terms-section { margin-top: 1mm; }
.terms-title { font-size: 11pt; font-weight: bold; margin-bottom: 6pt; }
.term-heading { font-size: 9pt; font-weight: bold; margin-top: 10pt; margin-bottom: 4pt; }
.term-content { font-size: 9pt; text-align: justify; margin-bottom: 8pt; line-height: 1.5; }
.summary-section { margin-top: 5mm; page-break-inside: avoid; }
.summary-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1pt solid #ccc; border-radius: 8px; overflow: hidden; }
.summary-table thead { background-color: #e6e6e6; }
.summary-table th { font-weight: bold; padding: 5pt; text-align: left; border-bottom: 1pt solid #ccc; border-right: 1pt solid #ccc; }
.summary-table th:last-child { border-right: none; }
.summary-table td { padding: 5pt; border-bottom: 1pt solid #ccc; border-right: 1pt solid #ccc; }
.summary-table td:last-child { border-right: none; }
.summary-table tr:last-child td { border-bottom: none; }
.summary-table td:last-child { text-align: right; font-weight: bold; }
.totals-box { width: 50%; margin-left: auto; }
.totals-box table { width: 100%; border-collapse: collapse; }
.totals-box td { padding: 4pt 8pt; text-align: right; border: 1pt solid #ccc; }
.totals-box td:first-child { font-weight: bold; border: none; text-align: right; }
.totals-box .grand-total { font-weight: bold; font-size: 10pt; }
.section-page { page-break-before: always; margin-top: 5mm; }
.section-title { font-size: 10pt; font-weight: bold; margin-bottom: 8pt; color: #000; }
.product-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1pt solid #eee; border-radius: 8px; overflow: hidden; }
.product-table thead { background-color: #999; color: #fff; }
.product-table th { padding: 5pt 8pt; text-align: left; font-weight: bold; font-size: 9pt; border-right: 1pt solid #eee; }
.product-table th:last-child { border-right: none; }
.product-table td { padding: 5pt 8pt; border-top: 1pt solid #eee; border-right: 1pt solid #eee; font-size: 9pt; }
.product-table td:last-child { border-right: none; text-align: center; }
.subtotal-box { width: 45%; margin-left: auto; }
.subtotal-box table { width: 100%; border-collapse: collapse; font-size: 9pt; }
.subtotal-box td { padding: 4pt 8pt; text-align: right; border: 1pt solid #ccc; }
.subtotal-box td:first-child { font-weight: bold; border: none; text-align: right; }
.subtotal-box .total-row { font-weight: bold; }
.payment-page { page-break-before: always; margin-top: 5mm; }
.payment-header { display: flex; justify-content: space-between; align-items: center; margin-top: 20mm; }
.payment-title { font-size: 14pt; font-weight: bold; }
.quote-badge { background-color: #999; color: #fff; padding: 8pt 16pt; font-size: 8pt; font-weight: bold; text-align: center; border-radius: 5px; }
.payment-methods { display: flex; justify-content: space-between; margin-top: 20mm; }
.payment-method { width: 48%; }
.payment-icon-container { display: flex; align-items: center; }
.payment-method-title { font-size: 12pt; font-weight: bold; }
.payment-details { font-size: 9pt; line-height: 1.6; }
.payment-label { display: inline-block; width: 60pt; }
.payment-value { font-weight: bold; }
.icon-computer { width: 40pt; height: 40pt; margin-right: 10pt; }
.icon-credit-card { width: 40pt; height: 40pt; margin-right: 10pt; }
.bold { font-weight: bold; }
.term-content ol { list-style-type: decimal; padding-left: 20px; margin-left: 20px; }
.term-content li { margin-bottom: 4px; }
</style>
</head>
<body>
<div class="page-card">
<table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <td>
        <table class="page-header">
          <tr>
            <td class="header-left">
              <div class="logo-box">
                <span class="logo-text">RED<span class="bold">5</span></span>
              </div>
            </td>
            <td class="header-right">
              <div class="company-info">
                <div class="company-name">Red 05 Limited</div>
                <div class="address">
                  Unit C, Norton Road Business Park<br/>
                  Newhaven<br/>
                  East Sussex<br/>
                  BN9 0FN<br/>
                  Tel. 01273 525525<br/>
                  www.red5.ltd
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <!-- PAGE 1 -->
        <div class="first-page-content">
          <div class="estimate-title">CUSTOMER ESTIMATE NO. ${quoteNumber}</div>
          <div class="customer-section">
            <div class="customer-address">
              ${customerName}<br/>
              ${cAddrLine1}<br/>
              ${cAddrLine2}<br/>
              ${cCity}<br/>
              ${cState}<br/>
              ${cPincode}
            </div>
            <div class="info-box">
              <table>
                <tr><td>Quote No:</td><td>${quoteNumber}</td></tr>
                <tr>
                  <td>Site Address:</td>
                  <td>${sAddrLine1}<br/>${sAddrLine2}<br/>${sCity}<br/>${sState}<br/>${sPincode}</td>
                </tr>
                <tr><td>Phone:</td><td>${customerPhone}</td></tr>
                <tr><td>Date:</td><td>${quoteDate}</td></tr>
                <tr><td>Valid For:</td><td>${validFor}</td></tr>
              </table>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="terms-section">
            <div class="terms-title">Description</div>
            <div class="term-heading">1. Definitions &amp; Interpretation</div>
            <div class="term-content">
              <span class="bold">"Red 5"</span> means Red 05 Ltd. <span class="bold">"Client"</span> means the company or person to whom the accompanying quotation is addressed. <span class="bold">"Works"</span> means the fire stopping services described in the quotation.
            </div>
            <div class="term-heading">2. Basis of Quotation</div>
            <div class="term-content">
              2.1 Any purchase order or instruction from the Client shall constitute acceptance of both the quotation and these Conditions. 2.2 No other terms shall apply unless agreed in writing by a Red 5 director.
            </div>
            <div class="term-heading">3. Scope of Works</div>
            <div class="term-content">
              The quotation covers only the following items, undertaken strictly in accordance with the fire-strategy drawings supplied by the Client and the manufacturers' tested details:<br/><br/>
              <ol type="1">
                <li>Mastic-seal cable and pipe penetrations within ceiling voids in plots and communal areas. <span style="font-style:italic;font-weight:bold;">Any work additional to mastic seals within bin/bike stores may need to be reviewed (price currently not included, but may not be required).</span></li>
                <li>Seal service-entry penetrations from communal areas into plots.</li>
                <li>Seal SVP penetrations through ceilings by wrap and compound in concrete slab zones.</li>
                <li>Seal sleeves to low-profile ducting. <span style="font-style:italic;font-weight:bold;">Ducting passing through the ceiling of top floor plots to be confirmed (price currently not included, but may not be required).</span></li>
                <li>Install intumescent putty pads to electrical back boxes and mastic seal to radiator back boxes.</li>
                <li>Record every installation (location reference, photographs, unique sticker ID) and provide a flattened PDF report on completion.</li>
                <li>Deliver toolbox talks with relevant trades to coordinate installation strategy prior to first fix.</li>
              </ol>
              <br/>
              <span style="font-style:italic;font-weight:bold;">Cost for riser cupboard floor seals has been omitted. Please note if GRP grates are to be installed, some firestopping may be required to seal the hollowcore slab edge prior to the installation of grates.</span><br/><br/>
              <span>Any item not expressly listed above is excluded.</span>
            </div>
            <div class="term-heading">4. Drawings, Specifications &amp; Design Responsibility</div>
            <div class="term-content">
              4.1 Fire lines are as indicated on the latest issue of the fire-strategy drawings provided by the Client's site team.
            </div>
          </div>
        </div>

        <!-- PAGE 2: Terms continued + Summary -->
        <div style="margin-top:1mm;">
          <div class="term-content">
            4.2 Red 5 does not accept design responsibility. Our installations are executed strictly to the supplied fire-strategy drawings and to third-party test evidence. 4.3 Where the drawings change after acceptance of the quotation, Red 5 reserves the right to re-price affected elements.
          </div>
          <div class="term-heading">5. Programme &amp; Working Hours</div>
          <div class="term-content">
            5.1 Unless otherwise agreed, Works will be performed Monday–Friday 08:00 – 16:00. 5.2 Saturday working is available by prior agreement. 5.3 The Client shall ensure areas are ready, accessible and free from obstruction when Red 5 arrives. 5.4 Site attendance is subject to a minimum order value of £500.00.
          </div>
          <div class="term-heading">6. Access, Facilities &amp; Site Conditions</div>
          <div class="term-content">
            The Client shall provide at no cost to Red 5: A safe, dry, storage area for materials and small tools near the workface. 110 V or 230 V power and potable water within reasonable distance. Access to suitable skips or bins for disposal. Adequate welfare facilities.
          </div>
          <div class="term-heading">7. Variations &amp; Additional Costs</div>
          <div class="term-content">
            7.1 If prerequisite fire-stopping provisions (e.g. clearances, framing, or services layout) are not met by preceding trades, the Client must either rectify the issue or instruct Red 5 to employ variation systems. 7.2 Significant damage to our installations that requires extra works may incur a variation process. 7.3 Such variations will attract additional cost and/or programme impact, notified via a written Variation Quotation prior to execution.
          </div>
          <div class="term-heading">8. Quality Assurance &amp; Reporting</div>
          <div class="term-content">
            8.1 All materials carry current third-party certification (e.g. IFC, UL-EU, CERTIFIRE). 8.2 Installation operatives undergo regular training and operate under the BM Trada fire stopping scheme. 8.3 On completion, Red 5 will issue an installation register and photographic record.
          </div>
          <div class="term-heading">9. Health, Safety &amp; Environmental</div>
          <div class="term-content">
            Red 5 works in accordance with the CDM Regulations 2015, the Management of Health &amp; Safety at Work Regulations 1999, and our ISO 45001 OH&amp;S management system. Operatives will attend the Client's site induction and abide by site rules.
          </div>
          <div class="term-heading">10. Payment Terms</div>
          <div class="term-content">
            10.1 Unless stated otherwise in the quotation, invoices shall be submitted monthly in arrears for Works completed on site. 10.2 Payment is due within 30 days of invoice date. 10.3 Red 5 reserves the right to charge statutory late payment interest under the Late Payment of Commercial Debts (Interest) Act 1998.
          </div>
          <div class="term-heading">11. Limitation of Liability &amp; Confidentiality</div>
          <div class="term-content">
            11.1 Red 5 shall not be liable for delay or non-performance caused by circumstances beyond its reasonable control. 11.2 Each party shall keep confidential all technical or commercial information received from the other and shall use such information solely for the purpose of the contract.
          </div>
          <div class="term-heading">12. Force Majeure</div>
          <div class="term-content">
            Neither party shall be liable for delay or failure to perform its obligations where such delay or failure results from events beyond its reasonable control.
          </div>

          <!-- Summary Table -->
          <div class="summary-section">
            <table class="summary-table">
              <thead>
                <tr><th colspan="2">Summary</th></tr>
              </thead>
              <tbody>${summaryRows}</tbody>
            </table>
            <div class="totals-box">
              <table>
                <tr><td>Sub-Total ex VAT</td><td>£${esc(fmtMoney(grandTotalExVat))}</td></tr>
                <tr><td>VAT (20%)</td><td>£${esc(fmtMoney(vatAmount))}</td></tr>
                <tr class="grand-total"><td>Total inc VAT</td><td>£${esc(fmtMoney(grandTotalIncVat))}</td></tr>
              </table>
            </div>
          </div>

          ${sectionPages}

          <!-- FINAL PAGE: How To Pay -->
          <div class="payment-page">
            <div class="payment-header">
              <div class="payment-title">How To Pay</div>
              <div class="quote-badge">QUOTATION NO. ${quoteNumber}</div>
            </div>
            <div class="payment-methods">
              <div class="payment-method">
                <div class="payment-icon-container">
                  <svg class="icon-computer" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="15" width="80" height="50" rx="4" fill="#f5f5f5" stroke="#ccc" stroke-width="2"/>
                    <rect x="15" y="20" width="70" height="40" fill="#fff" stroke="#ddd" stroke-width="1"/>
                    <path d="M 35 35 L 55 50 L 55 45 L 50 45 Z" fill="#ccc"/>
                    <rect x="45" y="65" width="10" height="10" fill="#ccc"/>
                    <rect x="35" y="75" width="30" height="5" fill="#ccc"/>
                  </svg>
                  <div><div class="payment-method-title">Direct Deposit</div></div>
                </div>
                <div class="payment-details">
                  <div><span class="payment-label">Bank</span><span class="payment-value">Virgin Business Banking</span></div>
                  <div><span class="payment-label">Acc. Name</span><span class="payment-value">Red 05 Ltd</span></div>
                  <div><span class="payment-label">Sort Code</span><span class="payment-value">82-61-37</span></div>
                  <div><span class="payment-label">Acc. No.</span><span class="payment-value">30580090</span></div>
                </div>
              </div>
              <div class="payment-method">
                <div class="payment-icon-container">
                  <svg class="icon-credit-card" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="25" width="80" height="50" rx="6" fill="#ebebeb" stroke="#b4b4b4" stroke-width="2"/>
                    <rect x="10" y="35" width="80" height="15" fill="#c8c8c8"/>
                    <rect x="65" y="55" width="15" height="10" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
                  </svg>
                  <div><div class="payment-method-title">Credit Card (MasterCard or Visa)</div></div>
                </div>
                <div class="payment-details">
                  <div><em>Call</em> <span class="payment-value">01273 525525</span> <em>to pay over the phone.</em></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
</div>
</body>
</html>`;
}

/* ─── Modal ───────────────────────────────────────────────── */

type Props = {
  open: boolean;
  quotationId: number;
  quoteName?: string;
  onClose: () => void;
};

export function QuotationPdfPreviewModal({ open, quotationId, quoteName, onClose }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [htmlContent, setHtmlContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  /* Fetch real data when modal opens and build HTML */
  React.useEffect(() => {
    if (!open) {
      setHtmlContent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchQuotation(quotationId);
        if (!cancelled) {
          setHtmlContent(buildPdfHtml(result));
        }
      } catch {
        if (!cancelled) setError("Failed to load quotation data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, quotationId]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportQuotation(quotationId, "pdf", quoteName);
    } catch (err) {
      toastApiError(err, "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={!exporting ? onClose : () => undefined}
      title="PDF Preview"
      size="5xl"
      isBusy={exporting}
      closeOnBackdrop={!exporting}
      footer={
        <>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting}
            onClick={onClose}
          >
            Close
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={exporting}
            disabled={loading || !!error || !htmlContent || exporting}
            onClick={() => void handleExport()}
          >
            <Download className="mr-1.5 size-4" />
            Export PDF
          </AppButton>
        </>
      }
    >
      {loading && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading quotation data&hellip;
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && htmlContent && (
        <iframe
          title="Quotation PDF Preview"
          srcDoc={htmlContent}
          className="h-[74vh] w-full rounded-lg border border-slate-700 bg-[#525659]"
          sandbox="allow-same-origin"
          style={{ display: "block" }}
        />
      )}
    </AppModal>
  );
}
