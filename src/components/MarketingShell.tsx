import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLockup, BrandMark } from "@/components/BrandMark";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" aria-label="ClusterHire home">
            <BrandLockup />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/docs" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">Docs</Link>
            <Link to="/auth" className="btn-teal px-4 py-2 text-sm">Sign in</Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-8 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span className="flex items-center gap-2">
            <BrandMark className="h-6 w-6 text-foreground" />
            <span>ClusterHire — AI candidate discovery and ranking</span>
          </span>
          <Link to="/docs" className="transition-colors hover:text-foreground">Docs</Link>
        </div>
      </footer>
    </div>
  );
}

