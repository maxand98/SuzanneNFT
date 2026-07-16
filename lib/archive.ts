import archiveData from "@/data/archive.json";

export type Reference = { label: string; url: string };

export type Thread = {
  id: string;
  title: string;
  date: string;
  parts: number;
  summary: string;
  excerpt: string;
  highlights: string[];
  tags: string[];
  artist_ids: string[];
  x_url: string;
  status: "verified" | "provisional" | "placeholder";
  references: Reference[];
};

export type Artist = {
  id: string;
  name: string;
  context: string;
  raster_url: string;
  x_handle: string | null;
  threads_mentioned: string[];
  tags: string[];
  verified: boolean;
};

export const archive = archiveData as { threads: Thread[]; artists: Artist[] };
