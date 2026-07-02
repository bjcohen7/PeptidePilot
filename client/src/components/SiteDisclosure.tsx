// Single source of truth for the site-wide affiliate/medical disclosure.
// Used by the footer on every page. Do NOT reintroduce "no financial
// relationship with any vendor" language anywhere — it contradicts the fact
// that we earn affiliate commissions. Independence = we don't manufacture or
// sell, and ranking isn't paid placement; it does NOT mean zero commissions.

/** Canonical disclosure sentence — every footer renders exactly this. */
export const SITE_DISCLOSURE =
  "PeptidePilot is an independent matching and comparison service. We earn a commission when you start treatment through our links. Not medical advice.";

/** Extra reassurance the footer appends after the canonical sentence. */
export const SITE_DISCLOSURE_TAIL =
  "Always consult a qualified healthcare provider before starting any treatment.";

/** Line added to library/content pages that contain outbound vendor links. */
export const LIBRARY_AFFILIATE_NOTE =
  "Some links on this page may be affiliate links. If you buy through them, we may earn a commission at no extra cost to you.";

/** Footer disclosure block (single component used by the site footer). */
export function SiteDisclosure({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <p className={className} style={style}>
      {SITE_DISCLOSURE} {SITE_DISCLOSURE_TAIL}
    </p>
  );
}

/** Small, visible affiliate-link note for library pages with vendor links. */
export function LibraryAffiliateNote({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <p className={className} style={style}>
      {LIBRARY_AFFILIATE_NOTE}
    </p>
  );
}
