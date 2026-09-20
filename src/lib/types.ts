// Shared client-side types (mirrors Prisma models, but trimmed for the frontend)

export type Image = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type MediaKind = 'image' | 'video' | 'audio' | 'interactive' | 'other';

/** One displayable item of a project: an uploaded image or a Tezos token. */
export type Media = {
  id: string; // "img:<imageId>" | "tok:<contract>:<tokenId>"
  kind: MediaKind;
  mime: string;
  title: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Best local display URL (WebP variant or the uploaded file). */
  url: string;
  /** `srcset` over the local WebP variants, when they exist. */
  srcSet: string | null;
  /** Tiny data-URL for the blur-up, when it exists. */
  placeholder: string | null;
  /** Candidate URLs for the original artifact (IPFS gateways, in order). Empty for uploads. */
  original: string[];
  objktUrl: string | null;
  tokenId: string | null;
};

/** A Tezos token as shown in the admin. */
export type Token = {
  id: string;
  contract: string;
  tokenId: string;
  name: string;
  mime: string;
  kind: MediaKind;
  supply: number;
  tags: string[];
  collectionName: string;
  collectionPath: string;
  mintedAt: string | null;
  hidden: boolean;
  width: number | null;
  height: number | null;
  thumb: string | null;
  placeholder: string | null;
  objktUrl: string;
  media: Media;
};

export type ProjectSource = 'manual' | 'contract';
export type ProjectSection = 'artworks' | 'lab';
export type ProjectLink = { label: string; url: string };

export type Project = {
  id: string;
  title: string;
  year: number;
  category: string;
  description: string;
  credits: string;
  source: ProjectSource;
  section: ProjectSection;
  slug: string;
  featured: boolean;
  tags: string[];
  links: ProjectLink[];
  contract: string | null;
  coverId: string | null;
  coverTokenId: string | null;
  cover: Media | null;
  images: Image[];
  tokens: Token[];
  media: Media[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type View = 'gallery' | 'project';
