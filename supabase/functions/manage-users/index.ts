// Admin-only user management for dashboard accounts (needs the service role, so it runs here, not in the app).
// Actions: create | delete | set_password
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: me } = await caller.auth.getUser();
  if (!me.user) return json({ error: "Not signed in" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Only admins can manage users" }, 403);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body.action === "create") {
    const { email, password, full_name, role, company_id } = body;
    if (!email || !password || password.length < 8) return json({ error: "Email and a password of at least 8 characters are required" }, 400);
    if (role !== "admin" && role !== "company") return json({ error: "Invalid role" }, 400);
    if (role === "company" && !company_id) return json({ error: "Company accounts need a company" }, 400);

    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (error) return json({ error: error.message }, 400);
    const { error: pErr } = await admin.from("profiles").insert({
      id: data.user.id,
      role,
      company_id: role === "company" ? company_id : null,
      full_name: full_name || null,
      email,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: pErr.message }, 400);
    }
    return json({ id: data.user.id });
  }

  if (body.action === "delete") {
    if (body.user_id === me.user.id) return json({ error: "You cannot delete your own account" }, 400);
    const { error } = await admin.auth.admin.deleteUser(body.user_id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (body.action === "set_password") {
    if (!body.password || body.password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
