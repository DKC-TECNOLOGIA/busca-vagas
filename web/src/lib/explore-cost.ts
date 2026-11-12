// The cost-honesty taxonomy — a single source for the FREE vs $ boundary that the
// Explorer teaches by repetition. Discovery (finding roles) is structurally free:
// it calls no LLM. Only evaluation (scoring a role against your CV) spends tokens,
// and only when the user chooses it. The framing is always local-first: "your key,
// your AI, your machine."

export type CostClass = "free" | "free-network" | "spend" | "free-gemini";

export const COST_META: Record<CostClass, { label: string; tip: string }> = {
  "free-network": {
    label: "Grátis",
    tip: "Varre a rede pública de ATS via HTTP. Sem IA, sem tokens, nada enviado — e nada é salvo até você escolher adicionar uma vaga.",
  },
  free: {
    label: "Grátis",
    tip: "Sem uso de tokens. Lê ou grava apenas arquivos locais.",
  },
  spend: {
    label: "Usa tokens",
    tip: "Executa uma avaliação real A–F na sua própria IA. É a única ação que consome tokens — e só quando você escolhe uma vaga.",
  },
  "free-gemini": {
    label: "Grátis · Gemini",
    tip: "Avalia com a camada gratuita do Gemini — sem custo de tokens.",
  },
};
