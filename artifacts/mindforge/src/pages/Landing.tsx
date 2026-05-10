import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  GitBranch,
  Github,
  Globe2,
  Layers3,
  MessageSquareText,
  Network,
  Search,
  Sparkles,
} from "lucide-react";

const workflow = [
  {
    step: "01",
    title: "Collect the source material",
    copy: "Bring in PDFs, web pages, markdown notes, repositories, and quick thoughts without reshaping how you already work.",
  },
  {
    step: "02",
    title: "Ask across everything",
    copy: "yukara retrieves grounded passages, cites context, and keeps the conversation tied to your actual library.",
  },
  {
    step: "03",
    title: "Turn reading into memory",
    copy: "Generate flashcards, revisit weak concepts, and follow how ideas connect as your collection grows.",
  },
];

const capabilities = [
  { icon: FileText, label: "Document library", detail: "PDFs, notes, links, and code live in one searchable workspace." },
  { icon: MessageSquareText, label: "Grounded chat", detail: "Ask precise questions and keep answers attached to source context." },
  { icon: BookOpen, label: "Flashcard generation", detail: "Convert important sections into review material with a few clicks." },
  { icon: Network, label: "Knowledge graph", detail: "Reveal recurring entities, themes, and paths through your research." },
];

const graphNodes = [
  { label: "Retrieval", x: "15%", y: "30%" },
  { label: "Notes", x: "40%", y: "16%" },
  { label: "Graph", x: "70%", y: "26%" },
  { label: "Review", x: "28%", y: "68%" },
  { label: "Agent", x: "62%", y: "66%" },
];

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#112f2c] text-white shadow-sm">
        <GitBranch className="h-4 w-4" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-[#14211f]">yukara</span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="landing-product-preview relative mx-auto w-full min-w-0 overflow-hidden">
      <div className="absolute -left-4 top-10 hidden h-24 w-24 rounded-full border border-[#d6ebe5] lg:block" />
      <div className="relative max-w-full overflow-hidden rounded-xl border border-[#d7e3df] bg-[#f9fbfa] shadow-[0_28px_80px_rgba(20,33,31,0.16)]">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#dfe9e5] bg-white px-4 py-3">
          <BrandMark />
          <div className="hidden items-center gap-2 rounded-lg border border-[#dfe9e5] bg-[#f6faf8] px-3 py-2 text-sm text-[#65736f] md:flex">
            <Search className="h-4 w-4" />
            Search documents, entities, and sessions
          </div>
          <Link
            href="/workspace"
            className="hidden shrink-0 items-center gap-1 rounded-lg bg-[#112f2c] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1a4842] sm:inline-flex"
          >
            Open
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid min-h-[430px] max-w-full grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_250px]">
          <aside className="hidden border-r border-[#dfe9e5] bg-[#f4f8f6] p-4 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#65736f]">Library</p>
            {[
              ["Adaptive RAG notes", "PDF", "bg-[#e5f3ef] text-[#23645d]"],
              ["Repo architecture", "GitHub", "bg-[#fff3db] text-[#8b5b12]"],
              ["Market research", "URL", "bg-white text-[#65736f]"],
            ].map(([title, type, tone]) => (
              <div key={title} className="mb-2 rounded-lg border border-[#dfe9e5] bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  {type === "GitHub" ? <Github className="h-4 w-4 text-[#23645d]" /> : type === "URL" ? <Globe2 className="h-4 w-4 text-[#23645d]" /> : <FileText className="h-4 w-4 text-[#23645d]" />}
                  <span className="truncate text-sm font-medium text-[#14211f]">{title}</span>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${tone}`}>{type}</span>
              </div>
            ))}
          </aside>

          <main className="min-w-0 bg-white p-4 sm:p-6">
            <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#23645d]">Research synthesis</p>
                <h3 className="mt-1 break-words text-xl font-semibold tracking-tight text-[#14211f] sm:text-2xl">What changed across the retrieval pipeline?</h3>
              </div>
              <div className="hidden rounded-lg bg-[#f5faf8] px-3 py-2 text-xs font-medium text-[#65736f] sm:block">8 sources cited</div>
            </div>

            <div className="min-w-0 space-y-3">
              <div className="max-w-full rounded-lg bg-[#eff7f4] p-4 text-sm leading-6 text-[#20312e] sm:max-w-[78%]">
                Compare the chunking strategy, evaluation notes, and graph results from this week.
              </div>
              <div className="ml-auto max-w-full rounded-lg border border-[#dfe9e5] bg-white p-4 shadow-sm sm:max-w-[84%]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#14211f]">
                  <Sparkles className="h-4 w-4 text-[#c98516]" />
                  yukara answer
                </div>
                <p className="break-words text-sm leading-6 text-[#40514d]">
                  The main shift is from broad semantic retrieval to a narrower source-ranked pass. Notes tagged evaluation now influence the final answer before graph expansion.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {["chunker.ts: adaptive windows", "eval notes: citation drift"].map((item) => (
                    <div key={item} className="rounded-lg bg-[#f7faf9] px-3 py-2 text-xs font-medium text-[#65736f]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          <aside className="border-t border-[#dfe9e5] bg-[#f7faf9] p-4 lg:border-l lg:border-t-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#65736f]">Today</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {[
                ["42", "documents indexed"],
                ["18", "cards due"],
                ["91%", "answer confidence"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-[#dfe9e5] bg-white p-3">
                  <div className="text-2xl font-semibold text-[#14211f]">{value}</div>
                  <div className="text-xs text-[#65736f]">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#dfe9e5] bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#14211f]">
                <Network className="h-4 w-4 text-[#23645d]" />
                Active cluster
              </div>
              <div className="space-y-2 text-xs text-[#65736f]">
                {["retrieval quality", "citation coverage", "memory review"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d9971c]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#fbfdfc] text-[#14211f]">
      <header className="sticky top-0 z-40 max-w-[100vw] overflow-hidden border-b border-[#e2ebe8] bg-[#fbfdfc]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#4f5f5b] md:flex">
            <a href="#product" className="transition hover:text-[#14211f]">Product</a>
            <a href="#workflow" className="transition hover:text-[#14211f]">Workflow</a>
            <a href="#insights" className="transition hover:text-[#14211f]">Insights</a>
          </nav>
          <Link
            href="/workspace"
            className="hidden items-center gap-2 rounded-lg border border-[#cbdad6] bg-white px-3 py-2 text-sm font-semibold text-[#14211f] transition hover:border-[#8ebdb4] sm:inline-flex"
          >
            View workspace
          </Link>
        </div>
      </header>

      <main>
        <section id="product" className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:pt-16 lg:pb-16">
          <div className="space-y-12">
            <div className="mx-auto max-w-4xl min-w-0 text-left sm:text-center">
              <h1 className="landing-hero-title text-balance font-semibold leading-[1.02] tracking-tight text-[#14211f] sm:mx-auto sm:max-w-4xl sm:text-6xl lg:text-7xl">
                Weave your documents into working knowledge.
              </h1>
              <p className="landing-hero-copy mt-6 text-pretty text-base leading-7 text-[#4f5f5b] sm:mx-auto sm:max-w-2xl sm:text-lg sm:leading-8">
                yukara is a focused AI workspace for collecting sources, asking grounded questions, building memory, and seeing how your ideas connect.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#112f2c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a4842]"
                >
                  Start weaving
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbdad6] bg-white px-5 py-3 text-sm font-semibold text-[#14211f] transition hover:border-[#8ebdb4]"
                >
                  View workspace
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-[#dfe9e5] pt-6 text-left sm:mx-auto">
                {[
                  ["PDF", "parse"],
                  ["URL", "capture"],
                  ["Repo", "reason"],
                ].map(([label, detail]) => (
                  <div key={label}>
                    <div className="text-xl font-semibold text-[#14211f]">{label}</div>
                    <div className="text-sm text-[#65736f]">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="workflow" className="border-y border-[#e2ebe8] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A calmer loop from source to synthesis.</h2>
                <p className="mt-4 text-base leading-7 text-[#65736f]">
                  Keep the collection, conversation, review, and insight layers close together so research momentum does not leak between tools.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {workflow.map((item) => (
                  <article key={item.step} className="rounded-lg border border-[#dfe9e5] bg-[#fbfdfc] p-5">
                    <div className="mb-8 text-sm font-semibold text-[#c98516]">{item.step}</div>
                    <h3 className="text-lg font-semibold text-[#14211f]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#65736f]">{item.copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything your knowledge base needs to become useful.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {capabilities.map((item) => (
                <article key={item.label} className="rounded-lg border border-[#dfe9e5] bg-white p-5">
                  <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-[#eaf5f1] text-[#23645d]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-[#14211f]">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#65736f]">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="insights" className="bg-[#112f2c] text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See the shape of what you know.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#c6d8d3]">
                Graphs and analytics make the hidden structure visible: what topics repeat, which sources matter, and where your next review should go.
              </p>
              <div className="mt-8 space-y-3">
                {["Entity clusters stay connected to documents.", "Analytics track reading, review, and answer quality.", "Agents can work from the same grounded source layer."].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-[#e9f2ef]">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#d9971c] text-[#112f2c]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/[0.06] p-4 shadow-2xl">
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="relative min-h-[310px] overflow-hidden rounded-lg bg-[#173d38]">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 320" aria-hidden="true">
                    <path d="M78 96 C154 72, 212 66, 292 86" stroke="#75b8ac" strokeWidth="1.5" fill="none" opacity=".55" />
                    <path d="M118 210 C176 172, 224 174, 292 212" stroke="#d9971c" strokeWidth="1.5" fill="none" opacity=".75" />
                    <path d="M166 72 C164 134, 148 164, 116 214" stroke="#75b8ac" strokeWidth="1.5" fill="none" opacity=".45" />
                    <path d="M292 86 C296 138, 292 166, 262 212" stroke="#75b8ac" strokeWidth="1.5" fill="none" opacity=".45" />
                  </svg>
                  {graphNodes.map((node) => (
                    <div
                      key={node.label}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-[#14211f] shadow-lg"
                      style={{ left: node.x, top: node.y }}
                    >
                      {node.label}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    [BarChart3, "Answer quality", "91%"],
                    [Layers3, "Source coverage", "34 docs"],
                    [Network, "Connected ideas", "128 links"],
                  ].map(([Icon, label, value]) => {
                    const MetricIcon = Icon as typeof BarChart3;
                    return (
                      <div key={label as string} className="rounded-lg border border-white/12 bg-white/[0.08] p-4">
                        <MetricIcon className="mb-5 h-5 w-5 text-[#f0bd54]" />
                        <div className="text-2xl font-semibold">{value as string}</div>
                        <div className="text-sm text-[#c6d8d3]">{label as string}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid items-center gap-8 rounded-xl border border-[#dfe9e5] bg-white p-8 shadow-sm md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Build a knowledge base that answers back.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#65736f]">
                Start with your current sources, then let yukara organize the path from reading to recall.
              </p>
            </div>
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#112f2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1a4842]"
            >
              Start weaving
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
