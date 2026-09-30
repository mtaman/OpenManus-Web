"use client";

import React from "react";
import { Search } from "lucide-react";

interface SearchTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function SearchTab({ config, setConfig }: SearchTabProps) {
  const engineOptions = ["Google", "DuckDuckGo", "Bing", "Baidu"];

  const toggleFallback = (eng: string) => {
    const list: string[] = Array.isArray(config.search.fallback_engines) ? [...config.search.fallback_engines] : [];
    const index = list.indexOf(eng);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(eng);
    }
    setConfig({
      ...config,
      search: {
        ...config.search,
        fallback_engines: list,
      },
    });
  };

  return (
    <div className="llm-tab w-full space-y-6 max-auto font-sans pb-6">
      <div className="border-b border-border w-full pb-4 pt-4 bg-custom">
        <div className="flex items-center gap-2 pr-4 pl-4">
          <Search size={16} className="text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wide">
            Search Engine Orchestration [search]
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 pr-4 pl-4">
          Select the primary search engine, fallback chain, regional language, and rate-limiting limits.
        </p>
      </div>

      <div className="w-full max-w-7xl space-y-9 pt-8 m-auto">
        <div className="p-5 rounded-md border border-border bg-card space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Primary Search Engine</label>
              <select
                value={config.search.engine}
                onChange={(e) => setConfig({ ...config, search: { ...config.search, engine: e.target.value } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-manus-xs"
              >
                {engineOptions.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Active Fallback Chain</label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {engineOptions.map((eng) => {
                  const isSelected = Array.isArray(config.search.fallback_engines) && config.search.fallback_engines.includes(eng);
                  return (
                    <button
                      key={eng}
                      type="button"
                      onClick={() => toggleFallback(eng)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-manus-xs"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {eng}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-border/60">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Retry Delay (seconds)</label>
              <input
                type="number"
                value={config.search.retry_delay ?? 60}
                onChange={(e) => setConfig({ ...config, search: { ...config.search, retry_delay: parseInt(e.target.value, 10) || 60 } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Max Retries</label>
              <input
                type="number"
                value={config.search.max_retries ?? 3}
                onChange={(e) => setConfig({ ...config, search: { ...config.search, max_retries: parseInt(e.target.value, 10) || 3 } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Search Language (lang)</label>
              <input
                type="text"
                value={config.search.lang || "en"}
                onChange={(e) => setConfig({ ...config, search: { ...config.search, lang: e.target.value } })}
                placeholder="en / ar"
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Region Country (country)</label>
              <input
                type="text"
                value={config.search.country || "us"}
                onChange={(e) => setConfig({ ...config, search: { ...config.search, country: e.target.value } })}
                placeholder="us / eg"
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}