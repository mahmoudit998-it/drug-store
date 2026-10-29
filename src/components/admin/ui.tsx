"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ImagePlus, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { FormState } from "@/app/(admin)/dashboard/actions";

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

type TextProps = { name: string; label: string; defaultValue?: string | number | null; hint?: string; required?: boolean; type?: string; dir?: "rtl" | "ltr"; placeholder?: string; step?: string; className?: string };

export function Text({ name, label, defaultValue, hint, required, type = "text", dir, placeholder, step, className }: TextProps) {
  return (
    <Field label={label + (required ? " *" : "")} hint={hint} className={className}>
      <input name={name} type={type} step={step} defaultValue={defaultValue ?? ""} required={required} dir={dir} placeholder={placeholder} className={`${inputCls} ${dir === "rtl" ? "font-arabic" : ""}`} />
    </Field>
  );
}

export function TextArea({ name, label, defaultValue, hint, rows = 4, dir }: Omit<TextProps, "type"> & { rows?: number }) {
  return (
    <Field label={label} hint={hint}>
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? ""} dir={dir} className={`${inputCls} h-auto py-2 ${dir === "rtl" ? "font-arabic" : ""}`} />
    </Field>
  );
}

/** English + Arabic inputs side by side. */
export function Bilingual({ name, label, en, ar, required, textarea, rows, hint }: { name: string; label: string; en?: string | null; ar?: string | null; required?: boolean; textarea?: boolean; rows?: number; hint?: string }) {
  const C = textarea ? TextArea : Text;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <C name={`${name}_en`} label={`${label} (English)`} defaultValue={en} required={required} rows={rows} hint={hint} />
      <C name={`${name}_ar`} label={`${label} (العربية)`} defaultValue={ar} required={required} rows={rows} dir="rtl" />
    </div>
  );
}

export function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm has-[:checked]:border-brand-200 has-[:checked]:bg-brand-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand-600" />
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Submit({ children = "Save", className = "" }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60 ${className}`}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <TriangleAlert className="size-4 shrink-0" /> {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        <CheckCircle2 className="size-4 shrink-0" /> {state.ok}
      </p>
    );
  return null;
}

/**
 * Uploads straight to the public "media" bucket and stores the URL in a hidden input.
 * Company accounts must upload under companies/<companyId>/ (enforced by storage policies).
 */
export function ImageUpload({ name, label, defaultValue, folder, aspect = "square", hint }: { name: string; label: string; defaultValue?: string | null; folder: string; aspect?: "square" | "wide"; hint?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5 MB.");
    setBusy(true);
    setError("");
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const supabase = createBrowserSupabase();
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setBusy(false);
    if (error) return setError(error.message);
    setUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className={`relative overflow-hidden rounded-xl border border-dashed border-line bg-white ${aspect === "wide" ? "aspect-[5/1]" : "aspect-square max-w-56"}`}>
        {url ? (
          <Image src={url} alt="" fill sizes="400px" className={aspect === "wide" ? "object-cover" : "object-contain p-2"} />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <ImagePlus className="size-8" strokeWidth={1.25} />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-6 animate-spin text-brand-600" />
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="h-9 rounded-lg border border-line bg-white px-3 font-medium hover:bg-surface">
          {url ? "Replace image" : "Upload image"}
        </button>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="grid size-9 place-items-center rounded-lg border border-line bg-white text-muted hover:text-red-600" aria-label="Remove image">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function ConfirmButton({ children, message, className = "" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
