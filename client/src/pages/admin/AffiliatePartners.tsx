import { useMemo, useState } from "react";
import { Bot, ExternalLink, Link2, Plus, RefreshCw, Save } from "lucide-react";
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
  status: "draft",
};

function inputClass() {
  return "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent";
}

function textareaClass() {
  return "min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";
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
  const seedLegacyLinks = trpc.affiliates.seedLegacyLinks.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.createdLinks > 0
          ? `Seeded ${result.createdLinks} links across ${result.createdPartners} partners.`
          : "Legacy links were already seeded."
      );
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
  const showSeedBanner = linkRows.length === 0;
  const numericPartners = useMemo(
    () => rows.filter((partner): partner is Extract<typeof partner, { id: number }> => typeof partner.id === "number"),
    [rows]
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
          <Button
            variant="outline"
            onClick={() => seedLegacyLinks.mutate()}
            disabled={seedLegacyLinks.isPending}
          >
            {seedLegacyLinks.isPending ? "Seeding..." : "Seed Legacy Links"}
          </Button>
          <Button className="bg-brand-gradient text-white hover:opacity-90" onClick={() => setPartnerForm(emptyPartner)}>
            <Plus className="w-4 h-4 mr-2" />
            New Partner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Partners", value: rows.length.toString() },
          { label: "Active", value: rows.filter((row) => row.status === "active").length.toString() },
          { label: "Tracked links", value: linkRows.length.toString() },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-white p-5">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-3xl font-semibold mt-2">{metric.value}</p>
          </div>
        ))}
      </div>

      {showSeedBanner && (
        <div className="rounded-xl border border-accent/30 bg-secondary/40 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Bring legacy vendor links under admin control</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                The results page still falls back to hard-coded vendor links until we seed the managed link table. Run this once and the dashboard becomes the source of truth for ordering and updates.
              </p>
            </div>
            <Button onClick={() => seedLegacyLinks.mutate()} disabled={seedLegacyLinks.isPending}>
              {seedLegacyLinks.isPending ? "Seeding..." : "Seed Legacy Links Now"}
            </Button>
          </div>
        </div>
      )}

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
            <p className="text-sm text-muted-foreground">Map partner URLs to result cards, PSEO pages, and future placements. Managed links show first on the results page before legacy fallback links.</p>
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
            <input className={inputClass()} placeholder={linkForm.isGlobal ? "Leave blank for global links" : "Peptide ID, e.g. semaglutide"} value={linkForm.peptideId} onChange={(e) => setLinkForm({ ...linkForm, peptideId: e.target.value })} disabled={linkForm.isGlobal} />
            <input className={inputClass()} placeholder="Sort order, e.g. 1" value={linkForm.sortOrder} onChange={(e) => setLinkForm({ ...linkForm, sortOrder: e.target.value })} />
            <select className={inputClass()} value={linkForm.status} onChange={(e) => setLinkForm({ ...linkForm, status: e.target.value as LinkForm["status"] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
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
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{partner.notes || "No notes yet."}</p>
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
              Active links are sorted by order before legacy fallback links appear on result cards.
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
                    {typeof link.lastTestStatus === "number" ? ` · Last test ${link.lastTestStatus}` : ""}
                  </p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
                    <ExternalLink className="w-4 h-4" />
                    {link.url}
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => editLink(link)}>
                    Edit
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
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Migration tools</h2>
            <p className="text-sm text-muted-foreground">
              One-time import tools for moving legacy result-card vendors into the managed affiliate system.
            </p>
          </div>
          <Button variant="outline" onClick={() => seedLegacyLinks.mutate()} disabled={seedLegacyLinks.isPending}>
            {seedLegacyLinks.isPending ? "Seeding..." : "Seed Legacy Links"}
          </Button>
        </div>
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
