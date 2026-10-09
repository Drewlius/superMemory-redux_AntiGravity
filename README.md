[![wakatime](https://wakatime.com/badge/github/Drewlius/Supermemory-redux_AntiGravity.svg)](https://wakatime.com/badge/github/Drewlius/superMemory-redux_AntiGravity)
# supermemory-redux (Antigravity Integration)

A focused [Supermemory](https://supermemory.ai/docs) plugin for Google Antigravity. It implements Antigravity's `hooks.json` contract to intercept user turns and inject memory context, as well as seamlessly stream conversation logs to the Supermemory backend.

## Features

- Fetches the configured container's profile on the very first message of a session and injects context.
- Uses targeted `.search` via hybrid mode on all subsequent messages to dramatically reduce token burning.
- Incrementally sends structured user and assistant turns to `/v4/conversations` under a stable `conversationId` upon the completion of the agent's turn (`Stop` hook).
- Keeps recall and conversation ingestion independent so one failing path does not block the other.

## Installation

### Build From Source

```sh
git clone https://github.com/Drewlius/supermemory-redux_AntiGravity.git
cd superMemory-redux_AntiGravity
bun install --frozen-lockfile
bun run typecheck
bun run build
```

### Register the Hook

Antigravity executes scripts via the `hooks.json` configuration file. After building the plugin, copy the entire `antigravity-hooks.example.json` to `~/.gemini/config/hooks.json` or if pre-existing append those example hooks to it:

```json
{
  "supermemory-logger": {
    "enabled": true,
    "PreInvocation": [
      {
        "type": "command",
        "command": "/usr/bin/bun run /path/to/oc-supermemory-redux/dist/index.js",
        "timeout": 10
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "/usr/bin/bun run /path/to/oc-supermemory-redux/dist/index.js",
        "timeout": 10
      }
    ]
  }
}
```

*Note: Replace `/path/to/supermemory-redux/dist/index.js` with the absolute path to your cloned repository.* Usually, it is going to be `~/.gemini/config/plugins/superMemory-redux_AntiGravity`

## Configuration

Create `supermemory.jsonc` in your Antigravity configuration directory (`~/.gemini/config/`) This is your SuperMemory specific configuration file, example below:

```jsonc
{
  // Omit this when using SUPERMEMORY_API_KEY or the credentials file.
  "apiKey": "sm_...",

  // One container for all plugin reads and writes. // I recommend using the same container tag across all your agents/harness/platforms so memory is persisted everywhere. Just remember `<containerTag>==isoaltion` they cannot see each other memories.
  "containerTag": "antigravity",

  // Optional settings shown with their defaults.
  "baseUrl": "https://api.supermemory.ai",
  "similarityThreshold": 0.6,
  "maxMemories": 3,
  "injectProfile": true
}
```

- `apiKey`: REQUIRED - alphanumerical string (NO DEFAULT)
- `containerTag`: REQUIRED - alphanumerical string (NO DEFAULT)
- `similarityThreshold`: OPTIONAL - number from 0 to 1 (DEFAULT = 0.6)
- `maxMemories`: OPTIONAL - integer from 1 to 100 (DEFAULT = 3)
- `injectProfile`: OPTIONAL - boolean (DEFAULT = true)

### API Key Resolution

The first available API key is used:

1. `SUPERMEMORY_API_KEY` environment variable
2. `apiKey` in `~/.gemini/config/supermemory.jsonc`
3. `apiKey` in `~/.gemini/config/supermemory-credentials.json`

## <div align="center"> How It Works
---

### Recall (PreInvocation Hook)

Before the agent invokes its model to generate a response, Antigravity calls the `PreInvocation` hook. 
On the first user message for a session, the plugin calls `/v4/profile` with the user's message as the query. The response provides the full static and dynamic profile plus query-specific search results.

On later messages, the hook calls `/v4/search` in `hybrid` mode using the configured threshold and result limit to save API tokens. 

The retrieved context is passed back to Antigravity via `stdout` as JSON, which the IDE injects into the agent's context window as a synthetic `[SUPERMEMORY]` ephemeral message.

### Conversation Ingestion (Stop Hook)

When the agent finishes all tool executions and fully completes its response, Antigravity fires the `Stop` hook. The plugin reads the transcript from the session's JSONL log file, formats the user and assistant turns, and POSTs them to `/v4/conversations`.

The stable `conversationId` provided by Antigravity is used (`session_<conversationId>`), allowing Supermemory to associate incremental updates with one conversation and trigger dynamic "Dreaming" natively on the backend.

## Development

```sh
bun install --frozen-lockfile
bun run build
```

# Patch Notes, Notes - API Endpoint ```v4/conversations``` Changes
- SuperMemory API provider has enabled "Dreaming" on the v4/conversations endpoint by default. This Plugin Follows that default and currently has no way to switch to "instant" mode. The "Dreaming" mode allows delayed inference of memories stored by the embeddings model. This SHOULD allow the embedded memories to be more accurate as the conversation with the agent develops over time.
