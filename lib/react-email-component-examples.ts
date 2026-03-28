import { promises as fs } from "node:fs";
import path from "node:path";

import {
  componentsStructure,
  getComponentPathFromSlug,
  type Category,
  type Component,
} from "@/react-email-component-examples/structure";

export type ReactEmailComponentCategory = Category;
export type ReactEmailComponent = Component;

export interface ReactEmailComponentExampleFile {
  fileName: string;
  variant: "inline-styles" | "tailwind" | "default";
  filePath: string;
  source: string;
}

export interface ReactEmailComponentExampleDocument
  extends ReactEmailComponent {
  categoryName: string;
  categoryDescription: string;
  files: ReactEmailComponentExampleFile[];
}

const PREFERRED_FILE_ORDER = ["inline-styles.tsx", "tailwind.tsx", "index.tsx"];
const DEFAULT_SELECTION_LIMIT = 4;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Headers: [
    "header",
    "hero",
    "brand",
    "logo",
    "navigation",
    "menu",
    "announcement",
  ],
  Footers: ["footer", "unsubscribe", "legal", "support", "contact", "social"],
  Container: ["container", "wrapper", "shell", "frame"],
  Section: ["section", "block", "split", "content"],
  Grid: ["grid", "columns", "cards", "comparison"],
  Divider: ["divider", "separator", "line", "rule"],
  Heading: ["heading", "headline", "title", "eyebrow"],
  Text: ["text", "copy", "body", "paragraph"],
  Link: ["link", "inline", "anchor"],
  Buttons: ["button", "cta", "action", "download"],
  Image: ["image", "photo", "visual", "hero", "product"],
  Avatars: ["avatar", "author", "speaker", "team", "profile"],
  Gallery: ["gallery", "images", "showcase", "portfolio", "collection"],
  List: ["list", "bullets", "steps", "features"],
  "Code Inline": ["code", "snippet", "developer", "technical"],
  "Code Block": ["code", "developer", "technical", "syntax"],
  Markdown: ["markdown", "documentation", "developer", "article"],
  Articles: ["article", "editorial", "blog", "newsletter", "story", "authors"],
  Features: [
    "features",
    "benefits",
    "highlights",
    "launch",
    "product",
    "promo",
  ],
  Stats: ["stats", "metrics", "numbers", "results", "analytics"],
  Testimonials: ["testimonial", "quote", "social proof", "review"],
  Feedback: ["feedback", "survey", "rating", "nps", "reviews"],
  Pricing: ["pricing", "plans", "tiers", "quote", "compare"],
  Ecommerce: [
    "ecommerce",
    "product",
    "store",
    "shop",
    "cart",
    "checkout",
    "receipt",
    "invoice",
    "order",
  ],
  Marketing: ["marketing", "campaign", "promo", "launch", "spotlight", "bento"],
};

const FALLBACK_CATEGORY_SETS = [
  {
    keywords: ["receipt", "invoice", "order", "checkout", "purchase", "shop"],
    categories: ["Ecommerce", "Pricing", "Buttons", "Footers"],
  },
  {
    keywords: ["newsletter", "article", "blog", "digest", "editorial"],
    categories: ["Articles", "Heading", "Text", "Footers"],
  },
  {
    keywords: ["survey", "feedback", "nps", "rating", "review"],
    categories: ["Feedback", "Testimonials", "Buttons", "Footers"],
  },
  {
    keywords: ["welcome", "onboarding", "confirmation", "verify", "reset"],
    categories: ["Headers", "Buttons", "Section", "Footers"],
  },
  {
    keywords: ["launch", "promo", "promotion", "announcement", "campaign"],
    categories: ["Marketing", "Features", "Buttons", "Headers"],
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function scoreTerms(queryTokens: Set<string>, terms: string[]): number {
  let score = 0;

  for (const term of terms) {
    const normalizedTerm = term.toLowerCase();
    const termTokens = tokenize(normalizedTerm);

    if (termTokens.length === 0) {
      continue;
    }

    if (termTokens.every((token) => queryTokens.has(token))) {
      score += termTokens.length > 1 ? 6 : 3;
      continue;
    }

    if (termTokens.some((token) => queryTokens.has(token))) {
      score += 1;
    }
  }

  return score;
}

function getVariant(fileName: string): ReactEmailComponentExampleFile["variant"] {
  if (fileName === "inline-styles.tsx") {
    return "inline-styles";
  }

  if (fileName === "tailwind.tsx") {
    return "tailwind";
  }

  return "default";
}

export function listReactEmailComponentCategories(): ReactEmailComponentCategory[] {
  return componentsStructure;
}

export function listReactEmailComponentExamples(): ReactEmailComponent[] {
  return componentsStructure.flatMap((category) => category.components);
}

export function selectReactEmailComponentExampleSlugs(
  query: string,
  limit = DEFAULT_SELECTION_LIMIT,
): string[] {
  const queryTokens = new Set(tokenize(query));
  const normalizedQuery = query.toLowerCase();

  const scoredCategories = componentsStructure
    .map((category) => {
      const categoryTerms = unique([
        category.name,
        category.description,
        ...(CATEGORY_KEYWORDS[category.name] ?? []),
      ]);

      const componentTerms = category.components.flatMap((component) => [
        component.title,
        component.slug.replace(/-/g, " "),
      ]);

      const score =
        scoreTerms(queryTokens, categoryTerms) +
        scoreTerms(queryTokens, componentTerms);

      return { category, score };
    })
    .sort((left, right) => right.score - left.score);

  const directMatches = scoredCategories
    .filter(({ score }) => score > 0)
    .flatMap(({ category }) => category.components)
    .map((component) => component.slug);

  if (directMatches.length > 0) {
    return directMatches.slice(0, limit);
  }

  const fallbackSet = FALLBACK_CATEGORY_SETS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedQuery.includes(keyword)),
  );

  const fallbackCategories =
    fallbackSet?.categories ?? ["Headers", "Features", "Buttons", "Footers"];

  return componentsStructure
    .filter((category) => fallbackCategories.includes(category.name))
    .flatMap((category) => category.components)
    .map((component) => component.slug)
    .slice(0, limit);
}

export async function readReactEmailComponentExample(
  slug: string,
): Promise<ReactEmailComponentExampleDocument> {
  const normalizedSlug = slug.trim().toLowerCase();
  const category = componentsStructure.find((candidate) =>
    candidate.components.some((component) => component.slug === normalizedSlug),
  );

  if (!category) {
    throw new Error(`Unknown React Email component example: ${slug}`);
  }

  const component = category.components.find(
    (candidate) => candidate.slug === normalizedSlug,
  );

  if (!component) {
    throw new Error(`Missing React Email component example metadata: ${slug}`);
  }

  const componentDir = getComponentPathFromSlug(normalizedSlug);
  const entries = await fs.readdir(componentDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
      .sort((left, right) => {
        const leftIndex = PREFERRED_FILE_ORDER.indexOf(left.name);
        const rightIndex = PREFERRED_FILE_ORDER.indexOf(right.name);
        const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const normalizedRight =
          rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

        if (normalizedLeft !== normalizedRight) {
          return normalizedLeft - normalizedRight;
        }

        return left.name.localeCompare(right.name);
      })
      .map(async (entry) => {
        const filePath = path.join(componentDir, entry.name);
        const source = await fs.readFile(filePath, "utf8");

        return {
          fileName: entry.name,
          variant: getVariant(entry.name),
          filePath,
          source,
        };
      }),
  );

  return {
    ...component,
    categoryName: category.name,
    categoryDescription: category.description,
    files,
  };
}
