// Shared client-side types (mirrors Prisma models, but trimmed for the frontend)

export type Image = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type Project = {
  id: string;
  title: string;
  year: number;
  category: string;
  description: string;
  credits: string;
  coverId: string | null;
  cover: Image | null;
  images: Image[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type View = 'gallery' | 'project' | 'admin';
