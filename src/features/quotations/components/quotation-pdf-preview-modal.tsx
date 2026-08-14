"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { fetchQuotation } from "@/features/quotations/api/quotation.api";
import type {
  QuotationDetail,
  QuotationQuoteSection,
  QuotationQuoteSectionPin,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";
import { AppButton, AppModal } from "@/shared/ui";
import {
  generateQuotationPinSnapshots,
  extractPinSnapshotTasks,
  getQuotationPinSnapshotKey,
} from "@/features/quotations/utils/quotation-pin-snapshot.util";
import { formatOrgMoneyValue } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

/* ── helpers ─────────────────────────────────────────── */

function fmtMoney(value: number | string | null | undefined): string {
  return formatOrgMoneyValue(value ?? 0, getOrgCurrencySettings());
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
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

/* ── Snapshot cell ──────────────────────────────────── */

function PinSnapshotCellComponent({
  pinKey,
  pinSnapshots,
  locationLabel,
}: {
  pinKey: string;
  pinSnapshots: Map<string, string>;
  locationLabel?: string | number | null;
}) {
  const dataUrl = pinSnapshots.get(pinKey);

  return (
    <div
      style={{
        width: 130,
        height: 90,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: 4,
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          alt={locationLabel ? `Pin location ${locationLabel}` : "Pin snapshot"}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>No snapshot</span>
        </div>
      )}
    </div>
  );
}

const PinSnapshotCell = React.memo(PinSnapshotCellComponent);

/* ── Build pin rows from section ─────────────────────── */

type PinRow = {
  sp: QuotationQuoteSectionSourcePin;
  group: QuotationQuoteSectionPin;
  pinIdx: number;
  pinGroupIdx: number;
};

function buildPinRows(section: QuotationQuoteSection) {
  const allRows: { plotName: string; rows: PinRow[]; plotSubtotal: number; plotVat: number; plotTotal: number }[] = [];
  for (let plotIdx = 0; plotIdx < section.plots.length; plotIdx++) {
    const plot = section.plots[plotIdx];
    const plotSubtotal = plot.plot_total ?? 0;
    const plotVat = plotSubtotal * 0.2;
    const plotTotal = plotSubtotal + plotVat;
    const rows: PinRow[] = [];
    const pins = plot.pins ?? [];
    for (let groupIdx = 0; groupIdx < pins.length; groupIdx++) {
      const group = pins[groupIdx];
      const sourcePins = group.source_pins ?? [];
      if (sourcePins.length > 0) {
        sourcePins.forEach((sp, spIdx) => rows.push({ sp, group, pinIdx: spIdx, pinGroupIdx: groupIdx }));
      } else {
        rows.push({
          sp: { pin_id: null, x_coordinate: null, y_coordinate: null, name: group.name, status_name: null, location: null } as QuotationQuoteSectionSourcePin,
          group,
          pinIdx: 0,
          pinGroupIdx: groupIdx,
        });
      }
    }
    allRows.push({ plotName: plot.name, rows, plotSubtotal, plotVat, plotTotal });
  }
  return allRows;
}

/* ── Plot table ───────────────────────────────────────── */

function PlotTable({
  sectionIdx,
  plotIdx,
  plotName,
  rows,
  plotSubtotal,
  plotVat,
  plotTotal,
  pinSnapshots,
  quotationId,
  onPinClick,
}: {
  sectionIdx: number;
  plotIdx: number;
  plotName: string;
  rows: PinRow[];
  plotSubtotal: number;
  plotVat: number;
  plotTotal: number;
  pinSnapshots: Map<string, string>;
  quotationId?: number;
  onPinClick?: (pinId: number) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 6, marginLeft: 4 }}>
        {plotName}
      </div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#334155", color: "white" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, width: 130 }}>Snapshot</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, width: 80 }}>Location</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>Item / Description</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, width: 80 }}>Variation</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, width: 70 }}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sp, group, pinIdx, pinGroupIdx }, rowIdx) => {
              const locText =
                sp.location != null && String(sp.location).trim() !== ""
                  ? `#${sp.location}`
                  : sp.pin_id != null ? `Pin #${sp.pin_id}` : `#${pinIdx + 1}`;
              const itemName = sp.name || group.name || "Item";
              const pinKey = getQuotationPinSnapshotKey(sectionIdx, plotIdx, pinGroupIdx, pinIdx);
              const qty = sp.quantity ?? group.quantity ?? 1;
              const isVariation = sp.variation ?? false;
              const variationText = isVariation ? "Yes" : "No";

              const frontendAddr = (process.env.NEXT_PUBLIC_FRONTEND_ADDRESS || "http://localhost:3000").replace(
                /\/$/,
                "",
              );
              const pinLink = quotationId
                ? `${frontendAddr}/public/quotation?token=${quotationId}${sp.pin_id ? `&pin=${sp.pin_id}&pinDialog=true` : ""}`
                : sp.pin_id
                ? `${frontendAddr}/public/quotation?token=${sp.pin_id}&pinDialog=true`
                : null;

              return (
                <tr key={rowIdx} style={{ borderTop: "1px solid #f1f5f9", background: rowIdx % 2 === 1 ? "#f8fafc" : "white" }}>
                  <td style={{ padding: "8px 10px" }}>
                    {sp.pin_id && onPinClick ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onPinClick(sp.pin_id!);
                        }}
                        style={{
                          display: "inline-block",
                          lineHeight: 0,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <PinSnapshotCell
                          pinKey={pinKey}
                          pinSnapshots={pinSnapshots}
                          locationLabel={sp.location}
                        />
                      </button>
                    ) : pinLink ? (
                      <a
                        href={pinLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-block", lineHeight: 0 }}
                      >
                        <PinSnapshotCell
                          pinKey={pinKey}
                          pinSnapshots={pinSnapshots}
                          locationLabel={sp.location}
                        />
                      </a>
                    ) : (
                      <PinSnapshotCell
                        pinKey={pinKey}
                        pinSnapshots={pinSnapshots}
                        locationLabel={sp.location}
                      />
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: "#374151" }}>{locText}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{itemName}</div>
                    {(sp as any).description && (
                      <div style={{ color: "#6b7280", marginTop: 2, fontSize: 10 }}>{(sp as any).description}</div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", color: "#374151" }}>{variationText}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: "#374151" }}>{qty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Plot totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <div style={{ minWidth: 220, border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "#f8fafc" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Sub-Total ex VAT</span>
            <span style={{ fontWeight: 600 }}>{fmtMoney(plotSubtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderTop: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>VAT (20%)</span>
            <span style={{ fontWeight: 600 }}>{fmtMoney(plotVat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderTop: "1px solid #e2e8f0", background: "#e2e8f0" }}>
            <span style={{ fontWeight: 700, color: "#111827" }}>Total inc VAT</span>
            <span style={{ fontWeight: 700, color: "#111827" }}>{fmtMoney(plotTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section block ───────────────────────────────────── */

function SectionBlock({
  sectionIdx,
  section,
  pinSnapshots,
  quotationId,
  onPinClick,
}: {
  sectionIdx: number;
  section: QuotationQuoteSection;
  pinSnapshots: Map<string, string>;
  quotationId?: number;
  onPinClick?: (pinId: number) => void;
}) {
  const grandTotal = section.section_total ?? 0;
  const vat = grandTotal * 0.2;
  const total = grandTotal + vat;
  const plots = buildPinRows(section);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 4, height: 20, borderRadius: 99, background: "#334155" }} />
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          {section.name}
        </h3>
      </div>
      {plots.map((p, i) => (
        <PlotTable
          key={i}
          sectionIdx={sectionIdx}
          plotIdx={i}
          plotName={p.plotName}
          rows={p.rows}
          plotSubtotal={p.plotSubtotal}
          plotVat={p.plotVat}
          plotTotal={p.plotTotal}
          pinSnapshots={pinSnapshots}
          quotationId={quotationId}
          onPinClick={onPinClick}
        />
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, marginBottom: 16 }}>
        <div style={{ minWidth: 220, border: "1px solid #334155", borderRadius: 6, overflow: "hidden", background: "#334155", color: "white", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px" }}>
            <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Section Total inc VAT</span>
            <span style={{ fontWeight: 700 }}>{fmtMoney(total)}</span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 8 }} />
    </div>
  );
}

/* ── Terms Section ───────────────────────────────────── */

function TermsSection() {
  return (
    <div style={{ marginTop: 24, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Description</div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>1. Definitions & Interpretation</div>
      <div style={{ color: "#4b5563" }}>
        <span className="font-bold">"Red 5" </span> means Red 05 Ltd.  <span className="font-bold">"Client"</span> means the company or person to whom the accompanying
        quotation is addressed. <span className="font-bold">"Works"</span> means the fire stopping services described in the quotation.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>2. Basis of Quotation</div>
      <div style={{ color: "#4b5563" }}>
        2.1 Any purchase order or instruction from the Client shall constitute acceptance of both the quotation
        and these Conditions. 2.2 No other terms shall apply unless agreed in writing by a Red 5 director.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>3. Scope of Works</div>
      <div style={{ color: "#4b5563" }}>
        The quotation covers only the following items, undertaken strictly in accordance with the fire-strategy
        drawings supplied by the Client and the manufacturers' tested details:
        <ol type="1" style={{ paddingLeft: 20, marginTop: 4, marginBottom: 4 , listStyle: "decimal"}}>
          <li>Mastic-seal cable and pipe penetrations within ceiling voids in plots and communal areas.
            <span className="font-bold">Any work additional to mastic seals within bin/bike stores may need to be reviewed
            (price currently not included, but may not be required).</span></li>
          <li>Seal service-entry penetrations from communal areas into plots.</li>
          <li>Seal SVP penetrations through ceilings by wrap and compound in concrete slab zones.</li>
          <li>Seal sleeves to low-profile ducting. <span className="font-bold">Ducting passing through the ceiling of top floor
            <span></span>plots to be confirmed (price currently not included, but may not be required).</span> </li>
          <li>Install intumescent putty pads to electrical back boxes and mastic seal to radiator back boxes.</li>
          <li>Record every installation (location reference, photographs, unique sticker ID) and provide a
            flattened PDF report on completion.</li>
          <li>Deliver toolbox talks with relevant trades to coordinate installation strategy prior to first fix.</li>
        </ol>
       <span className="font-bold">Cost for riser cupboard floor seals has been omitted. Please note if GRP grates are to be installed,
        some firestopping may be required to seal the hollowcore slab edge prior to the installation of grates.
        Any item not expressly listed above is excluded.</span>
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>4. Drawings, Specifications & Design Responsibility</div>
      <div style={{ color: "#4b5563" }}>
        4.1 Fire lines are as indicated on the latest issue of the fire-strategy drawings provided by the
        Client's site team. 4.2 Red 5 does not accept design responsibility. Our installations are executed
        strictly to the supplied fire-strategy drawings and to third-party test evidence. 4.3 Where the
        drawings change after acceptance of the quotation, Red 5 reserves the right to re-price affected elements.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>5. Programme & Working Hours</div>
      <div style={{ color: "#4b5563" }}>
        5.1 Unless otherwise agreed, Works will be performed Monday–Friday 08:00 – 16:00. 5.2 Saturday working
        is available by prior agreement. 5.3 The Client shall ensure areas are ready, accessible and free from
        obstruction when Red 5 arrives. 5.4 Site attendance is subject to a minimum order value of £500.00.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>6. Access, Facilities & Site Conditions</div>
      <div style={{ color: "#4b5563" }}>
        The Client shall provide at no cost to Red 5: a safe, dry storage area for materials and small tools
        near the workface; 110V or 230V power and potable water within reasonable distance; access to suitable
        skips or bins for disposal; adequate welfare facilities.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>7. Variations & Additional Costs</div>
      <div style={{ color: "#4b5563" }}>
        7.1 If prerequisite fire-stopping provisions (e.g. clearances, framing, or services layout) are not
        met by preceding trades, the Client must either rectify the issue or instruct Red 5 to employ variation
        systems. 7.2 Significant damage to our installations that requires extra works may incur a variation
        process. 7.3 Such variations will attract additional cost and/or programme impact, notified via a
        written Variation Quotation prior to execution.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>8. Quality Assurance & Reporting</div>
      <div style={{ color: "#4b5563" }}>
        8.1 All materials carry current third-party certification (e.g. IFC, UL-EU, CERTIFIRE). 8.2 Installation
        operatives undergo regular training and operate under the BM Trada fire stopping scheme. 8.3 On
        completion, Red 5 will issue an installation register and photographic record.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>9. Health, Safety & Environmental</div>
      <div style={{ color: "#4b5563" }}>
        Red 5 works in accordance with the CDM Regulations 2015, the Management of Health & Safety at Work
        Regulations 1999, and our ISO 45001 OH&S management system. Operatives will attend the Client's site
        induction and abide by site rules.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>10. Payment Terms</div>
      <div style={{ color: "#4b5563" }}>
        10.1 Unless stated otherwise in the quotation, invoices shall be submitted monthly in arrears for
        Works completed on site. 10.2 Payment is due within 30 days of invoice date. 10.3 Red 5 reserves the
        right to charge statutory late payment interest under the Late Payment of Commercial Debts (Interest)
        Act 1998.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>11. Limitation of Liability & Confidentiality</div>
      <div style={{ color: "#4b5563" }}>
        11.1 Red 5 shall not be liable for delay or non-performance caused by circumstances beyond its
        reasonable control. 11.2 Each party shall keep confidential all technical or commercial information
        received from the other and shall use such information solely for the purpose of the contract.
      </div>

      <div style={{ fontWeight: 600, marginTop: 10 }}>12. Force Majeure</div>
      <div style={{ color: "#4b5563" }}>
        Neither party shall be liable for delay or failure to perform its obligations where such delay or
        failure results from events beyond its reasonable control.
      </div>
    </div>
  );
}

/* ── Document body (shared by preview + hidden export render) ── */

export type DocumentBodyProps = {
  data: QuotationDetail;
  pinSnapshots: Map<string, string>;
  sections: QuotationQuoteSection[];
  onPinClick?: (pinId: number) => void;
};

export function DocumentBody({ data, pinSnapshots, sections, onPinClick }: DocumentBodyProps) {
  const grandTotalExVat = sections.reduce((s, sec) => s + (sec.section_total ?? 0), 0);
  const vatAmount = grandTotalExVat * 0.2;
  const grandTotalIncVat = grandTotalExVat + vatAmount;
  const quoteNumber = data.quotation_serial_number || (data as any).order_number || "\u2014";
  const customer = typeof data.customer === "object" && data.customer !== null ? (data.customer as any) : {};
  const contact = typeof data.primary_customer_contact === "object" && data.primary_customer_contact !== null
    ? (data.primary_customer_contact as any) : {};
  const sites = (data.sites ?? []) as any[];
  const primarySite = sites[0] ?? {};

  return (
    <div style={{ background: "white", width: "100%", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 32px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ background: "#0f172a", border: "1px solid #475569", padding: "8px 14px", borderRadius: 4 }}>
          <span style={{ color: "#94a3b8", fontSize: 22, fontWeight: 700, letterSpacing: "-0.05em" }}>
            RED<span style={{ color: "white" }}>5</span>
          </span>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#111827", marginBottom: 2 }}>Red 05 Limited</div>
          Unit C, Norton Road Business Park<br />
          Newhaven, East Sussex, BN9 0FN<br />
          Tel. 01273 525525 · www.red5.ltd
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Title */}
        <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 20 }}>
          CUSTOMER ESTIMATE NO. {quoteNumber}
        </div>

        {/* Customer / Info */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <div style={{ flex: 1, fontSize: 11, color: "#374151", lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600 }}>{customer.name || "\u2014"}</div>
            <div>{contact.address_line_1 || primarySite.address_line_1}</div>
            <div>{contact.city || primarySite.city}</div>
            <div>{contact.state || primarySite.state}</div>
          </div>
          <div style={{ minWidth: 220, background: "#f1f5f9", borderRadius: 8, padding: 12, fontSize: 11, color: "#374151" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Quote No:", quoteNumber],
                  ["Site:", primarySite.site_name || primarySite.address_line_1 || "\u2014"],
                  ["Phone:", customer.phone || "\u2014"],
                  ["Date:", fmtDate(data.created_at)],
                  ["Valid For:", data.due_date ? fmtDate(data.due_date) : "30 Days"],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ fontWeight: 600, paddingRight: 10, paddingTop: 2, paddingBottom: 2, whiteSpace: "nowrap" }}>{label}</td>
                    <td>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Description / Scope of Work
            </div>
            <div style={{
              padding: 12, background: "#f8fafc", borderRadius: 8,
              border: "1px solid #e2e8f0", fontSize: 11, color: "#374151",
              whiteSpace: "pre-line", lineHeight: 1.6,
            }}>
              {data.description}
            </div>
          </div>
        )}

        {/* Terms & Conditions / Definitions */}
        <TermsSection />

        {/* Summary */}
        {sections.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Summary</div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", fontSize: 11 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Section</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#374151" }}>Total ex VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 500 }}>{sec.name}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmtMoney(sec.section_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <div style={{ minWidth: 220, border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden", fontSize: 11 }}>
                {[
                  ["Sub-Total ex VAT", fmtMoney(grandTotalExVat), "#f8fafc", "#64748b"],
                  ["VAT (20%)", fmtMoney(vatAmount), "white", "#64748b"],
                  ["Total inc VAT", fmtMoney(grandTotalIncVat), "#334155", "white"],
                ].map(([label, val, bg, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: bg, borderTop: label !== "Sub-Total ex VAT" ? "1px solid #e2e8f0" : undefined }}>
                    <span style={{ color, fontWeight: label === "Total inc VAT" ? 700 : 500 }}>{label}</span>
                    <span style={{ color, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.map((sec, secIdx) => (
          <SectionBlock
            key={secIdx}
            sectionIdx={secIdx}
            section={sec}
            pinSnapshots={pinSnapshots}
            quotationId={data.id}
            onPinClick={onPinClick}
          />
        ))}

        {/* How to pay */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>How To Pay</div>
            <div style={{ background: "#475569", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 4 }}>
              QUOTATION NO. {quoteNumber}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, fontSize: 11, color: "#374151" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Direct Deposit</div>
              {[["Bank:", "Virgin Business Banking"], ["Acc. Name:", "Red 05 Ltd"], ["Sort Code:", "82-61-37"], ["Acc. No.:", "30580090"]].map(([k, v]) => (
                <div key={k}><span style={{ display: "inline-block", width: 90, fontWeight: 600 }}>{k}</span>{v}</div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Credit Card (MasterCard or Visa)</div>
              <div style={{ color: "#64748b" }}>Call <span style={{ fontWeight: 700, color: "#111827" }}>01273 525525</span> to pay over the phone.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Download hook ──────────────────────────────────── */

type DownloadState = "idle" | "capturing" | "done";

function useDownloadPdf(quoteName: string | undefined, quotationId: number) {
  const [state, setState] = React.useState<DownloadState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const download = React.useCallback(
    async () => {
      setState("capturing");
      setError(null);

      // Wait two animation frames for canvas renders to settle
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      try {
        const [html2canvas, { default: jsPDF }] = await Promise.all([
          import("html2canvas-pro").then((m) => m.default),
          import("jspdf"),
        ]);

        const el = document.getElementById("quotation-export-render");
        if (!el) throw new Error("Export render element not found");

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: el.scrollWidth,
          height: el.scrollHeight,
          windowWidth: el.scrollWidth,
          scrollX: 0,
          scrollY: 0,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdfW = 210; // A4 mm
        const pdfH = (canvas.height / canvas.width) * pdfW;
        const pdf = new jsPDF({ orientation: pdfH > pdfW ? "portrait" : "landscape", unit: "mm", format: [pdfW, pdfH] });
        pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");

        // Add embedded link annotations over captured image
        const containerRect = el.getBoundingClientRect();
        const scale = pdfW / (containerRect.width || el.scrollWidth || 1060);
        const linkElements = el.querySelectorAll<HTMLAnchorElement>("a[href]");

        linkElements.forEach((linkEl) => {
          const href = linkEl.getAttribute("href");
          if (!href || href === "#") return;
          const rect = linkEl.getBoundingClientRect();
          const x = (rect.left - containerRect.left) * scale;
          const y = (rect.top - containerRect.top) * scale;
          const w = rect.width * scale;
          const h = rect.height * scale;
          if (w > 0 && h > 0) {
            pdf.link(x, y, w, h, { url: href });
          }
        });

        const filename = quoteName
          ? `${quoteName.replace(/[/\\?%*:|"<>]/g, "").trim().replace(/\s+/g, "-").slice(0, 80)}.pdf`
          : `quotation-${quotationId}.pdf`;

        pdf.save(filename);
        setState("done");
      } catch (err) {
        console.error("[PDF Download]", err);
        setError("Failed to generate PDF. Please try again.");
        setState("idle");
      } finally {
        setTimeout(() => setState("idle"), 2000);
      }
    },
    [quoteName, quotationId],
  );

  return { state, error, download };
}

/* ── Modal ───────────────────────────────────────────── */

type Props = {
  open: boolean;
  quotationId: number;
  quoteName?: string;
  onClose: () => void;
};

export function QuotationPdfPreviewModal({ open, quotationId, quoteName, onClose }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [quoteDetail, setQuoteDetail] = React.useState<QuotationDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Upfront snapshot generation state
  const [generationStatus, setGenerationStatus] = React.useState<"idle" | "generating" | "success" | "error">("idle");
  const [generationProgress, setGenerationProgress] = React.useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [pinSnapshots, setPinSnapshots] = React.useState<Map<string, string>>(new Map());
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  const { state: dlState, error: dlError, download } = useDownloadPdf(quoteName, quotationId);

  // Fetch quotation data
  React.useEffect(() => {
    if (!open) {
      setQuoteDetail(null);
      setError(null);
      setGenerationStatus("idle");
      setGenerationProgress({ completed: 0, total: 0 });
      setPinSnapshots(new Map());
      setGenerationError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchQuotation(quotationId)
      .then((result) => { if (!cancelled) setQuoteDetail(result); })
      .catch(() => { if (!cancelled) setError("Failed to load quotation data. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, quotationId]);

  // Upfront snapshot generation pass
  React.useEffect(() => {
    if (!quoteDetail) return;

    const tasks = extractPinSnapshotTasks(quoteDetail.quote_sections ?? []);
    if (tasks.length === 0) {
      setPinSnapshots(new Map());
      setGenerationProgress({ completed: 0, total: 0 });
      setGenerationStatus("success");
      return;
    }

    let cancelled = false;
    setPinSnapshots(new Map());
    setGenerationStatus("generating");
    setGenerationProgress({ completed: 0, total: tasks.length });

    generateQuotationPinSnapshots(
      quoteDetail.quote_sections ?? [],
      (key, dataUrl) => {
        if (cancelled) return;
        setPinSnapshots((prev) => {
          const next = new Map(prev);
          next.set(key, dataUrl);
          return next;
        });
        setGenerationProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      },
      () => cancelled
    )
      .then(() => {
        if (cancelled) return;
        setGenerationStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Upfront pin snapshot generation failed:", err);
        setGenerationStatus("error");
        setGenerationError("Failed to prepare preview snapshots. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [quoteDetail]);

  const isCapturing = dlState === "capturing";
  const isBusy = isCapturing;

  const progressPercent = generationProgress.total > 0
    ? Math.round((generationProgress.completed / generationProgress.total) * 100)
    : 0;

  const buttonLabel = isCapturing
    ? "Generating PDF…"
    : dlState === "done"
      ? "Downloaded!"
      : "Download PDF";

  return (
    <AppModal
      open={open}
      onClose={!isBusy ? onClose : () => undefined}
      title="PDF Preview"
      size="5xl"
      closeOnBackdrop={!isBusy}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={isBusy} onClick={onClose}>
            Close
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={isBusy}
            disabled={loading || !!error || !quoteDetail || generationStatus !== "success" || isBusy}
            onClick={() => void download()}
          >
            <Download className="mr-1.5 size-4" />
            {buttonLabel}
          </AppButton>
        </>
      }
    >
      {loading && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading quotation&hellip;</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && generationStatus === "generating" && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-6 text-center">
          <Loader2 className="size-8 animate-spin text-[#334155]" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Preparing snapshots…</p>
            <p className="text-xs text-slate-500">
              {generationProgress.completed} of {generationProgress.total} completed
            </p>
          </div>
          <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#334155] h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {!loading && !error && generationStatus === "error" && (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
          <p className="text-sm text-red-500">{generationError || "Failed to prepare snapshots."}</p>
        </div>
      )}

      {!loading && !error && generationStatus === "success" && quoteDetail && (
        <>
          {dlError && (
            <div className="mx-4 mb-2 rounded border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-600">{dlError}</p>
            </div>
          )}

          <div className="h-[74vh] overflow-y-auto rounded-lg border border-slate-700">
            <div className="bg-[#525659] min-h-full p-5 flex flex-col items-center">
              <div className="bg-white w-full max-w-4xl rounded shadow-xl overflow-hidden">
                <DocumentBody
                  data={quoteDetail}
                  pinSnapshots={pinSnapshots}
                  sections={quoteDetail.quote_sections ?? []}
                />
              </div>
            </div>
          </div>

          {/* Hidden export renderer for html2canvas */}
          <div
            id="quotation-export-render"
            aria-hidden="true"
            style={{
              position: "fixed",
              left: -9999,
              top: 0,
              width: 1060,
              zIndex: -1,
              pointerEvents: "none",
              background: "white",
            }}
          >
            <DocumentBody
              data={quoteDetail}
              pinSnapshots={pinSnapshots}
              sections={quoteDetail.quote_sections ?? []}
            />
          </div>
        </>
      )}
    </AppModal>
  );
}
