function getActiveLlmOverride() {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("omweb_active_llm_override");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
  }
  return {};
}

