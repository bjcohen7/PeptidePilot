import { Link } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";

const PLATFORM_LINKS = [
  { href: "/quiz/flow", label: "Quiz" },
  { href: "/results", label: "Results" },
  { href: "/providers", label: "Providers" },
];

const RESOURCES_LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/disclaimer", label: "Medical Disclaimer" },
  { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
];

export default function Footer() {
  return (
    <footer style={{ background: "#0F1729", color: "rgba(255,255,255,0.78)" }}>
      <div className="mx-auto w-full max-w-[1120px] px-5 py-12 sm:px-8 sm:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <PeptidePilotLogo height={28} variant="light" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Independent matching and comparison for GLP-1 treatment. We vet providers so you can start with confidence.
            </p>
          </div>

          <FooterColumn title="Platform" links={PLATFORM_LINKS} />
          <FooterColumn title="Resources" links={RESOURCES_LINKS} />
          <div>
            <FooterColumn title="Legal" links={LEGAL_LINKS} />
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Contact
              </h4>
              <a
                href="mailto:hello@peptidepilot.me"
                className="text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                hello@peptidepilot.me
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            &copy; {new Date().getFullYear()} PeptidePilot. All rights reserved.
          </p>
          <p className="max-w-[520px] text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            PeptidePilot is an independent matching and comparison service. We earn affiliate commissions when you start treatment through our links. Not medical advice. Always consult a qualified healthcare provider before starting any treatment.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.35)" }}>
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
