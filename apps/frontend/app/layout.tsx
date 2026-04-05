import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth-controls";
import { NotificationCenter } from "@/components/notification-center";
import { Providers } from "@/components/providers";
import { loadScenario } from "@/app/lib/api";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grind",
  description: "Predictive academic execution system",
};

const navigation = [
  { href: "/", label: "Pulse" },
  { href: "/tasks", label: "Tasks" },
  { href: "/interventions", label: "Interventions" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const snapshot = await loadScenario();

  return (
    <html lang="en">
      <body className="bg-canvas text-ink">
        <Providers>
          <div className="relative z-0 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-10">
            <header className="relative z-[220] mb-8 flex flex-col gap-4 rounded-card border border-line/80 bg-surface/90 px-5 py-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href="/" className="text-xl font-semibold tracking-[-0.04em]">
                  Grind
                </Link>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <nav className="flex flex-wrap gap-2 sm:justify-end">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-line bg-white px-3 py-2 text-sm text-muted transition hover:border-accent/35 hover:bg-canvas hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <AuthControls email={session?.user?.email ?? null} />
                <NotificationCenter notifications={snapshot.notifications} voiceCall={snapshot.voiceCall} />
              </div>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
