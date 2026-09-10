import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already gated this route; this is the defence-in-depth check
  // so the page is never renderable without a verified user.
  if (!user) redirect("/login?next=/home");

  const { count: categoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });
  const { count: itemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-ember-600">Artha</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Hello, {user.email}
          </h1>
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

      <section className="mt-10 rounded-xl border border-parchment-200 bg-white p-5">
        <h2 className="font-medium">Your list is ready to be built</h2>
        <p className="mt-1 text-sm text-ink-600">
          {itemCount
            ? `${itemCount} items across ${categoryCount} categories are seeded and waiting. The checklist UI lands in Step 4.`
            : "No items seeded yet — run `npm run db:seed` after applying the migration."}
        </p>
        <Link
          href="/status"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          Check stack status
        </Link>
      </section>
    </main>
  );
}
