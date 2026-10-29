import { requireAdmin } from "@/lib/auth";
import type { Settings } from "@/lib/types";
import { SettingsForm } from "@/components/admin/simple-forms";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single<Settings>();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Site settings</h1>
        <p className="text-sm text-muted">WhatsApp number for orders, contact details and the free-delivery amount shown across the site.</p>
      </div>
      {data && <SettingsForm settings={data} />}
    </div>
  );
}
