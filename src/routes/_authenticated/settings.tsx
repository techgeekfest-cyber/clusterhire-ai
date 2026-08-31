import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Linkedin, Briefcase, Globe, Sun, Moon, FileSpreadsheet, ArrowRight } from "lucide-react";
import { useAppTheme } from "@/hooks/useAppTheme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ClusterHire" }] }),
  component: Settings,
});

const JOB_TITLES = ["Recruiter", "Hiring Manager", "HR Ops", "Talent Lead", "Other"] as const;
const INDUSTRIES = [
  "Software/SaaS", "Financial Services", "Retail/E-commerce", "Healthcare",
  "Manufacturing", "Marketing/Advertising", "Professional Services",
  "Media/Entertainment", "Education", "Non-profit", "Other",
] as const;
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"] as const;

const inputCls = "w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm outline-none focus:border-signal focus:ring-2 focus:ring-signal/25";

function Settings() {
  const qc = useQueryClient();
  const { theme, setTheme } = useAppTheme();

  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    full_name: "", job_title: "", job_title_other: "",
    company_name: "", company_industry: "", company_size: "",
  });
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase.from("profiles")
        .select("full_name, job_title, job_title_other, company_name, company_industry, company_size")
        .eq("id", u.user.id).maybeSingle();
      if (p) setForm({
        full_name: p.full_name ?? "", job_title: p.job_title ?? "",
        job_title_other: p.job_title_other ?? "", company_name: p.company_name ?? "",
        company_industry: p.company_industry ?? "", company_size: p.company_size ?? "",
      });
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert({ id: u.user.id, ...form });
      if (error) throw error;
      toast.success("Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const clearSamples = async () => {
    if (!confirm("Remove all sample candidates and requisitions?")) return;
    setClearing(true);
    try {
      const { error } = await supabase.rpc("clear_sample_data");
      if (error) throw error;
      toast.success("Sample data cleared");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setClearing(false); }
  };

  const patch = (p: Partial<typeof form>) => setForm({ ...form, ...p });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-display font-semibold">Appearance</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick how the signed-in app looks. The public homepage always stays light.
          </p>
          <div className="mt-4 inline-flex rounded-xl border border-border p-1">
            <button type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"}
              className={"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Sun className="h-4 w-4" /> Light
            </button>
            <button type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}
              className={"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-display font-semibold">Profile</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
              <input value={email} disabled className={inputCls + " opacity-70"} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Full name</span>
              <input value={form.full_name} onChange={(e) => patch({ full_name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Job title / role</span>
              <select value={form.job_title} onChange={(e) => patch({ job_title: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {JOB_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {form.job_title === "Other" && (
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Your role</span>
                <input value={form.job_title_other} onChange={(e) => patch({ job_title_other: e.target.value })} className={inputCls} />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Company name</span>
              <input value={form.company_name} onChange={(e) => patch({ company_name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Industry</span>
              <select value={form.company_industry} onChange={(e) => patch({ company_industry: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {INDUSTRIES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Company size</span>
              <select value={form.company_size} onChange={(e) => patch({ company_size: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-teal mt-4 rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold">Sample data</h3>
          <p className="mt-1 text-sm text-muted-foreground">Remove the seeded example candidates and requisitions. Your own data is untouched.</p>
          <button onClick={clearSamples} disabled={clearing} className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60">
            {clearing ? "Clearing…" : "Clear sample data"}
          </button>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold">Data sources & integrations</h3>
          <p className="mt-1 text-sm text-muted-foreground">Import candidates today with CSV. Direct ATS and sourcing integrations are planned.</p>

          <Link to="/import" className="mt-4 flex items-center gap-3 rounded-xl border border-signal/35 bg-signal-soft p-3 transition-colors hover:border-signal/60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-signal text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">CSV Import</span>
              <span className="block text-xs text-muted-foreground">Upload candidate data from a spreadsheet</span>
            </span>
            <span className="hidden rounded-full border border-signal/35 px-2 py-0.5 text-xs font-medium text-signal sm:inline">Available now</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-signal" />
          </Link>

          <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-secondary/50">
            {[
              { icon: Linkedin, name: "LinkedIn" },
              { icon: Briefcase, name: "Indeed" },
              { icon: Globe, name: "Greenhouse / Lever" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium">Planned</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

