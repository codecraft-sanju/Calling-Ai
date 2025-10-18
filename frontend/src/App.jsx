import { useMemo, useRef, useState, useEffect } from "react";
import { Toaster, toast } from "sonner"; // npm i sonner

/**
 * ENV + constants
 * - VITE_API_URL should point to your backend base (ngrok or hosted)
 *   example: VITE_API_URL="https://margarito-schistose-christa.ngrok-free.dev"
 */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://margarito-schistose-christa.ngrok-free.dev";

/* 🧩 helper fns */
function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Section({ title, children, className = "" }) {
  return (
    <section className={classNames("w-full max-w-3xl", className)}>
      <h2 className="text-lg font-semibold text-gray-200 mb-3">{title}</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
        {children}
      </div>
    </section>
  );
}

function KeyVal({ label, value, mono = false }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 py-1">
      <div className="text-gray-400">{label}</div>
      <div
        className={classNames("col-span-2 md:col-span-3 break-all", mono && "font-mono")}
      >
        {value}
      </div>
    </div>
  );
}

function PrettyCode({ data }) {
  const pretty = useMemo(() => {
    try {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      return String(data ?? "");
    }
  }, [data]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      toast.success("Copied to clipboard ✅");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute right-2 top-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
        title="Copy"
      >
        Copy
      </button>
      <pre className="font-mono text-xs md:text-sm whitespace-pre-wrap overflow-auto max-h-96 p-3 rounded-lg bg-black/60 text-green-300 border border-white/10">
        {pretty || "—"}
      </pre>
    </div>
  );
}

/* ✅ universal safe fetch */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [callResp, setCallResp] = useState(null);
  const [logs, setLogs] = useState([
    "🟢 Ready — click Start to trigger Exotel call",
  ]);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [backendOK, setBackendOK] = useState(false);
  const btnRef = useRef(null);

  const appendLog = (msg, type = "info") => {
    const prefix =
      type === "error"
        ? "❌"
        : type === "success"
        ? "✅"
        : type === "warn"
        ? "⚠️"
        : "ℹ️";
    setLogs((l) => [`${new Date().toLocaleTimeString()} ${prefix} ${msg}`, ...l].slice(0, 200));
  };

  /* 🩺 auto health check on mount */
  useEffect(() => {
    (async () => {
      appendLog("Checking backend health…");
      const ping = await safeFetch(`${API_BASE}/health`);
      if (ping.ok) {
        appendLog("Backend OK ✅", "success");
        setBackendOK(true);
      } else {
        appendLog("Backend not reachable!", "error");
        setBackendOK(false);
      }
    })();
  }, []);

  const startAICall = async () => {
    setError("");
    setLoading(true);
    setCallResp(null);
    appendLog("Verifying backend before call…");
    const ping = await safeFetch(`${API_BASE}/health`);
    if (!ping.ok) {
      appendLog("Backend unreachable or CORS blocked", "error");
      setError("Backend unreachable or CORS blocked");
      setLoading(false);
      return;
    }

    appendLog("Sending POST /api/call to backend…");
    const result = await safeFetch(`${API_BASE}/api/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!result.ok) {
      appendLog(`Backend error: ${result.error}`, "error");
      setError(result.error);
      setCallResp(result.data);
      toast.error("Backend error occurred ❌");
    } else {
      appendLog("✅ Call initiated via Exotel. Waiting for AI bridge…", "success");
      setCallResp(result.data);
      toast.success("Call initiated successfully 🚀");
    }
    setLoading(false);
  };

  const resetUI = () => {
    setCallResp(null);
    setError("");
    setLogs(["🔁 UI reset"]);
    toast("UI Reset");
  };

  return (
    <div
      className={classNames(
        "min-h-screen w-full transition-colors duration-300",
        isDark
          ? "bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      )}
    >
      <Toaster richColors position="top-right" />

      {/* Top Bar */}
      <header className="w-full border-b border-white/10 sticky top-0 backdrop-blur bg-black/20 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Freelancer AI Voice Caller
              </h1>
              <p className="text-xs md:text-sm text-gray-400">
                Exotel ↔ OpenAI Realtime bridge — Hinglish sales agent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={classNames(
                "h-3 w-3 rounded-full",
                backendOK ? "bg-green-500" : "bg-red-500"
              )}
              title={backendOK ? "Backend online" : "Backend offline"}
            />
            <span className="hidden md:inline text-xs text-gray-400">
              {API_BASE.replace(/^https?:\/\//, "")}
            </span>
            <button
              onClick={() => setIsDark((v) => !v)}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
              title="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 flex flex-col items-center gap-6">
        {/* Error Banner */}
        {error && (
          <div className="w-full max-w-3xl rounded-lg border border-red-500/30 bg-red-900/30 text-red-200 p-4 text-sm relative">
            <strong>🚨 Error:</strong> {error}
            <button
              onClick={() => setError("")}
              className="absolute right-2 top-2 bg-red-700/40 hover:bg-red-700/60 text-white text-xs px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>
        )}

        {/* Controls */}
        <Section title="Controls">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <button
              ref={btnRef}
              onClick={startAICall}
              disabled={loading}
              className={classNames(
                "px-6 py-3 rounded-xl font-semibold shadow-lg transition-all w-full md:w-auto",
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              )}
            >
              {loading ? "🔄 Calling…" : "📞 Start AI Call"}
            </button>

            <button
              onClick={resetUI}
              className="px-4 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 w-full md:w-auto"
            >
              ♻️ Reset
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-black/40 p-3 border border-white/10 text-sm">
              <KeyVal label="Backend Base" value={API_BASE} mono />
              <KeyVal label="Status" value={loading ? "Calling…" : "Idle"} />
              <KeyVal
                label="Hint"
                value="Exotel will dial → server sends wss URL → GPT joins stream"
              />
            </div>
            <div className="rounded-lg bg-black/40 p-3 border border-white/10 text-xs md:text-sm">
              <p className="text-gray-300">
                Make sure your backend is running & public (ngrok/hosted):
              </p>
              <pre className="font-mono mt-2 text-gray-300 overflow-auto">
{`ngrok http 5000 --domain=margarito-schistose-christa.ngrok-free.dev
node server.js`}
              </pre>
            </div>
          </div>
        </Section>

        {/* Live Logs */}
        <Section title="Live Logs">
          <ul className="space-y-1 max-h-56 overflow-auto text-sm w-full">
            {logs.map((l, i) => (
              <li
                key={i}
                className="px-3 py-2 rounded-md bg-black/40 border border-white/10 break-all"
              >
                {l}
              </li>
            ))}
          </ul>
        </Section>

        {/* Response */}
        <Section title="Latest API Response">
          {!callResp ? (
            <div className="text-sm text-gray-400">No response yet.</div>
          ) : (
            <details className="mt-2 w-full">
              <summary className="cursor-pointer text-sm text-gray-400">
                🔍 Show Raw Response
              </summary>
              <PrettyCode data={callResp} />
            </details>
          )}
        </Section>

        {/* Help */}
        <Section title="Quick Checklist" className="mb-10">
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-200">
            <li>
              Env <code className="font-mono">VITE_API_URL</code> → backend base
              URL.
            </li>
            <li>
              Backend must expose <code>/api/call</code> & return Exotel JSON.
            </li>
            <li>
              Exotel callback <code>/ai-voice-start</code> → sends{" "}
              <code>&lt;User&gt;wss://.../ws/ai&lt;/User&gt;</code>.
            </li>
            <li>
              GPT Realtime connects via{" "}
              <code>wss://api.openai.com/v1/realtime</code>.
            </li>
          </ul>
        </Section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs text-gray-400">
        Built for speed ⚡ — Exotel × OpenAI Realtime (Hinglish Agent)
      </footer>
    </div>
  );
}
