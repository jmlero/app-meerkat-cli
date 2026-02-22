# Meerkat CLI User Manual

Meerkat CLI is a command-line tool to upload and manage grocery receipts.

## Installation

```bash
npm install -g meerkat-cli
```

Requires Node.js 18 or later.

## Global Options

These flags work with any command:

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON |
| `--server <url>` | Override the server URL for this invocation |
| `--no-color` | Disable colored output |
| `-v, --verbose` | Print HTTP request/response details to stderr |

## Commands

### `meerkat login`

Authenticate with the Meerkat server. Credentials are stored locally.

```bash
meerkat login
meerkat login -e user@example.com -p secret
```

| Option | Description |
|--------|-------------|
| `-e, --email <email>` | Email address |
| `-p, --password <password>` | Password |

If email or password are omitted the CLI will prompt interactively. On first login you will also be asked for the server URL (defaults to `https://themeerkat.app`).

### `meerkat logout`

Clear stored credentials from the local machine.

```bash
meerkat logout
meerkat logout --json
```

The command is idempotent — running it when already logged out is not an error.

### `meerkat whoami`

Show the currently authenticated user.

```bash
meerkat whoami
meerkat whoami --json
```

Displays email, server URL, and token expiry. Exits with code 2 if not logged in.

### `meerkat upload <files...>`

Upload one or more receipt images or PDFs.

```bash
meerkat upload receipt.jpg
meerkat upload *.png --wait
```

| Option | Description |
|--------|-------------|
| `-w, --wait` | Poll until processing completes (timeout: 120 s) |

**Constraints:**

- Accepted formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.pdf`
- Maximum file size: 10 MB per file
- Maximum files per upload: 20

### `meerkat receipts`

List and inspect processed receipts.

#### `meerkat receipts list` (default)

```bash
meerkat receipts
meerkat receipts list --limit 10 --offset 20
meerkat receipts list --json
```

| Option | Default | Description |
|--------|---------|-------------|
| `-l, --limit <n>` | 50 | Number of receipts to fetch |
| `-o, --offset <n>` | 0 | Offset for pagination |

The table output shows resolved store names (e.g. "Mercadona" instead of a numeric ID) and totals formatted with the configured currency symbol.

#### `meerkat receipts show <id>`

```bash
meerkat receipts show 101
meerkat receipts show 101 --json
```

Displays receipt header (store, date, total) followed by a products table with quantities and prices. All amounts use the configured currency symbol in human-readable output; JSON output returns raw numbers.

### `meerkat config`

View or edit CLI settings.

#### `meerkat config show` (default)

```bash
meerkat config
meerkat config show --json
```

Prints the current configuration: server URL, currency, logged-in email, and file paths for `config.json` and `credentials.json`.

#### `meerkat config set <key> <value>`

```bash
meerkat config set currency USD
meerkat config set server_url https://custom.example.com
```

| Key | Description |
|-----|-------------|
| `currency` | Currency code used when formatting amounts (default: `EUR`). Supported symbols: EUR (€), USD ($), GBP (£). Other codes are shown as a prefix. |
| `server_url` | Base URL of the Meerkat API server |

Requires an existing configuration — run `meerkat login` first.

## Configuration Files

Meerkat stores its data under `~/.config/meerkat/` (override with the `MEERKAT_CONFIG_DIR` environment variable).

| File | Contents |
|------|----------|
| `config.json` | Server URL, Supabase keys, currency preference |
| `credentials.json` | Email, access token, refresh token, expiry (mode 600) |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication required — run `meerkat login` |
