import type { Metadata } from "next";

type MetadataInput = {
  title: string;
  description: string;
  path: string;
};

const SITE_URL = "https://www.kapioo.com";
const SITE_NAME = "Kapioo";

export function buildPageMetadata({ title, description, path }: MetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}
