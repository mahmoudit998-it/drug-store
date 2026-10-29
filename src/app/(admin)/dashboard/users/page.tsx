import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Card, ConfirmButton } from "@/components/admin/ui";
import { CreateUserForm, PasswordForm } from "@/components/admin/simple-forms";
import { deleteUser } from "../actions";

export const metadata = { title: "Accounts" };

export default async function Users() {
  const { supabase, profile: me } = await requireAdmin();
  const [{ data: users }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("id, role, email, full_name, created_at, company:companies(name_en)").order("role").order("created_at"),
    supabase.from("companies").select("id, name_en").order("sort_order"),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Accounts</h1>
        <p className="text-sm text-muted">Company accounts can only manage their own products and profile. Admins manage everything.</p>
      </div>
      <Card title="Create account">
        <CreateUserForm companies={companies ?? []} />
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">User</th>
              <th className="px-4 py-3 text-start font-semibold">Access</th>
              <th className="px-4 py-3 text-start font-semibold">Reset password</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users?.map((u) => {
              const c = u.company as unknown as { name_en: string } | null;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{u.full_name || "—"}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">Warehouse admin</span>
                    ) : (
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{c?.name_en}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PasswordForm userId={u.id} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    {u.id !== me.id && (
                      <form action={deleteUser}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <ConfirmButton message={`Delete the account ${u.email}?`} className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
