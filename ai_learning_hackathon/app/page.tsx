import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LandingPageClient from "@/app/components/LandingPageClient";

export default async function LandingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect("/home");
    }

  return <LandingPageClient />;
}
