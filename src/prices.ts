const API = "https://api.energidataservice.dk/dataset";

// Defaults: 2765 Smørum (Egedal) -> DK2, grid company Radius, household tariff C.
export interface Config {
  priceArea: "DK1" | "DK2";
  gridGln: string;
  gridTariffCode: string;
  /** OK's own margin in DKK/kWh excl. VAT. Not published as open data, so configurable. */
  supplierMarkup: number;
  vat: number;
}

export const DEFAULT_CONFIG: Config = {
  priceArea: "DK2",
  gridGln: "5790000705689", // Radius Elnet A/S
  gridTariffCode: "DT_C_01",
  supplierMarkup: 0,
  vat: 0.25,
};

const ENERGINET_GLN = "5790000432752";

export interface Breakdown {
  spot: number;
  grid: number;
  energinet: number;
  tax: number;
  markup: number;
  /** DKK/kWh incl. VAT */
  total: number;
  hour: number;
}

interface PricelistRecord {
  ValidFrom: string;
  ValidTo: string | null;
  [priceN: string]: string | number | null;
}

async function getJson<T>(path: string, params: Record<string, string>, tries = 3): Promise<T[]> {
  const url = `${API}/${path}?${new URLSearchParams(params)}`;
  for (let i = 0; i < tries; i++) {
    const body = (await (await fetch(url)).json()) as { records?: T[]; message?: string };
    if (body.records) return body.records;
    // The API rate limits bursts ("Try again in N seconds"); wait and retry.
    const wait = Number(/in (\d+) second/.exec(body.message ?? "")?.[1] ?? 1);
    await new Promise((r) => setTimeout(r, (wait + 0.3) * 1000));
  }
  throw new Error(`Energi Data Service request failed: ${path}`);
}

/** Local Copenhagen wall-clock "YYYY-MM-DDTHH:mm:ss" and hour for a Date. */
export function copenhagenTime(now: Date): { iso: string; hour: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Copenhagen",
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(now).map((x) => [x.type, x.value]),
  );
  return { iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`, hour: Number(p.hour) };
}

const TARIFF_TTL_MS = 6 * 3600_000;
let tariffCache: { key: string; at: number; records: (PricelistRecord & { GLN_Number: string; ChargeTypeCode: string })[] } | undefined;

/** Tariffs change rarely, so one cached query covers grid, Energinet fees and elafgift. */
async function tariffs(cfg: Config) {
  const key = `${cfg.gridGln}/${cfg.gridTariffCode}`;
  if (tariffCache?.key === key && Date.now() - tariffCache.at < TARIFF_TTL_MS) return tariffCache.records;
  const records = await getJson<NonNullable<typeof tariffCache>["records"][number]>("DatahubPricelist", {
    filter: JSON.stringify({ ChargeTypeCode: [cfg.gridTariffCode, "40000", "41000", "EA-001"] }),
    sort: "ValidFrom desc",
    limit: "60",
  });
  tariffCache = { key, at: Date.now(), records };
  return records;
}

function pick(records: Awaited<ReturnType<typeof tariffs>>, code: string, nowLocal: string, gln?: string) {
  const hit = records.find(
    (r) => r.ChargeTypeCode === code && (!gln || r.GLN_Number === gln) && r.ValidFrom <= nowLocal && (!r.ValidTo || nowLocal < r.ValidTo),
  );
  if (!hit) throw new Error(`No valid tariff ${code} at ${nowLocal}`);
  return hit;
}

const hourly = (r: PricelistRecord, hour: number) => Number(r[`Price${hour + 1}`]);

export async function fetchSpot(now: Date, area: string): Promise<number> {
  // The API's start/end filters are in Danish local time, not UTC.
  const end = copenhagenTime(new Date(now.getTime() + 60_000)).iso.slice(0, 16);
  const [rec] = await getJson<{ DayAheadPriceDKK: number }>("DayAheadPrices", {
    filter: JSON.stringify({ PriceArea: area }),
    sort: "TimeUTC desc",
    end,
    limit: "1",
  });
  if (!rec) throw new Error("No spot price available");
  return rec.DayAheadPriceDKK / 1000; // DKK/MWh -> DKK/kWh
}

export async function currentPrice(now = new Date(), cfg: Config = DEFAULT_CONFIG): Promise<Breakdown> {
  const { iso, hour } = copenhagenTime(now);
  const spot = await fetchSpot(now, cfg.priceArea);
  const all = await tariffs(cfg);
  const gridRec = pick(all, cfg.gridTariffCode, iso, cfg.gridGln);
  const transmission = pick(all, "40000", iso, ENERGINET_GLN);
  const system = pick(all, "41000", iso, ENERGINET_GLN);
  const taxRec = pick(all, "EA-001", iso);

  const grid = hourly(gridRec, hour);
  const energinet = Number(transmission.Price1) + Number(system.Price1);
  const tax = Number(taxRec.Price1);
  const total = (spot + grid + energinet + tax + cfg.supplierMarkup) * (1 + cfg.vat);
  return { spot, grid, energinet, tax, markup: cfg.supplierMarkup, total, hour };
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    ...DEFAULT_CONFIG,
    priceArea: env.PRICE_AREA === "DK1" ? "DK1" : "DK2",
    supplierMarkup: env.SUPPLIER_MARKUP_DKK ? Number(env.SUPPLIER_MARKUP_DKK) : 0,
  };
}

export function speak(b: Breakdown, markupIncluded: boolean): string {
  const [kroner, ore] = b.total.toFixed(2).split(".");
  const spoken =
    kroner === "0" ? `${Number(ore)} øre` : ore === "00" ? `${kroner} kroner` : `${kroner} kroner ${Number(ore)} øre`;
  const note = markupIncluded ? "" : " This excludes your provider's own margin.";
  return `Right now electricity costs about ${spoken} per kilowatt hour, including grid fees, taxes and VAT.${note}`;
}
