import { logger } from "./logger";

export interface GithubContent {
  title: string;
  content: string;
  sourceUrl: string;
}

export async function scrapeGithubRepo(url: string): Promise<GithubContent> {
  // Parse GitHub URL to get owner/repo
  const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");

  logger.info({ owner, repo: cleanRepo }, "Scraping GitHub repo");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "MindForge/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  // Fetch README
  const readmeRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
    { headers }
  );

  let content = `# ${owner}/${cleanRepo}\n\n`;

  if (readmeRes.ok) {
    const readmeData = (await readmeRes.json()) as { content?: string };
    if (readmeData.content) {
      const decoded = Buffer.from(readmeData.content, "base64").toString("utf-8");
      content += decoded + "\n\n";
    }
  }

  // Fetch repo info
  const repoRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}`,
    { headers }
  );

  if (repoRes.ok) {
    const repoData = (await repoRes.json()) as {
      description?: string;
      language?: string;
      stargazers_count?: number;
      topics?: string[];
    };
    content += `## Repository Info\n`;
    if (repoData.description) content += `Description: ${repoData.description}\n`;
    if (repoData.language) content += `Primary Language: ${repoData.language}\n`;
    if (repoData.stargazers_count !== undefined) {
      content += `Stars: ${repoData.stargazers_count}\n`;
    }
    if (repoData.topics && repoData.topics.length > 0) {
      content += `Topics: ${repoData.topics.join(", ")}\n`;
    }
  }

  // Fetch top-level file list
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/HEAD?recursive=0`,
    { headers }
  );

  if (treeRes.ok) {
    const treeData = (await treeRes.json()) as {
      tree?: Array<{ path: string; type: string }>;
    };
    if (treeData.tree) {
      const files = treeData.tree
        .filter((f) => f.type === "blob")
        .slice(0, 30)
        .map((f) => f.path);
      content += `\n## Files\n${files.join("\n")}\n`;
    }
  }

  return {
    title: `${owner}/${cleanRepo}`,
    content,
    sourceUrl: `https://github.com/${owner}/${cleanRepo}`,
  };
}
