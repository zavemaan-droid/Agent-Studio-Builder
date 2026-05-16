import { useState } from "react";
import { CheckCircle2, FileText, RefreshCcw, ShieldCheck } from "lucide-react";

const VERSION = "2026.05.15-draft";
const KEY = "agent-studio:legal-gate";

const tabs = [
  ["Terms", "Users are responsible for reviewing, testing, editing, and legally clearing generated apps, code, media, and assets before publishing or distributing them."],
  ["Privacy", "The app should explain stored project data, uploaded files, prompts, generated assets, payment data, agreement records, provider sharing, retention, and deletion options."],
  ["Acceptable Use", "The builder should be broad and creative, but must not be used for malware, credential theft, stalking, exploitation, real-world violence instructions, child sexual content, or other harmful/illegal systems."],
  ["Payments", "Standard builds are planned at $20 per app. Pro builds are planned at $30 per app with fewer optional constraints. Payment unlocks a specific build job."],
  ["Copyright / IP", "Users are responsible for rights to uploaded materials and reviewing generated outputs for copyright, trademark, licensing, privacy, and publicity-right issues."],
  ["AI Output", "AI output may be inaccurate, incomplete, unsafe, insecure, unsuitable, or require manual review. Generated output is not guaranteed final."],
] as const;

function readAccepted() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as { version: string; acceptedAt: number } : null;
  } catch {
    return null;
  }
}

export default function LegalGatePage() {
  const [accepted, setAccepted] = useState(readAccepted);
  const [checked, setChecked] = useState(false);
  const [active, setActive] = useState(0);

  const accept = () => {
    if (!checked) return;
    const next = { version: VERSION, acceptedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
    setAccepted(next);
  };

  const reset = () => {
    localStorage.removeItem(KEY);
    setAccepted(null);
    setChecked(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Legal Agreement Gate</h1>
        <p className="text-xs text-muted-foreground mt-0.5">First-launch terms, privacy, payments, copyright, and AI-output agreement preview</p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">User agreement before access</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Regular users must accept legal terms before building, repairing, generating assets, or paying.</p>
            </div>
          </div>

          {accepted ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Accepted {accepted.version} on {new Date(accepted.acceptedAt).toLocaleString()}</span>
              <button onClick={reset} className="text-muted-foreground hover:text-foreground flex items-center gap-1"><RefreshCcw className="w-3 h-3" />Reset</button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 text-xs leading-relaxed">
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5" />
                <span>I have read and agree to the Terms of Service, Privacy Policy, Acceptable Use Policy, Payment Terms, and Copyright/IP Terms.</span>
              </label>
              <button onClick={accept} disabled={!checked} className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Agree & Continue</button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold">Fine print viewer</h2></div>
          <div className="flex overflow-x-auto border-b border-border">
            {tabs.map((tab, index) => <button key={tab[0]} onClick={() => setActive(index)} className={`px-3 py-2 text-xs whitespace-nowrap ${active === index ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>{tab[0]}</button>)}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold">{tabs[active][0]}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tabs[active][1]}</p>
            <p className="text-[10px] text-amber-400 mt-4">Draft only — final public language should be reviewed before launch.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
