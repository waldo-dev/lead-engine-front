"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegister } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync({ email, password, name });
      toast.success("Cuenta creada exitosamente");
      router.push("/dashboard");
    } catch {
      toast.error("Error al crear la cuenta");
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 shadow-[var(--shadow-soft)]">
      <CardHeader className="space-y-3 pb-2 text-center sm:text-left">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground sm:mx-0">
          LE
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold">Crear cuenta</CardTitle>
          <CardDescription className="mt-1.5">
            Únete al equipo de prospección de Chilsmart
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="mt-1.5 bg-background"
            />
          </div>
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
              minLength={6}
              className="mt-1.5 bg-background"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={register.isPending}>
            {register.isPending ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground sm:text-left">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
