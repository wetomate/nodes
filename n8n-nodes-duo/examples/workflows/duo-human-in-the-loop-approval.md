# Duo human-in-the-loop approval board

## Core idea

An event asks for a sensitive action. n8n sends the administrator a synchronous Duo Push with enough context to make a decision. The action endpoint is called only after Duo immediately reports `allow`.

```text
Event Trigger
      |
      v
Check administrator access
      |
      v
Request synchronous Duo Push
  (event, action, target in pushinfo)
      |
      v
    Approved?
   /         \
 allow       deny / timeout
  /                 \
Execute action      Record rejection
```

## Event contract

The webhook expects a JSON body containing:

```json
{
	"eventId": "change-123",
	"action": "restart-service",
	"target": "payments-api",
	"actionUrl": "https://automation.example.test/actions/restart",
	"requestedBy": "release-bot",
	"adminUsername": "admin@example.com",
	"sourceIp": "192.0.2.20"
}
```

## Questions for the next iteration

- Should a denied or expired request notify the requester?
- Should the workflow persist the approval decision and Duo transaction ID for audit?
- Should the action URL be selected from an allowlisted action map instead of accepted from the event?
- Should approvals require two administrators for high impact actions?
- Should high impact actions use async authentication and poll `auth_status` instead?

The imported workflow is inactive and intentionally has no credential references. Create a Duo credential, replace the administrator username, and point `actionUrl` at a safe test endpoint before enabling it. The approved branch performs a real HTTP POST.
