import type { ModelMetadata } from "./types";

export const METADATA_STORAGE_KEY = "omweb_models_metadata_vault";

export interface InferredCapabilities {
  isVision: boolean;
  isTools: boolean;
  isReasoning: boolean;
  contextDisplay: string | null;
  paramsDisplay: string | null;
  quantDisplay: string | null;
  publisherDisplay: string | null;
  archDisplay: string | null;
  formatDisplay: string | null;
  loadedContext: number | null;
  maxContext: number | null;
}

export function getLocalMetadataVault(): Record<string, ModelMetadata> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalMetadataVault(newEntries: Record<string, Partial<ModelMetadata>>) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalMetadataVault();
    const updated = { ...current, ...newEntries };
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("omweb:metadata-updated", { detail: updated }));
  } catch (e) {
    console.error("Failed to save models metadata:", e);
  }
}

export async function fetchServerMetadata(): Promise<Record<string, ModelMetadata>> {
  try {
    const res = await fetch("http://localhost:8088/api/config/models-metadata");
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.metadata) {
        saveLocalMetadataVault(data.metadata);
        return data.metadata;
      }
    }
  } catch (err) {
    console.warn("Could not load backend metadata cache:", err);
  }
  return getLocalMetadataVault();
}

export function getModelMetadata(modelKey: string): ModelMetadata | null {
  const vault = getLocalMetadataVault();
  return vault[modelKey] || null;
}

/**
 * Universal capability inference function based on 2026 AI industry standards.
 */
export function inferModelCapabilities(modelKey: string, explicitMeta?: Partial<ModelMetadata> | null): InferredCapabilities {
  const meta = explicitMeta || getModelMetadata(modelKey) || {};
  const lowerKey = (modelKey || "").toLowerCase();

  // 1. Vision Capability
  const isVision = Boolean(
    meta.capabilities?.vision ||
    lowerKey.includes("vision") ||
    lowerKey.includes("-vl") ||
    lowerKey.includes("llava") ||
    lowerKey.includes("omni") ||
    lowerKey.includes("4o") ||
    lowerKey.includes("gemini") ||
    lowerKey.includes("claude-3")
  );

  // 2. Tool / Function Calling Capability
  const isTools = Boolean(
    meta.capabilities?.trained_for_tool_use ||
    lowerKey.includes("instruct") ||
    lowerKey.includes("tool") ||
    lowerKey.includes("function") ||
    lowerKey.includes("gpt") ||
    lowerKey.includes("claude") ||
    lowerKey.includes("gemini") ||
    lowerKey.includes("qwen") ||
    lowerKey.includes("llama-3")
  );

  // 3. Reasoning / Deep Thinking Capability
  const isReasoning = Boolean(
    lowerKey.includes("think") ||
    lowerKey.includes("reason") ||
    lowerKey.includes("-r1") ||
    lowerKey.includes("deepseek-r1") ||
    lowerKey.includes("o1") ||
    lowerKey.includes("o3") ||
    lowerKey.includes("qwq")
  );

  // 4. Context Window resolution with fallback to known standard model specifications
  const loadedContext = meta.loaded_instances && meta.loaded_instances[0]?.config?.context_length
    ? meta.loaded_instances[0].config.context_length
    : null;

  let maxContext = meta.max_context_length || null;
  if (!maxContext) {
    if (lowerKey.includes("gemini-1.5") || lowerKey.includes("gemini-2.0")) maxContext = 1048576;
    else if (lowerKey.includes("claude-3") || lowerKey.includes("claude-3-5")) maxContext = 200000;
    else if (lowerKey.includes("gpt-4o") || lowerKey.includes("o1") || lowerKey.includes("o3")) maxContext = 128000;
    else if (lowerKey.includes("deepseek")) maxContext = 131072;
    else if (lowerKey.includes("llama-3.1") || lowerKey.includes("llama-3.2") || lowerKey.includes("llama-3.3")) maxContext = 131072;
    else if (lowerKey.includes("qwen2.5") || lowerKey.includes("qwen3")) maxContext = 131072;
    else if (lowerKey.includes("gemma-4")) maxContext = 262144;
    else if (lowerKey.includes("nemotron")) maxContext = 1048576;
  }

  let contextDisplay: string | null = null;
  if (loadedContext && maxContext) {
    contextDisplay = `${Math.round(loadedContext / 1024)}K / ${Math.round(maxContext / 1024)}K ctx`;
  } else if (loadedContext) {
    contextDisplay = `${Math.round(loadedContext / 1024)}K ctx`;
  } else if (maxContext) {
    contextDisplay = maxContext >= 1024 ? `${Math.round(maxContext / 1024)}K ctx` : `${maxContext} ctx`;
  }

  // 5. Parameter Count
  let paramsDisplay: string | null = meta.params_string || null;
  if (!paramsDisplay) {
    const match = lowerKey.match(/(\d+(\.\d+)?b)/);
    if (match) paramsDisplay = match[1].toUpperCase();
  }

  // 6. Quantization
  let quantDisplay: string | null = meta.quantization?.name || null;
  if (!quantDisplay) {
    const qMatch = modelKey.match(/(q\d+_[a-z0-9_]+|qat|fp16|bf16|int8|int4)/i);
    if (qMatch) quantDisplay = qMatch[1].toUpperCase();
  }

  return {
    isVision,
    isTools,
    isReasoning,
    contextDisplay,
    paramsDisplay,
    quantDisplay,
    publisherDisplay: meta.publisher || null,
    archDisplay: meta.architecture || null,
    formatDisplay: meta.format ? meta.format.toUpperCase() : null,
    loadedContext,
    maxContext
  };
}
