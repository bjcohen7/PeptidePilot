import type { Testimonial } from "../client/src/components/testimonials/testimonials.types";

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "jasmine-24",
    name: "Jasmine",
    age: 24,
    stat: { amount: "27 lbs", timeframe: "3 months" },
    quote:
      "Working long hours and constant travel made it hard to prioritize my health. The treatments and support helped me manage stress, control cravings, and stay on track. I feel stronger, more focused, and proud of the progress I\u2019ve made.",
    beforeImage: {
      src: "/testimonials/jasmine-before.jpg",
      alt: "Jasmine before starting her peptide protocol",
    },
    afterImage: {
      src: "/testimonials/jasmine-after.jpg",
      alt: "Jasmine after 3 months on her peptide protocol",
    },
  },
  {
    id: "marcus-39",
    name: "Marcus",
    age: 39,
    stat: { amount: "51 lbs", timeframe: "5.5 months" },
    quote:
      "After my divorce, I felt like I had lost control of my health and my life. With the right support and personalized therapies, I finally started seeing real changes. I have more energy, sleep better, and feel confident in my body again.",
    beforeImage: {
      src: "/testimonials/marcus-before.jpg",
      alt: "Marcus before starting his peptide protocol",
    },
    afterImage: {
      src: "/testimonials/marcus-after.jpg",
      alt: "Marcus after 5.5 months on his peptide protocol",
    },
  },
  {
    id: "mia-29",
    name: "Mia",
    age: 29,
    stat: { amount: "33 lbs", timeframe: "4 months" },
    quote:
      "I used to feel constantly bloated, exhausted, and anxious about how I looked. The therapies and guidance I received helped me build healthier habits and stay consistent. I\u2019m wearing clothes I love and finally feel like myself again.",
    beforeImage: {
      src: "/testimonials/mia-before.jpg",
      alt: "Mia before starting her peptide protocol",
    },
    afterImage: {
      src: "/testimonials/mia-after.jpg",
      alt: "Mia after 4 months on her peptide protocol",
    },
  },
];
