"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Activity,
  GitBranch,
  Layers,
  Cpu,
  CheckCircle,
  AlertTriangle,
  FileCode,
  ArrowRight,
  TrendingUp,
  FileDown,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Compass,
  FileText,
  DollarSign
} from "lucide-react";
import type {
  NormalizedPacket,
  Agent,
  LedgerEvent,
  LineageNode
} from "../lib/types";
import { normalizePacket, selectAgent } from "../lib/normalize";

export default function ReplayViewerPage() {
  // Input states
  const [rawInput, setRawInput] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"viewer" | "input">("viewer");
  const [packet, setPacket] = useState<NormalizedPacket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load a demo sample on startup
  useEffect(() => {
    loadSample("/samples/agent_alpha-replay.json");
  }, []);

  // Set default selected event when packet or active agent changes
  useEffect(() => {
    if (packet && packet.ledger.length > 0) {
      setSelectedEvent(packet.ledger[0]);
    } else {
      setSelectedEvent(null);
    }
  }, [packet]);

  // Load sample file helper
  const loadSample = async (path: string) => {
    try {
      setErrorMsg(null);
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status} failed to fetch sample`);
      const data = await res.json();
      const norm = normalizePacket(data);
      setPacket(norm);
      setRawInput(JSON.stringify(data, null, 2));
      setActiveTab("viewer");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load sample");
    }
  };

  // Process raw text/paste action
  const handleParseRawInput = () => {
    try {
      setErrorMsg(null);
      if (!rawInput.trim()) {
        throw new Error("Input is empty");
      }
      const data = JSON.parse(rawInput);
      const norm = normalizePacket(data);
      setPacket(norm);
      setActiveTab("viewer");
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid JSON payload structure");
    }
  };

  // Load from remote URL
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      setErrorMsg(null);
      const res = await fetch(urlInput);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      const data = await res.json();
      const norm = normalizePacket(data);
      setPacket(norm);
      setRawInput(JSON.stringify(data, null, 2));
      setActiveTab("viewer");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to retrieve and normalize remote URL");
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setErrorMsg(null);
        const data = JSON.parse(event.target?.result as string);
        const norm = normalizePacket(data);
        setPacket(norm);
        setRawInput(JSON.stringify(data, null, 2));
        setActiveTab("viewer");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to parse uploaded JSON file");
      }
    };
    reader.readAsText(file);
  };

  // Select agent inside bundle
  const handleAgentSelect = (agentId: string) => {
    if (!packet) return;
    const updated = selectAgent(packet, agentId);
    setPacket(updated);
  };

  // Render lineage node recursively
  const renderLineageTree = (node: LineageNode, depth = 0): React.ReactNode => {
    const isCurrent = packet?.current_agent.agent_id === node.agent_id;
    return (
      <div key={node.agent_id} className="flex flex-col ml-4">
        <div className="flex items-center gap-3 my-1">
          <div className="w-2 h-2 rounded-full bg-border-strong relative">
            {node.children && node.children.length > 0 && (
              <div className="absolute top-2 left-[3px] w-[2px] h-full bg-border-strong" style={{ height: "calc(100% + 12px)" }} />
            )}
          </div>
          <button
            onClick={() => handleAgentSelect(node.agent_id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono text-left transition-all ${
              isCurrent
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/40 font-semibold shadow-[0_0_12px_rgba(63,182,255,0.15)]"
                : "bg-bg-800 text-ink-400 hover:bg-bg-700 hover:text-ink-50 border border-border"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{node.name || node.agent_id}</span>
              {node.status && (
                <span className={`w-1.5 h-1.5 rounded-full ${node.status === "excellent" || node.status === "active" ? "bg-accent-green" : "bg-accent-amber"}`} />
              )}
            </div>
            <div className="text-[10px] text-ink-600 mt-0.5">{node.agent_id}</div>
          </button>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="pl-4 border-l border-border/40 mt-1 flex flex-col gap-1">
            {node.children.map((child) => renderLineageTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredLedger = packet?.ledger.filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.event_id.toLowerCase().includes(q) ||
      ev.event_type.toLowerCase().includes(q) ||
      ev.summary?.toLowerCase().includes(q) ||
      ev.actor?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-bg-900 text-ink-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-border bg-bg-800/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-brand-600 to-accent-violet rounded-xl shadow-[0_0_20px_rgba(31,138,224,0.3)]">
            <Shield className="w-6 h-6 text-ink-50" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-ink-50 via-brand-400 to-accent-violet bg-clip-text text-transparent">
              VEKLOM REPLAY VIEWER
            </h1>
            <p className="text-[10px] font-mono text-brand-500 uppercase tracking-widest mt-0.5">
              Veklom Sovereign Runtime Authority
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-bg-900 rounded-lg p-1 border border-border">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "viewer" ? "bg-bg-700 text-brand-400 shadow-sm" : "text-ink-400 hover:text-ink-50"
            }`}
          >
            Dashboard Viewer
          </button>
          <button
            onClick={() => setActiveTab("input")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "input" ? "bg-bg-700 text-brand-400 shadow-sm" : "text-ink-400 hover:text-ink-50"
            }`}
          >
            Import Replay Packet
          </button>
        </div>
      </header>

      {/* Main body content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        {/* Error notification bar */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-xl text-sm animate-pulse glow-red">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="flex-1 font-mono text-xs">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-xs hover:underline uppercase tracking-wider font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "input" ? (
          /* INPUT / LOADER TAB */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6 lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-brand-500" />
                  <h3 className="font-semibold text-sm tracking-wide text-ink-50">Paste Replay JSON</h3>
                </div>
                <button
                  onClick={handleParseRawInput}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Load & Parse Packet
                </button>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste agent_alpha-replay.json or agent_alpha-compliance-packet-2.json..."
                className="w-full min-h-[500px] bg-bg-900 border border-border rounded-xl p-4 font-mono text-xs text-ink-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 scroll-thin"
              />
            </div>

            <div className="flex flex-col gap-6">
              {/* Load Samples */}
              <div className="card p-6">
                <h3 className="font-semibold text-sm tracking-wide text-ink-50 mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-accent-violet" />
                  OOTB Sample Replays
                </h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => loadSample("/samples/agent_alpha-replay.json")}
                    className="p-3 bg-bg-800 hover:bg-bg-700 border border-border hover:border-brand-500/40 rounded-xl text-left transition-all group flex items-start justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink-200 group-hover:text-brand-400">
                        Multi-Agent Full Replay
                      </div>
                      <div className="text-[10px] text-ink-600 mt-1 font-mono">
                        3 Agents • Ledger chain • Genealogies
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-600 group-hover:translate-x-1 transition-transform mt-0.5" />
                  </button>

                  <button
                    onClick={() => loadSample("/samples/agent_alpha-compliance-packet-2.json")}
                    className="p-3 bg-bg-800 hover:bg-bg-700 border border-border hover:border-brand-500/40 rounded-xl text-left transition-all group flex items-start justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink-200 group-hover:text-brand-400">
                        Investor Compliance Packet
                      </div>
                      <div className="text-[10px] text-ink-600 mt-1 font-mono">
                        Alpha Sentinel lock • 3 audited blocks
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-600 group-hover:translate-x-1 transition-transform mt-0.5" />
                  </button>
                </div>
              </div>

              {/* Upload File */}
              <div className="card p-6">
                <h3 className="font-semibold text-sm tracking-wide text-ink-50 mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-accent-green" />
                  Upload Replay File
                </h3>
                <label className="flex flex-col items-center justify-center border border-dashed border-border hover:border-brand-500/50 rounded-xl p-8 cursor-pointer transition-all bg-bg-800/50 hover:bg-bg-800">
                  <Upload className="w-8 h-8 text-ink-600 mb-2" />
                  <span className="text-xs font-medium text-ink-200">Select .json from machine</span>
                  <span className="text-[10px] text-ink-600 mt-1 font-mono">Accepts reprewind schema</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* URL Load */}
              <div className="card p-6">
                <h3 className="font-semibold text-sm tracking-wide text-ink-50 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-brand-400" />
                  Fetch via URL Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://api.veklom.com/..."
                    className="flex-1 bg-bg-900 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    onClick={handleFetchUrl}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-semibold text-white cursor-pointer"
                  >
                    Fetch
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : packet ? (
          /* VIEWER DASHBOARD TAB */
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* COLUMN 1: Agent Registry / Overview */}
            <div className="flex flex-col gap-6 xl:col-span-1">
              {/* Certificate & Identity Card */}
              <div className="card p-6 relative overflow-hidden">
                {/* Visual styling background gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/5 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-violet/5 blur-3xl rounded-full" />

                <div className="flex justify-between items-start mb-4">
                  <span className="pill border-brand-500/30 text-brand-400 bg-brand-500/5">
                    {packet.packet_kind === "investor_replay" ? "Investor Replay" : "Multi-Agent Bundle"}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    packet.current_agent.status === "excellent" || packet.current_agent.status === "active"
                      ? "bg-accent-green glow-green"
                      : "bg-accent-amber glow-amber"
                  }`} />
                </div>

                <h2 className="text-xl font-bold text-ink-50 leading-tight">{packet.current_agent.name}</h2>
                <div className="text-[10px] font-mono text-ink-600 mt-1 break-all">
                  ID: {packet.current_agent.agent_id}
                </div>

                <div className="border-t border-border/60 my-4" />

                <div className="flex flex-col gap-3 text-xs">
                  <div>
                    <span className="text-ink-600 block text-[10px] uppercase font-semibold">Jurisdiction</span>
                    <span className="text-ink-200 font-medium">{packet.current_agent.jurisdiction || "Autonomous Space"}</span>
                  </div>
                  <div>
                    <span className="text-ink-600 block text-[10px] uppercase font-semibold">Declared Purpose</span>
                    <span className="text-ink-200 leading-relaxed font-light">{packet.current_agent.declared_purpose}</span>
                  </div>
                  {packet.current_agent.certificate_id && (
                    <div>
                      <span className="text-ink-600 block text-[10px] uppercase font-semibold">Security Certificate</span>
                      <a
                        href={packet.current_agent.certificate_uri || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 font-mono flex items-center gap-1.5 hover:underline mt-0.5"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {packet.current_agent.certificate_id}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Integrity Seal verification status */}
              <div className={`card p-6 border ${packet.chain.valid ? "border-accent-green/20" : "border-accent-red/20"}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${packet.chain.valid ? "bg-accent-green/10 text-accent-green glow-green" : "bg-accent-red/10 text-accent-red glow-red"}`}>
                    {packet.chain.valid ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-ink-50 uppercase tracking-wide">
                      {packet.chain.valid ? "Hash-Chain Verified" : "Chain Corrupted"}
                    </div>
                    <div className="text-[10px] font-mono text-ink-600 mt-0.5">
                      {packet.chain.checked_events} Events verified sequentially
                    </div>
                  </div>
                </div>

                {packet.chain.breaks && packet.chain.breaks.length > 0 && (
                  <div className="mt-4 p-3 bg-accent-red/5 rounded-xl border border-accent-red/20 flex flex-col gap-2 font-mono text-[10px] text-accent-red">
                    <span className="font-bold">Corruption Logs:</span>
                    {packet.chain.breaks.map((b, idx) => (
                      <div key={idx} className="leading-relaxed border-t border-accent-red/10 pt-1.5">
                        [Block {b.at_index}] {b.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lineage Tree */}
              <div className="card p-6">
                <h3 className="font-semibold text-xs text-ink-600 uppercase tracking-widest border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-accent-violet" />
                  Spawn Lineage Tree
                </h3>
                <div className="overflow-x-auto scroll-thin pb-2">
                  <div className="-ml-4">
                    {renderLineageTree(packet.lineage)}
                  </div>
                </div>
              </div>

              {/* SLA Resource limits meter */}
              {packet.usage_limit && (
                <div className="card p-6">
                  <h3 className="font-semibold text-xs text-ink-600 uppercase tracking-widest border-b border-border pb-3 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-400" />
                    Sovereign Limits
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-ink-200">{packet.usage_limit.metric}</span>
                      <span className="text-[10px] text-ink-600 font-mono">
                        {packet.usage_limit.used} / {packet.usage_limit.limit}
                      </span>
                    </div>

                    <div className="w-full bg-bg-900 h-2 rounded-full overflow-hidden border border-border">
                      <div
                        className="bg-gradient-to-r from-brand-600 to-accent-violet h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (packet.usage_limit.used / packet.usage_limit.limit) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-ink-600 font-mono mt-1">
                      <span>Utilized {Math.round((packet.usage_limit.used / packet.usage_limit.limit) * 100)}%</span>
                      {packet.usage_limit.remaining !== undefined && (
                        <span>{packet.usage_limit.remaining} left</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2 & 3: Ledger Events log */}
            <div className="flex flex-col gap-6 xl:col-span-2">
              <div className="card p-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-3">
                  <div>
                    <h3 className="font-semibold text-sm tracking-wide text-ink-50">Cryptographic Ledger</h3>
                    <p className="text-[10px] text-ink-600 font-mono mt-0.5">
                      Hash-chained seals of the agent runtime execution
                    </p>
                  </div>

                  {/* Search filter */}
                  <div className="relative md:w-64">
                    <Search className="w-3.5 h-3.5 text-ink-600 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter ledger events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-900 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink-200 focus:outline-none focus:border-brand-500 placeholder-ink-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 relative overflow-y-auto scroll-thin pr-1 max-h-[600px]">
                  {filteredLedger.length === 0 ? (
                    <div className="text-center py-12 text-ink-600 text-xs font-mono">
                      No matching events found in active ledger.
                    </div>
                  ) : (
                    filteredLedger.map((ev, index) => {
                      const isSelected = selectedEvent?.event_id === ev.event_id;
                      return (
                        <div
                          key={ev.event_id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-brand-600/10 border-brand-500 shadow-[0_0_12px_rgba(63,182,255,0.06)]"
                              : "bg-bg-800/40 border-border/70 hover:border-brand-600/40 hover:bg-bg-800/60"
                          }`}
                        >
                          {index < filteredLedger.length - 1 && <div className="chain-line" />}

                          {/* Index bullet */}
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-[10px] shrink-0 transition-all ${
                            isSelected
                              ? "bg-brand-600/20 text-brand-400 border-brand-500"
                              : "bg-bg-900 text-ink-600 border-border group-hover:border-ink-400 group-hover:text-ink-200"
                          }`}>
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-xs font-bold font-mono text-ink-50 group-hover:text-brand-400 transition-colors">
                                {ev.event_type}
                              </span>
                              {ev.created_at && (
                                <span className="text-[10px] text-ink-600 font-mono">
                                  {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-ink-600 font-mono mt-0.5">
                              ID: {ev.event_id} • Actor: {ev.actor || "system"}
                            </div>
                            <p className="text-xs text-ink-200 mt-2 leading-relaxed font-light">
                              {ev.summary}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 4: Selected event details */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              <div className="card p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-xs text-ink-600 uppercase tracking-widest border-b border-border pb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  Event Signature
                </h3>

                {selectedEvent ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-ink-600 font-mono block">SHA-256 Seal</span>
                      <span className="text-[10px] text-ink-200 font-mono break-all mt-1 block p-2 bg-bg-900 border border-border rounded-lg leading-relaxed">
                        {selectedEvent.event_hash}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-ink-600 font-mono block">Previous Seal Pointer</span>
                      <span className="text-[10px] text-ink-400 font-mono break-all mt-1 block p-2 bg-bg-900 border border-border/40 rounded-lg leading-relaxed">
                        {selectedEvent.prev_event_hash || "NULL (Genesis Block)"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-ink-600 font-mono block mb-1">Audit Log Payload</span>
                      <pre className="text-[10px] font-mono bg-bg-900 border border-border rounded-lg p-3 text-brand-400 overflow-x-auto scroll-thin max-h-[300px] leading-relaxed">
                        {JSON.stringify(selectedEvent.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-ink-600 text-xs font-mono">
                    Select an event to view full cryptographic proof logs.
                  </div>
                )}
              </div>

              {/* Genome / DNA details of the current agent */}
              {packet.current_agent.genome && (
                <div className="card p-6 flex flex-col gap-4">
                  <h3 className="font-semibold text-xs text-ink-600 uppercase tracking-widest border-b border-border pb-3 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent-green" />
                    Agent Genome DNA
                  </h3>
                  <div className="flex flex-col gap-3 text-xs">
                    <div>
                      <span className="text-ink-600 block text-[9px] uppercase font-bold">Model Family</span>
                      <span className="text-ink-200 font-mono mt-0.5 block">{packet.current_agent.genome.model_family || "Unknown"}</span>
                    </div>
                    <div>
                      <span className="text-ink-600 block text-[9px] uppercase font-bold">Architecture</span>
                      <span className="text-ink-200 leading-normal font-light mt-0.5 block">{packet.current_agent.genome.architecture || "Not declared"}</span>
                    </div>

                    {packet.current_agent.genome.tools && packet.current_agent.genome.tools.length > 0 && (
                      <div>
                        <span className="text-ink-600 block text-[9px] uppercase font-bold mb-1.5">Registered Tools</span>
                        <div className="flex flex-wrap gap-1.5">
                          {packet.current_agent.genome.tools.map((t, idx) => (
                            <span key={idx} className="bg-bg-900 border border-border text-ink-200 font-mono text-[9px] px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {packet.current_agent.genome.safety_rules && packet.current_agent.genome.safety_rules.length > 0 && (
                      <div>
                        <span className="text-ink-600 block text-[9px] uppercase font-bold mb-1.5">Zero-Trust Rules</span>
                        <ul className="list-disc pl-4 text-ink-200 leading-relaxed font-light flex flex-col gap-1 text-[11px]">
                          {packet.current_agent.genome.safety_rules.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="card p-12 text-center flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <div className="text-xs font-mono text-ink-600">Waiting for packet load...</div>
          </div>
        )}
      </main>
    </div>
  );
}
