# Small Business Service MVP API

This workflow demonstrates the REST API node with small-business service scenarios. It is inactive when imported, uses a stable ID, and keeps package node types so the repository's development importer can convert them to `CUSTOM.*` types when needed.

## Small Business Service MVP

Import [`small-business-service-mvp.json`](./small-business-service-mvp.json) into n8n. The workflow contains independent endpoints for service requests, quotes, appointments, job status updates, attachments, strict validation, and an immediate health response.

The matching [`small-business-service-mvp.insomnia.json`](./small-business-service-mvp.insomnia.json) export contains the test requests. Import it into Insomnia and set the `n8n_base_url` environment variable to one of these values:

- `http://localhost:5678/webhook-test` while listening for a test event;
- `http://localhost:5678/webhook` after activating the workflow.

The workflow's sticky notes contain the same request examples as the Insomnia collection. The health endpoint returns `service-mvp-ok` immediately and does not start a workflow execution.

Before testing a scenario, select **Listen for test event** on its REST API trigger. The multipart attachment request uses the included sample-attachment.txt file; replace its path in Insomnia with a local image or document when needed.
