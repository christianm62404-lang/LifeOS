import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  FileText,
  BellRing,
  Target,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Bills", href: "/bills", icon: Receipt },
  { title: "Subscriptions", href: "/subscriptions", icon: RefreshCw },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Reminders", href: "/reminders", icon: BellRing },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Settings", href: "/settings", icon: Settings },
];
