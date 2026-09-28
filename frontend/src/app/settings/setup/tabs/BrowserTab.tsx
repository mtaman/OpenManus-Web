"use client";

import React, { useState } from "react";
import { Globe, Shield, Terminal, Eye, EyeOff } from "lucide-react";

interface BrowserTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function BrowserTab({ config, setConfig }: BrowserTabProps) {
  const [showProxyPass, setShowProxyPass] = useState(false);

  const proxy = config.browser.proxy || { server: "", username: "", password: "" };

  const updateProxy = (field: string, val: string) => {
    setConfig({
      ...config,
      browser: {
        ...config.browser,
        proxy: {
          ...proxy,
          [field]: val,
        },
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
            Browser Automation & CDP [browser]
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Headless execution, DevTools protocol, browser proxying, and DOM capture constraints.
        </p>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-manus-xs">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Execution Endpoints
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">CDP URL (Remote DevTools)</label>
            <input
              type="text"
              value={config.browser.cdp_url || ""}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, cdp_url: e.target.value } })}
              placeholder="http://localhost:9222"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Chrome Executable Path</label>
            <input
              type="text"
              value={config.browser.chrome_instance_path || ""}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, chrome_instance_path: e.target.value } })}
              placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">WebSocket URL (wss_url)</label>
            <input
              type="text"
              value={config.browser.wss_url || ""}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, wss_url: e.target.value } })}
              placeholder="wss://browserless.example.com"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Max DOM Content Length (chars)</label>
            <input
              type="number"
              value={config.browser.max_content_length || 2000}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, max_content_length: parseInt(e.target.value, 10) || 2000 } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border/60">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.browser.headless}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, headless: e.target.checked } })}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-xs text-foreground font-medium">Headless Mode (Run browser invisibly in background)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.browser.disable_security}
              onChange={(e) => setConfig({ ...config, browser: { ...config.browser, disable_security: e.target.checked } })}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-amber-500" />
              <span className="text-xs text-foreground font-medium">Disable Browser Security (Bypass CORS & iframe isolation)</span>
            </div>
          </label>
        </div>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-manus-xs">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Browser Network Proxy [browser.proxy]
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Proxy Server</label>
            <input
              type="text"
              value={proxy.server || ""}
              onChange={(e) => updateProxy("server", e.target.value)}
              placeholder="http://proxy-server:8080 or socks5://127.0.0.1:1080"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Username (optional)</label>
            <input
              type="text"
              value={proxy.username || ""}
              onChange={(e) => updateProxy("username", e.target.value)}
              placeholder="Username"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-muted-foreground">Password (optional)</label>
              <button
                type="button"
                onClick={() => setShowProxyPass(!showProxyPass)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showProxyPass ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showProxyPass ? "Hide" : "Show"}</span>
              </button>
            </div>
            <input
              type={showProxyPass ? "text" : "password"}
              value={proxy.password || ""}
              onChange={(e) => updateProxy("password", e.target.value)}
              placeholder="Password"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono shadow-manus-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
