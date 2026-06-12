"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      toast.success("Sesión iniciada");
      router.push("/dashboard");
    } catch {
      toast.error("Credenciales inválidas");
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 shadow-[var(--shadow-soft)]">
      <CardHeader className="space-y-3 pb-2 text-center sm:text-left">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground sm:mx-0">
          LE
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold">Bienvenido de vuelta</CardTitle>
          <CardDescription className="mt-1.5">
            Accede al CRM interno de prospección comercial
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
              className="mt-1.5 bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 bg-background"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
            {login.isPending ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground sm:text-left">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
