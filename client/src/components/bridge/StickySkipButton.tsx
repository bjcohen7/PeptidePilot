import { trackMetaCustomEvent } from "@/lib/metaPixel";

type StickySkipButtonProps = {
  href: string;
  onClick: () => void;
  label?: string;
};

export default function StickySkipButton({ href, onClick, label = "Skip ahead — view your providers →" }: StickySkipButtonProps) {
  const handleClick = () => {
    trackMetaCustomEvent("BridgeToProviders", { ctaType: "sticky" });
    onClick();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-90 mx-auto max-w-[720px] px-4 pb-4"
      style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
    >
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className="flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-semibold text-[#0e1f1c] no-underline shadow-lg transition active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #0fb88a, #22d3ee)",
          boxShadow: "0 8px 24px rgba(15,184,138,0.45)",
        }}
      >
        {label}
      </a>
    </div>
  );
}
