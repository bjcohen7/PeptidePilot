import { Link } from "wouter";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";

function LegalLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const path =
    title === "Privacy Policy"
      ? "/privacy"
      : title === "Terms of Service"
        ? "/terms"
        : "/disclaimer";
  const description =
    title === "Privacy Policy"
      ? "Read how PeptidePilot collects, uses, stores, and shares quiz and lead data."
      : title === "Terms of Service"
        ? "Review the terms that govern use of the PeptidePilot platform and educational content."
        : "Understand the medical and regulatory limitations of PeptidePilot's educational peptide content.";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={title}
        description={description}
        path={path}
        type="website"
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: title, path },
        ])}
      />
      <section className="bg-brand-gradient text-white py-14">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-normal mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {title}
          </h1>
          <p className="text-white/70">{subtitle}</p>
        </div>
      </section>
      <section className="py-14">
        <div className="container max-w-3xl prose prose-slate max-w-none">
          {children}
        </div>
      </section>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Last updated: January 2025">
      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>1. Information We Collect</h2>
          <p>When you complete the PeptideMatch quiz and submit your email address, we collect: your email address, your quiz responses (stored as an array of answer indices), your IP address for compliance purposes, and the timestamp of your consent. We also collect anonymous usage analytics through our analytics provider.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>2. How We Use Your Information</h2>
          <p>Your information is used to: generate your personalized peptide recommendations, deliver your results and protocol guide via email, send educational content about peptide science (if you opt in), and connect you with relevant healthcare partners (only with your explicit consent).</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>3. Data Sharing with Healthcare Partners</h2>
          <p className="font-medium text-foreground">This section is important. By checking the consent box on our results page, you explicitly agree that PeptideMatch may share your profile data — including your email address, age range, primary health goal, budget range, and top peptide match — with our vetted healthcare partners. These partners include telehealth clinics and hormone optimization practices that may contact you about services relevant to your health profile.</p>
          <p className="mt-3">We only share data with partners when you have explicitly checked the consent checkbox. Pre-checked boxes are never used. You may withdraw consent at any time by contacting us.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>4. Data Retention</h2>
          <p>We retain your lead data for up to 24 months. You may request deletion of your data at any time by emailing privacy@peptidematch.com.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>5. Cookies and Analytics</h2>
          <p>We use minimal, privacy-respecting analytics to understand how users interact with our platform. We do not use third-party advertising cookies or tracking pixels.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>6. Contact</h2>
          <p>For privacy-related inquiries, contact us at privacy@peptidematch.com.</p>
        </div>
      </div>
    </LegalLayout>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" subtitle="Last updated: January 2025">
      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>1. Acceptance of Terms</h2>
          <p>By accessing or using PeptideMatch, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>2. Educational Purpose Only</h2>
          <p>PeptideMatch is an educational platform. All content, quiz results, and recommendations are provided for informational purposes only and do not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before beginning any peptide protocol.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>3. No Warranty</h2>
          <p>PeptideMatch provides its services "as is" without warranty of any kind. We do not guarantee the accuracy, completeness, or suitability of any recommendation for your specific circumstances.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>4. Affiliate Relationships</h2>
          <p>PeptideMatch may earn affiliate commissions when you click vendor links from your results page. These relationships are disclosed and do not influence our recommendations. We list multiple vendors for every peptide to ensure you have choice.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>5. Healthcare Partner Referrals</h2>
          <p>When you provide explicit consent, PeptideMatch may share your profile with vetted healthcare partners. PeptideMatch is not responsible for the services, advice, or outcomes provided by these third-party partners.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, PeptideMatch shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform or any peptide protocol you undertake.</p>
        </div>
      </div>
    </LegalLayout>
  );
}

export function MedicalDisclaimer() {
  return (
    <LegalLayout title="Medical Disclaimer" subtitle="Please read this carefully before using PeptideMatch">
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-amber-900 font-medium text-sm">
            The information provided by PeptideMatch is for educational and informational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
        <p>PeptideMatch is an independent educational platform. We analyze publicly available research on peptide compounds and use a scoring algorithm to match your self-reported health profile to compounds that may be relevant to your goals. This is not a medical assessment.</p>
        <p>Peptide compounds vary significantly in their regulatory status across different jurisdictions. Many of the compounds discussed on this platform are research chemicals, not approved pharmaceutical products. Their use outside of a clinical setting may carry legal and health risks.</p>
        <p>Before beginning any peptide protocol, you should: consult a licensed physician or healthcare provider, disclose all current medications and supplements, undergo appropriate baseline testing, and obtain compounds only from reputable, third-party tested sources.</p>
        <p>PeptideMatch does not endorse self-administration of injectable compounds without proper medical supervision. We strongly encourage all users to work with a qualified healthcare provider, particularly for injectable peptides, hormonal compounds, or protocols involving multiple compounds.</p>
        <p>The quiz results and recommendations generated by PeptideMatch are based on self-reported data and a proprietary scoring algorithm. They are not diagnostic tools and should not be used to diagnose, treat, cure, or prevent any disease or medical condition.</p>
        <div className="pt-4 border-t border-border/40">
          <p className="text-sm">If you have questions about your health, please consult a qualified healthcare professional. In case of a medical emergency, contact emergency services immediately.</p>
        </div>
      </div>
    </LegalLayout>
  );
}
