"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
  );

  const handleSave = () => {
    toast.info("La URL de API se configura mediante NEXT_PUBLIC_API_URL en .env.local");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Ajustes"
        description="Preferencias y conexión con el backend de Lead Engine"
      />

      <Card>
        <CardHeader>
          <CardTitle>Conexión API</CardTitle>
          <CardDescription>
            URL base del backend REST. Configura NEXT_PUBLIC_API_URL en tu archivo .env.local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">URL de la API</label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3001/api"
              className="mt-1.5"
            />
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono text-muted-foreground">
          <p>POST /auth/register · POST /auth/login · POST /auth/logout · GET /auth/me</p>
          <Separator />
          <p>GET/POST /companies · GET/PATCH/DELETE /companies/:id</p>
          <p>POST /companies/:id/ban · POST /companies/:id/unban</p>
          <Separator />
          <p>POST /scraping/import · POST /scraping/run · GET /scraping/stats</p>
          <Separator />
          <p>POST /ai/analyze-company/:id · POST /ai/analyze-pending</p>
          <p>GET /ai/company-analysis/:id · GET /ai/briefing/:id</p>
          <p>POST /ai/generate-message/:id (opcional, requiere briefing)</p>
          <Separator />
          <p>GET/PATCH /commercial/:id</p>
          <p>GET/POST /commercial/:id/followups</p>
        </CardContent>
      </Card>
    </div>
  );
}
