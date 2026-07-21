import type {
  Agent,
  ChainStatus,
  LedgerEvent,
  LineageNode,
  NormalizedPacket,
  UsageLimit,
  UsageMetric,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function normalizeAgent(value: unknown, label: string): Agent {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);

  return {
    agent_id: readString(value.agent_id, `${label}.agent_id`),
    certificate_id: readOptionalString(value.certificate_id),
    name: readString(value.name, `${label}.name`),
    creator: readOptionalString(value.creator),
    jurisdiction: readOptionalString(value.jurisdiction),
    declared_purpose: readOptionalString(value.declared_purpose),
    status: readOptionalString(value.status),
    genome: isRecord(value.genome) ? (value.genome as Agent["genome"]) : undefined,
    parent_agent_ids: Array.isArray(value.parent_agent_ids)
      ? value.parent_agent_ids.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : undefined,
    created_at: readOptionalString(value.created_at),
    certificate_uri: readOptionalString(value.certificate_uri),
    version_count: typeof value.version_count === "number" ? value.version_count : undefined,
    latest_genome_hash: readOptionalString(value.latest_genome_hash),
  };
}

function normalizeLedgerEvent(value: unknown, label: string): LedgerEvent {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);

  return {
    event_id: readString(value.event_id, `${label}.event_id`),
    event_type: readString(value.event_type, `${label}.event_type`),
    actor: readOptionalString(value.actor),
    summary: readOptionalString(value.summary),
    details: isRecord(value.details) ? value.details : undefined,
    prev_event_hash: value.prev_event_hash === null ? null : readOptionalString(value.prev_event_hash) ?? null,
    event_hash: readString(value.event_hash, `${label}.event_hash`),
    created_at: readOptionalString(value.created_at),
  };
}

function normalizeLedgerEvents(value: unknown, label: string): LedgerEvent[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => normalizeLedgerEvent(entry, `${label}[${index}]`));
}

function normalizeLineageNode(
  value: unknown,
  fallback: Agent,
  allowFallback: boolean,
  label: string,
): LineageNode {
  if (!isRecord(value)) {
    if (!allowFallback) throw new Error(`${label} must be an object`);
    return { agent_id: fallback.agent_id, name: fallback.name, status: fallback.status, children: [] };
  }

  return {
    agent_id: readString(value.agent_id, `${label}.agent_id`),
    name: readOptionalString(value.name),
    status: readOptionalString(value.status),
    children: Array.isArray(value.children)
      ? value.children.map((entry, index) => normalizeLineageNode(entry, fallback, false, `${label}.children[${index}]`))
      : [],
  };
}

function normalizeUsageMetric(value: unknown, label: string): UsageMetric {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  if (typeof value.amount !== "number") throw new Error(`${label}.amount must be a number`);

  return {
    metric: readString(value.metric, `${label}.metric`),
    amount: value.amount,
    period_start: readOptionalString(value.period_start),
    period_end: readOptionalString(value.period_end),
  };
}

function normalizeUsageLimit(value: unknown): UsageLimit | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.metric !== "string" || typeof value.used !== "number" || typeof value.limit !== "number") {
    throw new Error("usage_limit must include metric, used, and limit fields");
  }

  return {
    account_id: value.account_id as UsageLimit["account_id"],
    metric: value.metric,
    used: value.used,
    limit: value.limit,
    remaining: typeof value.remaining === "number" ? value.remaining : undefined,
  };
}

/** Validate the linked-list hash chain: each event's prev_event_hash must equal the previous event_hash. */
export function validateChain(events: LedgerEvent[]): ChainStatus {
  const breaks: ChainStatus["breaks"] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const expected = i === 0 ? null : events[i - 1].event_hash;
    if ((ev.prev_event_hash ?? null) !== expected) {
      breaks.push({
        at_index: i,
        reason: `prev_event_hash mismatch at ${ev.event_id}: expected ${expected ?? "null"}, got ${ev.prev_event_hash ?? "null"}`,
      });
    }
    if (!ev.event_hash) {
      breaks.push({ at_index: i, reason: `event_hash missing at ${ev.event_id}` });
    }
  }
  return { valid: breaks.length === 0, checked_events: events.length, breaks };
}

/** Accept either the investor_replay packet or the full bundle export. */
export function normalizePacket(raw: unknown): NormalizedPacket {
  if (!raw || typeof raw !== "object") throw new Error("Packet is empty or not an object.");
  const packet = raw as Record<string, unknown>;

  // Investor replay packet ------------------------------------------------
  if (packet.mode === "investor_replay" || (packet.agent && packet.ledger_events && !packet.bundle)) {
    const agent = normalizeAgent(packet.agent, "agent");
    const ledger = normalizeLedgerEvents(packet.ledger_events, "ledger_events");
    const lineage = normalizeLineageNode(packet.lineage, agent, true, "lineage");
    const chain = isRecord(packet.chain_status) && typeof packet.chain_status.valid === "boolean"
      ? (packet.chain_status as unknown as ChainStatus)
      : validateChain(ledger);
    const usage_limit = normalizeUsageLimit(packet.usage_limit);
    return {
      packet_kind: "investor_replay",
      exported_at: readOptionalString(packet.exported_at),
      current_agent: agent,
      agents: [agent],
      ledger,
      ledger_by_agent: { [agent.agent_id]: ledger },
      lineage,
      chain,
      usage: [],
      usage_limit,
    };
  }

  // Full bundle -----------------------------------------------------------
  if (packet.bundle && packet.current_agent) {
    if (!isRecord(packet.bundle)) throw new Error("bundle must be an object");
    const bundle = packet.bundle;
    const current = normalizeAgent(packet.current_agent, "current_agent");
    const agents = Array.isArray(bundle.agents) && bundle.agents.length > 0
      ? bundle.agents.map((entry, index) => normalizeAgent(entry, `bundle.agents[${index}]`))
      : [current];
    const ledgerByAgentRaw = isRecord(bundle.ledgerByAgent) ? bundle.ledgerByAgent : {};
    const ledger_by_agent: Record<string, LedgerEvent[]> = Object.fromEntries(
      Object.entries(ledgerByAgentRaw).map(([agentId, events]) => [agentId, normalizeLedgerEvents(events, `bundle.ledgerByAgent.${agentId}`)]),
    );
    const currentLedgerRaw = packet.current_ledger ?? ledger_by_agent[current.agent_id] ?? [];
    const ledger = normalizeLedgerEvents(currentLedgerRaw, "current_ledger");
    const lineageSource = packet.current_lineage ?? (isRecord(bundle.lineageByAgent) ? bundle.lineageByAgent[current.agent_id] : undefined);
    const lineage = normalizeLineageNode(lineageSource, current, true, "current_lineage");
    const chain = validateChain(ledger);
    return {
      packet_kind: "full_bundle",
      exported_at: readOptionalString(packet.exported_at),
      current_agent: current,
      agents,
      ledger,
      ledger_by_agent,
      lineage,
      chain,
      usage: Array.isArray(bundle.usage)
        ? bundle.usage.map((entry, index) => normalizeUsageMetric(entry, `bundle.usage[${index}]`))
        : [],
      usage_limit: normalizeUsageLimit(bundle.usageLimit),
    };
  }

  // Loose fallback: at least an agent + ledger somewhere.
  const agentSource = packet.agent || packet.current_agent;
  const ledgerSource = packet.ledger_events || packet.current_ledger || [];
  if (agentSource) {
    const agent = normalizeAgent(agentSource, "agent");
    const ledger = normalizeLedgerEvents(ledgerSource, "ledger");
    return {
      packet_kind: "unknown",
      exported_at: readOptionalString(packet.exported_at),
      current_agent: agent,
      agents: [agent],
      ledger,
      ledger_by_agent: { [agent.agent_id]: ledger },
      lineage: normalizeLineageNode(packet.lineage || packet.current_lineage, agent, true, "lineage"),
      chain: validateChain(ledger),
      usage: [],
    };
  }
  throw new Error("Unrecognized packet shape. Expected 'investor_replay' or a full bundle with 'bundle' + 'current_agent'.");
}

/** Switch the "current" agent inside a full bundle without re-normalizing from scratch. */
export function selectAgent(pkt: NormalizedPacket, agent_id: string): NormalizedPacket {
  const agent = pkt.agents.find((a) => a.agent_id === agent_id);
  if (!agent) return pkt;
  const ledger = pkt.ledger_by_agent[agent_id] || [];
  const lineage = findLineage(pkt.lineage, agent_id) || { agent_id, name: agent.name, children: [] };
  return {
    ...pkt,
    current_agent: agent,
    ledger,
    lineage,
    chain: validateChain(ledger),
  };
}

function findLineage(root: LineageNode, id: string): LineageNode | null {
  if (root.agent_id === id) return root;
  for (const c of root.children || []) {
    const hit = findLineage(c, id);
    if (hit) return hit;
  }
  return null;
}

