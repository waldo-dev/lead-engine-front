"use client";

import { useRouter } from "next/navigation";
import { Building2, Loader2, LogOut, User } from "lucide-react";
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
import { useScrapingStats } from "@/hooks/useScraping";

export function Navbar() {
  const router = useRouter();
  const { globalSearch, setGlobalSearch } = useUIStore();
  const { user, logout } = useAuthStore();
  const { data: stats } = useScrapingStats();

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex-1 max-w-md ml-10 lg:ml-0">
        <SearchInput
          value={globalSearch}
          onChange={handleSearch}
          placeholder="Búsqueda global..."
        />
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <Badge variant="outline" className="gap-1.5 px-3 py-1">
          <Building2 className="h-3.5 w-3.5" />
          {stats?.total ?? 0} empresas
        </Badge>

        {stats && stats.processing > 0 && (
          <Badge variant="info" className="gap-1.5 px-3 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {stats.processing} procesando
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">
              {user?.name ?? "Usuario"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="truncate text-sm">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
