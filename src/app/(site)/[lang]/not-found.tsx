import Link from "next/link";

// Rendered inside the [lang] layout; the URL locale isn't available here, so it's bilingual.
export default function NotFound() {
  return (
    <div className="container-x grid place-items-center py-24 text-center">
      <p className="text-7xl font-extrabold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Page not found · الصفحة غير موجودة</h1>
      <div className="mt-6 flex gap-3">
        <Link href="/en" className="rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">Home</Link>
        <Link href="/ar" className="rounded-xl border border-line px-5 py-3 font-semibold hover:bg-surface">الرئيسية</Link>
      </div>
    </div>
  );
}
