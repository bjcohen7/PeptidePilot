// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TestimonialSection } from "./TestimonialSection";

vi.mock("@shared/testimonialsData", () => ({
  TESTIMONIALS: [
    {
      id: "t1",
      name: "A",
      age: 30,
      stat: { amount: "10 lbs", timeframe: "1 mo" },
      quote: "q1",
      beforeImage: { src: "/a-b.jpg", alt: "A before" },
      afterImage: { src: "/a-a.jpg", alt: "A after" },
    },
    {
      id: "t2",
      name: "B",
      age: 40,
      stat: { amount: "20 lbs", timeframe: "2 mo" },
      quote: "q2",
      beforeImage: { src: "/b-b.jpg", alt: "B before" },
      afterImage: { src: "/b-a.jpg", alt: "B after" },
    },
    {
      id: "t3",
      name: "C",
      age: 50,
      stat: { amount: "30 lbs", timeframe: "3 mo" },
      quote: "q3",
      beforeImage: { src: "/c-b.jpg", alt: "C before" },
      afterImage: { src: "/c-a.jpg", alt: "C after" },
    },
  ],
}));

describe("<TestimonialSection />", () => {
  beforeEach(cleanup);

  it("renders the headline and eyebrow", () => {
    render(<TestimonialSection />);
    expect(screen.getByText("Real Transformations")).toBeInTheDocument();
    expect(screen.getByText("Real people, real results")).toBeInTheDocument();
  });

  it("renders all three testimonials", () => {
    render(<TestimonialSection />);
    expect(screen.getByText("A, 30")).toBeInTheDocument();
    expect(screen.getByText("B, 40")).toBeInTheDocument();
    expect(screen.getByText("C, 50")).toBeInTheDocument();
  });

  it("renders the FTC disclaimer text", () => {
    render(<TestimonialSection />);
    expect(screen.getByText(/Individual results vary/i)).toBeInTheDocument();
    expect(screen.getByText(/Not medical advice/i)).toBeInTheDocument();
  });

  it("renders the partner-network attribution", () => {
    render(<TestimonialSection />);
    expect(
      screen.getByText(
        /provided with permission by our partner network/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses heading hierarchy correctly", () => {
    render(<TestimonialSection />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Real people, real results");
  });
});
