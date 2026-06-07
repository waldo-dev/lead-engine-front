"use client";

import { Copy, ExternalLink, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copyToClipboard } from "@/lib/utils";
import type { CompanyContact } from "@/types";
import { toast } from "sonner";

interface ContactCardProps {
  contacts?: CompanyContact;
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

function ContactItem({
  label,
  value,
  type,
}: {
  label: string;
  value: string;
  type: "phone" | "email" | "link";
}) {
  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) toast.success("Copiado al portapapeles");
  };

  const href =
    type === "phone" ? `tel:${value}` : type === "email" ? `mailto:${value}` : value;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={href} target={type === "link" ? "_blank" : undefined} rel="noopener noreferrer">
            {type === "phone" ? (
              <Phone className="h-3.5 w-3.5" />
            ) : type === "email" ? (
              <Mail className="h-3.5 w-3.5" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ContactCard({ contacts, socialMedia }: ContactCardProps) {
  const hasContacts =
    contacts?.phones?.length ||
    contacts?.emails?.length ||
    contacts?.linkedin ||
    contacts?.facebook ||
    contacts?.instagram ||
    socialMedia?.linkedin ||
    socialMedia?.facebook ||
    socialMedia?.instagram;

  if (!hasContacts) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sin información de contacto disponible
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contactos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts?.phones?.map((phone) => (
          <ContactItem key={phone} label="Teléfono" value={phone} type="phone" />
        ))}
        {contacts?.emails?.map((email) => (
          <ContactItem key={email} label="Email" value={email} type="email" />
        ))}
        {(contacts?.linkedin || socialMedia?.linkedin) && (
          <ContactItem
            label="LinkedIn"
            value={contacts?.linkedin || socialMedia?.linkedin!}
            type="link"
          />
        )}
        {(contacts?.facebook || socialMedia?.facebook) && (
          <ContactItem
            label="Facebook"
            value={contacts?.facebook || socialMedia?.facebook!}
            type="link"
          />
        )}
        {(contacts?.instagram || socialMedia?.instagram) && (
          <ContactItem
            label="Instagram"
            value={contacts?.instagram || socialMedia?.instagram!}
            type="link"
          />
        )}
      </CardContent>
    </Card>
  );
}
