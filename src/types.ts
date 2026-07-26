// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Stat        { value: string; label: string; color?: string }
export interface Service     { num: string; title: string; desc: string; tags: string[] }
export interface Result      { num: string; label: string }
export interface Testimonial { quote: string; name: string; role: string; metric: string }
export interface PricingPlan { name: string; price: { monthly: number; annual: number }; desc: string; features: string[]; cta: string; highlight?: boolean }
export interface FAQ         { q: string; a: string }

export type Page     = "home" | "funcionalidades" | "precos" | "faq" | "empresa";
export type AuthView = "login" | "register" | "recover" | "recover-sent";
export type RootView = Page | "auth";

