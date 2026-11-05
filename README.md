# FinTrack – Personal Finance Management

**FinTrack** is a web-based personal finance management application designed to help users manage, monitor, and organize their financial activities in one place.

## Live Demo

<https://fintrack-hikamsrl.netlify.app>

You can access the deployed application through the link above. Register for an account or log in to explore FinTrack's features and manage your personal finances.

## Features

- **Authentication** – User registration and login with password hashing and JWT-based authentication.
- **Dashboard** – View financial summaries, account balances, income, expenses, and recent transactions.
- **Account Management** – Manage multiple financial accounts, including cash, bank accounts, and e-wallets.
- **Transaction Management** – Record, edit, and manage income and expense transactions.
- **Fund Transfers** – Transfer balances between registered accounts.
- **Category Management** – Organize financial transactions using customizable categories.
- **Budget Management** – Set spending budgets and monitor expenses against budget limits.
- **Savings Goals** – Create and track personal savings targets.
- **Progressive Web App (PWA)** – Support for installable web application functionality.

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Vite PWA Plugin

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JSON Web Token (JWT)
- bcryptjs
- Zod
- Helmet
- CORS

### Database & Infrastructure
- PostgreSQL
- Supabase
- Netlify
- Netlify Functions

## Project Structure

```text
FinTrack/
├── backend/
│   ├── netlify/
│   │   └── functions/
│   │       └── api.ts
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── netlify.toml
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 22
- npm
- Git
- PostgreSQL database or Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/HikamSirrul/FinTrack.git
cd FinTrack
```

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:

```env
DATABASE_URL="your_supabase_database_connection_string"
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="http://localhost:5173"
```

Generate Prisma Client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Build and start the backend:

```bash
npm run build
npm start
```

For development:

```bash
npm run dev
```

Backend URL: `http://localhost:3000`

### 3. Configure the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the development server:

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key used for JWT authentication |
| `JWT_EXPIRES_IN` | JWT token expiration duration |
| `FRONTEND_URL` | Frontend origin allowed by backend CORS |
| `VITE_API_URL` | Backend API base URL |

**Important:** Never commit `.env` files, database credentials, or JWT secrets to the repository.

## API Overview

| Endpoint | Description |
|---|---|
| `/api/auth` | User authentication |
| `/api/accounts` | Account management |
| `/api/categories` | Transaction category management |
| `/api/transactions` | Income and expense transactions |
| `/api/dashboard` | Dashboard financial summaries |
| `/api/budgets` | Budget management |
| `/api/savings-goals` | Savings goal management |
| `/api/health` | Backend health check |
| `/api/health/db` | Database connection health check |

Most user-specific endpoints require JWT authentication.

## Deployment

FinTrack uses the following deployment architecture:

- **Frontend:** Netlify
- **Backend:** Netlify Functions
- **Database:** Supabase PostgreSQL

Frontend and backend are deployed through a single Netlify site, with API requests routed through Netlify redirects.

## Security

- Password hashing using bcryptjs.
- JWT-based authentication.
- Request validation using Zod.
- HTTP security headers using Helmet.
- CORS configuration.
- Environment variables for sensitive credentials.

## Author

**Hikam Sirrul Arifin**

- GitHub: [@HikamSirrul](https://github.com/HikamSirrul)
- LinkedIn: [hikamsrl](https://www.linkedin.com/in/hikamsrl/)

---

*FinTrack – Manage Your Money, Track Your Future.*
