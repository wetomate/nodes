# n8n-nodes-duo

> A Wetomate n8n community node for the Duo Security multi-factor authentication API.
> This package provides authentication, pre-authentication, status checks, availability checks, and human-in-the-loop approval directly within n8n workflows.

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

## Example: expense reimbursement approval

The included [Duo Expense Reimbursement Approval](./examples/workflows/duo-human-in-the-loop-approval.md) workflow starts with an n8n form. A manager receives a Duo Push containing the employee, expense, amount, and reference, and the workflow marks the expense approved only when Duo returns allow.

The example is inactive and has no credential references. Replace the example manager username and connect the approved branch to your finance or payroll system before enabling it. The Duo Push is a real authentication challenge.

## Supported endpoints

| Endpoint               | Description                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/auth/v2/auth`        | Starts second-factor authentication with a push notification, passcode, phone call, or SMS passcode delivery. |
| `/auth/v2/auth_status` | Waits for the next status update from an asynchronous authentication transaction.                             |
| `/auth/v2/check`       | Verifies the Auth API integration, secret keys, and request signature.                                        |
| `/auth/v2/logo`        | Retrieves the stored Duo logo.                                                                                |
| `/auth/v2/ping`        | Checks whether the Duo Auth API is available without requiring a signed request.                              |
| `/auth/v2/preauth`     | Checks whether a user may authenticate and returns the authentication factors available to that user.         |

Each operation accepts input parameters and returns JSON output.

## Development and testing

When the repository Docker development environment starts, it imports the inactive [`Duo Authentication Flow`](./examples/workflows/check-api-health.json) and [`Duo Expense Reimbursement Approval`](./examples/workflows/duo-human-in-the-loop-approval.json) sample workflows. The authentication example demonstrates availability checking, user pre-authentication, an asynchronous push request, and transaction status polling. The approval example starts with an expense form, sends contextual `pushinfo` in a synchronous Duo Push, and branches on the manager's decision; its usage notes are documented in [`duo-human-in-the-loop-approval.md`](./examples/workflows/duo-human-in-the-loop-approval.md). Both workflows intentionally omit credentials. Create or select a Duo credential and use test users before running them; the push step has a real effect.

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
