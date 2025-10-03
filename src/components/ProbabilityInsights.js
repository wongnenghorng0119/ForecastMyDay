// src/components/ProbabilityInsights.js
import React, { useMemo, useEffect, useState } from "react";
import { genAI } from "../utils/geminiConfig";

/**
 * ProbabilityInsights
 *
 * Props:
 * - data: Array<{ label: string, value: number }> | Record<string, number>
 * - title?: string
 * - autoAnalyze?: boolean (default: true) -> auto call Gemini to summarize and advise
 * - maxBars?: number (optional cap for display)
 * - onAdvice?: (result: { summary: string, advice: string }) => void
 *
 * This component does NOT add any new dependencies.
 * It uses a minimal SVG bar chart and the existing Gemini client.
 */
export default function ProbabilityInsights({
  data,
  title = "Probability Insights",
  autoAnalyze = true,
  maxBars,
  onAdvice,
}) {
  const [summary, setSummary] = useState("");
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Normalize input to array of {label, value}
  const series = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(Boolean).map(x => ({ label: String(x.label), value: Number(x.value) || 0 }));
    return Object.entries(data).map(([label, value]) => ({ label: String(label), value: Number(value) || 0 }));
  }, [data]);

  const trimmed = useMemo(() => {
    const arr = [...series];
    // Sort desc by value for clearer chart
    arr.sort((a, b) => b.value - a.value);
    return typeof maxBars === "number" && maxBars > 0 ? arr.slice(0, maxBars) : arr;
  }, [series, maxBars]);

  const maxValue = useMemo(() => {
    return trimmed.reduce((m, d) => Math.max(m, d.value), 0) || 1;
  }, [trimmed]);

  // Call Gemini to summarize + provide advice
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!autoAnalyze || trimmed.length === 0) return;
      setLoading(true);
      setError("");
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const payload = {
          task: "summarize_probability_distribution",
          guidance: "Return concise English: first a 2-4 sentence summary, then a short bullet list of actionable suggestions.",
          data: trimmed,
          notes: "Numbers represent probabilities in [0,1] or percentages. If values > 1 assume percentages. Be precise and avoid hallucinations.",
        };
        const prompt = `You are given a small probability result set as JSON.\n` +
          `- Provide a concise summary (2-4 sentences).\n` +
          `- Provide short actionable advice (3-5 bullets).\n` +
          `- If values look like percentages (>1), treat them as percentages; else treat as 0..1 probabilities.\n` +
          `Return two sections with clear headings: Summary and Advice.\n` +
          `JSON data:\n` + JSON.stringify(payload, null, 2);

        const result = await model.generateContent([prompt]);
        const response = await result.response;
        const txt = (response.text() || "").trim();
        if (cancelled) return;
        // Split best-effort into two parts
        const parts = txt.split(/\n\s*Advice\s*:?/i);
        if (parts.length > 1) {
          const s = parts[0].replace(/Summary\s*:?/i, "").trim();
          const adv = parts.slice(1).join("\n").trim();
          setSummary(s);
          setAdvice(adv);
          onAdvice && onAdvice({ summary: s, advice: adv });
        } else {
          setSummary(txt);
          setAdvice("");
          onAdvice && onAdvice({ summary: txt, advice: "" });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to analyze with Gemini");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [autoAnalyze, trimmed, onAdvice]);

  // Simple SVG bar chart
  const width = 520;
  const height = 240;
  const margin = { top: 24, right: 16, bottom: 60, left: 44 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const barGap = 8;
  const barWidth = trimmed.length ? Math.max(8, (chartW - barGap * (trimmed.length - 1)) / trimmed.length) : 0;

  const formatValue = (v) => {
    if (v > 1.0001) return `${v.toFixed(1)}%`;
    return `${(v * 100).toFixed(1)}%`;
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      </div>

      {/* Chart Card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12,
          padding: 12,
          overflowX: "auto",
        }}
      >
        {trimmed.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 12 }}>No data</div>
        ) : (
          <svg width={width} height={height} role="img" aria-label="Probability bar chart">
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* Y grid + ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const val = t * maxValue;
                const y = chartH - (val / maxValue) * chartH;
                return (
                  <g key={i} transform={`translate(0,${y})`}>
                    <line x1={0} x2={chartW} stroke="#2b2f36" />
                    <text x={-8} y={4} textAnchor="end" fontSize={10} fill="#9ca3af">
                      {formatValue(t <= 1 ? t : t / 100)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {trimmed.map((d, i) => {
                const v = d.value;
                const scaled = v / (maxValue || 1);
                const h = Math.max(0, scaled * chartH);
                const x = i * (barWidth + barGap);
                const y = chartH - h;
                return (
                  <g key={d.label} transform={`translate(${x},0)`}>
                    <rect
                      x={0}
                      y={y}
                      width={barWidth}
                      height={h}
                      rx={6}
                      fill="#60a5fa"
                    />
                    <text x={barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="#e5e7eb">
                      {formatValue(v)}
                    </text>
                    <text
                      x={barWidth / 2}
                      y={chartH + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#cbd5e1"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* Analysis Card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1" }}>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                border: "2px solid rgba(203,213,225,0.35)",
                borderTop: "2px solid #cbd5e1",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            />
            Analyzing with Gemini...
          </div>
        )}
        {error && (
          <div style={{ color: "#fca5a5", background: "rgba(239,68,68,0.15)", padding: 8, borderRadius: 8 }}>
            Error: {error}
          </div>
        )}
        {!loading && !error && (
          <div style={{ display: "grid", gap: 12 }}>
            {summary && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#e5e7eb" }}>Summary</div>
                <div style={{ whiteSpace: "pre-wrap", color: "#cbd5e1", lineHeight: 1.6 }}>{summary}</div>
              </div>
            )}
            {advice && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#e5e7eb" }}>Advice</div>
                <div style={{ whiteSpace: "pre-wrap", color: "#cbd5e1", lineHeight: 1.6 }}>{advice}</div>
              </div>
            )}
            {!summary && !advice && (
              <div style={{ color: "#9ca3af" }}>No analysis yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
