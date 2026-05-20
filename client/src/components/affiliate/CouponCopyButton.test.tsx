// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CouponCopyButton } from "./CouponCopyButton";

describe("<CouponCopyButton />", () => {
  beforeEach(() => {
    vi.useRealTimers();
    cleanup();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes code to clipboard on click", async () => {
    render(<CouponCopyButton code="PILOT25" />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("PILOT25");
  });

  it("shows copied state and reverts after 1500ms", async () => {
    vi.useFakeTimers();
    render(<CouponCopyButton code="PILOT25" />);
    const button = screen.getByRole("button");

    expect(button.getAttribute("aria-label")).toMatch(/Copy coupon code/);

    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(button.getAttribute("aria-label")).toBe("Coupon code copied");
    }, { timeout: 1000 });

    vi.advanceTimersByTime(1500);

    await vi.waitFor(() => {
      expect(button.getAttribute("aria-label")).toMatch(/Copy coupon code/);
    }, { timeout: 1000 });
  });

  it("stops event propagation", () => {
    const parentClick = vi.fn();
    render(
      <a href="#" onClick={parentClick}>
        <CouponCopyButton code="PILOT25" />
      </a>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("handles clipboard rejection without throwing", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<CouponCopyButton code="PILOT25" />);

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
    warnSpy.mockRestore();
  });
});
