// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AffiliateRecommendationSection } from "./AffiliateRecommendationSection";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    affiliates: {
      activeLinksByPeptide: {
        useQuery: vi.fn(),
      },
    },
    quiz: {
      trackAffiliateClick: {
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
      },
    },
  },
}));

import { trpc } from "@/lib/trpc";

describe("<AffiliateRecommendationSection />", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    (window as any).fbq = vi.fn();
    (trpc.quiz.trackAffiliateClick.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
    });
  });

  it("renders side-by-side cards when two partners are returned", () => {
    (trpc.affiliates.activeLinksByPeptide.useQuery as any).mockReturnValue({
      data: [
        {
          id: 1, partnerId: 1, partnerName: "Direct Meds", label: "Direct Meds",
          url: "https://a.test", sortOrder: 1, peptideId: "semaglutide",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
        {
          id: 2, partnerId: 2, partnerName: "SkinnyRX", label: "SkinnyRX",
          url: "https://b.test", sortOrder: 2, peptideId: "semaglutide",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
      ],
      isLoading: false,
    });

    render(
      <AffiliateRecommendationSection
        peptideId="semaglutide"
        peptideName="Semaglutide"
      />,
    );
    expect(screen.getByText("Direct Meds")).toBeInTheDocument();
    expect(screen.getByText("SkinnyRX")).toBeInTheDocument();
    expect(screen.getByText("RECOMMENDED")).toBeInTheDocument();
    expect(screen.getByText("Quick Assessment")).toBeInTheDocument();
  });

  it("renders only the featured card when one partner is returned", () => {
    (trpc.affiliates.activeLinksByPeptide.useQuery as any).mockReturnValue({
      data: [
        {
          id: 1, partnerId: 1, partnerName: "Limitless Life", label: "Limitless Life",
          url: "https://a.test", sortOrder: 1, peptideId: "bpc157",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
      ],
      isLoading: false,
    });

    render(
      <AffiliateRecommendationSection
        peptideId="bpc157"
        peptideName="BPC-157"
      />,
    );
    expect(screen.getByText("Limitless Life")).toBeInTheDocument();
    expect(screen.queryByText("Alternative")).not.toBeInTheDocument();
  });

  it("renders nothing when zero partners are returned and no fallback exists", () => {
    (trpc.affiliates.activeLinksByPeptide.useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { container } = render(
      <AffiliateRecommendationSection
        peptideId="nonexistent"
        peptideName="Nonexistent"
      />,
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("takes first two by sortOrder when 3+ partners are returned", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (trpc.affiliates.activeLinksByPeptide.useQuery as any).mockReturnValue({
      data: [
        {
          id: 3, partnerId: 3, partnerName: "Partner C", label: "Partner C",
          url: "https://c.test", sortOrder: 3, peptideId: "x",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
        {
          id: 1, partnerId: 1, partnerName: "Partner A", label: "Partner A",
          url: "https://a.test", sortOrder: 1, peptideId: "x",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
        {
          id: 2, partnerId: 2, partnerName: "Partner B", label: "Partner B",
          url: "https://b.test", sortOrder: 2, peptideId: "x",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
      ],
      isLoading: false,
    });

    render(
      <AffiliateRecommendationSection peptideId="x" peptideName="X" />,
    );
    expect(screen.getByText("Partner A")).toBeInTheDocument();
    expect(screen.getByText("Partner B")).toBeInTheDocument();
    expect(screen.queryByText("Partner C")).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("fires tRPC tracking and Meta Pixel on featured CTA click", () => {
    const trackMutate = vi.fn();
    (trpc.quiz.trackAffiliateClick.useMutation as any).mockReturnValue({
      mutate: trackMutate,
    });
    (trpc.affiliates.activeLinksByPeptide.useQuery as any).mockReturnValue({
      data: [
        {
          id: 1, partnerId: 1, partnerName: "Direct Meds", label: "Direct Meds",
          url: "https://a.test", sortOrder: 1, peptideId: "semaglutide",
          placement: "results-card", isGlobal: false, status: "active",
          cardHeadlineValue: null, cardHeadlineUnit: null, cardPromoText: null,
          cardCouponCode: null, cardBadge: null,
        },
      ],
      isLoading: false,
    });

    render(
      <AffiliateRecommendationSection
        peptideId="semaglutide"
        peptideName="Semaglutide"
        leadId="test-lead"
      />,
    );

    const cta = screen.getByRole("link", { name: /get started/i });
    fireEvent.click(cta);

    expect(trackMutate).toHaveBeenCalledWith({
      leadId: "test-lead",
      peptideId: "semaglutide",
      vendor: "Direct Meds",
    });
    expect((window as any).fbq).toHaveBeenCalledWith("track", "Lead", {
      content_name: "Direct Meds",
    });
    expect((window as any).fbq).toHaveBeenCalledWith(
      "trackCustom",
      "AffiliateClick",
      {
        content_name: "Direct Meds",
        slot: "featured",
        peptide_id: "semaglutide",
      },
    );
  });
});
