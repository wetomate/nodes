# n8n REST API node

`n8n-nodes-rest-api` adds a REST API trigger that validates incoming request bodies with AJV before an n8n workflow starts.

## Features

- Listen on one or several `DELETE`, `GET`, `HEAD`, `PATCH`, `POST`, or `PUT` methods.
- Use static paths or dynamic path segments such as `orders/:orderId`.
- Authenticate requests with the node's Basic Auth, Header Auth, or JWT Auth credentials.
- Return immediately, after the last node, through a **Respond to Webhook** node, or as a streaming response.
- Configure response status, content type, headers, body, JSON property, and binary property.
- Receive JSON, raw bodies, binary bodies, and multipart form data.
- Route each HTTP method to its own output and expose headers, path parameters, query parameters, execution mode, and the webhook URL.
- Restrict callers with an IP/CIDR allowlist, reject common bot user agents, or use an **Only Run If** expression.
- Define validation with visual fields or a complete JSON Schema.
- Configure AJV error collection, type coercion, default insertion, additional-property removal, strict mode, and standard format validation.

Invalid request bodies receive a JSON error response with a configurable `4xx` status. They don't continue through the workflow. Schema configuration errors stop the execution with an n8n configuration error.

## Install

Install `n8n-nodes-rest-api` from **Settings > Community Nodes**, or follow n8n's instructions for installing community packages in your deployment.

## Use

1. Add the **REST API** trigger to a workflow.
2. Select one or more HTTP methods and enter the endpoint path.
3. Configure authentication if the endpoint shouldn't be public.
4. Leave **Validate Request Body** enabled.
5. Choose **Define Fields Below** for common constraints or **JSON Schema** for a complete schema.
6. Configure **AJV Options** only when the validator should transform input or use stricter schema checks.
7. Run the workflow and call the displayed test URL. Activate the workflow before using its production URL.

For example, a custom schema that accepts an order request is:

```json
{
	"type": "object",
	"additionalProperties": false,
	"required": ["orderId", "email"],
	"properties": {
		"orderId": { "type": "integer", "minimum": 1 },
		"email": { "type": "string", "format": "email" },
		"tags": {
			"type": "array",
			"items": { "type": "string" },
			"uniqueItems": true
		}
	}
}
```

AJV options such as **Coerce Types**, **Use Defaults**, and **Remove Additional Properties** mutate the body before it reaches the first workflow node. They are disabled by default.

## Authentication

Selecting an authentication mode exposes the matching package-owned credential:

- **Basic Auth** compares the request's username and password with a **REST Basic Auth API** credential.
- **Header Auth** compares one configured request header with a **REST Header Auth API** credential.
- **JWT Auth** verifies a bearer token with a shared secret or PEM public key from a **REST JWT Auth API** credential.

Authentication values are stored by n8n as credentials and aren't included in workflow exports.

## Webhook compatibility

The node mirrors the public behavior of n8n's Webhook node. n8n User Auth (OAuth2) is intentionally unavailable because it is an internal n8n execution-identity feature and isn't exposed to community nodes. Direct file-system access is avoided; binary operations use the helpers supplied by n8n.

## Verification eligibility

The package follows applicable verified-node requirements: MIT licensing, English-only UI and documentation, TypeScript, no runtime package dependencies, no environment-variable or direct file-system access, validation and error handling, and provenance-ready GitHub publication.

It isn't eligible for n8n verification under the current policy because it extends an existing core node and provides a generic REST API endpoint rather than integrating one third-party service. It can still be installed as a self-hosted community node.

## Development

The repository Docker development environment automatically imports the inactive [`Validate REST Order Request`](./examples/workflows/validate-order-request.json) sample workflow. Listen for a test event and send a `POST` request containing a positive integer `orderId` and a valid `email` to exercise its schema validation.

From the repository root, run:

```bash
npm ci
npm run lint --workspace n8n-nodes-rest-api
npm test --workspace n8n-nodes-rest-api
npm run build --workspace n8n-nodes-rest-api
```

The Jest suite covers schema construction, AJV behavior, request filtering, output routing, and response settings. To verify the n8n webhook lifecycle manually, run `npm run dev`, add the node to a workflow, and exercise its test and production URLs with valid and invalid JSON, multipart, binary, authenticated, and multi-method requests.

## License

[MIT](./LICENSE.md)
