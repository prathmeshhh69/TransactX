# TransactX

TransactX is an Express and MongoDB backend for financial account and transaction processing. It provides cookie- or bearer-token-authenticated APIs for user registration, account management, ledger-backed balance calculation, and transfers.

## Features

- User registration, login, and logout with JWTs.
- JWT delivery through an HTTP cookie and support for `Authorization: Bearer <token>` requests.
- Token blacklisting on logout, with automatic blacklist expiry after three days.
- Per-user account creation and account listing.
- Account status (`ACTIVE`, `FROZEN`, or `CLOSED`) and INR as the default currency.
- Ledger-backed account balances, calculated from credit and debit entries.
- Account-to-account transfers guarded by account-status and sufficient-balance checks.
- Idempotency keys and transaction states (`PENDING`, `COMPLETED`, `FAILED`) for transfer requests.
- MongoDB sessions and transactions for creating transfer, debit-ledger, and credit-ledger records atomically.
- System-user-only endpoint for funding an account.
- Registration emails through Gmail OAuth2; the transfer handler also attempts a post-commit notification email.

## Tech Stack

- Node.js with CommonJS modules
- Express 5
- MongoDB and Mongoose 9
- JSON Web Tokens (`jsonwebtoken`)
- `bcrypt` password hashing
- `cookie-parser`
- Nodemailer with Gmail OAuth2
- `dotenv`

The repository also declares `cors` as a dependency, although no CORS middleware is registered in the current application.

## Architecture / Project Structure

```text
.
├── README.md
└── backend/
    ├── package.json              # Dependencies and start/dev scripts
    ├── server.js                 # Environment loading, DB connection, HTTP listener
    └── src/
        ├── app.js                # Express app and route mounting
        ├── config/db.js          # Mongoose connection setup
        ├── controllers/          # Auth, account, and transaction request handlers
        ├── middlewares/          # JWT and system-user authorization
        ├── models/               # Mongoose schemas and model methods
        ├── routes/               # API route definitions
        └── services/             # Email delivery service
```

## Backend Concepts Used

- **REST APIs:** Route modules expose JSON endpoints under `/api/auth`, `/api/account`, and `/api/transaction`.
- **Mongoose data modelling:** Users, accounts, transactions, ledger entries, and blacklisted tokens are stored as MongoDB documents.
- **JWT authentication:** Signed tokens carry the user ID; middleware verifies them before protected handlers run.
- **Cookies and bearer tokens:** Authentication middleware reads `req.cookies.token` first, then the bearer token in `Authorization`.
- **Password hashing:** A user-schema pre-save hook hashes modified passwords with bcrypt and hides the password field by default.
- **Ledger accounting:** Balances are computed with a MongoDB aggregation that subtracts total debits from total credits.
- **Atomic transaction processing:** MongoDB sessions keep transfer, debit, credit, and completion-status writes together.
- **Idempotency:** A unique idempotency key prevents a transfer from being processed twice and determines duplicate-request responses.
- **Role guard:** The system-funding route requires a user whose hidden `systemUser` field is true.
- **Token blacklisting:** Logout persists the current JWT in a TTL-indexed blacklist.
- **Email:** Nodemailer is configured with a Gmail OAuth2 transport.

## Data Models

| Model | Purpose and key fields |
| --- | --- |
| `user` | Application user. `name` and unique, normalized `email` are required. `password` is required, minimum six characters, hashed before save, and excluded from ordinary queries. `systemUser` is a hidden, immutable boolean that defaults to `false`. |
| `account` | Account owned by a `user` reference. Has `status` (`ACTIVE`, `FROZEN`, `CLOSED`) and `currency`, which defaults to `INR`. Its `getBalance()` method aggregates ledger entries. |
| `transaction` | Transfer from one `account` to another with `amount`, globally unique `idempotencyKey`, and `status` (`PENDING`, `COMPLETED`, `FAILED`). |
| `ledger` | Immutable accounting entry linked to an `account` and `transaction`; its `type` is `CREDIT` or `DEBIT`. Update and delete middleware reject modification attempts. |
| `tokenBlacklist` | Logged-out JWTs. `token` is unique; a TTL index expires documents three days after `createdAt`. |

## API Endpoints

Base URL when running locally: `http://localhost:5000`

| Method | Endpoint | Authentication Required | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Creates a user, sets a `token` cookie, and sends a registration email. |
| `POST` | `/api/auth/login` | No | Validates credentials and sets a `token` cookie. |
| `POST` | `/api/auth/logout` | Token required | Blacklists the supplied token and clears the `token` cookie. |
| `POST` | `/api/account` | User JWT | Creates an account for the authenticated user. |
| `GET` | `/api/account` | User JWT | Returns accounts belonging to the authenticated user. |
| `GET` | `/api/account/balance/:accountId` | User JWT | Returns the authenticated user's balance for the requested account. |
| `POST` | `/api/transaction` | User JWT | Creates an account-to-account transfer. |
| `POST` | `/api/transaction/system/intial-funds` | System-user JWT | Transfers funds from the system user's first account to a target account. The implemented path contains `intial` (not `initial`). |

For every protected endpoint, send either the `token` cookie set during registration/login or this header:

```http
Authorization: Bearer <JWT>
```

### Request bodies

`POST /api/auth/register`

```json
{
  "name": "Asha Patel",
  "email": "asha@example.com",
  "password": "secure-password",
  "systemUser": false
}
```

`systemUser` is accepted by the registration handler and defaults to `false` in the schema when omitted. It is immutable after user creation.

`POST /api/auth/login`

```json
{
  "email": "asha@example.com",
  "password": "secure-password"
}
```

`POST /api/account` has no request body; the account is linked to the authenticated user and uses the schema defaults.

`GET /api/account/balance/:accountId` uses the path parameter `accountId` and only returns an account owned by the authenticated user.

`POST /api/transaction`

```json
{
  "fromAccount": "<source-account-id>",
  "toAccount": "<destination-account-id>",
  "amount": 500,
  "idempotencyKey": "transfer-2026-0001"
}
```

All four fields are required. Both accounts must exist and be `ACTIVE`; the source account must have sufficient ledger-derived balance. A repeated idempotency key returns the previously completed transaction with `200`, `202` while it is pending, or `400` when it is marked failed.

`POST /api/transaction/system/intial-funds`

```json
{
  "toAccount": "<destination-account-id>",
  "amount": 500,
  "idempotencyKey": "initial-funds-2026-0001"
}
```

This endpoint requires a JWT for a user with `systemUser: true`. It finds a source account belonging to that user. The three request fields are required and duplicate-key behavior is the same for completed and pending transactions.

## Authentication Flow

1. Registration creates a user; the schema hashes the password with bcrypt before storage.
2. Registration and login sign a JWT containing `{ id: user._id }` using `JWT_SECRETS`, then set it in a `token` cookie.
3. Protected routes accept that cookie or a bearer token. Middleware rejects missing, invalid, or blacklisted tokens and attaches the database user to `req.user`.
4. The system-funding route additionally selects the hidden `systemUser` field and returns `403` unless it is true.
5. Logout stores the presented token in `tokenBlacklist`, clears the cookie, and returns success.

## Transaction Flow

1. A transfer validates required input, both account IDs, a unique idempotency key, account status, and available source balance.
2. The handler opens a Mongoose session and creates a `PENDING` transaction.
3. It adds immutable `DEBIT` and `CREDIT` ledger entries, updates the transaction to `COMPLETED`, and commits the MongoDB transaction.
4. If the same idempotency key is encountered, the handler returns the existing transaction status instead of performing a second transfer.
5. Account balance is calculated on demand as total credits minus total debits through an aggregation pipeline.

The system-funding flow follows the same ledger and session pattern, using the authenticated system user's account as the source.

## Environment Variables

Create `backend/.env` with only the variables referenced by the code. Keep actual values private.

```env
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRETS=<your-jwt-signing-secret>
EMAIL_USER=<gmail-address>
CLIENT_ID=<google-oauth-client-id>
CLIENT_SECRET=<google-oauth-client-secret>
REFRESH_TOKEN=<google-oauth-refresh-token>
```

`PORT` is optional and defaults to `5000`. The email service is configured to use Gmail OAuth2 credentials.

## Installation and Setup

1. Clone the repository and enter it:

   ```bash
   git clone <repository-url>
   cd TransactX/backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `backend/.env` using the variables above. Set `MONGO_URI` to a MongoDB deployment that supports the transactions used by the transfer handlers.

4. Start the development server using the existing script:

   ```bash
   npm run dev
   ```

   Or start it normally:

   ```bash
   npm start
   ```

## API Testing

Use Postman to send JSON requests to the endpoints above. Start by registering or logging in, then allow Postman to retain the `token` cookie or copy a token into the `Authorization: Bearer <JWT>` header for protected requests. Use unique `idempotencyKey` values for new transfer attempts; reuse the same key only to observe the idempotency response.

## Security Considerations

- Passwords are hashed with bcrypt before storage and omitted from normal user queries.
- JWTs protect account and transaction routes; system funding has an additional system-user check.
- Logout blacklists used tokens and removes the cookie.
- Account ownership is enforced when reading an account balance.
- Account status and available ledger-derived balance are checked before standard transfers.
- Ledger fields are immutable and model middleware blocks update/delete operations.

## Future Improvements

Future work could include a frontend dashboard, pagination and filtering for accounts or transactions, automated tests, rate limiting, stricter request validation, transaction monitoring, audit/reporting tools, and anomaly detection.

## Project Status

The core backend implementation is complete. Further enhancements and features are planned.
