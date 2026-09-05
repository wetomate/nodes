# n8n-nodes-duo

> A Wetomate n8n community node for the Duo Security multi-factor authentication API.
> This package provides authentication, pre-authentication, status checks, and availability checks directly within n8n workflows.

## Prerequisites

- n8n version 1.x or higher
- Node.js v14+
- Duo Security account with:
   - Integration Key
   - Secret Key
   - API Hostname (e.g., `api-xxxxxxxx.duosecurity.com`)

## Installation

Install the community package from your n8n instance's **Settings > Community Nodes** page using:

```text
n8n-nodes-duo
```

## Credential setup

Create a new Duo credential in n8n with these fields:

- **Integration Key**
- **Secret Key**
- **API Hostname**

Use this credential in all Duo node endpoints.
See the [Duo Auth API documentation](https://duo.com/docs/authapi) for integration setup and endpoint details.

## Supported endpoints

| Endpoint               | Description                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/auth/v2/auth`        | Starts second-factor authentication with a push notification, passcode, phone call, or SMS passcode delivery.        |
| `/auth/v2/auth_status` | Waits for the next status update from an asynchronous authentication transaction.                                     |
| `/auth/v2/ping`        | Checks whether the Duo Auth API is available without requiring a signed request.                                      |
| `/auth/v2/preauth`     | Checks whether a user may authenticate and returns the authentication factors available to that user.                |

Each operation accepts input parameters and returns JSON output.

## Development and testing

When the repository Docker development environment starts, it imports the inactive [`Duo Authentication Flow`](./examples/workflows/check-api-health.json) and [`Duo Human-in-the-Loop Approval`](./examples/workflows/duo-human-in-the-loop-approval.json) sample workflows. The authentication example demonstrates availability checking, user pre-authentication, an asynchronous push request, and transaction status polling. The approval example adds an event webhook, contextual `pushinfo`, a synchronous push approval, an allow/deny gate, and an action HTTP request; its brainstorming board is documented in [`duo-human-in-the-loop-approval.md`](./examples/workflows/duo-human-in-the-loop-approval.md). Both workflows intentionally omit credentials. Create or select a Duo credential and use test users and endpoints before running them; the push and approved action steps have real effects.

From the repository root, install the locked dependencies and run the Duo package checks with:

```bash
npm ci
npm run build --workspace n8n-nodes-duo
npm run lint --workspace n8n-nodes-duo
npm test --workspace n8n-nodes-duo
```

## Linting

Linting helps ensure code quality, consistency, and prevents common errors.  
This project uses **ESLint** (and optionally **Prettier** for formatting) to maintain a consistent code style.

### Run the linter

```bash
npm run lint
```

### Run Prettier

```bash
npm run format
```

## Contributing

Issues and pull requests are welcome! Please ensure code follows linting and testing standards before submitting.

## License

[MIT](./LICENSE.md)
