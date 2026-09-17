import type { Metadata } from "next";
import { Suspense } from "react";
import { VendorQuotationDetails } from "@/features/public/vendor-quotation/components/vendor-quotation-details";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor Quotation Review | OneTrace",
  description: "Review, edit, and submit vendor quotation line items, prices, and expected delivery schedules.",
};

export default function PublicVendorQuotationPage() {
  return (
    <Suspense fallback={null}>
      <VendorQuotationDetails />
    </Suspense>
  );
}
