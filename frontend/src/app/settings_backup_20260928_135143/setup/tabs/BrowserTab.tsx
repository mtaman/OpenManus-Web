// settings/setup/tabs/BrowserTab.tsx
"use client";

import React from "react";

interface BrowserTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function BrowserTab({ config, setConfig }: BrowserTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
          Browser Automation & CDP [browser]
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Headless flags, Playwright security toggles, and remote DevTools debugging.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">CDP URL</label>
          <input
            type="text"
            value={config.browser.cdp_url}
            onChange={(e) => setConfig({ ...config, browser: { ...config.browser, cdp_url: e.target.value } })}
            placeholder="http://localhost:9222"
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-peldrun-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Chrome Path</label>
          <input
            type="text"
            value={config.browser.chrome_instance_path || ""}
            onChange={(e) => setConfig({ ...config, browser: { ...config.browser, chrome_instance_path: e.target.value } })}
            placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-peldrun-xs"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.browser.headless}
            onChange={(e) => setConfig({ ...config, browser: { ...config.browser, headless: e.target.checked } })}
            className="rounded border-border text-primary"
          />
          <span className="text-xs text-foreground">Headless Mode (Run browser invisibly in background)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.browser.disable_security}
            onChange={(e) => setConfig({ ...config, browser: { ...config.browser, disable_security: e.target.checked } })}
            className="rounded border-border text-primary"
          />
          <span className="text-xs text-foreground">Disable Browser Security (Bypass CORS restrictions)</span>
        </label>
      </div>
    </div>
  );
}
