import { promises as fs } from "node:fs";
import path from "node:path";

export interface SkillSummary {
  slug: string;
  name: string;
  description: string;
}

export interface SkillDocument extends SkillSummary {
  content: string;
  filePath: string;
}

const SKILLS_DIR = path.join(process.cwd(), "skills");

type Frontmatter = {
  name?: string;
  description?: string;
};

function normalizeSkillSlug(value: string): string {
  return value.trim().toLowerCase();
}

function parseFrontmatter(source: string): { frontmatter: Frontmatter; body: string } {
  if (!source.startsWith("---")) {
    return {
      frontmatter: {},
      body: source.trim(),
    };
  }

  const lines = source.split(/\r?\n/);
  if (lines.length < 3 || lines[0] !== "---") {
    return {
      frontmatter: {},
      body: source.trim(),
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex === -1) {
    return {
      frontmatter: {},
      body: source.trim(),
    };
  }

  const frontmatter: Frontmatter = {};
  for (const line of lines.slice(1, closingIndex)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      continue;
    }

    const normalizedValue = value.replace(/^['"]|['"]$/g, "");
    if (key === "name") {
      frontmatter.name = normalizedValue;
    }
    if (key === "description") {
      frontmatter.description = normalizedValue;
    }
  }

  return {
    frontmatter,
    body: lines.slice(closingIndex + 1).join("\n").trim(),
  };
}

async function readSkillFile(slug: string): Promise<SkillDocument> {
  const normalizedSlug = normalizeSkillSlug(slug);
  if (!/^[a-z0-9-_]+$/.test(normalizedSlug)) {
    throw new Error("Invalid skill name");
  }

  const filePath = path.join(SKILLS_DIR, normalizedSlug, "SKILL.md");
  const source = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(source);

  return {
    slug: normalizedSlug,
    name: frontmatter.name || normalizedSlug,
    description: frontmatter.description || "No description provided.",
    content: body,
    filePath,
  };
}

export async function listSkills(): Promise<SkillSummary[]> {
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const skillDocs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            return await readSkillFile(entry.name);
          } catch {
            return null;
          }
        }),
    );

    return skillDocs
      .filter((skill): skill is SkillDocument => skill !== null)
      .map(({ slug, name, description }) => ({
        slug,
        name,
        description,
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug));
  } catch {
    return [];
  }
}

export async function readSkill(slug: string): Promise<SkillDocument> {
  return readSkillFile(slug);
}
