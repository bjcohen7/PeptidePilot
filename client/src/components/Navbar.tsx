import { useState } from "react";
import { Link, useLocation } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { Menu, X, Search } from "lucide-react";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

// "Find my match" enters the /start warm-up bridge (same destination as the homepage
// direct CTA) and fires the BridgeStart funnel-entry signal.
function fireBridgeStart() {
  try {
    trackMetaCustomEvent("BridgeStart", { placement: "nav" });
  } catch {
    /* no-op */
  }
}

// Library/blog/stacks/guides are demoted under a single "Learn" entry (→ /learn hub).
const NAV_LINKS = [
  { href: "/quiz/flow", label: "Quiz" },
  { href: "/learn", label: "Learn" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const hidden = location.startsWith("/quiz/flow") || location.startsWith("/results") || location.startsWith("/processing");
  const isHome = location === "/";
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
        .nav-search { flex: 1; max-width: 360px; position: relative; }
        .nav-search input {
          width: 100%; padding: 11px 16px 11px 40px; border-radius: var(--r-pill);
          border: 1px solid var(--line); background: var(--secondary); font-size: .92rem; color: var(--ink);
        }
        .nav-search input:focus { outline: 2px solid var(--sky); background: #fff; }
        .nav-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--muted-foreground); }
        @media (max-width: 680px) {
          .nav-links { position: fixed; inset: 70px 0 auto 0; flex-direction: column; align-items: stretch;
            background: var(--card); border-bottom: 1px solid var(--line); padding: 14px 16px; gap: 4px;
            box-shadow: var(--shadow-md); transform: translateY(-120%); transition: transform .25s ease; }
          .nav-links.open { transform: translateY(0); }
          .nav-links a { padding: 13px; }
          .hamburger { display: inline-flex !important; }
          .nav-search { display: none; }
        }
      `}</style>
      <div className="container">
        <div className="flex items-center gap-[18px] h-[70px]">
          <Link href="/" className="no-underline">
            <PeptidePilotLogo height={30} variant="dark" />
          </Link>

          {!isHome && (
            <div className="nav-search hidden md:block">
              <Search />
              <input placeholder="Search providers, drugs, states…" />
            </div>
          )}

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
            <Link href="/start" onClick={fireBridgeStart}
              className="rounded-[999px] px-[18px] py-[9px] text-[.94rem] font-semibold no-underline shadow-sm transition-shadow hover:shadow-md"
              style={{ background: "var(--grad-cta)", color: "var(--ink)" }}
            >
              Find my match
            </Link>
          </nav>

          <button
            className="hamburger md:hidden flex items-center justify-center w-10 h-10 rounded-xl border"
            style={{ borderColor: "var(--line)", background: "none", display: "none" }}
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
              <Link href="/start" onClick={() => { fireBridgeStart(); setMenuOpen(false); }}
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
