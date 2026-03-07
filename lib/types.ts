export type InputPayload = {
  urls: string[];
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
};

export type SitePlan = {
  brandName: string;
  tagLine: string;
  heroBlurb: string;
  cta: string;
  sections: SiteSection[];
};

export type ChatTurn = {
  role: "user" | "model";
  text: string;
};

export type GeneratedSite = {
  id: string;
  createdAt: string;
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
