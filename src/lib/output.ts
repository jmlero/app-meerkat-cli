import chalk from "chalk";
import ora, { type Ora } from "ora";
import Table from "cli-table3";

export function printSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function printError(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(
  headers: string[],
  rows: string[][],
): void {
  const table = new Table({ head: headers.map((h) => chalk.cyan(h)) });
  for (const row of rows) {
    table.push(row);
  }
  console.log(table.toString());
}

export function createSpinner(text: string): Ora {
  return ora({ text, stream: process.stderr });
}
