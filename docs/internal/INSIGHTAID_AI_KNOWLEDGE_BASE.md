# InsightAid AI — Claude Code Knowledge Base

> Paste this file at the start of your Claude Code session (or drag it into the context)  
> to restore full project context without re-explaining anything from scratch.

---

## 1. Project identity

| Field | Value |
|---|---|
| **Project name** | InsightAid AI |
| **Full title** | An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups |
| **Student** | Muhammad Danish Alif Bin Azrul |
| **Student ID** | 22006390 · CGPA 3.46 |
| **Email** | muhammad_22006390@utp.edu.my |
| **Specialisation** | Data Analytics with Financial Management |
| **Supervisor** | Ts Dr. Ahmad Izuddin Bin Zainal Abidin (DC/UTP) |
| **Institution** | Universiti Teknologi PETRONAS — Faculty of Science, Management & Computing |
| **Document reference** | UTP-ACA-PROG-FYP-01.01a v7.0 Jan 2025 (Form 01A submitted) |
| **Nature** | Final Year Project built to **commercial SaaS standards** |

---

## 2. Problem statement

Early-stage startups and SMEs face a critical data gap. Despite high startup failure rates directly linked to poor decision-making, most lack affordable tools to convert raw business and social media data into actionable intelligence. Existing solutions are either too expensive, overly complex, or too limited in scope, forcing startups to rely on manual analysis or intuition, which causes:

- Missed market signals and emerging trends
- Inaccurate demand and sales forecasting
- Delayed responses to customer sentiment shifts
- Inability to detect early warning signs of business crises

---

## 3. Solution overview

InsightAid AI is an AI-powered Intelligent Decision Support System (DSS) that integrates **multilingual** (English, Bahasa Melayu, Mandarin) social media and business data to generate real-time, actionable insights using:

- **Real-time sentiment analysis** — TikTok and X (Twitter) data, confidence-scored per post
- **Predictive business forecasting** — sales trends, market demand via time-series models
- **Automated crisis detection** — threshold-based alerting on sudden sentiment spikes
- **AI-driven recommendations** — context-aware suggestions for marketing, operations, product
- **Interactive BI dashboard** — real-time charts, KPI monitoring, multilingual UI

**Target users:** Startup founders and co-founders, SME business owners and marketing managers, business analysts in small companies, startup incubators and accelerators.

---

## 4. Technology stack

### Frontend (what is built)

| Package | Version | Role |
|---|---|---|
| react | ^19.2.7 | Core UI framework |
| react-dom | ^19.2.7 | DOM renderer |
| react-router-dom | ^7.18.1 | SPA routing |
| axios | ^1.18.1 | HTTP client (service layer only) |
| framer-motion | ^12.42.2 | Animation primitives |
| lucide-react | ^1.23.0 | Icon library (**exclusive** — no emojis anywhere) |
| recharts | ^3.9.2 | Chart components |
| vite | ^8.1.3 | Build tool / dev server |
| @vitejs/plugin-react | ^6.0.3 | React fast refresh |
| tailwindcss | ^4.3.2 | Utility CSS (v4 — `@theme` tokens, not config file) |
| @tailwindcss/vite | ^4.3.2 | Tailwind v4 Vite plugin |
| eslint | ^10.6.0 | Linting (flat config format) |
| prettier | ^3.9.4 | Formatting |

**Node requirement:** Node.js 20.19+ (Node 22 used during development).  
**Language:** JavaScript ES2023 — **no TypeScript** (per FYP requirements; can be migrated cheaply at Phase 2 start if desired).  
**Component style:** Functional components only. No class components.

### Backend (future integration — interfaces prepared, not built yet)

Flask REST API · HuggingFace (XLM-RoBERTa, mBERT) · Scikit-learn · Prophet · TensorFlow/LSTM · Firebase Auth/Firestore (dev) · PostgreSQL (prod) · MongoDB (analytics) · Celery + Redis (async jobs) · Docker

### Social media data sources (future)

TikTok API · X (Twitter) API v2 · Threads API  
Service files stubbed at `src/services/` for each (`sentimentService.js`, `tiktokService.js`, etc.).  
All data flows through the service layer — UI components never call axios directly.

---

## 5. Design system

Extracted from the Figma frames (Figma link: `https://www.figma.com/make/dG13QZc1FyXebdWMvW3mZ8/Remove-Emojis-from-System`).  
Figma blocks automated access so all tokens were extracted manually from screenshots.

### Colour tokens (defined in `src/styles/index.css` under `@theme`)

```css
/* Brand — deep pine green; used for sidebar, primary buttons, dark surfaces */
--color-brand-50:  #f3f7f5
--color-brand-950: #15211c   ← sidebar bg

/* Accent — signal green; positive metrics, active nav, logo pulse */
--color-accent-400: #4ade80
--color-accent-500: #22c55e  ← primary metric colour

/* Semantic */
--color-success: #16a34a
--color-danger:  #dc2626
--color-warning: #d97706
--color-info:    #3b82f6

/* Surfaces — paired for light / dark */
--color-canvas:       #f6f8f7   --color-canvas-dark:  #0f1714
--color-surface:      #ffffff   --color-surface-dark: #182420
--color-line:         #e6ece9   --color-line-dark:    #26332e

/* Shape */
--radius-card: 1rem
--shadow-card: 0 1px 2px rgb(15 23 19 / 0.04), 0 6px 16px rgb(15 23 19 / 0.05)
```

### Typography

| Role | Family | Usage |
|---|---|---|
| Display / Headings | Poppins | h1–h4, Sidebar brand name |
| Body / UI | Inter | Body copy, labels, table cells |

Both loaded via Google Fonts in `index.html`. Never serif, never decorative.

### Dark mode

Class-based — `ThemeProvider` toggles `.dark` on `<html>`.  
Declared in CSS as: `@custom-variant dark (&:where(.dark, .dark *));`  
Persists to `localStorage` key `insightaid.theme`. Falls back to `prefers-color-scheme`.

### Recharts colour constants (`src/theme/chartTheme.js`)

```js
CHART_COLORS = {
  positive: '#22c55e', neutral: '#a8a29e', negative: '#ef4444',
  tiktok:   '#22c55e', x:       '#60a5fa',
  actual:   '#1e2f29', forecast: '#3b82f6',
  grid: '#e6ece9',     gridDark: '#26332e',
}
CHART_SEQUENCE = ['#22c55e', '#60a5fa', '#a8a29e', '#d97706', '#ef4444']
```

---

## 6. Project structure

```
insightaid-ai/
├── index.html                  # Entry HTML — fonts, title, favicon
├── vite.config.js              # Vite + React plugin + Tailwind v4 + @ alias
├── eslint.config.js            # ESLint flat config (ES2023)
├── .prettierrc                 # single quotes, semi false, 100 chars
├── jsconfig.json               # @ alias for editor IntelliSense
├── .env.example                # VITE_API_BASE_URL=http://localhost:5000/api
├── public/
│   └── favicon.svg             # Pine-green pulse-line brand mark
└── src/
    ├── main.jsx                # createRoot → <StrictMode><App />
    ├── App.jsx                 # ThemeProvider + RouterProvider
    ├── animations/
    │   └── motionPresets.js    # fadeInUp, fadeIn, staggerContainer, pressable
    ├── assets/                 # Images, logos (empty at Phase 1)
    ├── components/
    │   └── common/
    │       ├── PageLoader.jsx  # Suspense fallback spinner
    │       └── PagePlaceholder.jsx  # Temp stand-in for unbuilt pages
    ├── config/
    │   └── env.js              # Typed env access — never use import.meta.env elsewhere
    ├── constants/
    │   └── navigation.js       # NAV_ITEMS array + PAGE_TITLES map (single source of truth)
    ├── contexts/
    │   ├── theme-context.js    # createContext(null) — separated for Fast Refresh
    │   └── ThemeProvider.jsx   # Reads/writes localStorage, toggles .dark on <html>
    ├── data/                   # Mock JSON fixtures (empty at Phase 1)
    ├── hooks/
    │   └── useTheme.js         # Consumes ThemeContext; throws if used outside provider
    ├── layouts/
    │   └── DashboardLayout.jsx # App shell — sidebar rail + topbar + <Outlet>
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── SentimentAnalysis.jsx
    │   ├── Forecasting.jsx
    │   ├── CrisisDetection.jsx
    │   ├── AiRecommendations.jsx
    │   ├── SocialIntelligence.jsx
    │   ├── Reports.jsx
    │   ├── DatasetManagement.jsx
    │   ├── SettingsPage.jsx
    │   └── NotFound.jsx
    ├── routes/
    │   ├── paths.js            # PATHS constant object — single source for all route strings
    │   ├── pages.js            # All lazy() imports — separated so Fast Refresh stays clean
    │   └── index.jsx           # createBrowserRouter config
    ├── services/
    │   └── apiClient.js        # Shared axios instance (baseURL from env.js)
    ├── styles/
    │   └── index.css           # @import tailwindcss + @theme tokens + @layer base resets
    ├── theme/
    │   └── chartTheme.js       # Recharts hex constants + CHART_SEQUENCE array
    ├── types/
    │   └── index.js            # JSDoc typedefs: SentimentLabel, SentimentResult, CrisisLevel…
    └── utils/
        └── formatters.js       # formatCurrencyMYR, formatCompact, formatPercent, formatDelta
```

---

## 7. Routing

All routes are **lazy-loaded** and nested under `DashboardLayout` which wraps them in `<Suspense fallback={<PageLoader />}>`. SPA fallback — any unknown path hits the `*` child and renders `NotFound`.

| URL | Page component | Phase |
|---|---|---|
| `/` | Dashboard | 4 |
| `/sentiment` | SentimentAnalysis | 5 |
| `/forecasting` | Forecasting | 7 |
| `/crisis-detection` | CrisisDetection | 6 |
| `/recommendations` | AiRecommendations | 8 |
| `/social-intelligence` | SocialIntelligence | 9 |
| `/reports` | Reports | 10 |
| `/datasets` | DatasetManagement | 11 |
| `/settings` | SettingsPage | 12 |
| `/*` | NotFound | — |

---

## 8. Sidebar navigation (Figma-exact order)

Defined in `src/constants/navigation.js`. Do not change the order — it matches the Figma frames.

```
Dashboard           → /                 → LayoutGrid (Lucide)
Sentiment Analysis  → /sentiment        → MessageSquare
Forecasting         → /forecasting      → TrendingUp
Crisis Detection    → /crisis-detection → AlertTriangle
AI Recommendations  → /recommendations  → Lightbulb
Social Intelligence → /social-intelligence → Globe
Reports             → /reports          → FileText
Dataset Management  → /datasets         → Database
Settings            → /settings         → Settings
```

Active state in sidebar: `bg-white/10` background + `font-medium text-white` + a green left indicator pip (Phase 2 — currently handled by NavLink active class only).

User footer at sidebar bottom: **Admin User / Founder** with logout link. (Phase 2 build.)

---

## 9. Key engineering rules (from the prompt pack)

1. **Functional components only.** No class components ever.
2. **No emojis anywhere** in the codebase or UI — Lucide icons exclusively.
3. **No axios outside `src/services/`** — all domain services build on `apiClient`.
4. **No raw `import.meta.env`** outside `src/config/env.js`.
5. **`@/` import alias everywhere** — never use relative `../../` paths.
6. **Dark mode is class-based** — don't add `media` variant anywhere.
7. **Tailwind v4 token syntax** — `bg-brand-950`, `rounded-card`, `shadow-card` etc. The `@theme` block in `index.css` is the source of truth. Do **not** create a `tailwind.config.js`.
8. **No inline styles** — Tailwind utility classes or CSS custom properties only.
9. **Route-level code splitting** — keep lazy imports in `routes/pages.js`, not in the router file itself, to preserve Fast Refresh.
10. **Single Responsibility** — context object (`theme-context.js`) is separate from the provider (`ThemeProvider.jsx`) and the hook (`useTheme.js`). Follow this pattern for new contexts.
11. **SOLID / DRY / Clean Architecture** — no duplicated JSX, no oversized components, no unnecessary libraries.

---

## 10. Development commands

```bash
npm install          # install dependencies
cp .env.example .env # first-time env setup
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # serve production build locally
npm run lint         # ESLint (flat config, 0 errors expected)
npm run format       # Prettier write
```

Build must complete with **zero errors and zero ESLint errors** before any phase is marked done.

---

## 11. Development phases — status and scope

| Phase | Title | Status | Scope summary |
|---|---|---|---|
| **1** | Scaffold, tokens, routing, theme | **DONE** | Vite init, Tailwind v4 tokens, all routes wired with lazy pages, ThemeProvider, DashboardLayout skeleton, ESLint/Prettier, prod build verified |
| **2** | Global Layout | **NEXT** | Extract `<Sidebar>` (collapsible, mobile drawer, user footer, active pip) and `<Navbar>` (search, dark toggle, notification bell+dot, avatar) into dedicated layout components; floating AI assistant button (bolt icon, bottom-right) |
| **3** | Reusable component library | Pending | Button, Card, Badge, Table, Form inputs, Dialogs, Notifications, Loading Skeleton, Tag/Chip |
| **4** | Dashboard page | Pending | AI executive summary banner, 5 KPI cards (sentiment, crisis risk, business health, revenue forecast, market opportunity — each with forecast and confidence %), Sentiment Trend area chart, Platform Distribution donut, Daily Mention Volume grouped bar, Trending Keywords chips, Recent Alerts list, Latest AI Recommendations preview list |
| **5** | Sentiment Analysis page | Pending | Keyword search, language filter (All/EN/MY/ZH), platform filter (All/TikTok/X), Export button, positive/neutral/negative score cards with WoW delta, 7-day Sentiment Trend line chart, Emotion Analysis breakdown (Joy 38%, Trust 24%, Anticipation 16%, Surprise 10%, Anger 7%, Sadness 5%), Most Influential Posts ranked list (post text, platform + language tags, sentiment + confidence), Region Breakdown by state (dual bar: score + mentions) |
| **6** | Crisis Detection page | Pending | Current Crisis Level banner (Low/Medium/High/Critical) with risk score and 4-level indicator, 4 status cards (Negative Spike, Mention Spike, Anomaly Score, Affected Platforms), 24-hour anomaly detection line chart with tooltip, AI Root Cause Summary panel with recommended actions, Historical Crisis Log table |
| **7** | Forecasting page | Pending | Forecast horizon selector (7/30/90 days) + Recalculate button, Historical vs Forecast line chart (actual solid / forecast dashed, with 90% confidence interval band), 3 metric cards (Sales Revenue, Customer Demand, Customer Engagement — each with arrow delta and forecast accuracy progress bar), Scenario Simulation (Best / Expected / Worst case cards) |
| **8** | AI Recommendations page | Pending | Category filter tabs (All / Marketing / Operations / Customer Service / Product / Growth / Investment) + Generate New button, recommendation cards (category badge, priority badge, Impact Score %, Confidence %, Est. ROI %, timeframe, expandable "Why did the AI make this?" disclosure, Action Checklist checkboxes) |
| **9** | Social Intelligence page | Pending | Platform toggle (TikTok / X), Platform Comparison table (mention volume, virality, engagement, top language, sentiment score), 7-day Mention Volume bar chart, Trending Hashtags ranked list with bar indicators, Top Influencers table (handle, platform, follower count, virality, engagement %, sentiment badge), Top Posts list (text, likes, shares, platform tag) |
| **10** | Reports page | Pending | One-click AI Executive Summary banner with Generate Now button, 6 report template cards (Weekly, Monthly, Investor, Startup Health, Sentiment, Forecast — each with Generate button), Export Options section (PDF, Excel, CSV, PowerPoint) |
| **11** | Dataset Management page | Pending | Upload dropzone (CSV/JSON/XLSX up to 100 MB), API Connection Status for TikTok API + X API + Internal Database (Connected status + Sync button each), Storage Usage widget (GB used / total, language detection breakdown EN/MY/ZH), Recent Imports table (file, size, records, quality %, status) |
| **12** | Settings page | Pending | Left sub-nav: Profile, Company, Notifications, Language & Theme, API Keys, Security, Model Config, Database, About. Profile section: avatar with Change Photo, Full Name, Email, Role, Phone, Save Changes button |

---

## 12. Figma design reference

**URL:** `https://www.figma.com/make/dG13QZc1FyXebdWMvW3mZ8/Remove-Emojis-from-System`  
**Note:** Figma blocks automated fetch. Always reference the screenshots provided in the original session, or share new Figma screenshots for any frame that needs to be built next.

**Confirmed frames seen (from screenshots):**
- Executive Dashboard (full — KPIs, charts, alerts, recommendations)
- Sentiment Analysis (full — search, emotion analysis, region breakdown, posts)
- Business Forecasting (full — chart, metrics, scenario simulation)
- Crisis Detection Center (full — banner, chart, AI summary, history log)
- AI Recommendation Engine (full — category filters, recommendation cards)
- Social Media Intelligence (full — platform comparison, hashtags, influencers, posts)
- Reports and Export (full — templates, export options)
- Dataset Management (full — upload, API status, storage, imports)
- Settings (full — profile sub-section)

**Visual language to preserve in every phase:**
- White cards on `#f6f8f7` page background (light) / `#182420` cards on `#0f1714` background (dark)
- Deep pine green sidebar (`#15211c`) with subtle white/10 active pill
- Signal green (`#22c55e`) for positive values, deltas, and metric highlights
- Red (`#ef4444`) for negative/danger, amber (`#d97706`) for medium/warning
- Blue (`#3b82f6`) for forecast lines, X (Twitter) platform data
- Thin `1px` borders (`#e6ece9` light / `#26332e` dark)
- `1rem` card border-radius, minimal drop shadow
- No decorative elements — enterprise minimal

---

## 13. Utility functions reference

All in `src/utils/formatters.js`:

```js
formatCurrencyMYR(67500)  // → "RM 67,500"
formatCompact(12340)       // → "12.3K"
formatPercent(74.24)       // → "74.2%"
formatDelta(23)            // → "+23%"
formatDelta(-7.2)          // → "-7.2%"
```

---

## 14. Framer Motion presets

All in `src/animations/motionPresets.js`. Spread onto `<motion.*>` elements:

```js
fadeInUp          // opacity 0→1, y 12→0, 350ms easeOut
fadeIn            // opacity 0→1, 300ms easeOut
staggerContainer  // staggerChildren: 60ms (use on list wrappers)
pressable         // whileHover scale 1.02, whileTap scale 0.98
```

---

## 15. What comes next (Phase 2 spec for Claude Code)

When starting Phase 2, tell Claude Code:

> "We are on Phase 2. Extract `<Sidebar>` and `<Navbar>` from `DashboardLayout.jsx` into `src/layouts/Sidebar.jsx` and `src/layouts/Navbar.jsx`. Follow the Figma design: deep pine sidebar with active pill (left green indicator + white/10 bg), user footer (Admin User / Founder / Logout), collapsible to icon-only rail on desktop and a drawer on mobile. Navbar: search input, dark/light toggle, notification bell with red dot, avatar circle. Add the floating AI assistant action button (bolt/lightning icon, bottom-right, brand-950 bg with accent-400 icon). Build and verify on localhost before moving to Phase 3."

---

## 16. Git commit convention

```
feat(scope): short present-tense description

feat(dashboard):   Executive Dashboard page
feat(sentiment):   Sentiment Analysis page
feat(layout):      Sidebar and Navbar extracted
refactor(layout):  Responsive sidebar drawer
fix(charts):       Recharts rendering issue
style(cards):      KPI spacing and delta chips
feat(crisis):      Crisis Detection page
chore(deps):       Upgrade framer-motion
```

Never commit with build errors or ESLint errors.

---

## 17. Second FYP project for reference context

Dzul Firdaus (Student ID 22007420) is building a separate project — **Gen-AI Enhanced Framework for Dynamic Skincare Synthesis** — supervised by Dr. Emelia Akasyah at UTP. This project was shown as a slide deck reference in the session (for proposal defense structure inspiration) but is **unrelated to InsightAid AI**. Do not mix up the two projects.

---

*Knowledge base generated from the claude.ai session on 2026-07-08. Transfer this file to Claude Code to continue from Phase 2 without re-explaining context.*
