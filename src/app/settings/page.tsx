import Link from "next/link";
import { redirect } from "next/navigation";
import { ToneToggle } from "@/components/tone-toggle";
import { createClient } from "@/lib/supabase/server";
import type { TonePreference } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("users")
    .select("tone_preference")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/home" className="text-sm text-ink-600 hover:text-ink-950">
        ← Your list
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-8">
        <ToneToggle current={(profile?.tone_preference as TonePreference) ?? "motivate"} />
      </section>

      <section className="mt-10 border-t border-parchment-200 pt-6">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="mt-1 text-sm text-ink-600">{user.email}</p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="rounded-lg border border-parchment-200 bg-white px-3 py-1.5 text-sm transition hover:bg-parchment-200"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
