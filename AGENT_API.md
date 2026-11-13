# Agent API contract

Endpoint: `POST /api/agent/execute`  
Content-Type: `application/json`

Envelope:
```json
{
  "protocol": "agentmesh.v1",
  "action": "list_services",
  "input": { "query": "bicycle repair" },
  "context": { "purpose": "discovery", "requestedBy": "external-agent" }
}
```

Actions:
- `list_services`: read-only. `input.query` is 1–100 characters.
- `request_quote`: requires known `serviceId`, 5–500 character description and `context.humanConfirmed=true`. Demo only.

The server rejects unknown fields/actions and invalid schemas. Success responses include `meta.requestId` and `meta.policy`. Error responses include an HTTP error status and request ID.
