import type { Command } from "commander";
import {
  printSuccess,
  printError,
  printJson,
  printTable,
  createSpinner,
} from "../lib/output.js";
import { apiRequest } from "../lib/api-client.js";
import { loadConfig } from "../lib/config.js";
import type {
  ReceiptsResponse,
  Receipt,
  SupermarketsResponse,
  GlobalOptions,
} from "../types.js";
import { EXIT_ERROR } from "../types.js";

function currencySymbol(code: string): string {
  switch (code) {
    case "EUR": return "€";
    case "USD": return "$";
    case "GBP": return "£";
    default: return `${code} `;
  }
}

function formatCurrency(amount: number, currency = "EUR"): string {
  return `${currencySymbol(currency)}${amount.toFixed(2)}`;
}

async function fetchSupermarketMap(verbose?: boolean): Promise<Map<number, string>> {
  try {
    const data = await apiRequest<SupermarketsResponse>(
      "/api/v1/supermarkets?limit=100&offset=0",
      { verbose },
    );
    const map = new Map<number, string>();
    for (const s of data.items) {
      map.set(s.id, s.name);
    }
    return map;
  } catch {
    return new Map();
  }
}

export function registerReceiptsCommand(program: Command): void {
  const receipts = program
    .command("receipts")
    .description("List and view receipts");

  receipts
    .command("list", { isDefault: true })
    .description("List recent receipts")
    .option("-l, --limit <n>", "Number of receipts to fetch", "50")
    .option("-o, --offset <n>", "Offset for pagination", "0")
    .action(async (cmdOpts: { limit: string; offset: string }) => {
      const opts = program.opts<GlobalOptions>();
      await listAction(parseInt(cmdOpts.limit, 10), parseInt(cmdOpts.offset, 10), opts);
    });

  receipts
    .command("show <id>")
    .description("Show receipt detail")
    .action(async (id: string) => {
      const opts = program.opts<GlobalOptions>();
      await showAction(id, opts);
    });
}

async function listAction(
  limit: number,
  offset: number,
  opts: GlobalOptions,
): Promise<void> {
  const spinner = createSpinner("Fetching receipts…");
  spinner.start();

  try {
    const [data, storeMap, config] = await Promise.all([
      apiRequest<ReceiptsResponse>(
        `/api/v1/receipts/recent?limit=${limit}&offset=${offset}`,
        { verbose: opts.verbose },
      ),
      fetchSupermarketMap(opts.verbose),
      loadConfig(),
    ]);

    const currency = config?.currency ?? "EUR";

    spinner.stop();

    if (opts.json) {
      printJson(data);
    } else if (data.items.length === 0) {
      console.log("No receipts found.");
    } else {
      printTable(
        ["ID", "Store", "Date", "Total", "Items"],
        data.items.map((r) => [
          String(r.id),
          storeMap.get(r.supermarket_id) ?? String(r.supermarket_id),
          r.date,
          formatCurrency(r.total, currency),
          String(r.products?.length ?? "-"),
        ]),
      );
      printSuccess(`Showing ${data.items.length} of ${data.total} receipts`);
    }
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);
    if (opts.json) {
      printJson({ error: message });
    } else {
      printError(message);
    }
    process.exit(EXIT_ERROR);
  }
}

async function showAction(
  id: string,
  opts: GlobalOptions,
): Promise<void> {
  const spinner = createSpinner("Fetching receipt…");
  spinner.start();

  try {
    const [receipt, storeMap, config] = await Promise.all([
      apiRequest<Receipt>(
        `/api/v1/receipts/${id}`,
        { verbose: opts.verbose },
      ),
      fetchSupermarketMap(opts.verbose),
      loadConfig(),
    ]);

    const currency = config?.currency ?? "EUR";

    spinner.stop();

    if (opts.json) {
      printJson(receipt);
    } else {
      const storeName = storeMap.get(receipt.supermarket_id) ?? String(receipt.supermarket_id);
      printSuccess(`Receipt #${receipt.id}`);
      console.log(`  Store: ${storeName}`);
      console.log(`  Date: ${receipt.date}`);
      console.log(`  Total: ${formatCurrency(receipt.total, currency)}`);

      if (receipt.products && receipt.products.length > 0) {
        console.log("");
        printTable(
          ["Product", "Qty", "Unit Price", "Price"],
          receipt.products.map((p) => [
            p.name,
            String(p.quantity),
            formatCurrency(p.unit_price, currency),
            formatCurrency(p.price, currency),
          ]),
        );
      }
    }
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);
    if (opts.json) {
      printJson({ error: message });
    } else {
      printError(message);
    }
    process.exit(EXIT_ERROR);
  }
}
