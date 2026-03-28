export type InputPayload = {
  pdfBase64?: string;
  objective?: string;
};

export type SourceFact = {
  source: string;
  title?: string;
  description?: string;
  url?: string;
  data?: Record<string, unknown>;
};

export type ProfileSummary = {
  name: string;
  headline: string;
  bio: string;
  location?: string;
  links: string[];
  highlights: string[];
  skills: string[];
  facts: SourceFact[];
};

export type SiteSection = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
};

export type SiteStat = {
  label: string;
  value: string;
};

export type SiteService = {
  title: string;
  description: string;
};

export type SiteProject = {
  name: string;
  summary: string;
  outcomes: string[];
  stack: string[];
};

export type SitePlan = {
  brandName: string;
  tagLine: string;
  heroBlurb: string;
  ctaPrimary: string;
  ctaSecondary: string;
  highlights: string[];
  stats: SiteStat[];
  services: SiteService[];
  projects: SiteProject[];
  sections: SiteSection[];
};

export type ChatTurn = {
  role: "user" | "model";
  text: string;
};

export type GeneratedSite = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published";
  publishedAt: string | null;
  profile: ProfileSummary;
  plan: SitePlan;
  theme: ThemePreset;
  html: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  bodyClass: string;
  css: string;
};
