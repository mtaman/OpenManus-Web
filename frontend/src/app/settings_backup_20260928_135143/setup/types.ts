// settings/setup/types.ts
export type SettingsTab = "llm" | "browser" | "search" | "sandbox" | "mcp" | "system";

export interface ProviderPreset {
  id: string;
  name: string;
  type: string;
  defaultBaseUrl: string;
  defaultModel: string;
  badge: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: "lmstudio", name: "LM Studio (Local)", type: "", defaultBaseUrl: "http://127.0.0.1:1234/v1", defaultModel: "qwen3-vl-8b-instruct", badge: "Local GPU" },
  { id: "ollama", name: "Ollama (Local)", type: "ollama", defaultBaseUrl: "http://localhost:11434/v1", defaultModel: "llama3.2", badge: "Local" },
  { id: "anthropic", name: "Anthropic Claude", type: "", defaultBaseUrl: "https://api.anthropic.com/v1/", defaultModel: "claude-3-7-sonnet-20250219", badge: "Cloud" },
  { id: "openai", name: "OpenAI", type: "", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o", badge: "Cloud" },
  { id: "google", name: "Google Gemini", type: "", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", defaultModel: "gemini-2.0-flash", badge: "Cloud" },
  { id: "ppio", name: "DeepSeek / PPIO", type: "ppio", defaultBaseUrl: "https://api.ppinfra.com/v3/openai", defaultModel: "deepseek/deepseek-v3-0324", badge: "Cloud" },
  { id: "jiekou", name: "Jiekou.AI", type: "jiekou", defaultBaseUrl: "https://api.jiekou.ai/openai", defaultModel: "claude-sonnet-4-5-20250929", badge: "Cloud" },
  { id: "azure", name: "Azure OpenAI", type: "azure", defaultBaseUrl: "https://your-resource.openai.azure.com/openai/deployments/your-deployment", defaultModel: "gpt-4o-mini", badge: "Enterprise" },
];
