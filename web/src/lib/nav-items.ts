import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Kanban,
  Calendar,
  Bot,
  BarChart3,
  Settings,
  Compass,
  ListChecks,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

// Single source of truth for the app's primary destinations — shared by the
// desktop sidebar and the mobile nav so they can never drift.
export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  chip?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vagas", label: "Vagas", icon: Briefcase },
  { href: "/curriculos", label: "Currículos", icon: FileText },
  { href: "/candidaturas", label: "Candidaturas", icon: Kanban },
  { href: "/entrevistas", label: "Entrevistas", icon: Calendar },
  { href: "/automacoes", label: "Automações", icon: Bot },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export const CORE_LEGACY_ITEMS: NavItem[] = [
  { href: "/explore", label: "Explorar (ATS)", icon: Compass },
  { href: "/pipeline", label: "Pipeline (Core)", icon: ListChecks },
];

export function visibleNavItems(_followupsEnabled: boolean): NavItem[] {
  return NAV_ITEMS;
}

export function isActivePath(href: string, pathname: string): boolean {
  if (href === "/dashboard" && pathname === "/") return true;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
