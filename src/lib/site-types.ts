// Site info shape + defaults (safe to import from client components).

export type SiteLink = { label: string; url: string };

export type SiteInfo = {
  name: string;
  tagline: string;
  description: string;
  author: string;
  copyright: string;
  email: string;
  url: string;
  keywords: string[];
  links: SiteLink[];
  about: string;
  goatcounterCode: string;
};

export const DEFAULT_SITE: SiteInfo = {
  name: 'Atelier',
  tagline: 'A Project Gallery',
  description: 'A minimal, fullscreen-image-first gallery of graphical projects.',
  author: '',
  copyright: '',
  email: '',
  url: '',
  keywords: [],
  links: [],
  about: '',
  goatcounterCode: '',
};
