import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { pseoSections } from "@/data/pseo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
];

const LEARN_LINKS = [
  ...pseoSections.map((section) => ({
    href: section.path,
    label: section.label,
    description: section.description,
  })),
  {
    href: "/blog",
    label: "Blog",
    description: "Articles and research updates",
  },
];

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isQuizFlow = location.startsWith("/quiz/flow") || location.startsWith("/results");
  if (isQuizFlow) return null;

  const isMinimal = location === "/quiz";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-border/60">
      <div className="container">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center group" onClick={() => setMenuOpen(false)}>
            <PeptidePilotLogo height={44} variant="dark" />
          </Link>

          {/* Desktop nav links */}
          {!isMinimal && (
            <nav className="hidden md:flex items-center gap-6">
              <div className="relative group">
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                >
                  Learn
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </Link>
                <div className="invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 focus-within:visible focus-within:opacity-100 focus-within:translate-y-0 absolute left-0 top-full pt-2 transition-all">
                  <div className="w-72 rounded-xl border border-border/60 bg-white shadow-lg p-3">
                    {LEARN_LINKS.map(({ href, label, description }) => (
                      <Link
                        key={href}
                        href={href}
                        className="block rounded-lg px-3 py-3 hover:bg-muted/70 transition-colors"
                      >
                        <div className="font-medium text-foreground text-sm">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{description}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {/* Desktop CTA */}
            <Link href="/quiz" className="hidden sm:block">
              <Button
                size="sm"
                className="bg-brand-gradient text-white hover:opacity-90 transition-opacity font-semibold shadow-sm"
              >
                Take the Quiz
              </Button>
            </Link>

            {/* Mobile hamburger — only on non-minimal pages */}
            {!isMinimal && (
              <button
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && !isMinimal && (
        <div className="md:hidden border-t border-border/60 bg-white animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between py-3 px-2 text-base font-medium text-foreground hover:text-accent transition-colors rounded-lg hover:bg-muted/50"
                onClick={() => setMenuOpen(false)}
              >
                {label}
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
            <div className="py-2">
              <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Learn
              </div>
              {LEARN_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between py-3 px-2 text-base font-medium text-foreground hover:text-accent transition-colors rounded-lg hover:bg-muted/50"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <div className="pt-3 border-t border-border/60 mt-2">
              <Link href="/quiz" onClick={() => setMenuOpen(false)}>
                <Button
                  size="lg"
                  className="w-full bg-brand-gradient text-white hover:opacity-90 font-semibold"
                >
                  Take the Free Quiz
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
