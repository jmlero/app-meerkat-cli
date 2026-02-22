import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { Command } from "commander";
import {
  printSuccess,
  printError,
  printJson,
  printTable,
  createSpinner,
} from "../lib/output.js";
import { apiRequest } from "../lib/api-client.js";
import type {
  UploadResponse,
  InboxItem,
  GlobalOptions,
} from "../types.js";
import { EXIT_ERROR } from "../types.js";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export function registerUploadCommand(program: Command): void {
  program
    .command("upload")
    .description("Upload receipt files")
    .argument("<files...>", "Files to upload")
    .option("-w, --wait", "Wait for processing to complete")
    .action(async (files: string[], cmdOpts: { wait?: boolean }) => {
      const opts = program.opts<GlobalOptions>();
      await uploadAction(files, cmdOpts.wait ?? false, opts);
    });
}

async function validateFiles(
  files: string[],
): Promise<{ path: string; buffer: Buffer; name: string; mime: string }[]> {
  if (files.length > MAX_FILES) {
    throw new Error(`Too many files: max ${MAX_FILES}, got ${files.length}`);
  }

  const validated = [];
  for (const filePath of files) {
    const ext = extname(filePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `Unsupported file type "${ext}" for ${basename(filePath)}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      );
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    if (fileStat.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${basename(filePath)} (${(fileStat.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB`,
      );
    }

    const buffer = await readFile(filePath);
    validated.push({
      path: filePath,
      buffer,
      name: basename(filePath),
      mime: MIME_MAP[ext] ?? "application/octet-stream",
    });
  }

  return validated;
}

async function pollForCompletion(
  itemId: string,
  verbose: boolean,
): Promise<InboxItem> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const item = await apiRequest<InboxItem>(`/api/v1/inbox/${itemId}`, {
      verbose,
    });

    if (item.status !== "pending" && item.status !== "processing") {
      return item;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for item ${itemId} to complete`);
}

async function uploadAction(
  files: string[],
  wait: boolean,
  opts: GlobalOptions,
): Promise<void> {
  try {
    const validated = await validateFiles(files);

    const spinner = createSpinner(
      `Uploading ${validated.length} file(s)…`,
    );
    spinner.start();

    const formData = new FormData();
    for (const file of validated) {
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mime });
      formData.append("files", blob, file.name);
    }

    const result = await apiRequest<UploadResponse>(
      "/api/v1/inbox/upload",
      {
        method: "POST",
        body: formData,
        verbose: opts.verbose,
      },
    );

    spinner.stop();

    if (wait && result.items.length > 0) {
      const waitSpinner = createSpinner("Waiting for processing…");
      waitSpinner.start();

      const completed: InboxItem[] = [];
      for (const item of result.items) {
        const done = await pollForCompletion(item.id, opts.verbose ?? false);
        completed.push(done);
      }

      waitSpinner.stop();

      if (opts.json) {
        printJson(completed);
      } else {
        printTable(
          ["ID", "File", "Status", "Merchant", "Amount"],
          completed.map((item) => [
            item.id,
            item.file_name,
            item.status,
            item.merchant_name ?? "-",
            item.total_amount != null
              ? `${item.total_amount} ${item.currency ?? ""}`
              : "-",
          ]),
        );
      }
    } else {
      if (opts.json) {
        printJson(result);
      } else {
        printTable(
          ["ID", "File", "Status"],
          result.items.map((item) => [item.id, item.file_name, item.status]),
        );
      }
    }

    printSuccess(`Uploaded ${validated.length} file(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (opts.json) {
      printJson({ error: message });
    } else {
      printError(message);
    }
    process.exit(EXIT_ERROR);
  }
}
