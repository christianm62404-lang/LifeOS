"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const OPTIONS = [
  {
    id: "bills",
    label: "Bill due reminders",
    description: "Get notified before bills are due.",
  },
  {
    id: "documents",
    label: "Document expiry alerts",
    description: "Alerts when documents are about to expire.",
  },
  {
    id: "reminders",
    label: "Task reminders",
    description: "Reminders for recurring home and vehicle tasks.",
  },
];

export function NotificationsCard() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    bills: true,
    documents: true,
    reminders: false,
  });

  function toggle(id: string, value: boolean) {
    setPrefs((p) => ({ ...p, [id]: value }));
    toast({
      title: "Preference saved (mock)",
      description:
        "Notifications are mocked in this MVP — no emails or texts are sent.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" /> Notifications
          <Badge variant="secondary">Mock</Badge>
        </CardTitle>
        <CardDescription>
          Notification delivery is mocked for the MVP. Toggling these stores
          your preference locally without sending real emails or texts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center justify-between gap-4 rounded-lg border p-3"
          >
            <div className="space-y-0.5">
              <Label htmlFor={opt.id}>{opt.label}</Label>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            <Switch
              id={opt.id}
              checked={prefs[opt.id]}
              onCheckedChange={(v) => toggle(opt.id, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
