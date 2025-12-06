# Monitoring & Observability

## Health Check

**Endpoint:** `GET /api/health`

Returns `{ database: true, timestamp: "..." }` with status 200 (healthy) or 503 (unhealthy).

Use external uptime monitoring services (UptimeRobot, Better Uptime, Pingdom) to monitor this endpoint.

## Key Metrics

| Metric               | Target  | Alert Threshold |
| -------------------- | ------- | --------------- |
| Response time (p50)  | < 200ms | -               |
| Response time (p95)  | < 500ms | > 1s            |
| Response time (p99)  | < 1s    | -               |
| Error rate           | < 0.1%  | > 1%            |
| Database query (p95) | < 100ms | -               |

## Alerting Rules

**Critical (Immediate):**

- Database connection failure
- Authentication service down
- Error rate > 5%
- Health check failures

**Warning (15 minutes):**

- Error rate > 1%
- p95 response time > 1s
- Rate limit violations > 100/hour
- Memory usage > 80%

**Info (Daily digest):**

- New error types
- Slow queries
- Unusual traffic patterns

## Logging Guidelines

**DO log:** Auth attempts, permission denials, external API failures, database issues, rate limits

**DON'T log:** Passwords, tokens, PII, routine success operations

## Docker Logs

```bash
# Follow logs in real-time
docker compose logs -f app

# View last 100 lines
docker logs gthanks-app --tail=100

# Filter for errors
docker logs gthanks-app 2>&1 | grep ERROR
```
