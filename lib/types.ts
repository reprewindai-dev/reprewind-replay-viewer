// Reprewind packet types — covers both "full bundle" (multi-agent export)
// and "investor replay packet" (single-agent).

export interface Genome {
  model_family?: string;
  model_version?: string;
  architecture?: string;
  tools?: string[];
  permissions?: string[];
  safety_rules?: string[];
  runtime_config?: Record<string, unknown>;
  intended_use?: string;
  risk_category?: "low" | "medium" | "high" | string;
}

export interface Agent {
  agent_id: string;
  certificate_id?: string;
  name: string;
  creator?: string;
  jurisdiction?: string;
  declared_purpose?: string;
  status?: string;
  genome?: Genome;
  parent_agent_ids?: string[];
  created_at?: string;
  certificate_uri?: string;
  version_count?: number;
  latest_genome_hash?: string;
}

export interface LedgerEvent {
  event_id: string;
  event_type: string;
  actor?: string;
  summary?: string;
  details?: Record<string, unknown>;
  prev_event_hash: string | null;
  event_hash: string;
  created_at?: string;
}

export interface LineageNode {
  agent_id: string;
  name?: string;
  status?: string;
  children?: LineageNode[];
}

export interface UsageMetric {
  metric: string;
  amount: number;
  period_start?: string;
  period_end?: string;
}

export interface UsageLimit {
  account_id?: number | string;
  metric: string;
  used: number;
  limit: number;
  remaining?: number;
}

export interface ChainStatus {
  valid: boolean;
  checked_events: number;
  breaks?: Array<{ at_index: number; reason: string }>;
}

/** Canonical normalized view the UI renders from. */
export interface NormalizedPacket {
  packet_kind: "investor_replay" | "full_bundle" | "unknown";
  exported_at?: string;
  current_agent: Agent;
  agents: Agent[]; // all known agents (may be just [current_agent])
  ledger: LedgerEvent[]; // ledger for current_agent
  ledger_by_agent: Record<string, LedgerEvent[]>;
  lineage: LineageNode;
  chain: ChainStatus;
  usage: UsageMetric[];
  usage_limit?: UsageLimit;
}
