import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { NotificationsCard } from "./notifications-card";

export const metadata: Metadata = { title: "Settings — LifeOS" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const email = user?.email ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your display name. This is shown across LifeOS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm initialName={fullName} email={email} />
          </CardContent>
        </Card>

        <NotificationsCard />

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Sign out of your LifeOS account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
