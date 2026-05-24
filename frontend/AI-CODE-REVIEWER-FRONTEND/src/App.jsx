import { useState, useRef } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const API = import.meta.env.VITE_API_URL;

const SEV_CONFIG = {
  High:   { color: "#ff4d6d", bg: "rgba(255,77,109,0.12)", label: "Critical" },
  Medium: { color: "#ffb347", bg: "rgba(255,179,71,0.12)",  label: "Warning"  },
  Low:    { color: "#4cc9f0", bg: "rgba(76,201,240,0.12)",  label: "Info"     },
};

const CAT_ICONS = {
  Bug:          "🐛",
  Security:     "🔐",
  Performance:  "⚡",
  "Code Smell": "🧹",
};

// #10 Language badges
const LANGUAGE_BADGES = ["C++", "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust"];

// #8 Animated timeline steps
const LOADING_STEPS = [
  "Fetching PR...",
  "Parsing code diff...",
  "Analyzing control flow...",
  "Checking security risks...",
  "Generating review comments...",
];

// #1 Detect language from filename for syntax highlighter
function detectLanguage(filename) {
  if (!filename) return "javascript";
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
    py: "python", cpp: "cpp", cc: "cpp", c: "c", java: "java",
    go: "go", rs: "rust", rb: "ruby", php: "php", cs: "csharp",
  };
  return map[ext] || "javascript";
}

function SeverityBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.Low;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: 20,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}44`, fontFamily: "monospace",
      textTransform: "uppercase",
    }}>
      {cfg.label}
    </span>
  );
}

function IssueCard({ item, index }) {
  const [copied, setCopied] = useState(false);
  const cfg = SEV_CONFIG[item.severity] || SEV_CONFIG.Low;
  const lang = detectLanguage(item.filename);

  const copyFix = () => {
    navigator.clipboard.writeText(item.fix);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      background: "#0d1117", border: `1px solid ${cfg.color}33`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 10, padding: "18px 20px", position: "relative",
      animation: `slideIn 0.3s ease ${index * 0.05}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>{CAT_ICONS[item.category] || "⚠️"}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#8b949e", fontFamily: "monospace" }}>
                {item.category}
                {item.filename && (
                  <span style={{ color: "#58a6ff", marginLeft: 8 }}>
                    {item.filename.split("/").pop()}
                  </span>
                )}
                {item.line && (
                  <span style={{ color: "#6e7681", marginLeft: 6 }}>:{item.line}</span>
                )}
              </span>
              <SeverityBadge severity={item.severity} />
            </div>
            {item.confidence && (
              <div style={{ fontSize: 11, color: "#4cc9f0", fontFamily: "monospace", marginTop: 6 }}>
                {item.confidence}% confidence
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#e6edf3", fontWeight: 600, lineHeight: 1.5 }}>
              {item.issue}
            </p>
          </div>
        </div>
      </div>

      {/* #1 Syntax-highlighted snippet */}
      {item.snippet && (
        <div style={{ marginTop: 12, overflow: "hidden", borderRadius: 8, border: `1px solid ${cfg.color}33` }}>
          <SyntaxHighlighter
            language={lang}
            style={oneDark}
            customStyle={{ margin: 0, fontSize: 12, background: "#161b22", padding: "14px" }}
            wrapLongLines={true}
          >
            {item.snippet}
          </SyntaxHighlighter>
        </div>
      )}

      {/* #6 Impact field */}
      {item.impact && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: `${cfg.color}0d`,
          border: `1px solid ${cfg.color}33`,
          borderRadius: 6,
        }}>
          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>
            IMPACT
          </span>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#c9d1d9", lineHeight: 1.5 }}>
            {item.impact}
          </p>
        </div>
      )}

      <div style={{
        marginTop: 10, padding: "10px 14px",
        background: "rgba(56,139,253,0.08)",
        border: "1px solid rgba(56,139,253,0.2)",
        borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
      }}>
        <div>
          <span style={{ fontSize: 11, color: "#388bfd", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>
            SUGGESTED FIX
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#c9d1d9", lineHeight: 1.6 }}>
            {item.fix}
          </p>
        </div>
        <button onClick={copyFix} title="Copy fix" style={{
          background: "transparent", border: "1px solid #30363d",
          borderRadius: 6, padding: "4px 10px", cursor: "pointer",
          color: copied ? "#3fb950" : "#8b949e", fontSize: 12, flexShrink: 0,
          fontFamily: "monospace", transition: "color 0.2s",
        }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ count, label, color }) {
  return (
    <div style={{
      background: "#0d1117", border: `1px solid ${color}33`,
      borderRadius: 10, padding: "16px 20px", textAlign: "center",
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "monospace", lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ fontSize: 12, color: "#6e7681", marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function FileAccordion({ fileReview }) {
  const [open, setOpen] = useState(false);
  const count = fileReview.issues.length;
  const highCount = fileReview.issues.filter(i => i.severity === "High").length;

  return (
    <div style={{ border: "1px solid #21262d", borderRadius: 8, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "#161b22", border: "none", cursor: "pointer",
        padding: "12px 16px", display: "flex", justifyContent: "space-between",
        alignItems: "center", color: "#c9d1d9",
      }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#8b949e" }}>📄</span>
          {fileReview.filename}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {highCount > 0 && (
            <span style={{ background: "rgba(255,77,109,0.15)", color: "#ff4d6d", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>
              {highCount} critical
            </span>
          )}
          <span style={{ color: "#8b949e", fontSize: 12 }}>{count} issue{count !== 1 ? "s" : ""}</span>
          <span style={{
            color: "#8b949e", fontSize: 14,
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}>▶</span>
        </span>
      </button>
      {open && count > 0 && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, background: "#0d1117" }}>
          {fileReview.issues.map((item, i) => <IssueCard key={i} item={item} index={i} />)}
        </div>
      )}
      {open && count === 0 && (
        <div style={{ padding: 16, color: "#3fb950", fontSize: 13, fontFamily: "monospace", background: "#0d1117" }}>
          ✓ No issues found in this file
        </div>
      )}
    </div>
  );
}

// #8 Animated loading timeline component
function LoadingTimeline({ currentStep }) {
  const completedIndex = LOADING_STEPS.indexOf(currentStep);
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #21262d",
      borderRadius: 12, padding: "20px 24px", marginBottom: 24,
    }}>
      <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Analyzing...
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LOADING_STEPS.map((step, i) => {
          const done = i < completedIndex;
          const active = i === completedIndex;
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 13, fontFamily: "monospace", fontWeight: 700,
                color: done ? "#3fb950" : active ? "#58a6ff" : "#3d444d",
                minWidth: 16,
              }}>
                {done ? "✓" : active ? "›" : "○"}
              </span>
              <span style={{
                fontSize: 13,
                color: done ? "#3fb950" : active ? "#e6edf3" : "#3d444d",
                fontFamily: "monospace",
                transition: "color 0.3s",
              }}>
                {step}
              </span>
              {active && (
                <span style={{ fontSize: 11, color: "#58a6ff", animation: "pulse 1s infinite" }}>
                  ●
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [code, setCode]               = useState("");
  const [prUrl, setPrUrl]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [review, setReview]           = useState([]);
  const [fileReviews, setFileReviews] = useState([]);
  const [meta, setMeta]               = useState(null);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState("pr");
  const resultsRef                    = useRef(null);
  const [loadingText, setLoadingText] = useState("");
  // #2 AI Summary state
  const [summary, setSummary]         = useState("");

  const reset = () => {
    setReview([]); setFileReviews([]); setMeta(null);
    setError(null); setSummary("");
  };

  const scrollToResults = () =>
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  const startLoadingCycle = () => {
    let step = 0;
    setLoadingText(LOADING_STEPS[0]);
    const interval = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      setLoadingText(LOADING_STEPS[step]);
    }, 1500);
    return interval;
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    reset();
    setLoading(true);
    const interval = startLoadingCycle();
    try {
      const res = await axios.post(`${API}/review`, { code });
      setReview(res.data.review || []);
      setSummary(res.data.summary || "");
      scrollToResults();
    } catch (err) {
      setError(err.response?.data?.error || "Review failed. Is the server running?");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingText("");
    }
  };

  const fetchPR = async () => {
    if (!prUrl.trim()) return;
    reset();
    setLoading(true);
    const interval = startLoadingCycle();
    try {
      const res = await axios.post(`${API}/fetch-pr`, { prUrl });
      setReview(res.data.review || []);
      setFileReviews(res.data.files || []);
      setMeta(res.data.meta || null);
      setSummary(res.data.summary || "");
      scrollToResults();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch PR. Check the URL.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingText("");
    }
  };

  const highCount   = review.filter(i => i.severity === "High").length;
  const medCount    = review.filter(i => i.severity === "Medium").length;
  const lowCount    = review.filter(i => i.severity === "Low").length;
  const totalIssues = review.length;

  // Simple: each issue type adds to score directly, no normalization
  const riskScore = Math.min(
    (highCount * 30) + (medCount * 10) + (lowCount * 3),
    100
  );

  // Verdict based purely on score thresholds
  let verdict, verdictColor, scoreColor, scoreLabel;
  if (riskScore === 0) {
    scoreColor = "#3fb950"; scoreLabel = "Safe";
    verdict = "✅ Approve"; verdictColor = "#3fb950";
  } else if (riskScore >= 30) {
    scoreColor = "#ff4d6d"; scoreLabel = "High Risk";
    verdict = "🚫 Block PR"; verdictColor = "#ff4d6d";
  } else if (riskScore >= 10) {
    scoreColor = "#ffb347"; scoreLabel = "Moderate Risk";
    verdict = "⚠️ Needs Review"; verdictColor = "#ffb347";
  } else {
    scoreColor = "#3fb950"; scoreLabel = "Low Risk";
    verdict = "✅ Approve"; verdictColor = "#3fb950";
  }

  const hasResults = review.length > 0 || fileReviews.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#010409", color: "#c9d1d9", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #3d444d; }
        textarea, input { color: #c9d1d9 !important; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 8px 18px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .tab-btn.active { background: #21262d; color: #58a6ff; }
        .tab-btn:not(.active) { color: #6e7681; }
        .tab-btn:not(.active):hover { color: #c9d1d9; }
        .review-btn { width: 100%; border: none; border-radius: 8px; padding: 14px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.05em; transition: all 0.2s; }
        .review-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .review-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lang-badge { display: inline-block; font-size: 11px; font-family: monospace; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #161b22; border: 1px solid #30363d; color: #8b949e; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #21262d", padding: "16px 0",
        position: "sticky", top: 0, background: "rgba(1,4,9,0.95)", backdropFilter: "blur(12px)", zIndex: 100,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#e6edf3" }}>CodeGuard</span>
            <span style={{ fontSize: 11, color: "#58a6ff", background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.3)", borderRadius: 20, padding: "2px 10px" }}>AI</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6e7681" }}>
            <span style={{ color: "#3fb950" }}>● Live</span>
            <span>Groq · llama-3.1-8b</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#e6edf3", margin: "0 0 12px", lineHeight: 1.2 }}>
            AI-Powered Code Review
          </h1>
          <p style={{ fontSize: 16, color: "#8b949e", margin: "0 0 16px" }}>
            Detect bugs, security issues &amp; performance bottlenecks — instantly.
          </p>
          {/* #10 Language badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {LANGUAGE_BADGES.map(lang => (
              <span key={lang} className="lang-badge">{lang}</span>
            ))}
          </div>
        </div>

        {/* Input Card */}
        <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #21262d", display: "flex", gap: 4 }}>
            <button className={`tab-btn ${activeTab === "pr" ? "active" : ""}`} onClick={() => setActiveTab("pr")}>
              🔗 GitHub PR
            </button>
            <button className={`tab-btn ${activeTab === "paste" ? "active" : ""}`} onClick={() => setActiveTab("paste")}>
              📋 Paste Code
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {activeTab === "pr" ? (
              <>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <input
                    type="text" value={prUrl}
                    onChange={e => setPrUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && fetchPR()}
                    placeholder="https://github.com/owner/repo/pull/123"
                    style={{
                      width: "100%", background: "#161b22", border: "1px solid #30363d",
                      borderRadius: 8, padding: "12px 16px", fontSize: 14, outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "#6e7681", margin: "0 0 14px" }}>
                  Supports all public GitHub repositories. Private repo support via GitHub OAuth — coming soon.
                </p>
                <button className="review-btn" onClick={fetchPR} disabled={loading || !prUrl.trim()}
                  style={{ background: "linear-gradient(135deg, #238636, #2ea043)" }}>
                  {loading ? `⟳  ${loadingText}` : "▶  Analyze Pull Request"}
                </button>
              </>
            ) : (
              <>
                <textarea
                  value={code} onChange={e => setCode(e.target.value)}
                  placeholder="// Paste your code or diff here..."
                  style={{
                    width: "100%", height: 240, background: "#161b22",
                    border: "1px solid #30363d", borderRadius: 8, padding: "14px 16px",
                    fontSize: 13, resize: "vertical", outline: "none",
                    fontFamily: "inherit", lineHeight: 1.6, marginBottom: 14,
                  }}
                />
                <button className="review-btn" onClick={handleReview} disabled={loading || !code.trim()}
                  style={{ background: "linear-gradient(135deg, #1f6feb, #388bfd)" }}>
                  {loading ? `⟳  ${loadingText}` : "▶  Review Code"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)",
            borderRadius: 10, padding: "14px 18px", marginBottom: 24,
            color: "#ff4d6d", fontSize: 14, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* #8 Animated loading timeline */}
        {loading && loadingText && (
          <LoadingTimeline currentStep={loadingText} />
        )}

        {/* Results */}
        {hasResults && (
          <div ref={resultsRef}>

            {/* PR Meta */}
            {meta && (
              <div style={{
                background: "#0d1117", border: "1px solid #21262d", borderRadius: 12,
                padding: "16px 20px", marginBottom: 20,
                display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3", marginBottom: 4 }}>{meta.title}</div>
                  <div style={{ fontSize: 12, color: "#8b949e" }}>
                    by <span style={{ color: "#58a6ff" }}>@{meta.author}</span>
                    &nbsp;·&nbsp;
                    <span style={{ color: "#3fb950" }}>+{meta.additions}</span> / <span style={{ color: "#f85149" }}>-{meta.deletions}</span>
                    &nbsp;·&nbsp; {meta.changed_files} files
                    &nbsp;·&nbsp; {meta.head} → {meta.base}
                  </div>
                </div>
              </div>
            )}

            {/* #2 AI Summary */}
            {summary && (
              <div style={{
                background: "#0d1117",
                border: "1px solid #30363d",
                borderLeft: "3px solid #58a6ff",
                borderRadius: 10, padding: "16px 20px", marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, color: "#58a6ff", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 8 }}>
                  🤖 AI SUMMARY
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "#c9d1d9", lineHeight: 1.7 }}>
                  {summary}
                </p>
              </div>
            )}

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard count={review.length} label="Total Issues" color="#8b949e" />
              <StatCard count={highCount}     label="Critical"     color="#ff4d6d" />
              <StatCard count={medCount}      label="Warnings"     color="#ffb347" />
              <StatCard count={lowCount}      label="Info"         color="#4cc9f0" />
            </div>

            {/* #3 Score Banner with Verdict */}
            <div style={{
              background: "#0d1117", border: `1px solid ${scoreColor}44`,
              borderRadius: 10, padding: "14px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 4 }}>Overall Assessment</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: verdictColor, fontFamily: "monospace" }}>
                  {verdict}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor, fontFamily: "monospace", lineHeight: 1 }}>
                  {riskScore}/100
                </div>
                <div style={{ fontSize: 12, color: scoreColor, fontWeight: 700, marginTop: 2 }}>
                  {scoreLabel}
                </div>
              </div>
            </div>

            {/* File-level view */}
            {fileReviews.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 14, color: "#8b949e", margin: "0 0 12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Files Reviewed ({fileReviews.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {fileReviews.map((fr, i) => <FileAccordion key={i} fileReview={fr} />)}
                </div>
              </div>
            )}

            {/* Flat issues (paste mode) */}
            {fileReviews.length === 0 && review.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, color: "#8b949e", margin: "0 0 12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Issues Found ({review.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {review.map((item, i) => <IssueCard key={i} item={item} index={i} />)}
                </div>
              </div>
            )}

            {/* #7 Smart empty state */}
            {review.length === 0 && (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                background: "#0d1117", border: "1px solid #21262d", borderRadius: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ color: "#3fb950", fontWeight: 700, fontSize: 16 }}>
                  No major correctness or security issues detected.
                </div>
                <div style={{ color: "#6e7681", fontSize: 13, marginTop: 6 }}>
                  This code looks safe to merge. No bugs, security risks, or performance concerns were found.
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
