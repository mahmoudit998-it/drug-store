import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "./supabase/server";
import type { Company, Profile } from "./types";

export type Session = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  profile: Profile;
  company: Pick<Company, "id" | "slug" | "name_en" | "logo_url"> | null;
  isAdmin: boolean;
};

/** Signed-in dashboard user with a profile; redirects to /login otherwise. */
export const requireSession = cache(async (): Promise<Session> => {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle<Profile>();
  if (!profile) redirect("/login?error=no-access");

  let company: Session["company"] = null;
  if (profile.company_id) {
    const { data: c } = await supabase.from("companies").select("id, slug, name_en, logo_url").eq("id", profile.company_id).maybeSingle();
    company = c;
  }
  return { supabase, profile, company, isAdmin: profile.role === "admin" };
});

export async function requireAdmin() {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/dashboard");
  return s;
}
