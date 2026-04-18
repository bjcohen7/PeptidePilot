import { Link } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";

const PLATFORM_LINKS = [
  { href: "/quiz", label: "Take the Quiz" },
  { href: "/results", label: "View My Results" },
  { href: "/about", label: "About PeptidePilot" },
  { href: "/learn", label: "Learn" },
];

const RESEARCH_LINKS = [
  { href: "/peptides", label: "Peptide Library" },
  { href: "/goals", label: "Goals Guide" },
  { href: "/compare", label: "Compare Peptides" },
  { href: "/stacks", label: "Peptide Stacks" },
];

const LEARN_LINKS = [
  { href: "/blog", label: "Peptide Science" },
  { href: "/blog/what-are-peptides", label: "What Are Peptides?" },
  { href: "/blog/bpc157-complete-guide", label: "BPC-157 Guide" },
  { href: "/blog/glp1-peptides-explained", label: "GLP-1 Peptides" },
  { href: "/blog/how-to-source-peptides-safely", label: "Sourcing Guide" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/disclaimer", label: "Medical Disclaimer" },
];

const TRUST_BADGES = ["100% Independent", "Science-Backed"];

export default function Footer() {
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-[1360px] px-6 py-12 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.35fr_1fr_1fr_1fr_1fr] md:gap-10 lg:gap-12">
          <div className="max-w-[320px]">
            <div className="mb-5">
              <PeptidePilotLogo height={32} variant="light" />
            </div>
            <p className="text-[15px] leading-8 text-primary-foreground/78">
              Independent, science-backed peptide recommendations tailored to your unique biology, goals, and lifestyle. We don't sell peptides — we analyze them.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex min-h-11 items-center rounded-full border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-[13px] font-semibold leading-tight text-cyan-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <FooterColumn title="Platform" links={PLATFORM_LINKS} />
          <FooterColumn title="Research" links={RESEARCH_LINKS} />
          <FooterColumn title="Learn" links={LEARN_LINKS} />

          <div>
            <FooterColumn title="Legal" links={LEGAL_LINKS} />
            <div className="mt-6 border-t border-white/12 pt-6">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/45">
                Contact
              </h4>
              <a
                href="mailto:hello@peptidepilot.me"
                className="text-[15px] text-primary-foreground/78 transition-colors hover:text-white"
              >
                hello@peptidepilot.me
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/12 pt-8 sm:mt-12 sm:pt-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <p className="text-xs text-primary-foreground/52">
            © {new Date().getFullYear()} PeptidePilot. All rights reserved.
            </p>
            <p className="max-w-[460px] text-xs leading-7 text-primary-foreground/48 lg:text-right">
              PeptidePilot provides educational information only. Nothing on this site constitutes medical advice, diagnosis, or treatment. All vendor links are independent third-party references — we have no financial relationship with any vendor. Always consult a qualified healthcare provider before starting any peptide protocol.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/45">
        {title}
      </h4>
      <ul className="space-y-4">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-[15px] text-primary-foreground/78 transition-colors hover:text-white"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
