import { KioskBuilder } from "@/features/kiosk/components/kiosk-builder";

export default async function EditKioskPage() {
  return (
    <div data-full-bleed-page className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <KioskBuilder />
    </div>
  );
}
