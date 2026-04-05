import type { Metadata } from "next";
import Link from "next/link";
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
  { href: "/focus", label: "Focus" },
  { href: "/admin", label: "Admin" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-10">
          <header className="mb-8 flex flex-col gap-5 rounded-card border border-line/80 bg-surface/90 px-5 py-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="text-xl font-semibold tracking-[-0.04em]">
                Grind
              </Link>
              <p className="mt-1 text-sm text-muted">Predict risk. Make time. Start the next concrete step.</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-line bg-white px-3 py-2 text-sm text-muted transition hover:border-accent/35 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
