import Link from "next/link";
import { redirect } from "next/navigation";
import { Checklist } from "@/components/checklist";
import { createClient } from "@/lib/supabase/server";
import { loadChecklist } from "@/lib/checklist-queries";

export const metadata = { title: "Your list" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gated this route; this is the defence-in-depth check so
  // the page is never renderable without a verified user.
  if (!user) redirect("/login?next=/home");

  const { categories, completedItemIds, stats, error } = await loadChecklist(supabase);

  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <main className="mx-auto max-w-2xl px-6 pb-20">
      <header className="flex items-baseline justify-between gap-4 pb-5 pt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-ember-600">Artha</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Your list</h1>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-parchment-200 bg-white px-3 py-1.5 text-sm transition hover:bg-parchment-200"
          >
            Sign out
          </button>
        </form>
      </header>

      {error || totalItems === 0 ? (
        <section className="rounded-xl border border-parchment-200 bg-white p-5">
          <h2 className="font-medium">Nothing to check off yet</h2>
          <p className="mt-1 text-sm text-ink-600">
            {error
              ? `The list could not be loaded: ${error}`
              : "No items are seeded. Apply the migrations in supabase/migrations, then run npm run db:seed."}
          </p>
          <Link
            href="/status"
            className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
          >
            Check stack status
          </Link>
        </section>
      ) : (
        <Checklist
          categories={categories}
          completedItemIds={completedItemIds}
          stats={stats}
        />
      )}
    </main>
  );
}
