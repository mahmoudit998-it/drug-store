import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteSubscriber } from "../actions";

export const metadata = { title: "Newsletter" };

export default async function Subscribers() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Newsletter subscribers</h1>
        <p className="text-sm text-muted">{data?.length ?? 0} people subscribed from the website.</p>
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {data?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="font-medium">{s.email}</span>
            <span className="flex items-center gap-4 text-muted">
              {new Date(s.created_at).toLocaleDateString("en-GB")}
              <form action={deleteSubscriber}>
                <input type="hidden" name="id" value={s.id} />
                <ConfirmButton message={`Remove ${s.email}?`} className="grid size-8 place-items-center rounded-lg hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            </span>
          </li>
        ))}
        {!data?.length && <li className="p-10 text-center text-muted">No subscribers yet.</li>}
      </ul>
    </div>
  );
}
