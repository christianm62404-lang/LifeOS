import {
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  RotateCcw,
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
  { title: "Receipts", href: "/receipts", icon: Receipt },
  { title: "Warranties", href: "/warranties", icon: ShieldCheck },
  { title: "Returns", href: "/returns", icon: RotateCcw },
  { title: "Settings", href: "/settings", icon: Settings },
];
