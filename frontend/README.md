# Frontend

React + Vite client for the Secure Audit Portal.

## Setup

1. Copy .env.example to .env
2. Set VITE_API_URL to your backend base URL
3. Install dependencies and run dev server

```bash
npm install
npm run dev
```

## Notes

- API requests use cookies (withCredentials=true)
- Routing includes protected and admin-only sections
- UI is custom CSS (no Tailwind)
