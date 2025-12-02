# Safari Extension API Reference

Quick reference for authenticating the Safari extension with gthanks.

---

## Authentication Flow

### Option 1: OAuth Callback (Recommended for Initial Setup)

```
Safari Extension -> Open Browser -> gthanks Login -> Callback with Token
```

**Callback URL:** `GET /api/auth/safari-extension-callback`

After user logs in via browser, redirect to:

```
https://gthanks.app/api/auth/safari-extension-callback
```

**Response (JSON):**

```json
{
  "token": "gth_abc123...",
  "expiresAt": 1735689600000,
  "user": {
    "id": "clh0abc123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

| Field       | Type           | Description                                   |
| ----------- | -------------- | --------------------------------------------- |
| `token`     | string         | Personal Access Token (store securely)        |
| `expiresAt` | number \| null | Unix timestamp (ms) or `null` = never expires |
| `user`      | object         | User info                                     |

---

### Option 2: Manual Token Creation (Settings UI)

Users can create tokens at: `https://gthanks.app/settings` -> "Access Tokens"

Expiration options:

- 30 days
- 90 days (default)
- 6 months
- 1 year
- Never expires

---

## Using the Token

### All API Requests

Include the token in the `Authorization` header:

```http
GET /api/wishes HTTP/1.1
Host: gthanks.app
Authorization: Bearer gth_abc123...
```

### Token Format

- Prefix: `gth_` (access tokens)
- Example: `gth_a1b2c3d4e5f6g7h8...`

---

## Key Endpoints

### Get Current User

```http
GET /api/users/me
Authorization: Bearer gth_...
```

**Response:**

```json
{
  "id": "clh0abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "avatarUrl": "/uploads/avatar.jpg"
}
```

### List User's Wishes

```http
GET /api/wishes
Authorization: Bearer gth_...
```

### Create a Wish

```http
POST /api/wishes
Authorization: Bearer gth_...
Content-Type: application/json

{
  "title": "Product Name",
  "url": "https://amazon.com/...",
  "price": 29.99,
  "currency": "USD",
  "notes": "Size: Large",
  "wishLevel": 2
}
```

| Field       | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `title`     | string | Yes      | Product name (max 200 chars)            |
| `url`       | string | No       | Product URL                             |
| `price`     | number | No       | Price (positive number)                 |
| `currency`  | string | No       | 3-letter code (USD, EUR, etc.)          |
| `notes`     | string | No       | Additional notes (max 1000 chars)       |
| `wishLevel` | number | No       | Priority: 1 (low), 2 (medium), 3 (high) |

### List User's Lists

```http
GET /api/lists
Authorization: Bearer gth_...
```

### Add Wish to List

```http
POST /api/lists/{listId}/wishes
Authorization: Bearer gth_...
Content-Type: application/json

{
  "wishId": "wish_abc123"
}
```

---

## Error Handling

### 401 Unauthorized

Token is invalid, expired, or revoked.

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

**Action:** Prompt user to re-authenticate.

### 429 Rate Limited

Too many requests.

```json
{
  "error": "rate_limited",
  "message": "Too many requests",
  "retryAfter": 45
}
```

**Headers:**

- `Retry-After: 45` (seconds)
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 2025-01-15T10:35:00Z`

**Rate Limits:**

- 100 requests/minute for authenticated users
- 5 requests/minute for metadata extraction

---

## Token Lifecycle

### Expiration

- Check `expiresAt` from token creation response
- `null` = never expires
- Otherwise, Unix timestamp in milliseconds

### Token Revocation

Users can revoke tokens from Settings. Revoked tokens return 401.

### Best Practices

1. Store token securely (Keychain on macOS/iOS)
2. Check `expiresAt` before making requests
3. Handle 401 gracefully - prompt re-authentication
4. Don't hardcode tokens
5. Token prefix `gth_` indicates valid format

---

## Quick Start Code (Swift)

```swift
struct GThanksAPI {
    let baseURL = "https://gthanks.app"
    var token: String?

    func request(_ path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        var request = URLRequest(url: URL(string: "\(baseURL)\(path)")!)
        request.httpMethod = method
        request.setValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            return data
        case 401:
            throw APIError.unauthorized
        case 429:
            throw APIError.rateLimited
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    func getCurrentUser() async throws -> User {
        let data = try await request("/api/users/me")
        return try JSONDecoder().decode(User.self, from: data)
    }

    func createWish(title: String, url: String?, price: Double?) async throws -> Wish {
        let wish = CreateWishRequest(title: title, url: url, price: price)
        let body = try JSONEncoder().encode(wish)
        let data = try await request("/api/wishes", method: "POST", body: body)
        return try JSONDecoder().decode(Wish.self, from: data)
    }
}
```

---

## Support

- API Base URL: `https://gthanks.app`
- Health Check: `GET /api/health`
- Token Management: `https://gthanks.app/settings`
