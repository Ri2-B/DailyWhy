# AI Decision-Making App - Backend & Deployment Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Setup](#supabase-setup)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [AI Provider Setup](#ai-provider-setup)
7. [Local Development](#local-development)
8. [Deployment](#deployment)
9. [API Documentation](#api-documentation)
10. [Cron Jobs & Edge Functions](#cron-jobs--edge-functions)

---

## 🎯 Project Overview

This backend system provides:
- **Decision Input & AI Analysis**: Submit decisions and get AI-powered rankings
- **Multi-AI Support**: OpenAI (GPT-4) and Anthropic (Claude) integration
- **Insights Engine**: Weekly/monthly pattern analysis
- **Streak & Habit Tracking**: Gamification features
- **Community Trends**: Anonymous aggregated insights
- **Edge Functions**: Scheduled tasks for insights generation

---

## 📦 Prerequisites

- Node.js 18+ 
- pnpm, npm, or yarn
- Supabase account (free tier works)
- OpenAI API key and/or Anthropic API key
- Vercel account (for deployment with cron jobs)

---

## 🗄️ Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project name: `ai-decision-app`
4. Generate a secure database password (save it!)
5. Select your region
6. Click "Create new project"

### 2. Get Your API Keys

1. Go to **Settings > API**
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🗃️ Database Setup

### 1. Run the Schema Migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and click **Run**

### 2. Set Up RLS Policies

1. Still in **SQL Editor**
2. Copy the contents of `supabase/rls-policies.sql`
3. Paste and click **Run**

### 3. Verify Tables

Go to **Table Editor** and confirm these tables exist:
- `profiles`
- `decisions`
- `outcomes`
- `insights`
- `community_trends`
- `streaks`
- `micro_decisions`
- `life_hacks`
- `user_life_hacks`
- `mood_boosters`
- `decision_templates`

---

## 🔐 Environment Variables

### Create `.env.local`

```bash
cp .env.example .env.local
```

### Fill in the values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Cron Jobs
CRON_SECRET=generate-a-random-string-here
```

---

## 🤖 AI Provider Setup

### OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Create a new key
4. Add billing (required for API access)
5. Add to `.env.local` as `OPENAI_API_KEY`

### Anthropic (Claude) Setup

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Create a new key
4. Add billing
5. Add to `.env.local` as `ANTHROPIC_API_KEY`

---

## 💻 Local Development

### Install Dependencies

```bash
pnpm install
# or
npm install
```

### Add Required Packages

```bash
pnpm add @supabase/supabase-js @supabase/ssr openai @anthropic-ai/sdk
# or
npm install @supabase/supabase-js @supabase/ssr openai @anthropic-ai/sdk
```

### Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Visit `http://localhost:3000`

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `CRON_SECRET`
5. Deploy!

### Cron Jobs

The `vercel.json` file configures:
- **Weekly Insights**: Runs every Sunday at midnight UTC

To test locally:
```bash
curl http://localhost:3000/api/cron/weekly-insights \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 📖 API Documentation

### Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <supabase-access-token>
```

### Endpoints

#### Decisions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/decisions` | List user's decisions |
| POST | `/api/decisions` | Create decision with AI analysis |
| GET | `/api/decisions/[id]` | Get single decision |
| PATCH | `/api/decisions/[id]` | Update decision (choose option) |
| DELETE | `/api/decisions/[id]` | Delete decision |
| POST | `/api/decisions/[id]/analyze` | Re-analyze with AI |

##### Create Decision Request
```json
{
  "title": "Should I change jobs?",
  "description": "Considering a new opportunity...",
  "category": "work",
  "urgency": "high",
  "options": [
    {"id": "1", "text": "Stay at current job", "pros": ["stability"], "cons": ["no growth"]},
    {"id": "2", "text": "Accept new offer", "pros": ["higher pay"], "cons": ["unknown culture"]}
  ],
  "mood_before": "anxious",
  "analyze": true,
  "ai_provider": "openai"
}
```

##### AI Analysis Response
```json
{
  "decision": { ... },
  "aiAnalysis": {
    "rankings": [
      {
        "option_id": "2",
        "rank": 1,
        "score": 78,
        "predicted_outcome": "Career advancement with initial adjustment period",
        "risk_level": "medium",
        "time_horizon": "long-term"
      }
    ],
    "reasoning": "Based on the analysis...",
    "summary": "The new opportunity offers...",
    "confidence_score": 0.72,
    "key_factors": ["career growth", "compensation"],
    "potential_biases": ["status quo bias"],
    "recommended_action": "Negotiate terms before deciding"
  }
}
```

#### Outcomes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/outcomes` | List user's outcomes |
| POST | `/api/outcomes` | Record decision outcome |

##### Record Outcome Request
```json
{
  "decision_id": "uuid",
  "outcome_type": "positive",
  "outcome_score": 8,
  "notes": "The decision worked out well",
  "learned_lessons": "Trust the data",
  "would_decide_same": true,
  "actual_vs_predicted": "as_expected"
}
```

#### Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insights` | Get user's insights |
| POST | `/api/insights` | Generate insights on demand |
| PATCH | `/api/insights` | Get dashboard metrics |

#### Micro-Decisions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/micro-decisions` | List micro-decisions |
| POST | `/api/micro-decisions` | Create with AI suggestion |
| PATCH | `/api/micro-decisions` | Record choice |

#### Streaks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/streaks` | Get user's streaks |
| POST | `/api/streaks` | Record streak activity |

#### Community Trends

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | Get anonymous community trends |

---

## ⏰ Cron Jobs & Edge Functions

### Vercel Cron (Recommended for Vercel deployments)

Configured in `vercel.json`:
- Weekly insights run every Sunday at midnight

### Supabase Edge Functions (Alternative)

Deploy Edge Functions:
```bash
supabase functions deploy weekly-insights
supabase functions deploy generate-trends
```

Schedule with pg_cron (in Supabase SQL Editor):
```sql
-- Enable pg_cron extension (requires Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly insights (Sundays at midnight)
SELECT cron.schedule(
  'weekly-insights',
  '0 0 * * 0',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/weekly-insights',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);

-- Schedule daily trends generation (2 AM)
SELECT cron.schedule(
  'generate-trends',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-trends',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);
```

---

## 🔒 Security Considerations

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** on the client
2. All user data is protected by RLS policies
3. API routes verify authentication before processing
4. Cron endpoints verify `CRON_SECRET`
5. Community trends only show aggregated, anonymous data

---

## 📊 Database Schema Overview

```
profiles (extends auth.users)
├── decisions
│   ├── outcomes
│   └── ai_rankings (JSON)
├── insights
├── streaks
├── micro_decisions
├── user_life_hacks
└── mood_boosters

community_trends (global, anonymous)
life_hacks (global)
decision_templates (global + user-created)
```

---

## 🐛 Troubleshooting

### Common Issues

1. **"Unauthorized" errors**: Check that your Supabase keys are correct
2. **AI analysis failing**: Verify API keys and check rate limits
3. **RLS errors**: Ensure policies are applied correctly
4. **Cron not running**: Check Vercel dashboard for cron logs

### Useful Commands

```bash
# Check Supabase connection
npx supabase db diff

# View function logs (Supabase)
supabase functions logs weekly-insights

# Test API locally
curl -X POST http://localhost:3000/api/decisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Test","options":[{"id":"1","text":"A"},{"id":"2","text":"B"}]}'
```

---

## 📞 Support

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
