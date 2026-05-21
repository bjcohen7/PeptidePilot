import { TESTIMONIALS } from "@shared/testimonialsData";
import { TestimonialCard } from "./TestimonialCard";

export function TestimonialSection() {
  const testimonials = TESTIMONIALS.slice(0, 3);

  if (process.env.NODE_ENV !== "production" && TESTIMONIALS.length > 3) {
    console.warn(
      `[TestimonialSection] ${TESTIMONIALS.length} testimonials defined; only first 3 rendered.`,
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="w-full py-14 sm:py-14 px-6 bg-[#f6f8f7] rounded-2xl"
    >
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-9">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a6b54] mb-2.5">
            Real Transformations
          </div>
          <h2
            id="testimonials-heading"
            className="font-serif text-[28px] sm:text-[32px] leading-tight text-[#0e1f1c] mb-2.5 tracking-tight"
          >
            Real people, real results
          </h2>
          <p className="text-[14px] sm:text-[14.5px] text-[#4a5b58] max-w-[560px] mx-auto leading-relaxed">
            Transformations from members of our partner network who started with
            a personalized peptide protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-[18px]">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>

        <p
          role="contentinfo"
          className="text-center text-[11.5px] text-[#8a939b] leading-relaxed max-w-[720px] mx-auto mt-8 px-5"
        >
          Testimonials and photos provided with permission by our partner
          network. Individual results vary. Not medical advice — consult a
          qualified provider before starting any peptide protocol.
        </p>
      </div>
    </section>
  );
}
