# 💰 FinanceTracker — Personal Budget Dashboard

A personal finance web application built with **Next.js 15 (App Router)**, **Supabase** (Auth + Postgres + RLS), **Tailwind CSS v4**, and custom **shadcn/ui** components. Deployable on Vercel.

---

## ✨ Features

- **Monthly Dashboard** — KPI cards for Income, Total Spent, Remaining (color-coded)
- **Category Breakdown** — 8 default categories (Rent, Groceries, Gym, etc.) with progress bars
- **Budget Limits** — Set monthly budget targets per category, hover to edit inline
- **Quick-Add Transactions** — Modal form for logging income or expenses
- **Month Navigation** — Switch between past months with arrow buttons
- **Authentication** — Email/Password + Magic Link via Supabase Auth
- **Row-Level Security** — Each user sees only their own data

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd personal-fianance
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Paste and run the contents of `supabase_schema.sql` (in the project root)
4. Go to **Settings → API** and copy your `Project URL` and `anon public` key

### 3. Configure Environment Variables

Create `.env.local` (already created as a template):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## 📦 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          # Dark glassmorphism auth wrapper
│   │   ├── login/page.tsx      # Login page
│   │   └── signup/page.tsx     # Sign up page
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Nav header + ambient background
│   │   └── dashboard/page.tsx  # Main monthly dashboard (client)
│   ├── layout.tsx              # Root layout (Inter font, metadata)
│   ├── page.tsx                # Root → redirects to /dashboard
│   └── globals.css             # Design system CSS
├── components/
│   ├── auth/
│   │   └── AuthForm.tsx        # Email/password + magic link form
│   ├── dashboard/
│   │   ├── KPICards.tsx        # Income / Spent / Remaining cards
│   │   ├── CategoryBreakdown.tsx # Per-category progress bars
│   │   ├── TransactionList.tsx # Transaction feed with delete
│   │   ├── AddTransactionModal.tsx # Quick-add form dialog
│   │   └── MonthSwitcher.tsx   # Month/year navigation
│   └── ui/                     # Custom shadcn-style components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── progress.tsx
│       ├── textarea.tsx
│       └── badge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client (SSR)
│   │   └── middleware.ts       # Auth session refresh
│   ├── types.ts                # All TypeScript interfaces
│   └── utils.ts                # cn(), formatCurrency(), date helpers
└── middleware.ts                # Route protection
```

---

## 🗄️ Database Schema

See `supabase_schema.sql` for the complete SQL. Tables:

| Table | Purpose |
|---|---|
| `profiles` | User display name (auto-created on signup) |
| `categories` | Per-user categories with icon, color, sort order |
| `months` | One row per user/month (for notes) |
| `category_budgets` | Monthly budget limits per category |
| `transactions` | All income/expense entries |

All tables have **Row Level Security (RLS)** — users can only access their own data.

---

## ☁️ Vercel Deployment

1. Push to GitHub
2. Connect repo in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase → **Authentication → URL Configuration**:
   - Add your Vercel domain to **Redirect URLs**: `https://your-app.vercel.app/**`
5. Deploy!

---

## 🔒 Security Notes

- Supabase RLS ensures data isolation between users at the database level
- Next.js Middleware (`src/middleware.ts`) enforces auth on all routes
- Never commit your `.env.local` file — it's in `.gitignore` ✅

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15+ (App Router, TypeScript) |
| Database + Auth | Supabase (Postgres + RLS) |
| Styling | Tailwind CSS v4 |
| UI Primitives | Radix UI + custom components |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Deployment | Vercel |
