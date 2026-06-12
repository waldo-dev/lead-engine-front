import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="auth-panel relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <div>
          <Link href="/login" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
              LE
            </div>
            <div>
              <p className="font-semibold">Lead Engine</p>
              <p className="text-xs text-primary-foreground/75">Chilsmart</p>
            </div>
          </Link>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Prospección comercial con criterio, no con ruido
          </h2>
          <p className="text-sm leading-relaxed text-primary-foreground/85">
            Centraliza empresas, enriquece datos con scraping y prioriza oportunidades con análisis
            pensado para tu equipo de ventas.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Uso interno · Chilsmart</p>
      </div>
      <div className="flex items-center justify-center bg-background p-4 sm:p-8">{children}</div>
    </div>
  );
}
