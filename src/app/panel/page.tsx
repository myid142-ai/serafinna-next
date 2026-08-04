import { AdminApp } from "@/components/admin/AdminApp";
import { adminPath } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Серафинна — панель",
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return <AdminApp adminPathHint={adminPath()} />;
}
