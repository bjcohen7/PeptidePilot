/**
 * Read-only Meta Marketing API client (ads insights) for the digest + /ads bot
 * command.
 *
 * Env vars (report these to Ben):
 *   META_ADS_TOKEN       – System User token with ads_read on the ad account
 *   META_AD_ACCOUNT_ID   – numeric ad account id (no "act_" prefix needed;
 *                          both forms accepted)
 *
 * Degrades gracefully: any missing env, API error, or expired token returns
 * null — callers render "n/a" and nothing ever breaks. Responses cached 15 min
 * (Meta rate limits); all failures are logged fire-and-forget.
 */

const GRAPH = "https://graph.facebook.com/v19.0";
const CACHE_MS = 15 * 60 * 1000;

export type AdRow = {
  adId: string;
  adName: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  results: number; // summed custom-conversion / lead actions
};

export type AccountInsights = {
  spend: number;
  impressions: number;
  linkClicks: number;
  cpm: number;
  ads: AdRow[];
};

function creds(): { token: string; account: string } | null {
  const token = process.env.META_ADS_TOKEN?.trim();
  let account = process.env.META_AD_ACCOUNT_ID?.trim();
  if (!token || !account) return null;
  if (!account.startsWith("act_")) account = `act_${account}`;
  return { token, account };
}

const _cache = new Map<string, { at: number; data: AccountInsights | null }>();

/** Daily insights for an ET date range (YYYY-MM-DD strings), per-ad + account totals. */
export async function getAdsInsights(since: string, until: string): Promise<AccountInsights | null> {
  const c = creds();
  if (!c) return null;

  const key = `${since}:${until}`;
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  try {
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
    const fields = "ad_id,ad_name,spend,impressions,inline_link_clicks,actions";
    const url =
      `${GRAPH}/${c.account}/insights?level=ad&fields=${fields}` +
      `&time_range=${timeRange}&limit=100&access_token=${c.token}`;
    const res = await fetch(url);
    const body = (await res.json()) as any;
    if (!res.ok || body.error) {
      console.error("[MetaAds] insights error:", body?.error?.message ?? res.status);
      _cache.set(key, { at: Date.now(), data: null });
      return null;
    }

    const ads: AdRow[] = (body.data ?? []).map((r: any) => ({
      adId: String(r.ad_id ?? ""),
      adName: String(r.ad_name ?? r.ad_id ?? "?"),
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      linkClicks: Number(r.inline_link_clicks ?? 0),
      results: (r.actions ?? [])
        .filter((a: any) => /offsite_conversion|lead/.test(String(a.action_type)))
        .reduce((s: number, a: any) => s + Number(a.value ?? 0), 0),
    }));

    const spend = ads.reduce((s, a) => s + a.spend, 0);
    const impressions = ads.reduce((s, a) => s + a.impressions, 0);
    const linkClicks = ads.reduce((s, a) => s + a.linkClicks, 0);
    const data: AccountInsights = {
      spend,
      impressions,
      linkClicks,
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      ads: ads.sort((a, b) => b.spend - a.spend),
    };
    _cache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.error("[MetaAds] fetch failed:", err);
    _cache.set(key, { at: Date.now(), data: null });
    return null;
  }
}
