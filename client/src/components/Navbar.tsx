import { useState } from "react";
import { Link, useLocation } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/quiz/flow", label: "Quiz" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const hidden = location.startsWith("/quiz/flow") || location.startsWith("/results") || location.startsWith("/processing");
  if (hidden) return null;

  return (
    <header className="site-header">
      <style>{`
        .site-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(251,252,254,.82);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }
      `}</style>
      <div className="container">
        <div className="flex items-center gap-[18px] h-[70px]">
          <Link href="/" className="flex items-center gap-[10px] no-underline" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "var(--ink)" }}>
            <PeptidePilotLogo height={30} variant="dark" />
          </Link>

          <nav className="hidden md:flex items-center gap-[6px]" style={{ marginLeft: "auto" }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}
                className="rounded-[999px] px-[13px] py-[9px] text-[.94rem] font-medium no-underline transition-colors"
                style={{ color: "var(--ink)" }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = "var(--secondary)"}
                onMouseLeave={e => (e.target as HTMLElement).style.background = "transparent"}
              >
                {label}
              </Link>
            ))}
            <Link href="/quiz/flow"
              className="rounded-[999px] px-[18px] py-[9px] text-[.94rem] font-semibold no-underline shadow-sm transition-shadow hover:shadow-md"
              style={{ background: "var(--grad-cta)", color: "var(--ink)" }}
            >
              Find my match
            </Link>
          </nav>

          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border ml-auto"
            style={{ borderColor: "var(--line)", background: "none" }}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="w-5 h-5" style={{ color: "var(--ink)" }} /> : <Menu className="w-5 h-5" style={{ color: "var(--ink)" }} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="container py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}
                className="block rounded-[999px] px-[13px] py-[13px] text-base font-medium no-underline"
                style={{ color: "var(--ink)" }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 mt-2" style={{ borderTop: "1px solid var(--line)" }}>
              <Link href="/quiz/flow" onClick={() => setMenuOpen(false)}
                className="block rounded-[999px] px-[18px] py-[13px] text-base font-semibold text-center no-underline shadow-sm"
                style={{ background: "var(--grad-cta)", color: "var(--ink)" }}
              >
                Find my match
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
