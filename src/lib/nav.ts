import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  FileText,
  BellRing,
  Target,
  CalendarDays,
  Home,
  Car,
  Sparkles,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/lib/billing";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Feature this item maps to; used to show a lock when not entitled. */
  feature?: Feature;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Reminders", href: "/reminders", icon: BellRing, feature: "reminders" },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Bills", href: "/bills", icon: Receipt, feature: "bills" },
      { title: "Documents", href: "/documents", icon: FileText, feature: "documents" },
      { title: "Goals", href: "/goals", icon: Target, feature: "goals" },
      { title: "Calendar", href: "/calendar", icon: CalendarDays, feature: "calendar" },
    ],
  },
  {
    label: "Pro",
    items: [
      { title: "Subscriptions", href: "/subscriptions", icon: RefreshCw, feature: "subscriptions" },
      { title: "Home maintenance", href: "/home-maintenance", icon: Home, feature: "home-maintenance" },
      { title: "Vehicle maintenance", href: "/vehicle-maintenance", icon: Car, feature: "vehicle-maintenance" },
      { title: "AI suggestions", href: "/ai-suggestions", icon: Sparkles, feature: "ai-suggestions" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Plans & billing", href: "/billing", icon: CreditCard },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
