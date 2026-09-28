export type SettingsTab = "llm" | "browser" | "search" | "sandbox" | "mcp" | "system";

export type HubSubTab = "overview" | "lmstudio" | "cloud" | "custom";

export type ProviderConnectionStatus = "online" | "offline" | "untested" | "testing";

export type ApiModeType = "Auto-detect" | "Chat Completions" | "Responses API" | "Anthropic Messages";

export interface CustomEndpoint {
  id: string;
  name: string;
  providerId: string;
  endpointUrl: string;
  apiMode: ApiModeType;
  defaultModel: string;
  contextWindow: number | string;
  apiKey: string;
  status: ProviderConnectionStatus;
  latency?: number;
  lastError?: string;
  useForNewChats?: boolean;
}

export interface CloudProviderVaultItem {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  popularModels: string[];
  badge: "Cloud" | "Enterprise";
  keyPrefixHint: string;
  status: ProviderConnectionStatus;
  latency?: number;
  lastError?: string;
}

export interface LMStudioSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  status: ProviderConnectionStatus;
  latency?: number;
  lastError?: string;
}

export interface LLMConfig {
  provider: string;
  provider_name: string;
  model: string;
  base_url: string;
  api_key: string;
  max_tokens: number;
  temperature: number;
  api_type: string;
}

export interface LLMVisionConfig {
  provider?: string;
  provider_name?: string;
  model: string;
  base_url: string;
  api_key: string;
  max_tokens: number;
  temperature: number;
}

export interface BrowserProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface BrowserConfig {
  headless: boolean;
  disable_security: boolean;
  chrome_instance_path: string;
  cdp_url: string;
  wss_url: string;
  max_content_length: number;
  proxy: BrowserProxyConfig;
}

export interface SearchConfig {
  engine: string;
  fallback_engines: string[];
  retry_delay: number;
  max_retries: number;
  lang: string;
  country: string;
}

export interface SandboxConfig {
  use_sandbox: boolean;
  image: string;
  work_dir: string;
  memory_limit: string;
  cpu_limit: number;
  timeout: number;
  network_enabled: boolean;
}

export interface DaytonaConfig {
  daytona_api_key: string;
  daytona_server_url: string;
  daytona_target: string;
  sandbox_image_name: string;
  VNC_password: string;
}

export interface MCPConfig {
  server_reference: string;
}

export interface RunflowConfig {
  use_data_analysis_agent: boolean;
}

export interface FullAppConfig {
  llm: LLMConfig;
  llm_vision: LLMVisionConfig;
  browser: BrowserConfig;
  search: SearchConfig;
  sandbox: SandboxConfig;
  daytona: DaytonaConfig;
  mcp: MCPConfig;
  runflow: RunflowConfig;
}

export const INITIAL_CLOUD_PROVIDERS: CloudProviderVaultItem[] = [
  {
    id: "google",
    name: "Google Gemini",
    type: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: "",
    model: "gemini-2.0-flash",
    popularModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-pro-preview-05-06"],
    badge: "Cloud",
    keyPrefixHint: "Google Gemini keys start with 'AIzaSy...'",
    status: "untested"
  },
  {
    id: "deepseek",
    name: "DeepSeek / PPIO",
    type: "ppio",
    baseUrl: "https://api.ppinfra.com/v3/openai",
    apiKey: "",
    model: "deepseek/deepseek-v3-0324",
    popularModels: ["deepseek/deepseek-v3-0324", "deepseek/deepseek-r1", "deepseek-chat", "deepseek-reasoner"],
    badge: "Cloud",
    keyPrefixHint: "DeepSeek keys start with 'sk-...'",
    status: "untested"
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o",
    popularModels: ["gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4.5-preview", "chatgpt-4o-latest"],
    badge: "Cloud",
    keyPrefixHint: "OpenAI keys start with 'sk-proj-...'",
    status: "untested"
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    type: "",
    baseUrl: "https://api.anthropic.com/v1/",
    apiKey: "",
    model: "claude-3-7-sonnet-20250219",
    popularModels: ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    badge: "Cloud",
    keyPrefixHint: "Anthropic keys start with 'sk-ant-...'",
    status: "untested"
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    type: "azure",
    baseUrl: "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
    apiKey: "",
    model: "gpt-4o-mini",
    popularModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    badge: "Enterprise",
    keyPrefixHint: "Azure 32-character API key",
    status: "untested"
  }
];

export const INITIAL_LMSTUDIO_SETTINGS: LMStudioSettings = {
  baseUrl: "http://127.0.0.1:1234/v1",
  apiKey: "",
  model: "qwen3-vl-8b-instruct",
  status: "untested"
};
