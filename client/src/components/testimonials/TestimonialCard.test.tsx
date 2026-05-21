// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TestimonialCard } from "./TestimonialCard";

const mockTestimonial = {
  id: "test-1",
  name: "Test User",
  age: 35,
  stat: { amount: "40 lbs", timeframe: "5 months" },
  quote: "This worked when nothing else did.",
  beforeImage: { src: "/test-before.jpg", alt: "Test before" },
  afterImage: { src: "/test-after.jpg", alt: "Test after" },
};

describe("<TestimonialCard />", () => {
  beforeEach(cleanup);

  it("renders name with age", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(screen.getByText("Test User, 35")).toBeInTheDocument();
  });

  it("renders the stat pill with proper aria-label", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    const pill = screen.getByLabelText("Result: 40 lbs in 5 months");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent("40 lbs in 5 months");
  });

  it("renders both images with alt text", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(screen.getByAltText("Test before")).toBeInTheDocument();
    expect(screen.getByAltText("Test after")).toBeInTheDocument();
  });

  it("renders the quote text", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(
      screen.getByText("This worked when nothing else did."),
    ).toBeInTheDocument();
  });

  it("renders the before image without a grey overlay label", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(screen.getByAltText("Test before")).toBeInTheDocument();
    expect(screen.queryByText("Before")).not.toBeInTheDocument();
  });

  it("lazy-loads images", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    const beforeImg = screen.getByAltText("Test before");
    expect(beforeImg).toHaveAttribute("loading", "lazy");
    expect(beforeImg).toHaveAttribute("decoding", "async");
  });
});
