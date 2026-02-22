import { Command } from "commander";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerUploadCommand } from "./commands/upload.js";
import { registerWhoamiCommand } from "./commands/whoami.js";
import { registerReceiptsCommand } from "./commands/receipts.js";
import { registerConfigCommand } from "./commands/config.js";
import { printError, printJson } from "./lib/output.js";
import { AuthRequiredError } from "./lib/auth.js";
import { EXIT_AUTH_REQUIRED, EXIT_ERROR } from "./types.js";

const program = new Command();

program
  .name("meerkat")
  .description("Meerkat CLI – upload and manage receipts")
  .version("0.1.0")
  .option("--json", "Output results as JSON")
  .option("--server <url>", "Server URL override")
  .option("--no-color", "Disable colored output")
  .option("-v, --verbose", "Verbose output");

registerLoginCommand(program);
registerLogoutCommand(program);
registerUploadCommand(program);
registerWhoamiCommand(program);
registerReceiptsCommand(program);
registerConfigCommand(program);

program.hook("postAction", () => {
  // noop – keeps the process alive for async commands
});

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      const json = program.opts().json;
      if (json) {
        printJson({ error: error.message });
      } else {
        printError(error.message);
      }
      process.exit(EXIT_AUTH_REQUIRED);
    }

    const message = error instanceof Error ? error.message : String(error);
    const json = program.opts().json;
    if (json) {
      printJson({ error: message });
    } else {
      printError(message);
    }
    process.exit(EXIT_ERROR);
  }
}

main();
