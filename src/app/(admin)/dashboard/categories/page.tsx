import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { Card, ConfirmButton } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/simple-forms";
import { deleteCategory } from "../actions";

export const metadata = { title: "Categories" };

export default async function Categories() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order").returns<Category[]>();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Categories</h1>
        <p className="text-sm text-muted">Shown in the menu, the category strip on the home page and the product filters.</p>
      </div>
      <Card title="Add category">
        <CategoryForm />
      </Card>
      <Card title="All categories">
        <ul className="divide-y divide-line">
          {categories?.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex-1">
                <CategoryForm category={c} />
              </div>
              <form action={deleteCategory} className="pt-6">
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton message={`Delete “${c.name_en}”? Products in it will become uncategorised.`} className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
