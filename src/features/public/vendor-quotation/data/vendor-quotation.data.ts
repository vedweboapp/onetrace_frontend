export interface VendorQuotationLineItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  specification: string;
  quantity: number;
  unit: string;
  quotedPrice: number;
  expectedDeliveryDate: string;
  availability: "In Stock" | "Lead Time 3-5 Days" | "Special Order" | "Backorder";
  vendorNotes?: string;
}

export interface VendorQuotationItemGroup {
  id: string;
  groupName: string;
  groupCode: string;
  description: string;
  items: VendorQuotationLineItem[];
}

export interface VendorQuotation {
  quotationId: string;
  quotationNumber: string;
  rfqNumber: string;
  orderRef: string;
  title: string;
  status: "Approved" | "Draft" | "Pending Submission" | "Rejected";
  customer: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    country: string;
    phone: string;
  };
  project: string;
  site: {
    name: string;
    address: string;
  };
  primaryContact: {
    name: string;
    role: string;
    email: string;
    phone: string;
  };
  submissionDate: string;
  startDate: string;
  validFor: string;
  signatureUrl: string | null;
  signedAt: string | null;
  signerName: string | null;
  currencySymbol: string;
  taxRate: number;
  itemGroups: VendorQuotationItemGroup[];
}

export const initialVendorQuotation: VendorQuotation = {
  quotationId: "QUOTE183",
  quotationNumber: "QUOTE183",
  rfqNumber: "RFQ-2026-9921",
  orderRef: "ORD-S8LM3B",
  title: "Network Wires ISS",
  status: "Approved",
  customer: {
    name: "Green Leaf Traders",
    addressLine1: "45 Oxford Road, Littlemore",
    city: "Oxford",
    state: "Oxfordshire",
    country: "England",
    phone: "+918989747895",
  },
  project: "Network Wires ISS",
  site: {
    name: "Manchester Distribution Hub",
    address: "Unit 12, Trafford Park Industrial Estate, Manchester M17 1EH",
  },
  primaryContact: {
    name: "Naina Kaushik",
    role: "Primary Contact",
    email: "naina.kaushik@greenleaf.com",
    phone: "+91 89897 47895",
  },
  submissionDate: "2026-09-11",
  startDate: "2026-09-11",
  validFor: "30 Days",
  signatureUrl: null,
  signedAt: "2026-09-11T12:00:00Z",
  signerName: "Naina Kaushik",
  currencySymbol: "$",
  taxRate: 0.20,
  itemGroups: [
    {
      id: "group-cables",
      groupName: "Structured Cabling & High-Speed Network Wires",
      groupCode: "GRP-NW-01",
      description: "Cat6A shielded twisted pair cables, fiber patch cords and trunking cables.",
      items: [
        {
          id: "item-nw-101",
          name: "Cat6A U/FTP LSZH Solid Bulk Cable (305m Drum)",
          sku: "CAB-C6A-305M",
          category: "Cabling",
          specification: "500MHz bandwidth, 10Gbps rated, Low Smoke Zero Halogen purple sheath",
          quantity: 12,
          unit: "Drums",
          quotedPrice: 185.00,
          expectedDeliveryDate: "2026-09-18",
          availability: "In Stock",
          vendorNotes: "Supplied on recyclable wooden reels",
        },
        {
          id: "item-nw-102",
          name: "OM4 Duplex Multimode Fiber Optic Cable 50/125 (100m Spool)",
          sku: "FIB-OM4-100M",
          category: "Fiber",
          specification: "Aqua jacket, armored bend-insensitive core, LC-LC terminations ready",
          quantity: 6,
          unit: "Spools",
          quotedPrice: 245.00,
          expectedDeliveryDate: "2026-09-20",
          availability: "In Stock",
          vendorNotes: "Individual factory test certificates included",
        },
        {
          id: "item-nw-103",
          name: "Direct Burial Outdoor Armored Cat6 Cable (100m Roll)",
          sku: "CAB-OUT-C6-100",
          category: "Cabling",
          specification: "UV resistant PE sheath, water-blocking gel tape with steel tape armor",
          quantity: 8,
          unit: "Rolls",
          quotedPrice: 140.00,
          expectedDeliveryDate: "2026-09-22",
          availability: "Lead Time 3-5 Days",
          vendorNotes: "Rated for direct soil burial and duct pulling",
        },
      ],
    },
    {
      id: "group-connectors",
      groupName: "Patch Panels, Keystone Jacks & Connectors",
      groupCode: "GRP-CON-02",
      description: "24-port modular patch panels, shielded toolless keystone jacks and boots.",
      items: [
        {
          id: "item-con-201",
          name: "24-Port 1U Cat6A Shielded Modular Patch Panel",
          sku: "PNL-24P-1U-C6A",
          category: "Hardware",
          specification: "Includes rear cable management bar, grounding wire and numbering labels",
          quantity: 4,
          unit: "Units",
          quotedPrice: 95.00,
          expectedDeliveryDate: "2026-09-17",
          availability: "In Stock",
          vendorNotes: "Fits standard 19-inch server racks",
        },
        {
          id: "item-con-202",
          name: "Cat6A Shielded RJ45 Toolless Keystone Jack (Pack of 24)",
          sku: "KEY-C6A-SH-24PK",
          category: "Connectors",
          specification: "Zinc-alloy die-cast housing, 360-degree shielding, gold plated contacts",
          quantity: 8,
          unit: "Packs",
          quotedPrice: 62.50,
          expectedDeliveryDate: "2026-09-18",
          availability: "In Stock",
          vendorNotes: "Toolless snap-in design with T568A/B wiring color guide",
        },
      ],
    },
    {
      id: "group-containment",
      groupName: "Wire Containment & Mesh Cable Trays",
      groupCode: "GRP-TRAY-03",
      description: "Electro-galvanized wire basket cable trays, joiners and suspension brackets.",
      items: [
        {
          id: "item-try-301",
          name: "Wire Mesh Cable Tray 150mm x 50mm x 3m (Electro-Galv)",
          sku: "TRY-MSH-150-3M",
          category: "Containment",
          specification: "5.0mm steel wire grid, 50x100mm mesh matrix, smooth safety edges",
          quantity: 15,
          unit: "Lengths",
          quotedPrice: 28.00,
          expectedDeliveryDate: "2026-09-24",
          availability: "Lead Time 3-5 Days",
          vendorNotes: "Fast-lock couplers included with every length",
        },
        {
          id: "item-try-302",
          name: "Ceiling Trapeze Suspension Bracket Kit for 150mm Tray",
          sku: "BRK-SUSP-150KT",
          category: "Fixings",
          specification: "Includes threaded rod clamps, tray hold-down clips and M8 flange nuts",
          quantity: 30,
          unit: "Kits",
          quotedPrice: 11.50,
          expectedDeliveryDate: "2026-09-19",
          availability: "In Stock",
          vendorNotes: "Safe working load 120kg per bracket kit",
        },
      ],
    },
  ],
};
