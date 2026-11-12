import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { inter, instrumentSerif, instrumentSerifItalic } from "@/lib/fonts";
import { AppShell } from "@/components/app-shell";
import { RouteProgressHost } from "@/components/route-progress-host";
import { ThemeProvider } from "@/components/theme-provider";
import { readFollowupsEnabled } from "@/lib/followups-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOps — Plataforma Inteligente de Gestão de Carreira",
  description: "Monitoramento de vagas, compatibilidade profissional, currículos ATS, candidaturas e automações.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CareerOps" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#101318",
};

// Dark mode é o padrão da plataforma CareerOps (#101318), mantendo alternância opcional.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('career-ops:theme');var d=t==='light'?false:true;if(d)document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',d?'#101318':'#f7f6f3');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const followupsEnabled = readFollowupsEnabled();
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${instrumentSerifItalic.variable}`}
    >
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <RouteProgressHost />
        <ThemeProvider>
          <AppShell followupsEnabled={followupsEnabled}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
