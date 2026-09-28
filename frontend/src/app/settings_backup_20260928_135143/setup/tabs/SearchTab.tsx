// settings/setup/tabs/SearchTab.tsx
"use client";

import React from "react";

interface SearchTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function SearchTab({ config, setConfig }: SearchTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
          Search Engine Orchestration [search]
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Primary search engine, fallback chain, and rate limit retries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Primary Engine</label>
          <select
            value={config.search.engine}
            onChange={(e) => setConfig({ ...config, search: { ...config.search, engine: e.target.value } })}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-manus-xs"
          >
            <option value="Google">Google</option>
            <option value="DuckDuckGo">DuckDuckGo</option>
            <option value="Bing">Bing</option>
            <option value="Baidu">Baidu</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Fallback Chain (comma-separated)</label>
          <input
            type="text"
            value={Array.isArray(config.search.fallback_engines) ? config.search.fallback_engines.join(", ") : ""}
            onChange={(e) => setConfig({ ...config, search: { ...config.search, fallback_engines: e.target.value.split(",").map((s) => s.trim()) } })}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}
