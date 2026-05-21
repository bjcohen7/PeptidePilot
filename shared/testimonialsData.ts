import type { Testimonial } from "../client/src/components/testimonials/testimonials.types";

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "elena-41",
    name: "Elena",
    age: 41,
    stat: { amount: "48 lbs", timeframe: "6 months" },
    quote:
      "After turning 40, my metabolism basically packed its bags and left. Hot flashes, weight gain around my middle, and zero energy to keep up with my teenagers. This was my last resort after trying literally everything else.",
    beforeImage: {
      src: "/testimonials/elena-before.jpg",
      alt: "Elena before starting her peptide protocol",
    },
    afterImage: {
      src: "/testimonials/elena-after.jpg",
      alt: "Elena after 6 months on her peptide protocol",
    },
  },
  {
    id: "michael-48",
    name: "Michael",
    age: 48,
    stat: { amount: "63 lbs", timeframe: "7 months" },
    quote:
      "Being the 'funny fat guy' stopped being funny when I couldn't play with my grandkids without getting winded. Decades of business dinners and stress eating had taken their toll. The first thing that actually worked with my unpredictable schedule.",
    beforeImage: {
      src: "/testimonials/michael-before.jpg",
      alt: "Michael before starting his peptide protocol",
    },
    afterImage: {
      src: "/testimonials/michael-after.jpg",
      alt: "Michael after 7 months on his peptide protocol",
    },
  },
  {
    id: "olivia-26",
    name: "Olivia",
    age: 26,
    stat: { amount: "32 lbs", timeframe: "3.5 months" },
    quote:
      "As a grad student living on ramen and coffee, my health had completely tanked. I was barely sleeping, constantly bloated, and had zero energy for anything beyond Netflix. It fit into my broke student lifestyle because it actually worked — no expensive gym memberships or meal prep services needed.",
    beforeImage: {
      src: "/testimonials/olivia-before.jpg",
      alt: "Olivia before starting her peptide protocol",
    },
    afterImage: {
      src: "/testimonials/olivia-after.jpg",
      alt: "Olivia after 3.5 months on her peptide protocol",
    },
  },
];
