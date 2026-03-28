"use client";

import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Download,
  History,
  Image as ImageIcon,
  LayoutTemplate,
  Send,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const workflow = [
  {
    step: "01",
    title: "Prompt",
    desc: "Describe your campaign in natural language.",
    icon: Wand2,
  },
  {
    step: "02",
    title: "Generate",
    desc: "AI crafts the copy and structures the layout.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Preview",
    desc: "Live desktop and mobile rendering.",
    icon: Smartphone,
  },
  {
    step: "04",
    title: "Export",
    desc: "Download clean HTML or React Email source.",
    icon: Download,
  },
];

const campaignTypes = [
  "Newsletters",
  "Product Launches",
  "Welcome Series",
  "Transactional",
];

const panelClass =
  "border border-border/70 bg-card/70 backdrop-blur-xl shadow-premium";

export default function LandingPage() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);
  const workspaceHref = isLoggedIn ? "/chat" : "/login";

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-artifact-empty-mesh" />
        <div className="absolute inset-0 bg-pattern-grid-32" />
        <div className="absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-glow-warm blur-[120px]" />
        <div className="absolute right-[8%] top-[22rem] h-72 w-72 rounded-full bg-chart-2/10 blur-[110px]" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight">
                EmailGen
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
            ) : null}
            <Link
              href={workspaceHref}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform duration-300 hover:-translate-y-0.5"
            >
              Start for free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative px-6 pb-20 pt-36 md:pt-44">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="mx-auto max-w-5xl text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.05em] md:text-7xl lg:text-[5.5rem]">
              Generate beautiful,
              <br />
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                campaign-ready emails
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-8 text-muted-foreground md:text-xl">
              Create premium, high-converting, brand-consistent emails in
              minutes. Built for growth marketers, sales reps, and lifecycle
              teams who care about polish.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={workspaceHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
              >
                Open Workspace <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="rounded-full border border-border/70 bg-card/50 px-5 py-3 text-sm text-muted-foreground">
                Free to try. No credit card required.
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-20 max-w-6xl"
          >
            <div className="absolute inset-x-20 -top-10 h-32 rounded-full bg-primary/12 blur-3xl" />
            <div
              className={`relative overflow-hidden rounded-[2rem] p-2 md:rounded-[2.5rem] ${panelClass}`}
            >
              <div className="grid min-h-[32rem] grid-cols-1 overflow-hidden rounded-[1.5rem] border border-border/50 bg-surface-canvas lg:grid-cols-[0.95fr_1.35fr]">
                <div className="flex flex-col border-b border-border/60 bg-surface-code p-6 text-sm lg:border-b-0 lg:border-r">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Wand2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Prompt Session
                      </p>
                      <div className="mt-1 h-4 w-28 rounded-full bg-foreground/10" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 text-muted-foreground shadow-sm">
                      Create a product launch email for our new &apos;Pro&apos;
                      tier. Keep it refined, modern, and use the uploaded brand
                      assets.
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          Generating
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                        <div className="h-full w-2/3 rounded-full bg-primary" />
                      </div>
                    </div>
                    <div className="mt-auto rounded-2xl border border-border/50 bg-card/50 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <span>Brand assets</span>
                        <span>Ready</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="aspect-square rounded-2xl bg-primary/10" />
                        <div className="aspect-square rounded-2xl bg-accent/20" />
                        <div className="aspect-square rounded-2xl bg-secondary/50" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col justify-center bg-surface-elevated p-6 md:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Live Preview
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        Desktop and mobile ready
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Smartphone className="h-3 w-3" /> Mobile
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background">
                        <LayoutTemplate className="h-3 w-3" /> Desktop
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-border/70 bg-background p-6 shadow-3xl">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="h-10 w-10 rounded-2xl bg-foreground" />
                      <div className="h-2 w-24 rounded-full bg-muted" />
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3 text-center">
                        <div className="mx-auto h-8 w-2/3 rounded-full bg-muted" />
                        <div className="mx-auto h-3 w-5/6 rounded-full bg-muted/70" />
                        <div className="mx-auto h-3 w-2/3 rounded-full bg-muted/70" />
                      </div>
                      <div className="flex aspect-[16/9] items-center justify-center rounded-[1.5rem] border border-border/60 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/50">
                        <ImageIcon className="h-10 w-10 text-primary/70" />
                      </div>
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background">
                          View offer <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Render Time
                      </p>
                      <p className="mt-2 text-2xl font-semibold">42s</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Responsive
                      </p>
                      <p className="mt-2 text-2xl font-semibold">2 views</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Export
                      </p>
                      <p className="mt-2 text-2xl font-semibold">HTML + JSX</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface-canvas/70 px-6 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-primary">
              Workflow
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              The all-in-one workflow
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From idea to inbox-ready HTML in minutes, not hours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {workflow.map((item) => (
              <div
                key={item.step}
                className={`group relative overflow-hidden rounded-[1.75rem] p-8 transition-transform duration-300 hover:-translate-y-1 ${panelClass}`}
              >
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="absolute right-5 top-4 text-5xl font-semibold tracking-[-0.06em] text-foreground/5 transition-colors group-hover:text-primary/15">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid auto-rows-[320px] grid-cols-1 gap-6 md:grid-cols-3">
            <div
              className={`group relative overflow-hidden rounded-[2rem] p-10 md:col-span-2 ${panelClass}`}
            >
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10 max-w-md">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-semibold tracking-tight">
                  Brand Asset Management
                </h3>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  Upload your logos, product shots, and brand imagery once. The
                  AI automatically integrates your specific image URLs into
                  every generated email.
                </p>
              </div>
              <div className="absolute -bottom-10 -right-10 flex h-64 w-64 rotate-12 items-center justify-center rounded-[2rem] border border-border/60 bg-card/40">
                <ImageIcon className="h-16 w-16 text-primary/30" />
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-[2rem] p-10 ${panelClass}`}
            >
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Dev-Ready Code
                </h3>
                <p className="mt-4 leading-7 text-muted-foreground">
                  Get production-ready HTML or clean React Email source code
                  instantly.
                </p>
              </div>
              <div className="mt-8 rounded-2xl border border-border/60 bg-surface-code p-4 font-mono text-xs leading-6 text-muted-foreground">
                <span className="text-primary">&lt;Html&gt;</span>
                <br />
                &nbsp;&nbsp;<span className="text-accent">&lt;Head /&gt;</span>
                <br />
                &nbsp;&nbsp;<span className="text-primary">&lt;Body&gt;</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="text-chart-3">&lt;Container&gt;</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...
              </div>
            </div>

            <div className={`rounded-[2rem] p-10 ${panelClass}`}>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/70 text-secondary-foreground">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">
                Any Campaign
              </h3>
              <ul className="mt-6 space-y-4">
                {campaignTypes.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-[2rem] p-10 md:col-span-2 ${panelClass}`}>
              <div className="max-w-md">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-semibold tracking-tight">
                  Persistent Workspace
                </h3>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  Save your campaign history, return to previous prompts, and
                  keep building on the emails that already worked. Your best
                  campaigns become a reusable system, not one-off drafts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-32">
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent via-primary/6 to-accent/10" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-primary">
            Start now
          </p>
          <h2 className="mt-6 text-balance text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
            Ready to upgrade your email workflow?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-muted-foreground">
            Join teams creating better emails faster. Start generating inside
            the workspace today.
          </p>
          <Link
            href={workspaceHref}
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-10 py-5 text-lg font-medium text-background shadow-lg shadow-foreground/10 transition-transform duration-300 hover:-translate-y-0.5"
          >
            Open Workspace <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2 text-foreground">
            <Send className="h-4 w-4 text-primary" />
            <span className="font-medium">EmailGen</span>
          </div>
          <p>(c) {new Date().getFullYear()} EmailGen. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
