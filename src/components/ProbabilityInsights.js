import React, { useMemo, useEffect, useRef, useState } from "react";
import { genAI } from "../utils/geminiConfig";
import "./css/ProbabilityInsights.css";

/**
 * Props:
 * - data: Array<{ label: string, value: number }> | Record<string, number>
 * - title?: string
 * - autoAnalyze?: boolean (default: true)
 * - maxBars?: number
 * - onAdvice?: (result: { summary: string, advice: string }) => void
 * - visible?: boolean (default: false)
 */
export default function ProbabilityInsights({
  data,
  title = "Probability Insights",
  autoAnalyze = true,
  maxBars,
  onAdvice,
  visible = false,
}) {
  // -------- State（无条件调用 Hooks，避免 ESLint 报错） --------
  const [summary, setSummary] = useState("");
  const [advice, setAdvice] = useState("");
  const [activities, setActivities] = useState([]); // 新增：存储活动建议（包含图片）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // -------- 结果缓存（按数据签名存取） --------
  // Map<signature, {summary, advice, activities}>
  const cacheRef = useRef(new Map());

  // 生成稳定签名：标签+数值（四舍五入到 3 位，避免细微浮动导致误判）
  const signature = useMemo(() => {
    if (!data) return "nil";
    const arr = Array.isArray(data)
      ? data
          .filter(Boolean)
          .map((x) => ({ label: String(x.label), value: Number(x.value) || 0 }))
      : Object.entries(data).map(([label, value]) => ({
          label: String(label),
          value: Number(value) || 0,
        }));
    const norm = [...arr]
      .sort((a, b) => (a.label > b.label ? 1 : -1))
      .map(({ label, value }) => [label, Math.round(Number(value) * 1000) / 1000]);
    return JSON.stringify(norm);
  }, [data]);

  // -------- 数据整理 --------
  const series = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data))
      return data
        .filter(Boolean)
        .map((x) => ({ label: String(x.label), value: Number(x.value) || 0 }));
    return Object.entries(data).map(([label, value]) => ({
      label: String(label),
      value: Number(value) || 0,
    }));
  }, [data]);

  const trimmed = useMemo(() => {
    const arr = [...series].sort((a, b) => b.value - a.value);
    return typeof maxBars === "number" && maxBars > 0 ? arr.slice(0, maxBars) : arr;
  }, [series, maxBars]);

  const maxValue = useMemo(
    () => trimmed.reduce((m, d) => Math.max(m, d.value), 0) || 1,
    [trimmed]
  );

  // -------- 请求 Gemini（仅在可见 + 允许分析 + 没缓存 时）--------
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!visible || !autoAnalyze || trimmed.length === 0) return;

      // 命中缓存：直接回填，绝不发请求
      const cached = cacheRef.current.get(signature);
      if (cached) {
        setLoading(false);
        setError("");
        setSummary(cached.summary);
        setAdvice(cached.advice);
        setActivities(cached.activities || []);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const payload = {
          task: "summarize_probability_distribution",
          guidance:
            "Return concise English: first a 2-4 sentence summary, then a short bullet list of actionable suggestions.",
          data: trimmed,
          notes:
            "Numbers represent probabilities in [0,1] or percentages. If values > 1 assume percentages. Be precise and avoid hallucinations.",
        };
        const prompt =
        `You are given weather probability data as JSON.\n` +
        `\n` +
        `TASK:\n` +
        `1. Analyze the weather conditions and provide a concise summary (2-4 sentences)\n` +
        `2. Suggest 3 specific activities (outdoor or indoor) that match the weather\n` +
        `3. For EACH activity, search Google Images and provide a direct image URL\n` +
        `\n` +
        `RETURN FORMAT (MUST be exact):\n` +
        `\n` +
        `Summary: [Your weather analysis here]\n` +
        `\n` +
        `Activities:\n` +
        `[\n` +
        `  {"name": "Activity Name", "description": "Why this activity suits the weather", "imageUrl": "https://..."},\n` +
        `  {"name": "Activity Name", "description": "Why this activity suits the weather", "imageUrl": "https://..."},\n` +
        `]\n` +
        `\n` +
        `IMAGE URL REQUIREMENTS:\n` +
        `- For each activity, perform a Google Image search with the activity name\n` +
        `- Use the direct image URL from Google search results\n` +
        `- Preferred image sources (in order):\n` +
        `  1. Pexels.com images (https://images.pexels.com/...)\n` +
        `  2. Pixabay.com images (https://cdn.pixabay.com/...)\n` +
        `  5. Any other direct image URL that appears in Google Images\n` +
        `- CRITICAL: URLs must be DIRECT image links (ending in  .jpeg, .png, format only！！！！！)\n` +
        `- DO NOT use:\n` +
        `  * Google's proxy URLs (e.g., googleusercontent.com)\n` +
        `  * Shortened URLs or redirects\n` +
        `- Each imageUrl MUST be different and specifically match its activity\n` +
        `- Test that the URL works by ensuring it's a direct image link\n` +
        `\n` +
        `ACTIVITY GUIDELINES:\n` +
        `- For rainy/bad weather: indoor activities (reading, cooking, gaming, yoga, museum, baking, crafts, movie)\n` +
        `- For sunny/good weather: outdoor activities (hiking, cycling, picnic, beach, sports, walking, camping, fishing)\n` +
        `- Be specific and descriptive: "Mountain Hiking" not just "Hiking"\n` +
        `- Choose realistic activities people can actually do\n` +
        `\n` +
        `IMPORTANT: Search Google Images for each activity and use real image URLs from the search results. PLS MAKE SURE THE IMAGE CAN BE OPEN NO ERROR 404 AND THE IMAGE IS REALLY RELATED WITHT ACTIVITY\n` +
        `\n` +
        `Weather data to analyze:\n` +
        JSON.stringify(payload, null, 2);
        const result = await model.generateContent([prompt]);
        const response = await result.response;
        const txt = (response.text() || "").trim();
        if (cancelled) return;

        console.log("=== Gemini Response ===");
console.log(txt);
console.log("======================");

        let s = "", adv = "", acts = [];
        
// 解析 Summary（匹配到 Activities 之前停止）
const summaryMatch = txt.match(/Summary\s*:?\s*([\s\S]*?)(?=\n\s*Activities\s*:?|$)/i);
if (summaryMatch) {
  s = summaryMatch[1].trim();
}
        
        // 解析 Advice
// 解析 Advice（如果有的话，在 Activities 之前停止）
const adviceMatch = txt.match(/Advice\s*:?\s*([\s\S]*?)(?=\n\s*Activities\s*:?|$)/i);
if (adviceMatch) {
  adv = adviceMatch[1].trim();
}
        
        // 解析 Activities JSON
        const activitiesMatch = txt.match(/Activities\s*:?\s*(\[[\s\S]*?\])/i);
        if (activitiesMatch) {
          try {
            const parsed = JSON.parse(activitiesMatch[1]);
            if (Array.isArray(parsed)) {
              acts = parsed.filter(a => a.name && a.description && a.imageUrl);
            }
          } catch (e) {
            console.warn("Failed to parse activities JSON:", e);
          }
        }

        setSummary(s);
        setAdvice(adv);
        setActivities(acts);

        // 写入缓存，限制最多 10 条，简单淘汰最旧
        const map = cacheRef.current;
        if (!map.has(signature)) {
          if (map.size >= 10) {
            const firstKey = map.keys().next().value;
            map.delete(firstKey);
          }
          map.set(signature, { summary: s, advice: adv, activities: acts });
        }

        onAdvice && onAdvice({ summary: s, advice: adv });
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
  }, [visible, autoAnalyze, trimmed, signature, onAdvice]);

  // -------- Text-to-Speech 功能 --------
  const handleVoice = () => {
    if (!summary && !advice) return;
    
    // 如果正在朗读，停止
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // 组合要朗读的文本
    const textToSpeak = `${summary ? 'Summary: ' + summary : ''} ${advice ? ' Advice: ' + advice : ''}`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // 清理 TTS
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // -------- 图表尺寸（SSR 兜底）--------
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isMobile = vw <= 480;
  const isTablet = vw <= 768;

  const chartDims = (() => {
    if (isMobile) {
      return {
        width: Math.min(300, vw - 32),
        height: 180,
        margin: { top: 20, right: 12, bottom: 50, left: 32 },
      };
    } else if (isTablet) {
      return {
        width: Math.min(380, vw - 48),
        height: 200,
        margin: { top: 22, right: 14, bottom: 55, left: 38 },
      };
    } else {
      return {
        width: Math.min(500, vw - 40),
        height: 240,
        margin: { top: 24, right: 16, bottom: 60, left: 44 },
      };
    }
  })();

  const { width, height, margin } = chartDims;
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const barGap = 8;
  const barWidth = trimmed.length
    ? Math.max(8, (chartW - barGap * (trimmed.length - 1)) / trimmed.length)
    : 0;

  const svgFontSize = isMobile ? 8 : 10;
  const formatValue = (v) => (v > 1.0001 ? `${v.toFixed(1)}%` : `${(v * 100).toFixed(1)}%`);

  // 只在可见时渲染
  if (!visible) return null;

  return (
    <div className="pi-root">
      {/* Chart Card */}
      <div className="pi-card chart">
        {trimmed.length === 0 ? (
          <div className="pi-empty">No data</div>
        ) : (
          <svg
            width={width}
            height={200}
            role="img"
            aria-label="Probability bar chart"
            className="pi-chart-svg"
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* Y grid + ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const val = t * maxValue;
                const y = chartH - (val / maxValue) * chartH;
                return (
                  <g key={i} transform={`translate(0,${y})`}>
                    <line x1={0} x2={chartW} stroke="var(--border)" />
                    <text
                      x={-8}
                      y={4}
                      textAnchor="end"
                      fontSize={svgFontSize}
                      fill="var(--muted)"
                    >
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
                    <rect x={0} y={y} width={barWidth} height={h} rx={8} fill="var(--accent)" />
                    <text
                      x={barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize={svgFontSize}
                      fill="var(--fg)"
                    >
                      {formatValue(v)}
                    </text>
                    <text
                      x={barWidth / 2}
                      y={chartH + 14}
                      textAnchor="middle"
                      fontSize={svgFontSize}
                      fill="var(--muted)"
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
      <div className="pi-card analysis">
        {loading && (
          <div className="pi-loading">
            <span className="pi-spinner" />
            Analyzing with Gemini...
          </div>
        )}
        {error && <div className="pi-error">Error: {error}</div>}
        {!loading && !error && (
          <div className="pi-sections">
            {summary && (
              <div>
                <div className="pi-section-title">Summary</div>
                <div className="pi-section-body">{summary}</div>
              </div>
            )}
            {advice && (
              <div>
                <div className="pi-section-title">Advice</div>
                <div className="pi-section-body">{advice}</div>
              </div>
            )}
            {!summary && !advice && <div className="pi-empty">No analysis yet.</div>}
          </div>
        )}
      </div>

      {/* Activities Card with Images */}
      {!loading && !error && activities.length > 0 && (
        <div className="pi-card activities">
          <div className="pi-section-title" style={{ marginBottom: 12 }}>Suggested Activities</div>
          <div className="pi-activities-grid">
            {activities.map((activity, idx) => (
              <div key={idx} className="pi-activity-card">
                <div className="pi-activity-image-wrapper">
                  <img
                    src={activity.imageUrl}
                    alt={activity.name}
                    className="pi-activity-image"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="pi-activity-image-fallback" style={{ display: 'none' }}>
                    <span style={{ fontSize: 32 }}>📷</span>
                  </div>
                </div>
                <div className="pi-activity-content">
                  <div className="pi-activity-name">{activity.name}</div>
                  <div className="pi-activity-description">{activity.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Button - Outside Analysis Card */}
      {!loading && !error && (summary || advice) && (
        <button
          className="calculate-btn"
          onClick={handleVoice}
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: isSpeaking 
              ? 'linear-gradient(135deg, transparent，100%)'
              : undefined,
          }}
        >
          <span style={{ fontSize: 18 }}>{isSpeaking ? '⏸️' : '🔊'}</span>
          <span>{isSpeaking ? 'Stop' : 'Voice'}</span>
        </button>
      )}
    </div>
  );
}