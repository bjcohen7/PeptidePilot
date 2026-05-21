import type { Testimonial } from "./testimonials.types";

type Props = {
  testimonial: Testimonial;
};

export function TestimonialCard({ testimonial: t }: Props) {
  return (
    <article
      aria-labelledby={`testimonial-${t.id}-name`}
      className="bg-white border border-[#e2e8e5] rounded-2xl p-[22px] flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 mb-[18px]">
        <div
          id={`testimonial-${t.id}-name`}
          className="font-serif text-[19px] leading-tight text-[#0e1f1c]"
        >
          {t.name}, {t.age}
        </div>
        <div
          aria-label={`Result: ${t.stat.amount} in ${t.stat.timeframe}`}
          className="inline-flex items-center px-[11px] py-[5px] rounded-full bg-[#e6f7f1] text-[#0a6b54] text-[11.5px] font-semibold whitespace-nowrap"
        >
          {t.stat.amount} in {t.stat.timeframe}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-[18px]">
        <BeforeAfterImage
          src={t.beforeImage.src}
          alt={t.beforeImage.alt}
        />
        <BeforeAfterImage
          src={t.afterImage.src}
          alt={t.afterImage.alt}
        />
      </div>

      <span
        aria-hidden="true"
        className="block font-serif text-[32px] leading-[0.5] text-[#5eead4] mb-3.5 mt-1"
      >
        &ldquo;
      </span>

      <p
        className="font-serif italic text-[15.5px] leading-[1.5] text-[#4a5b58] flex-1"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        {t.quote}
      </p>
    </article>
  );
}

function BeforeAfterImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="aspect-[3/4] rounded-[10px] overflow-hidden">
      <img
        src={src}
        alt={alt}
        width={800}
        height={1067}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
