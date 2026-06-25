"use client";

import { useState, useEffect, useRef } from "react";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

interface Props {
  onAdd: (ticker: string, name: string) => void;
  loading?: boolean;
}

export default function StockSearch({ onAdd, loading }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    onAdd(result.ticker, result.name);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company name…"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          disabled={loading}
        />
        {searching && (
          <span className="flex items-center px-2 text-xs text-zinc-400">searching…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((r) => (
            <li key={r.ticker}>
              <button
                onClick={() => handleSelect(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 w-16 shrink-0">
                  {r.ticker}
                </span>
                <span className="truncate text-zinc-700 dark:text-zinc-300">{r.name}</span>
                <span className="ml-auto text-xs text-zinc-400">{r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
