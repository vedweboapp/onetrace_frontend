import { KioskList } from "@/features/kiosk/components/kiosk-list";

export default async function KiosksListPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <KioskList />
    </div>
  );
}
