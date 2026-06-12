"use client";

import { useRouter } from "next/navigation";
import { Building2, LogOut, User } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/hooks/useAuth";
import { useCompanyCount } from "@/hooks/useCompanyCount";

export function Navbar() {
  const router = useRouter();
  const { globalSearch, setGlobalSearch } = useUIStore();
  const { user } = useAuthStore();
  const logout = useLogout();
  const { data: companyCount } = useCompanyCount();

  const handleSearch = (value: string) => {
    setGlobalSearch(value);
    router.push(`/companies?search=${encodeURIComponent(value)}`);
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur-md sm:gap-4 lg:h-16 lg:px-6">
      <div className="min-w-0 flex-1 max-w-lg ml-11 lg:ml-0">
        <SearchInput
          value={globalSearch}
          onChange={handleSearch}
          placeholder="Buscar empresa, rubro o ciudad..."
        />
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Badge variant="secondary" className="gap-1.5 font-normal">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          {companyCount ?? 0}
        </Badge>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 pl-1 pr-2">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-accent text-xs font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[120px] truncate text-sm font-medium lg:inline">
              {user?.name ?? "Usuario"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate text-sm">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut className="mr-2 h-4 w-4" />
            {logout.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
