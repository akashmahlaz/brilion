import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

const GITHUB_API = "https://api.github.com";

async function githubFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getToken() {
  const token = await resolveProviderKey("github");
  if (!token) {
    throw new Error(
      "GitHub token not configured. Add it in Settings → API Keys with provider 'github'."
    );
  }
  return token;
}

export const githubReadFile = toolDefinition({
  name: "github_read_file",
  description:
    "Read a file from a GitHub repository. Returns the file content decoded from base64.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or org)"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path in the repo"),
    ref: z.string().optional().describe("Branch or commit SHA (default: main)"),
  }),
}).server(async ({ owner, repo, path, ref }) => {
  try {
    const token = await getToken();
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const data = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${query}`,
      token
    );
    if (data.type !== "file") {
      return { error: `Path is a ${data.type}, not a file` };
    }
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { path: data.path, content, sha: data.sha, size: data.size };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

export const githubWriteFile = toolDefinition({
  name: "github_write_file",
  description:
    "Create or update a file in a GitHub repository. Provide content and an optional SHA for updates.",
  needsApproval: true,
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path"),
    content: z.string().describe("File content (plain text)"),
    message: z.string().describe("Commit message"),
    sha: z
      .string()
      .optional()
      .describe("SHA of the file being replaced (required for updates)"),
    branch: z.string().optional().describe("Target branch (default: main)"),
  }),
}).server(async ({ owner, repo, path, content, message, sha, branch }) => {
  try {
    const token = await getToken();
    const body: Record<string, string> = {
      message,
      content: Buffer.from(content).toString("base64"),
    };
    if (sha) body.sha = sha;
    if (branch) body.branch = branch;

    const data = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
      token,
      { method: "PUT", body: JSON.stringify(body) }
    );
    return {
      status: "ok",
      path: data.content.path,
      sha: data.content.sha,
      commitSha: data.commit.sha,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

export const githubListRepoContents = toolDefinition({
  name: "github_list_repo_contents",
  description:
    "List files and directories in a GitHub repo path.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().optional().describe("Directory path (default: root)"),
    ref: z.string().optional().describe("Branch or commit SHA"),
  }),
}).server(async ({ owner, repo, path = "", ref }) => {
  try {
    const token = await getToken();
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const data = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${query}`,
      token
    );
    if (!Array.isArray(data)) {
      return { error: "Path is a file, not a directory" };
    }
    return {
      items: data.map(
        (item: { name: string; type: string; path: string; size: number }) => ({
          name: item.name,
          type: item.type,
          path: item.path,
          size: item.size,
        })
      ),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

export const githubCreateRepo = toolDefinition({
  name: "github_create_repo",
  description: "Create a new GitHub repository.",
  needsApproval: true,
  inputSchema: z.object({
    name: z.string().describe("Repository name"),
    description: z.string().optional().describe("Repository description"),
    isPrivate: z
      .boolean()
      .optional()
      .describe("Whether the repo is private (default: false)"),
  }),
}).server(async ({ name, description, isPrivate = false }) => {
  try {
    const token = await getToken();
    const data = await githubFetch("/user/repos", token, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      }),
    });
    return {
      status: "ok",
      fullName: data.full_name,
      url: data.html_url,
      cloneUrl: data.clone_url,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

export const githubListRepos = toolDefinition({
  name: "github_list_repos",
  description: "List the authenticated user's GitHub repositories.",
  inputSchema: z.object({
    sort: z
      .enum(["updated", "created", "pushed", "full_name"])
      .optional()
      .describe("Sort order"),
    perPage: z.number().min(1).max(100).optional().describe("Results per page"),
  }),
}).server(async ({ sort = "updated", perPage = 30 }) => {
  try {
    const token = await getToken();
    const data = await githubFetch(
      `/user/repos?sort=${sort}&per_page=${perPage}`,
      token
    );
    return {
      repos: data.map(
        (r: {
          full_name: string;
          description: string | null;
          html_url: string;
          private: boolean;
          language: string | null;
          updated_at: string;
        }) => ({
          fullName: r.full_name,
          description: r.description,
          url: r.html_url,
          private: r.private,
          language: r.language,
          updatedAt: r.updated_at,
        })
      ),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

export const githubDispatchWorkflow = toolDefinition({
  name: "github_dispatch_workflow",
  description:
    "Trigger a GitHub Actions workflow dispatch event. The workflow must have a workflow_dispatch trigger.",
  needsApproval: true,
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    workflowId: z
      .string()
      .describe("Workflow file name (e.g., 'deploy.yml') or ID"),
    ref: z.string().describe("Branch to run the workflow on"),
    inputs: z
      .string()
      .optional()
      .describe(
        'Workflow input parameters as a JSON object string, e.g. \'{"deploy_target": "production"}\'. Omit if no inputs needed.'
      ),
  }),
}).server(async ({ owner, repo, workflowId, ref, inputs }) => {
  try {
    const token = await getToken();
    let parsedInputs: Record<string, string> = {};
    if (inputs) {
      try {
        parsedInputs = JSON.parse(inputs);
      } catch {
        return { error: "Invalid JSON for inputs parameter" };
      }
    }
    await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ ref, inputs: parsedInputs }),
      }
    );
    return {
      status: "ok",
      message: `Workflow '${workflowId}' dispatched on branch '${ref}'`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});
