"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/ui.store";

const mainNav = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/processing", label: "Procesamiento", icon: Zap },
];

const secondaryNav = [
  { href: "/failed", label: "Con errores", icon: AlertTriangle },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const logout = useLogout();

  const renderLink = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-3.5 z-50 border-border/80 bg-card shadow-sm lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menú"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(100vw-3rem,17rem)] flex-col border-r border-sidebar-accent bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:w-60 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-accent px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
            LE
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight text-sidebar-foreground">Lead Engine</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Chilsmart · CRM</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              Operación
            </p>
            {mainNav.map(({ href, label, icon }) => renderLink(href, label, icon))}
          </div>
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              Más
            </p>
            {secondaryNav.map(({ href, label, icon }) => renderLink(href, label, icon))}
          </div>
        </nav>

        <div className="space-y-2 border-t border-sidebar-accent p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => {
              setSidebarOpen(false);
              logout.mutate();
            }}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Saliendo..." : "Cerrar sesión"}
          </Button>
        </div>
      </aside>
    </>
  );
}
