import { useMemo, useState } from "react";
import { Ban, Bot, ExternalLink, Link2, Plus, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { affiliatePartnerSeeds } from "../../../../shared/affiliatePartners";

type PartnerForm = {
  id?: number;
  name: string;
  category: string;
  status: "active" | "draft" | "paused";
  primaryUrl: string;
  notes: string;
};

type LinkForm = {
  id?: number;
  partnerId: string;
  label: string;
  url: string;
  placement: string;
  peptideId: string;
  isGlobal: boolean;
  sortOrder: string;
  cardHeadlineValue: string;
  cardHeadlineUnit: string;
  cardPromoText: string;
  cardCouponCode: string;
  cardBadge: string;
  status: "active" | "draft" | "paused";
};

type AssistantPreview = {
  action: "create" | "update";
  partnerName: string;
  label: string;
  url: string;
  placement: string;
  peptideId: string | null;
  isGlobal: boolean;
  sortOrder: number;
  message: string;
};

const emptyPartner: PartnerForm = {
  name: "",
  category: "Telehealth",
  status: "draft",
  primaryUrl: "",
  notes: "",
};

const emptyLink: LinkForm = {
  partnerId: "",
  label: "",
  url: "",
  placement: "results-card",
  peptideId: "",
  isGlobal: false,
  sortOrder: "100",
  cardHeadlineValue: "",
  cardHeadlineUnit: "",
  cardPromoText: "",
  cardCouponCode: "",
  cardBadge: "",
  status: "draft",
};

function inputClass() {
  return "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent";
}

function textareaClass() {
  return "min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";
}

function summarizeLinkCoverage(link: {
  cardHeadlineValue?: string | null;
  cardHeadlineUnit?: string | null;
  cardPromoText?: string | null;
  cardCouponCode?: string | null;
  cardBadge?: string | null;
}) {
  const hasPrice = Boolean(link.cardHeadlineValue?.trim());
  const hasPromo = Boolean(link.cardPromoText?.trim());
  const hasCoupon = Boolean(link.cardCouponCode?.trim());
  const hasBadge = Boolean(link.cardBadge?.trim());
  const isOfferReady = hasPrice && hasBadge;

  let statusLabel = "Needs pricing";
  let statusClass = "bg-amber-50 text-amber-800 border-amber-200";

  if (isOfferReady) {
    statusLabel = hasCoupon || hasPromo ? "Offer ready" : "Needs promo";
    statusClass =
      hasCoupon || hasPromo
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : "bg-sky-50 text-sky-800 border-sky-200";
  } else if (hasPrice) {
    statusLabel = "Needs badge";
    statusClass = "bg-sky-50 text-sky-800 border-sky-200";
  }

  return {
    hasPrice,
    hasPromo,
    hasCoupon,
    hasBadge,
    isOfferReady: isOfferReady && (hasPromo || hasCoupon),
    statusLabel,
    statusClass,
  };
}

export default function AffiliatePartnersAdmin() {
  const utils = trpc.useUtils();
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(emptyPartner);
  const [linkForm, setLinkForm] = useState<LinkForm>(emptyLink);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantPreview, setAssistantPreview] = useState<AssistantPreview | null>(null);
  const [testResult, setTestResult] = useState<string>("");

  const partners = trpc.affiliates.listPartners.useQuery(undefined, { retry: false });
  const links = trpc.affiliates.listLinks.useQuery(undefined, { retry: false });
  const auditEvents = trpc.affiliates.listAuditEvents.useQuery(undefined, { retry: false });
  const createPartner = trpc.affiliates.createPartner.useMutation({
    onSuccess: async () => {
      toast.success("Partner created.");
      setPartnerForm(emptyPartner);
      await utils.affiliates.listPartners.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updatePartner = trpc.affiliates.updatePartner.useMutation({
    onSuccess: async () => {
      toast.success("Partner updated.");
      setPartnerForm(emptyPartner);
      await utils.affiliates.listPartners.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setPartnerStatus = trpc.affiliates.setPartnerStatus.useMutation({
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.status === "paused"
          ? "Partner deactivated."
          : `Partner marked ${variables.status}.`,
      );
      await Promise.all([
        utils.affiliates.listPartners.invalidate(),
        utils.affiliates.listLinks.invalidate(),
        utils.affiliates.listAuditEvents.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const createLink = trpc.affiliates.createLink.useMutation({
    onSuccess: async () => {
      toast.success("Affiliate link created.");
      setLinkForm(emptyLink);
      await utils.affiliates.listLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateLink = trpc.affiliates.updateLink.useMutation({
    onSuccess: async () => {
      toast.success("Affiliate link updated.");
      setLinkForm(emptyLink);
      await utils.affiliates.listLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setLinkStatus = trpc.affiliates.setLinkStatus.useMutation({
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.status === "paused"
          ? "Tracked link deactivated."
          : `Tracked link marked ${variables.status}.`,
      );
      await Promise.all([
        utils.affiliates.listLinks.invalidate(),
        utils.affiliates.listAuditEvents.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const testLink = trpc.affiliates.testLink.useMutation({
    onSuccess: (result) => {
      const label = result.ok ? "OK" : "Failed";
      setTestResult(`${label}: ${result.status} ${result.finalUrl}`);
      toast[result.ok ? "success" : "error"](`${label}: ${result.status}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const previewAssistant = trpc.affiliates.previewAssistantCommand.useMutation({
    onSuccess: (result) => setAssistantPreview(result as AssistantPreview),
    onError: (error) => toast.error(error.message),
  });
  const assistant = trpc.affiliates.runAssistantCommand.useMutation({
    onSuccess: async (result) => {
      toast.success(result.message);
      setAssistantPrompt("");
      setAssistantPreview(null);
      await Promise.all([
        utils.affiliates.listPartners.invalidate(),
        utils.affiliates.listLinks.invalidate(),
        utils.affiliates.listAuditEvents.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const rows = partners.data?.length ? partners.data : affiliatePartnerSeeds;
  const linkRows = links.data ?? [];
  const numericPartners = useMemo(
    () => rows.filter((partner): partner is Extract<typeof partner, { id: number }> => typeof partner.id === "number"),
    [rows]
  );
  const linkCoverage = useMemo(
    () => linkRows.map((link) => ({ linkId: link.id, ...summarizeLinkCoverage(link) })),
    [linkRows],
  );
  const coverageByLinkId = useMemo(
    () => new Map(linkCoverage.map((entry) => [entry.linkId, entry])),
    [linkCoverage],
  );
  const partnerCoverage = useMemo(() => {
    return new Map(
      rows
        .filter((partner): partner is Extract<typeof partner, { id: number }> => typeof partner.id === "number")
        .map((partner) => {
          const partnerLinks = linkRows.filter((link) => link.partnerId === partner.id);
          const offerReadyCount = partnerLinks.filter(
            (link) => coverageByLinkId.get(link.id)?.isOfferReady,
          ).length;
          const couponCount = partnerLinks.filter(
            (link) => coverageByLinkId.get(link.id)?.hasCoupon,
          ).length;
          const missingPricingCount = partnerLinks.filter(
            (link) => !coverageByLinkId.get(link.id)?.hasPrice,
          ).length;

          return [
            partner.id,
            {
              totalLinks: partnerLinks.length,
              offerReadyCount,
              couponCount,
              missingPricingCount,
            },
          ] as const;
        }),
    );
  }, [rows, linkRows, coverageByLinkId]);
  const activeLinksCount = useMemo(
    () => linkRows.filter((link) => link.status === "active").length,
    [linkRows],
  );
  const offerReadyCount = useMemo(
    () => linkCoverage.filter((entry) => entry.isOfferReady).length,
    [linkCoverage],
  );
  const needsPricingCount = useMemo(
    () => linkCoverage.filter((entry) => !entry.hasPrice).length,
    [linkCoverage],
  );
  const couponsLiveCount = useMemo(
    () => linkCoverage.filter((entry) => entry.hasCoupon).length,
    [linkCoverage],
  );
  const promosLiveCount = useMemo(
    () => linkCoverage.filter((entry) => entry.hasPromo).length,
    [linkCoverage],
  );

  const savePartner = (event: React.FormEvent) => {
    event.preventDefault();
    if (partnerForm.id) {
      updatePartner.mutate({ ...partnerForm, id: partnerForm.id });
      return;
    }
    createPartner.mutate(partnerForm);
  };

  const saveLink = (event: React.FormEvent) => {
    event.preventDefault();
    const partnerId = Number(linkForm.partnerId);
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      toast.error("Choose a migrated database partner before adding a link.");
      return;
    }

    const payload = {
      partnerId,
      label: linkForm.label,
      url: linkForm.url,
      placement: linkForm.placement,
      peptideId: linkForm.peptideId || null,
      isGlobal: linkForm.isGlobal,
      sortOrder: Number(linkForm.sortOrder) || 100,
      cardHeadlineValue: linkForm.cardHeadlineValue || null,
      cardHeadlineUnit: linkForm.cardHeadlineUnit || null,
      cardPromoText: linkForm.cardPromoText || null,
      cardCouponCode: linkForm.cardCouponCode || null,
      cardBadge: linkForm.cardBadge || null,
      status: linkForm.status,
    };

    if (linkForm.id) {
      updateLink.mutate({ ...payload, id: linkForm.id });
      return;
    }

    createLink.mutate(payload);
  };

  const runAssistant = (event: React.FormEvent) => {
    event.preventDefault();
    previewAssistant.mutate({ command: assistantPrompt });
  };

  const editLink = (link: (typeof linkRows)[number]) => {
    setLinkForm({
      id: link.id,
      partnerId: String(link.partnerId),
      label: link.label,
      url: link.url,
      placement: link.placement,
      peptideId: link.peptideId ?? "",
      isGlobal: link.isGlobal,
      sortOrder: String(link.sortOrder),
      cardHeadlineValue: link.cardHeadlineValue ?? "",
      cardHeadlineUnit: link.cardHeadlineUnit ?? "",
      cardPromoText: link.cardPromoText ?? "",
      cardCouponCode: link.cardCouponCode ?? "",
      cardBadge: link.cardBadge ?? "",
      status: link.status,
    });
  };

  const editPartner = (partner: (typeof rows)[number]) => {
    if (typeof partner.id !== "number") return;
    setPartnerForm({
      id: partner.id,
      name: partner.name,
      category: partner.category,
      status: partner.status,
      primaryUrl: partner.primaryUrl,
      notes: partner.notes ?? "",
    });
  };

  const togglePartnerStatus = (partner: (typeof rows)[number]) => {
    if (typeof partner.id !== "number") return;
    const nextStatus = partner.status === "paused" ? "active" : "paused";
    const confirmed = window.confirm(
      nextStatus === "paused"
        ? `Deactivate ${partner.name}? This will also pause all tracked links for this partner.`
        : `Reactivate ${partner.name}?`,
    );
    if (!confirmed) return;
    setPartnerStatus.mutate({ id: partner.id, status: nextStatus });
  };

  const toggleLinkStatus = (link: (typeof linkRows)[number]) => {
    const nextStatus = link.status === "paused" ? "active" : "paused";
    const confirmed = window.confirm(
      nextStatus === "paused"
        ? `Deactivate the tracked link "${link.label}"?`
        : `Reactivate the tracked link "${link.label}"?`,
    );
    if (!confirmed) return;
    setLinkStatus.mutate({ id: link.id, status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Affiliate workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Partners & Links</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Add partners, manage tracked URLs, and test links before they go live in the quiz results flow.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="bg-brand-gradient text-white hover:opacity-90" onClick={() => setPartnerForm(emptyPartner)}>
            <Plus className="w-4 h-4 mr-2" />
            New Partner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          { label: "Partners", value: rows.length.toString() },
          { label: "Active links", value: activeLinksCount.toString() },
          { label: "Offer ready", value: offerReadyCount.toString() },
          { label: "Needs pricing", value: needsPricingCount.toString() },
          { label: "Promos live", value: promosLiveCount.toString() },
          { label: "Coupons live", value: couponsLiveCount.toString() },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-white p-5">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-3xl font-semibold mt-2">{metric.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={runAssistant} className="rounded-xl border border-accent/30 bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Tell the assistant what affiliate change to make. It can add links, scope them to a peptide, set global placement, assign priority, and update matching records instead of duplicating them.
            </p>
          </div>
        </div>
        <textarea
          className={textareaClass()}
          placeholder={'Example: Add https://partner.com/glp1 for semaglutide and make it ordered #1'}
          value={assistantPrompt}
          onChange={(event) => setAssistantPrompt(event.target.value)}
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Supports phrases like “global”, “always”, “for BPC-157”, “for semaglutide”, and “#1”.
          </p>
          <Button type="submit" disabled={previewAssistant.isPending} className="bg-brand-gradient text-white hover:opacity-90">
            <Bot className="w-4 h-4 mr-2" />
            Preview Command
          </Button>
        </div>
        {assistantPreview && (
          <div className="rounded-lg border border-accent/30 bg-secondary/50 p-4">
            <h3 className="font-semibold text-foreground mb-2">Confirm change</h3>
            <p className="text-sm text-muted-foreground mb-3">{assistantPreview.message}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
              <div>Action: {assistantPreview.action === "create" ? "Create new link" : "Update existing link"}</div>
              <div>Partner: {assistantPreview.partnerName}</div>
              <div>Label: {assistantPreview.label}</div>
              <div>Scope: {assistantPreview.isGlobal ? "Global" : assistantPreview.peptideId || "Unscoped"}</div>
              <div>Order: #{assistantPreview.sortOrder}</div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => assistant.mutate({ command: assistantPrompt })} disabled={assistant.isPending}>
                Confirm & Apply
              </Button>
              <Button type="button" variant="outline" onClick={() => setAssistantPreview(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={savePartner} className="rounded-xl border border-border bg-white p-5 space-y-4">
          <div>
            <h2 className="font-semibold">{partnerForm.id ? "Edit partner" : "Add partner"}</h2>
            <p className="text-sm text-muted-foreground">Use draft until URLs and placements are tested.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputClass()} placeholder="Partner name" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
            <input className={inputClass()} placeholder="Category" value={partnerForm.category} onChange={(e) => setPartnerForm({ ...partnerForm, category: e.target.value })} required />
            <select className={inputClass()} value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as PartnerForm["status"] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <input className={inputClass()} placeholder="Primary URL" value={partnerForm.primaryUrl} onChange={(e) => setPartnerForm({ ...partnerForm, primaryUrl: e.target.value })} required />
          </div>
          <textarea className={textareaClass()} placeholder="Notes" value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" disabled={createPartner.isPending || updatePartner.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Partner
            </Button>
            <Button type="button" variant="outline" onClick={() => partnerForm.primaryUrl && testLink.mutate({ url: partnerForm.primaryUrl })}>
              <Link2 className="w-4 h-4 mr-2" />
              Test URL
            </Button>
          </div>
          {testResult && <p className="text-sm text-muted-foreground">{testResult}</p>}
        </form>

        <form onSubmit={saveLink} className="rounded-xl border border-border bg-white p-5 space-y-4">
          <div>
            <h2 className="font-semibold">{linkForm.id ? "Edit tracked link" : "Add tracked link"}</h2>
            <p className="text-sm text-muted-foreground">Map partner URLs to result cards, PSEO pages, and future placements. Only active managed links appear on the results page.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={inputClass()} value={linkForm.partnerId} onChange={(e) => setLinkForm({ ...linkForm, partnerId: e.target.value })} required>
              <option value="">Choose partner</option>
              {numericPartners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name}</option>
              ))}
            </select>
            <input className={inputClass()} placeholder="Button label" value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} required />
            <input className={inputClass()} placeholder="Tracked URL" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} required />
            <select className={inputClass()} value={linkForm.placement} onChange={(e) => setLinkForm({ ...linkForm, placement: e.target.value })} required>
              <option value="results-card">results-card</option>
              <option value="pseo-page">pseo-page</option>
            </select>
            <input className={inputClass()} placeholder={linkForm.isGlobal ? "Leave blank for global links" : "Peptide ID or slug, e.g. semaglutide or ghk-cu"} value={linkForm.peptideId} onChange={(e) => setLinkForm({ ...linkForm, peptideId: e.target.value })} disabled={linkForm.isGlobal} />
            <input className={inputClass()} placeholder="Sort order, e.g. 1" value={linkForm.sortOrder} onChange={(e) => setLinkForm({ ...linkForm, sortOrder: e.target.value })} />
            <select className={inputClass()} value={linkForm.status} onChange={(e) => setLinkForm({ ...linkForm, status: e.target.value as LinkForm["status"] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/30 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Results card display</h3>
              <p className="text-xs text-muted-foreground mt-1">
                These fields control the live price/promo surface on the results cards. Leave blank to fall back to the shared default metadata.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className={inputClass()}
                placeholder='Headline value, e.g. "$179"'
                value={linkForm.cardHeadlineValue}
                onChange={(e) => setLinkForm({ ...linkForm, cardHeadlineValue: e.target.value })}
              />
              <input
                className={inputClass()}
                placeholder='Headline unit, e.g. "first month"'
                value={linkForm.cardHeadlineUnit}
                onChange={(e) => setLinkForm({ ...linkForm, cardHeadlineUnit: e.target.value })}
              />
              <input
                className={inputClass()}
                placeholder='Promo text, e.g. "Refills locked at $299"'
                value={linkForm.cardPromoText}
                onChange={(e) => setLinkForm({ ...linkForm, cardPromoText: e.target.value })}
              />
              <input
                className={inputClass()}
                placeholder='Coupon code, e.g. "PEPTIDEPILOT10"'
                value={linkForm.cardCouponCode}
                onChange={(e) => setLinkForm({ ...linkForm, cardCouponCode: e.target.value })}
              />
              <input
                className={inputClass()}
                placeholder='Card badge, e.g. "Lowest Price"'
                value={linkForm.cardBadge}
                onChange={(e) => setLinkForm({ ...linkForm, cardBadge: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={linkForm.isGlobal}
              onChange={(event) => setLinkForm({ ...linkForm, isGlobal: event.target.checked, peptideId: event.target.checked ? "" : linkForm.peptideId })}
            />
            Make this link global across result cards
          </label>
          <p className="text-xs text-muted-foreground">
            Use a peptide ID for targeted links. Use global only when the same destination should appear for every result card in that placement.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={createLink.isPending || updateLink.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Link
            </Button>
            <Button type="button" variant="outline" onClick={() => linkForm.url && testLink.mutate({ url: linkForm.url })}>
              <Link2 className="w-4 h-4 mr-2" />
              Test URL
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Partner directory</h2>
            <p className="text-sm text-muted-foreground">
              Database-backed partners live here. Seed rows only appear when no production partner records have been created yet.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => partners.refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="divide-y divide-border">
          {rows.map((partner) => (
            <div key={partner.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">{partner.name}</h3>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{partner.status}</span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{partner.category}</span>
                  {typeof partner.id === "number" && partnerCoverage.get(partner.id)?.offerReadyCount ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      {partnerCoverage.get(partner.id)?.offerReadyCount} offer-ready
                    </span>
                  ) : null}
                  {typeof partner.id === "number" && partnerCoverage.get(partner.id)?.couponCount ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
                      {partnerCoverage.get(partner.id)?.couponCount} coupon live
                    </span>
                  ) : null}
                  {typeof partner.id === "number" && partnerCoverage.get(partner.id)?.missingPricingCount ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {partnerCoverage.get(partner.id)?.missingPricingCount} need pricing
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{partner.notes || "No notes yet."}</p>
                {typeof partner.id === "number" && partnerCoverage.get(partner.id)?.totalLinks ? (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {partnerCoverage.get(partner.id)?.totalLinks} tracked link
                    {partnerCoverage.get(partner.id)?.totalLinks === 1 ? "" : "s"} · {partnerCoverage.get(partner.id)?.offerReadyCount ?? 0} ready · {partnerCoverage.get(partner.id)?.missingPricingCount ?? 0} still missing pricing
                  </p>
                ) : null}
                <a href={partner.primaryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  {partner.primaryUrl}
                </a>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={typeof partner.id !== "number"}
                  onClick={() => editPartner(partner)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={typeof partner.id !== "number" || setPartnerStatus.isPending}
                  onClick={() => togglePartnerStatus(partner)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {partner.status === "paused" ? "Reactivate" : "Deactivate"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => testLink.mutate({ url: partner.primaryUrl })}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Test
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Tracked links</h2>
            <p className="text-sm text-muted-foreground">
              Active links are sorted by order on result cards. Enter price first, then badge, then promo/coupon so the card is fully merchandised.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => links.refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        {linkRows.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No tracked links yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {linkRows.map((link) => (
              <div key={link.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                <div>
                  {(() => {
                    const coverage = coverageByLinkId.get(link.id);
                    return coverage ? (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${coverage.statusClass}`}>
                          {coverage.statusLabel}
                        </span>
                        {coverage.hasPrice ? (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                            Price entered
                          </span>
                        ) : null}
                        {coverage.hasBadge ? (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                            Ribbon ready
                          </span>
                        ) : null}
                        {coverage.hasPromo ? (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                            Promo text live
                          </span>
                        ) : null}
                        {coverage.hasCoupon ? (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                            Coupon live
                          </span>
                        ) : null}
                      </div>
                    ) : null;
                  })()}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{link.label}</h3>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {link.partnerName}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      #{link.sortOrder}
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {link.isGlobal ? "Global" : link.peptideId || "Unscoped"}
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {link.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Placement: {link.placement}
                  </p>
                  {(link.cardHeadlineValue || link.cardPromoText || link.cardCouponCode || link.cardBadge) ? (
                    <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {link.cardBadge ? (
                        <span className="rounded-full border border-border px-2.5 py-1">
                          Badge: {link.cardBadge}
                        </span>
                      ) : null}
                      {link.cardHeadlineValue || link.cardHeadlineUnit ? (
                        <span className="rounded-full border border-border px-2.5 py-1">
                          Price: {[link.cardHeadlineValue, link.cardHeadlineUnit].filter(Boolean).join(" ")}
                        </span>
                      ) : null}
                      {link.cardPromoText ? (
                        <span className="rounded-full border border-border px-2.5 py-1">
                          Promo: {link.cardPromoText}
                        </span>
                      ) : null}
                      {link.cardCouponCode ? (
                        <span className="rounded-full border border-border px-2.5 py-1">
                          Code: {link.cardCouponCode}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
                    <ExternalLink className="w-4 h-4" />
                    {link.url}
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => editLink(link)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={setLinkStatus.isPending}
                    onClick={() => toggleLinkStatus(link)}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {link.status === "paused" ? "Reactivate" : "Deactivate"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testLink.mutate({ url: link.url })}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Audit history</h2>
          <p className="text-sm text-muted-foreground">Recent affiliate changes, including assistant actions.</p>
        </div>
        {(auditEvents.data ?? []).length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No audit events yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {(auditEvents.data ?? []).slice(-10).reverse().map((event) => (
              <div key={event.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {event.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{event.summary}</p>
                <p className="text-xs text-muted-foreground mt-1">{event.actorEmail || event.actorOpenId || "Unknown actor"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
