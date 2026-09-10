import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/home";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <AuthForm mode="signup" next={next} initialError={params.error} />
    </main>
  );
}
