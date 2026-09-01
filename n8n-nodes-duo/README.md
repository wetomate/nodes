# n8n-nodes-duo

> A Wetomate n8n community node for the Duo Security multi-factor authentication API.
> This package provides a set of endpoints to interact with Duo Security, enabling you to perform authentication, pre-authentication, status checks, and more, directly within your n8n workflows.

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

## Credential Setup

Create a new Duo credential in n8n with these fields:

- **Integration Key**
- **Secret Key**
- **API Hostname**

Use this credential in all Duo node endpoints.
Click [here](https://duo.com/docs/authapi) to view Duo Security Documentions.

## Available Endpoints

| Endpoints              | Description                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/auth/v2/auth`        | Performs second-factor authentication for a user by sending a push notification to the user's smartphone app, verifying a passcode, or placing a phone call. It is also used to send the user a new batch of passcodes via SMS.                                      |
| `/auth/v2/preauth`     | determines whether a user is authorized to log in, and (if so) returns the user's available authentication factors.                                                                                                                                                  |
| `/auth/v2/auth_status` | "long-polls" for the next status update from the authentication process for a given transaction. That is to say, if no status update is available at the time the request is sent, it will wait until there is an update before returning a response.                |
| `/auth/v2/check`       | can be called to verify that the Auth API integration and secret keys are valid, and that the signature is being generated properly.                                                                                                                                 |
| `/auth/v2/logo`        | provides a programmatic way to retrieve your stored logo.                                                                                                                                                                                                            |
| `/auth/v2/ping`        | acts as a "liveness check" that can be called to verify that Duo is up before trying to call other Auth API endpoints. Unlike the other endpoints, this one does not have to be signed with the [Authorization header](https://duo.com/docs/authapi#authentication). |

Each endpoints accepts input parameters and returns JSON output.

## Development & Testing

When the repository Docker development environment starts, it imports the inactive [`Duo Authentication Flow`](./examples/workflows/check-api-health.json) and [`Duo Human-in-the-Loop Approval`](./examples/workflows/duo-human-in-the-loop-approval.json) sample workflows. The authentication example demonstrates availability checking, user pre-authentication, an asynchronous push request, and transaction status polling. The approval example adds an event webhook, contextual `pushinfo`, a synchronous push approval, an allow/deny gate, and an action HTTP request; its brainstorming board is documented in [`duo-human-in-the-loop-approval.md`](./examples/workflows/duo-human-in-the-loop-approval.md). Both workflows intentionally omit credentials. Create or select a Duo credential and use test users and endpoints before running them; the push and approved action steps have real effects.

- Written in TypeScript (or JavaScript depending on your setup)
- Run tests with:

```bash
npm install
npm run build
npm run test
```

## Linting

Linting helps ensure code quality, consistency, and prevents common errors.  
This project uses **ESLint** (and optionally **Prettier** for formatting) to maintain a consistent code style.

### Run Linter

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
