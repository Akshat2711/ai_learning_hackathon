import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LandingPageClient from "@/app/components/LandingPageClient";

export default async function LandingPage() {
    let user = null;
    try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (error) {
        // This likely means Supabase is not configured or we are in a build environment without env vars.
        // We can safely ignore this for the landing page render.
    }

    if (user) {
        redirect("/home");
    }

  return <LandingPageClient />;
}
