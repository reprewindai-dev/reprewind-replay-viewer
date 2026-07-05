import type {
  Agent, ChainStatus, LedgerEvent, LineageNode, NormalizedPacket, UsageLimit, UsageMetric,
} from "./types";

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
export function normalizePacket(raw: any): NormalizedPacket {
  if (!raw || typeof raw !== "object") throw new Error("Packet is empty or not an object.");

  // Investor replay packet ------------------------------------------------
  if (raw.mode === "investor_replay" || (raw.agent && raw.ledger_events && !raw.bundle)) {
    const agent: Agent = raw.agent;
    if (!agent?.agent_id) throw new Error("Investor packet missing agent.agent_id");
    const ledger: LedgerEvent[] = raw.ledger_events || [];
    const lineage: LineageNode = raw.lineage || { agent_id: agent.agent_id, name: agent.name, status: agent.status, children: [] };
    const chain: ChainStatus = raw.chain_status?.valid !== undefined ? raw.chain_status : validateChain(ledger);
    const usage_limit: UsageLimit | undefined = raw.usage_limit;
    return {
      packet_kind: "investor_replay",
      exported_at: raw.exported_at,
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
  if (raw.bundle && raw.current_agent) {
    const b = raw.bundle;
    const current: Agent = raw.current_agent;
    const agents: Agent[] = b.agents || [current];
    const ledger_by_agent: Record<string, LedgerEvent[]> = b.ledgerByAgent || {};
    const ledger: LedgerEvent[] = raw.current_ledger || ledger_by_agent[current.agent_id] || [];
    const lineage: LineageNode = raw.current_lineage || b.lineageByAgent?.[current.agent_id] || {
      agent_id: current.agent_id, name: current.name, status: current.status, children: [],
    };
    const chain = validateChain(ledger);
    return {
      packet_kind: "full_bundle",
      exported_at: raw.exported_at,
      current_agent: current,
      agents,
      ledger,
      ledger_by_agent,
      lineage,
      chain,
      usage: (b.usage || []) as UsageMetric[],
      usage_limit: b.usageLimit,
    };
  }

  // Loose fallback: at least an agent + ledger somewhere.
  const agent: Agent | undefined = raw.agent || raw.current_agent;
  const ledger: LedgerEvent[] = raw.ledger_events || raw.current_ledger || [];
  if (agent && ledger) {
    return {
      packet_kind: "unknown",
      exported_at: raw.exported_at,
      current_agent: agent,
      agents: [agent],
      ledger,
      ledger_by_agent: { [agent.agent_id]: ledger },
      lineage: raw.lineage || raw.current_lineage || { agent_id: agent.agent_id, name: agent.name, children: [] },
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
