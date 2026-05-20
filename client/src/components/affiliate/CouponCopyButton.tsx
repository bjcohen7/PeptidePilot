import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  code: string;
  className?: string;
};

export function CouponCopyButton({ code, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[CouponCopyButton] Clipboard write failed:", err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? "Coupon code copied" : `Copy coupon code ${code}`}
      className={className}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
