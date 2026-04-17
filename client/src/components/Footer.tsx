import { Link } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";

const PLATFORM_LINKS = [
  { href: "/quiz", label: "Take the Quiz" },
  { href: "/learn", label: "Learn" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/disclaimer", label: "Medical Disclaimer" },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container py-10 sm:py-14">
        {/* Top section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-10">
          {/* Brand — full width on mobile, 2 cols on md */}
          <div className="sm:col-span-2">
            <div className="mb-4">
              <PeptidePilotLogo height={36} variant="light" />
            </div>
            <p className="text-sm text-primary-foreground/70 max-w-sm leading-relaxed">
              Independent, unbiased peptide recommendations based on your unique biology, goals, and lifestyle. We have no skin in the game — only your results matter.
            </p>
          </div>

          {/* Links — side by side on mobile */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">Platform</h4>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary-foreground/70 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">Legal</h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary-foreground/70 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-primary-foreground/50 text-center sm:text-left">
            © {new Date().getFullYear()} PeptidePilot. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/50 text-center sm:text-right sm:max-w-sm">
            For educational purposes only. Not medical advice. Always consult a qualified healthcare provider before starting any peptide protocol.
          </p>
        </div>
      </div>
    </footer>
  );
}
