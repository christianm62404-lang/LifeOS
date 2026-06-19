import { Sparkles, Info } from "lucide-react";

import { requireUser } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { LogoutButton } from "./logout-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={profile?.email ?? user.email ?? ""}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                Your email cannot be changed here.
              </p>
            </div>
            <SettingsForm fullName={profile?.full_name ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI extraction</CardTitle>
            <CardDescription>
              Receipt details are auto-filled on upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-md border p-4">
              {aiEnabled ? (
                <>
                  <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">AI extraction enabled</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Uploaded receipts are parsed with your configured
                      OpenAI-compatible model.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Mock extraction</span>
                      <Badge variant="secondary">No API key</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set <code className="text-xs">OPENAI_API_KEY</code> in your
                      environment to enable real AI extraction. Until then,
                      uploads are pre-filled with sample data you can edit.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Sign out of Receipt Vault.</CardDescription>
          </CardHeader>
          <CardContent>
            <LogoutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
