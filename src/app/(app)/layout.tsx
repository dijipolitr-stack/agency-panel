import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the user's primary agency. If they don't have one, push them
  // to a setup page (here we redirect to login with a hint).
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);

  const agency = agencies?.[0];
  if (!agency) {
    // Edge case: signup creates the agency, but if a user landed here
    // without one, redirect them through signup.
    redirect("/login?error=missing-agency");
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen relative z-[2]">
      <Sidebar
        agencyName={agency.name}
        clients={clients ?? []}
        userEmail={user.email ?? ""}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
