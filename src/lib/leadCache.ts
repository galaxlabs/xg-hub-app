// Local-first cache for XG Hub (sales agents).
// Stores leads / follow-ups / companies in localStorage and syncs ONLY deltas
// (new/updated rows since last sync) to avoid thousands of full-data calls.

import { callFrappe } from "./frappe";

type CacheEnvelope<T> = {
  synced_at: string;
  rows: Record<string, T>;
  partial?: boolean;
};

const CACHE_PREFIX = "xghub-cache:";
const CACHE_LIMIT = 2_000;

function read<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEnvelope<T>) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, env: CacheEnvelope<T>) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(env));
  } catch {
    // storage full / private mode — degrade gracefully
  }
}

export async function syncLeads(user: string, since?: string): Promise<ATMLeadLite[]> {
  const key = `leads:${user}`;
  const cache = read<ATMLeadLite>(key);
  let env = cache ?? { synced_at: "", rows: {}, partial: false };

  // Initial fill: request full dataset.
  const payload: Record<string, unknown> = {};
  if (since || env.synced_at) payload.since = since || env.synced_at;
  const res = await callFrappe<{ rows?: ATMLeadLite[]; removed?: string[]; synced_at?: string }>(
    "cclms.api.lead.sync_leads",
    payload,
  );

  const rows = res?.rows ?? [];
  const removed = res?.removed ?? [];
  const nextRows = { ...env.rows };
  for (const name of removed) delete nextRows[name];
  for (const r of rows) if (r?.name) nextRows[r.name] = r;

  // Enforce a sane cache size.
  const keys = Object.keys(nextRows);
  if (keys.length > CACHE_LIMIT) {
    for (const k of keys.slice(0, keys.length - CACHE_LIMIT)) delete nextRows[k];
  }

  env = { synced_at: res?.synced_at ?? env.synced_at, rows: nextRows, partial: keys.length > CACHE_LIMIT };
  write(key, env);
  return Object.values(nextRows);
}

export async function syncFollowUps(user: string): Promise<FollowUpLite[]> {
  const key = `followups:${user}`;
  const rows = (await callFrappe<FollowUpLite[]>("cclms.api.follow_up.my_follow_ups")) || [];
  write(key, { synced_at: new Date().toISOString(), rows: Object.fromEntries(rows.map((r) => [r.name ?? r.lead ?? "", r])) });
  return rows;
}

export async function syncCompanies(): Promise<CompanyLite[]> {
  const key = `companies:shared`;
  const rows = (await callFrappe<CompanyLite[]>("frappe.client.get_list", {
    doctype: "Operator Companies",
    fields: ["name", "operator_name"],
    limit_page_length: 200,
    order_by: "operator_name asc",
  })) || [];
  write(key, { synced_at: new Date().toISOString(), rows: Object.fromEntries(rows.map((c) => [c.name, c])) });
  return rows;
}

export function getCachedLeads<T = ATMLeadLite>(user: string): T[] {
  return Object.values(read<T>(`leads:${user}`)?.rows ?? {});
}
export function getCachedFollowUps<T = FollowUpLite>(user: string): T[] {
  return Object.values(read<T>(`followups:${user}`)?.rows ?? {});
}
export function getCachedCompanies<T = CompanyLite>(): T[] {
  return Object.values(read<T>(`companies:shared`)?.rows ?? {});
}

export function clearCache(user?: string) {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX) && (!user || key.includes(`:${user}`))) localStorage.removeItem(key);
  }
}

export interface ATMLeadLite {
  name: string;
  business_name?: string;
  company?: string;
  workflow_state?: string;
  status?: string;
  city?: string;
  state?: string;
  state_code?: string;
  zip_code?: string;
  full_address?: string;
  business_phone_number?: string;
  owner_name?: string;
  priority?: string;
  executive_name?: string;
  branch?: string;
  notes?: string;
  creation?: string;
  modified?: string;
  post_date?: string;
}
export interface FollowUpLite {
  name?: string;
  lead?: string;
  business_name?: string;
  business_phone?: string;
  company?: string;
  priority?: string;
  follow_up_time?: string;
  status?: string;
  assigned_to?: string;
  assigned_branch?: string;
  notes?: string;
  dial_result?: string;
  business_address?: string;
  state_code?: string;
}
export interface CompanyLite {
  name: string;
  operator_name?: string;
}
