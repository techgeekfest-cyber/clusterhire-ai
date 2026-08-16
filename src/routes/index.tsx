import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroImage from "@/assets/hero-team-review.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClusterHire — AI candidate discovery and ranking" },
      { name: "description", content: "ClusterHire clusters, ranks, and explains your candidate pipeline so recruiters can find and hire the strongest people faster." },
      { property: "og:title", content: "ClusterHire — AI candidate discovery and ranking" },
      { property: "og:description", content: "Cluster, rank, and explain your candidate pipeline with an AI assistant built for recruiters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-1">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.14]"
            style={{ backgroundImage: `url(${heroImage.url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1)" }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(10,10,11,0.9) 70%)" }}
          />
          <div className="relative px-6 py-16 text-center sm:px-12 sm:py-24">
            <span className="chip-signal inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
              AI-native applicant intelligence
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Discover, rank, and hire the best — <span className="text-muted-foreground">with AI in your corner</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ClusterHire brings every candidate, requisition, and stage into one shared pipeline — with an AI assistant that helps you find, understand, and rank your talent so you can hire with confidence.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/auth" className="btn-teal px-6 py-3 text-sm font-semibold">Start now</Link>
              <Link to="/docs" className="btn-ghost px-6 py-3 text-sm font-semibold">See how it works</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <p className="eyebrow text-center">How it works</p>
        <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight">From open role to signed offer</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {[
            { n: "01", t: "Open a requisition", d: "Define the role, hiring manager, and target start date. Your open roles live in one place, ready for candidates." },
            { n: "02", t: "Ask the AI", d: "Ask in plain English who's strongest, who's stuck, and which sources convert. The assistant reads your live pipeline and answers — no dashboards to build." },
            { n: "03", t: "Move and hire", d: "Advance candidates across stages — Applied → Screen → Interview → Offer → Hired — watch time-in-stage and conversion, and close the offer." },
          ].map((s) => (
            <div key={s.t} className="bg-surface-1 p-6 sm:p-8">
              <span className="font-mono text-xs text-signal">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-center">Frequently asked</h2>
        <div className="glass mt-8 rounded-2xl p-2 sm:p-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="a">
              <AccordionTrigger>Is my data shared with other users?</AccordionTrigger>
              <AccordionContent>No. Every account has its own private workspace. Row-level security scopes every candidate and requisition to your user only.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Do you integrate with LinkedIn or job boards?</AccordionTrigger>
              <AccordionContent>Not yet — this is a template. The Settings page has a "Connect your tools" section marked coming soon; import via CSV works today.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Can I remix this template?</AccordionTrigger>
              <AccordionContent>Yes. Schema, RLS, auth, and sample seeds carry over on remix. Your candidate data does not — see the Docs page for details.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="d" className="border-b-0">
              <AccordionTrigger>What sign-in methods are supported?</AccordionTrigger>
              <AccordionContent>Email + password and Continue with Google.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </MarketingShell>
  );
}
