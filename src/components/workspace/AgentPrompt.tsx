import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import { SLASH_COMMANDS } from "@/lib/workspace/intent";

export function AgentPrompt({
  onSubmit,
  busy,
}: {
  onSubmit: (value: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const token = value.startsWith("/") && !value.includes(" ") ? value.toLowerCase() : null;
  const suggestions = token
    ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(token))
    : [];
  const menuOpen = suggestions.length > 0 && !busy;

  useEffect(() => {
    setHighlight(0);
  }, [token]);

  const submit = (override?: string) => {
    const v = (override ?? value).trim();
    if (!v || busy) return;
    onSubmit(v);
    setValue("");
    setTimeout(() => ref.current?.focus(), 0);
  };

  const pick = (cmd: string) => {
    setValue(cmd + " ");
    setTimeout(() => ref.current?.focus(), 0);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        pick(suggestions[highlight].cmd);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const cmd = suggestions[highlight].cmd;
        if (cmd === token) submit(cmd);
        else pick(cmd);
        return;
      }
      if (e.key === "Escape") {
        setValue("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <motion.div layout className="sticky bottom-0 z-30 px-3 pb-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-strong mb-2 overflow-hidden rounded-2xl p-1.5"
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.cmd}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(s.cmd)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    i === highlight ? "bg-secondary" : "hover:bg-secondary"
                  }`}
                >
                  <span className="font-mono text-signal">{s.cmd}</span>
                  <span className="truncate text-xs text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          className="glass-strong flex items-end gap-2 rounded-2xl px-3 py-2.5"
        >
          <label htmlFor="agent-prompt" className="sr-only">Ask the agent</label>
          <textarea
            id="agent-prompt"
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder={busy ? "Thinking…" : "Ask anything, or type / for commands…"}
            disabled={busy}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          <button
            onClick={() => submit()}
            disabled={!value.trim() || busy}
            aria-label="Send"
            className="btn-teal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:opacity-50"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
