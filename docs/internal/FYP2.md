# INSIGHTAID AI — Claude Code Knowledge Base & FYP 2 Development Master Prompt

> **Purpose:** This document is the single source of truth for Claude Code when working on the existing INSIGHTAID AI application.
>
> **Current stage:** FYP 2 — Implementation, Integration, Testing & Deployment
>
> **Core instruction:** Do not rebuild the project. Audit, reuse, repair, integrate, improve, test, and deploy the existing application.

---

# 1. PROJECT IDENTITY

| Field                 | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Project Name**      | INSIGHTAID AI                                                                                     |
| **Full Title**        | An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups |
| **Student**           | Muhammad Danish Alif Bin Azrul                                                                    |
| **Student ID**        | 22006390                                                                                          |
| **Specialisation**    | Data Analytics with Financial Management                                                          |
| **Supervisor**        | Ts Dr. Ahmad Izuddin Bin Zainal Abidin                                                            |
| **Institution**       | Universiti Teknologi PETRONAS — Faculty of Science, Management & Computing                        |
| **Nature**            | Final Year Project                                                                                |
| **Current Stage**     | FYP 2 — Implementation, Integration, Testing & Deployment                                         |
| **Product Direction** | Intelligent Decision Support System for early-stage businesses and selected e-commerce use cases  |

The system is an existing FYP project.

Claude Code must treat the current repository as the foundation of the project.

---

# 2. PRIMARY DEVELOPMENT OBJECTIVE

The current application is evolving from:

```text
UI / Prototype / Mock Data
```

toward:

```text
Real Data
↓
Data Processing
↓
Feature Engineering
↓
Real ML
↓
Forecasting
↓
Crisis Detection
↓
Actionable Recommendations
↓
Decision Support Dashboard
↓
Business Planning for Limited/No Data
↓
Reports
↓
Testing
↓
Production Deployment
```

The final application must remain recognizably INSIGHTAID AI and aligned with the original FYP research objectives.

The goal is NOT to create a different product.

> **EVOLVE INSIGHTAID AI.**

---

# 3. MOST IMPORTANT EXECUTION RULE — AUDIT FIRST

## DO NOT IMMEDIATELY MODIFY THE CODEBASE.

Before making significant changes:

1. Inspect the existing repository.
2. Understand the current architecture.
3. Understand the current UI and design system.
4. Understand the current routing.
5. Understand the current database.
6. Understand Supabase configuration.
7. Inspect authentication and authorization.
8. Inspect API integrations.
9. Inspect external data sources.
10. Inspect existing analytics.
11. Inspect existing ML implementation.
12. Search for mock/demo data.
13. Search for hardcoded production values.
14. Inspect environment variables.
15. Inspect deployment configuration.
16. Inspect tests.
17. Identify what already works.
18. Identify what is incomplete.
19. Identify what is broken.
20. Identify what can be reused.

Create:

```text
docs/INSIGHTAID_AUDIT.md
```

before making major architectural modifications.

Do not perform destructive refactoring before understanding the existing implementation.

---

# 4. DEVELOPMENT PHILOSOPHY

Follow:

```text
AUDIT
↓
UNDERSTAND
↓
REUSE
↓
REPAIR
↓
INTEGRATE
↓
IMPROVE
↓
TEST
↓
DOCUMENT
↓
DEPLOY
```

Never default to:

```text
DELETE
↓
REBUILD
↓
CHANGE THE PROJECT
```

If an existing implementation already solves a requirement:

**Reuse it.**

If it is broken:

**Repair it.**

If it is only mock/demo functionality:

**Connect it to the real pipeline where appropriate.**

Only introduce new architecture when the existing architecture genuinely cannot support the requirement.

---

# 5. DO NOT REBUILD THE PROJECT

DO NOT unnecessarily:

* rewrite the entire application
* replace React/Vite
* replace the existing frontend architecture
* replace Supabase/PostgreSQL without technical justification
* introduce Firebase unnecessarily
* introduce MongoDB unnecessarily
* introduce Redis unnecessarily
* introduce Docker unnecessarily
* remove useful existing components
* replace the existing UI unnecessarily
* change the FYP title
* change the research direction
* turn the system into a generic BI dashboard
* turn the project into only a chatbot
* make Gemini the primary analytical engine
* remove multilingual sentiment analysis
* remove forecasting comparison
* remove crisis detection
* remove recommendation functionality
* replace real analytics with generated AI text

Preserve working components.

---

# 6. ORIGINAL PROJECT PURPOSE

INSIGHTAID AI is an intelligent decision-support system intended to help:

* early-stage startups
* small businesses
* SMEs where appropriate
* selected e-commerce businesses

understand business, customer, marketplace and social data and make more informed decisions.

The original analytical direction consists of:

1. Multilingual sentiment analysis
2. Business/customer/social data analysis
3. Data preprocessing
4. Feature engineering
5. Demand/sales forecasting
6. Comparison between sales-only forecasting and sentiment-enhanced forecasting
7. Crisis detection
8. Actionable recommendation generation
9. Affordable and understandable analytics
10. Decision-support dashboards

The system should transform:

```text
DATA
↓
INSIGHT
↓
RISK
↓
FORECAST
↓
RECOMMENDATION
↓
DECISION SUPPORT
```

The system must not merely display charts.

---

# 7. CURRENT PRODUCT DIRECTION

INSIGHTAID AI should support two major business contexts within one unified application:

```text
BUSINESS STARTUP
        |
        +----------------+
                         |
                    E-COMMERCE
```

These are not separate applications.

They should share:

* analytics
* data models
* processing
* services
* components
* dashboard patterns
* recommendation logic
* reporting infrastructure

where appropriate.

---

# 8. BUSINESS STARTUP MODE

Focus on:

* business overview
* sales/revenue
* customer sentiment
* business health
* social intelligence
* forecasting
* crisis monitoring
* recommendations
* business planning
* data collection guidance

---

# 9. E-COMMERCE MODE

The e-commerce scope is primarily focused on:

* Shopee
* TikTok
* X
* Threads
* customer reviews
* products
* ratings
* customer sentiment
* complaints
* social discussions
* demand indicators
* forecasting
* crisis signals

The system should focus on selected Malaysian e-commerce/SME product categories.

Do not claim that the system represents every Malaysian SME.

Use precise wording such as:

> Analysis of publicly available marketplace and social/customer data relevant to selected Malaysian SME/e-commerce product categories.

---

# 10. TWO DATA AVAILABILITY PATHS

The application must support two fundamental business situations.

## PATH A — I HAVE DATA

The business has some combination of:

* sales records
* revenue
* customer reviews
* social-media data
* product information
* transaction history
* operational records

Workflow:

```text
Upload / Connect Data
↓
Validate
↓
Normalize
↓
Store Raw Data
↓
Preprocess
↓
Feature Engineering
↓
Sentiment
↓
Forecast
↓
Crisis
↓
Recommendation
↓
Dashboard
↓
Report
```

---

## PATH B — I DON'T HAVE DATA YET

The business has insufficient historical data.

The system should allow the business owner to:

* describe their business
* describe their business idea
* define products/services
* define prices
* define costs
* define target customers
* define expected sales
* define marketing plans
* define business goals
* provide assumptions

The system can then provide:

* structured business profile
* missing-information detection
* scenario planning
* planning projections
* potential risks
* recommended actions
* required future data
* suggested KPIs
* data collection guidance
* business planning report

### CRITICAL

Do NOT present scenario projections as scientifically validated historical forecasts.

Use:

**Scenario-Based / Planning Estimates**

or:

**Scenario Projections**

These are not historical-data forecasts.

---

# 11. APPLICATION ARCHITECTURE

Conceptually:

```text
                         INSIGHTAID AI
                               |
              +----------------+----------------+
              |                                 |
       BUSINESS STARTUP                    E-COMMERCE
              |                                 |
              +----------------+----------------+
                               |
                     DATA AVAILABILITY
                               |
                  +------------+------------+
                  |                         |
             DATA AVAILABLE          NO DATA / LIMITED DATA
                  |                         |
                  ↓                         ↓
          REAL DATA PIPELINE        BUSINESS PLANNING
                  |                         |
          Data Processing          Business Description
                  |                         |
          Feature Engineering       AI Extraction
                  |                         |
          Sentiment Analysis        Missing Information
                  |                         |
          Forecasting               Assumptions
                  |                         |
          Crisis Detection          Scenario Engine
                  |                         |
          Recommendation            Scenario Comparison
                  |                         |
                  +------------+------------+
                               |
                    DECISION SUPPORT ENGINE
                               |
                +--------------+--------------+
                |              |              |
             Dashboard       Reports       Data Guide
```

This is a conceptual architecture.

Do not force a new architecture if the current repository can support the same functionality more simply.

---

# 12. TECHNOLOGY STACK — PRESERVE

## Frontend

* React 19
* Vite
* JavaScript ES2023
* Tailwind CSS v4
* React Router DOM
* Recharts
* Framer Motion
* Lucide React

## Backend / Database

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Row Level Security

## Development

* Node.js
* npm
* Git
* ESLint
* Prettier
* Playwright where available

### Important

No TypeScript unless there is a later explicit project decision to migrate.

No unnecessary infrastructure.

---

# 13. EXISTING FRONTEND STACK

| Package          | Role                              |
| ---------------- | --------------------------------- |
| React            | UI framework                      |
| React DOM        | Rendering                         |
| React Router DOM | SPA routing                       |
| Axios            | HTTP client through service layer |
| Framer Motion    | Animation                         |
| Lucide React     | Icons                             |
| Recharts         | Charts                            |
| Vite             | Build tool                        |
| Tailwind CSS v4  | Styling                           |
| ESLint           | Linting                           |
| Prettier         | Formatting                        |

Node.js requirement:

```text
Node.js 20.19+
```

Node 22 may be used during development.

Functional components only.

---

# 14. DESIGN SYSTEM

Preserve the existing visual identity unless a UX issue requires improvement.

## Brand

Deep pine green.

```text
#15211c
```

## Accent

Signal green.

```text
#22c55e
```

## Semantic

```text
Success  #16a34a
Danger   #dc2626
Warning  #d97706
Info     #3b82f6
```

## Surfaces

Light:

```text
Canvas  #f6f8f7
Surface #ffffff
Line    #e6ece9
```

Dark:

```text
Canvas  #0f1714
Surface #182420
Line    #26332e
```

## Shape

```text
Card radius: 1rem
```

Use minimal shadows.

---

# 15. TYPOGRAPHY

| Role               | Font    | Usage                |
| ------------------ | ------- | -------------------- |
| Display / Headings | Poppins | H1–H4, brand         |
| Body / UI          | Inter   | Body, labels, tables |

Never use decorative or serif fonts.

---

# 16. DARK MODE

Dark mode is class-based.

```text
ThemeProvider
↓
.dark on <html>
```

Use:

```text
@custom-variant dark (&:where(.dark, .dark *));
```

Persist preference using:

```text
insightaid.theme
```

Do not introduce media-based dark mode as a replacement.

---

# 17. EXISTING PROJECT STRUCTURE

Expected existing structure:

```text
insightaid-ai/

├── index.html
├── vite.config.js
├── eslint.config.js
├── .prettierrc
├── jsconfig.json
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── animations/
    ├── assets/
    ├── components/
    │   └── common/
    ├── config/
    ├── constants/
    ├── contexts/
    ├── data/
    ├── hooks/
    ├── layouts/
    ├── pages/
    ├── routes/
    ├── services/
    ├── styles/
    ├── theme/
    ├── types/
    └── utils/
```

The actual repository may have evolved beyond this structure.

**The repository itself is authoritative.**

Do not create duplicate architecture simply because this document shows an earlier structure.

---

# 18. ROUTING

Existing routes include:

```text
/                   Dashboard
/sentiment          Sentiment Analysis
/forecasting        Forecasting
/crisis-detection   Crisis Detection
/recommendations    AI Recommendations
/social-intelligence Social Intelligence
/reports            Reports
/datasets           Dataset Management
/settings           Settings
/*                  NotFound
```

Routes should remain lazy-loaded where practical.

Do not unnecessarily change route URLs.

---

# 19. NAVIGATION

Existing sidebar order:

```text
Dashboard
Sentiment Analysis
Forecasting
Crisis Detection
AI Recommendations
Social Intelligence
Reports
Dataset Management
Settings
```

Use Lucide icons exclusively.

No emojis.

Do not change navigation unnecessarily.

---

# 20. ENGINEERING RULES

1. Functional components only.
2. No emojis anywhere in the UI or code.
3. Lucide React for icons.
4. No Axios outside the service layer.
5. No raw `import.meta.env` outside environment configuration.
6. Use `@/` alias consistently.
7. Class-based dark mode.
8. Tailwind CSS v4 syntax.
9. Do not create `tailwind.config.js` unless technically required.
10. Avoid inline styles.
11. Lazy-load route pages.
12. Follow Single Responsibility Principle.
13. Follow SOLID where practical.
14. Avoid duplicated JSX.
15. Avoid unnecessary libraries.
16. Keep components maintainable.
17. Do not expose secrets.
18. Do not fabricate data.
19. Do not claim unimplemented functionality exists.
20. Test before claiming completion.

---

# 21. PHASE 0 — CODEBASE AUDIT

Inspect:

## Frontend

* package.json
* src/
* routes
* pages
* components
* hooks
* services
* API clients
* authentication
* state management
* dashboards
* charts
* tables
* forms
* settings
* navigation
* mode logic

## Backend

Inspect:

* API endpoints
* server functions
* Supabase functions
* database queries
* backend utilities
* ML services
* external integrations
* environment-variable usage

## Database

Inspect:

* tables
* relationships
* indexes
* RLS
* migrations
* schema
* seed data

## Data

Search for:

```text
mockData
fakeData
dummyData
JSON fixtures
hardcoded KPI values
hardcoded chart values
hardcoded sentiment
hardcoded forecast
hardcoded crisis
static recommendations
```

## Configuration

Inspect:

* `.env`
* `.env.example`
* Vite
* Vercel
* ESLint
* build scripts
* deployment configuration

## Tests

Inspect:

* unit tests
* integration tests
* Playwright
* existing coverage

---

# 22. AUDIT DOCUMENT

Create:

```text
docs/INSIGHTAID_AUDIT.md
```

Include:

1. Current architecture
2. Frontend routes
3. Backend/API architecture
4. Supabase schema
5. Existing data sources
6. Existing API integrations
7. Existing ML/data-analysis logic
8. Authentication
9. Deployment configuration
10. Mock-data dependencies
11. Hardcoded production values
12. Broken functionality
13. Incomplete functionality
14. Missing requirements
15. Architectural risks
16. Recommended implementation order

Never claim a feature exists if inspection shows it does not.

---

# 23. BUSINESS DESCRIPTION INPUT

Users should be able to describe a business naturally.

Example:

> I want to start a small Malaysian skincare business selling affordable products through TikTok Shop and Shopee. My target customers are university students and young adults. I expect to sell around 100 units per month initially and my estimated selling price is RM35 per product.

Do not immediately generate a prediction.

First:

```text
Natural Language
↓
Information Extraction
↓
Structured Business Profile
↓
Validation
```

---

# 24. STRUCTURED BUSINESS PROFILE

Support fields where relevant.

## Business

* business name
* business type
* industry
* business stage
* location/market
* business model

## Product / Service

* product/service
* category
* product type
* selling price
* cost per unit
* expected margin
* number of products

## Market

* target customer
* target age group
* target location
* target market
* customer segment

## Sales Assumptions

* expected monthly units
* expected monthly revenue
* expected growth rate
* expected conversion rate
* expected repeat purchase rate

## Operating Costs

* product cost
* marketing cost
* platform fees
* shipping
* labour
* fixed costs
* other expenses

## Marketing

* TikTok marketing
* Shopee marketing
* social activity
* advertising budget
* campaign frequency

## Business Goals

* revenue target
* sales target
* customer target
* launch date
* growth target

Do not force every field to be completed.

---

# 25. GEMINI — INFORMATION EXTRACTION ONLY

Gemini may convert natural language into structured JSON.

Architecture:

```text
Natural Language
↓
Gemini
↓
Structured JSON
↓
Validation
↓
Business Profile
↓
Scenario Engine
```

Example:

```json
{
  "business_type": "ecommerce",
  "market": "Malaysia",
  "product_category": "skincare",
  "sales_channel": ["Shopee", "TikTok"],
  "estimated_price": 35,
  "expected_monthly_units": 100,
  "target_customer": "young adults",
  "marketing_budget": null
}
```

Validate extracted values.

Never blindly trust AI-generated extraction.

---

# 26. MISSING INFORMATION DETECTION

After profile extraction, identify genuinely missing information.

Example:

```text
Business Profile: 72% complete

Missing:
- Product cost
- Monthly marketing budget
- Operating cost
- Launch date
```

Ask targeted questions only.

Do not overwhelm users with unnecessary questions.

---

# 27. DATA PROVENANCE

Important values must have provenance.

Possible categories:

```text
USER PROVIDED
AI EXTRACTED
DEFAULT ASSUMPTION
DATASET DERIVED
REAL OBSERVED DATA
```

The UI and reports must distinguish them.

### Observed

Actual historical data.

### User Assumption

Provided by the business owner.

### AI-Assisted Estimate

Generated from assumptions or permitted reference information.

### Scenario Projection

Calculated from assumptions.

Never present assumptions as observed facts.

---

# 28. NO-DATA SCENARIO ENGINE

When historical data is insufficient, generate transparent scenarios.

At minimum:

### Conservative

Lower sales and/or higher costs.

### Expected

Based on stated assumptions.

### Growth

Higher sales and/or stronger assumptions.

Example:

```text
                Conservative   Expected   Growth
Monthly Units       70           100        140
Revenue           RM2,450       RM3,500    RM4,900
```

The numbers must be calculated from user inputs and documented assumptions.

Do not arbitrarily invent financial values.

---

# 29. TRANSPARENT CALCULATIONS

Where sufficient information exists:

```text
Projected Revenue
=
Expected Units × Selling Price
```

```text
Gross Profit
=
Revenue − Variable Costs
```

```text
Estimated Operating Result
=
Gross Profit − Operating Costs
```

Potential calculations:

* break-even units
* break-even revenue
* gross margin
* marketing-cost ratio
* monthly growth
* customer acquisition assumptions

Display assumptions used.

---

# 30. USER-CONTROLLED ASSUMPTIONS

Users should be able to edit assumptions.

Example:

```text
Selling Price          RM35
Expected Units         100/month
Marketing Budget       RM500
Product Cost           RM15/unit
Monthly Fixed Cost     RM300
Expected Growth        5%
```

After changing assumptions:

```text
Edit
↓
Recalculate
↓
Updated Scenario
```

No subjective ranking should be imposed.

---

# 31. SCENARIO COMPARISON

Allow users to compare business assumptions.

Compare:

* revenue
* cost
* gross profit
* margin
* break-even
* projected growth

Do not label one scenario as objectively "best."

Present calculated differences and assumptions.

---

# 32. DATA READINESS

Create a simple system-readiness indicator.

Possible levels:

```text
Level 1 — No Data
Level 2 — Basic Data
Level 3 — Operational Data
Level 4 — Customer Intelligence
Level 5 — Full Analytics
```

Example:

```text
DATA READINESS

████████░░ 80%

Sales Data       ✓
Product Data     ✓
Customer Reviews ✓
Social Data      ✓
Historical Data  ✕
```

This is a system readiness indicator.

It is not a scientifically validated score unless a formal methodology is implemented.

---

# 33. DATA COLLECTION GUIDANCE

Help users understand what data to collect.

Examples:

1. Daily sales
2. Product quantity
3. Selling price
4. Product category
5. Customer reviews
6. Review ratings
7. Marketing spend
8. TikTok engagement
9. Shopee orders/reviews
10. Refund/cancellation records

The system should answer:

> What data should I collect now so I can make better decisions later?

---

# 34. DATA TEMPLATE GENERATOR

Provide templates for:

## Sales

```text
date
product
category
quantity_sold
unit_price
revenue
discount
cost
```

## Customer Reviews

```text
date
product
review_text
rating
platform
```

## Social Media

```text
date
platform
content
engagement
likes
comments
shares
```

## Product

```text
product
category
price
cost
stock
```

## Expenses

```text
date
expense_category
amount
description
```

Users should be able to:

* download
* fill in Excel/CSV
* upload
* validate
* preview
* import

---

# 35. DATA UPLOAD VALIDATION

Validate:

* file type
* required columns
* data types
* missing values
* duplicates
* invalid dates
* invalid numerical values
* negative values where inappropriate
* inconsistent categories

Example:

```text
Dataset Validation

✓ File format valid
✓ 2,340 rows detected
✓ Date column detected
✓ Revenue column detected

⚠ 34 missing product values
⚠ 12 duplicate rows

Ready for processing: YES
```

Do not silently modify data.

Explain preprocessing changes.

---

# 36. DATA MATURITY JOURNEY

The system should support:

```text
No Data
↓
Business Planning
↓
Data Collection
↓
Basic Analytics
↓
Operational Analytics
↓
Customer Intelligence
↓
Historical Forecasting
↓
Sentiment-Enhanced Forecasting
```

This is an important INSIGHTAID AI product concept.

---

# 37. SHOPEE DATA PIPELINE

Shopee is an important e-commerce data source.

Use only legally and technically permitted datasets/sources.

Do NOT:

* bypass anti-bot mechanisms
* implement unauthorized scraping
* assume access to private/internal APIs

Pipeline:

```text
Shopee Dataset / Approved Source
↓
Raw Data
↓
Preprocessing
↓
Feature Engineering
↓
Sentiment
↓
Supabase/PostgreSQL
```

Ratings may be used as weak/semi-supervised labels:

```text
4–5 stars → potential Positive
3 stars → potential Neutral
1–2 stars → potential Negative
```

However:

> Rating does not automatically equal sentiment.

Validate a manually labelled subset where practical.

---

# 38. SOCIAL DATA SOURCES

Create modular adapters for:

* TikTok
* X
* Threads

Each source must be independently enabled/disabled.

Architecture:

```text
Source Adapter
↓
Normalized Schema
↓
Shared Processing Pipeline
```

One unavailable platform must not crash the application.

---

# 39. API STATUS

External APIs may require:

* developer accounts
* approval
* OAuth
* quotas
* permissions
* research access

Supported states:

```text
CONNECTED
NOT_CONFIGURED
AUTH_REQUIRED
RATE_LIMITED
ERROR
DISABLED
```

Never fake a connected status.

---

# 40. REAL DATA OVER MOCK PRODUCTION DATA

Search the repository for hardcoded:

* KPIs
* charts
* sentiment
* revenue
* forecasts
* crisis scores
* recommendations

Mock/fallback data may remain for:

* development
* UI testing
* demonstrations
* API failure
* offline development

But production should use:

```text
Database
OR
Backend Analytics
OR
Model Output
```

Do not leave fake production values such as:

```text
Overall Sentiment: +78%
Forecasted Revenue: RM128,500
Crisis Risk: Low
CSAT: 4.6/5
```

unless dynamically calculated from legitimate data.

---

# 41. FALLBACK DATA

Do not delete useful fallback datasets.

Use:

```text
Real Data
OR
Approved Dataset / Fixture
↓
Same Normalized Schema
↓
Same Processing Pipeline
↓
Database
↓
Dashboard
```

Do not create a separate fake analytical pipeline only for demonstrations.

---

# 42. NORMALIZED DATA SCHEMA

Use a consistent internal representation where practical.

Potential fields:

```text
id
source
platform
original_id
collected_at
published_at
raw_text
cleaned_text
language
author_id_hash
product
category
rating
engagement
sales
revenue
```

Sentiment:

```text
sentiment
sentiment_score
sentiment_confidence
model_name
model_version
predicted_at
```

Do not store unnecessary personal information.

---

# 43. DATA PROVENANCE

Track where possible:

```text
source
platform
original_id
collection_timestamp
processing_timestamp
model_version
dataset_version
```

This supports:

* reproducibility
* debugging
* FYP evaluation
* research documentation
* deployment

---

# 44. DATA PREPROCESSING

For text:

1. preserve raw text
2. detect language
3. normalize
4. remove URLs where appropriate
5. remove duplicates
6. handle platform-specific symbols
7. preserve meaningful repeated letters
8. handle hashtags
9. handle mentions
10. support code-mixed text where practical

Store:

```text
raw_text
cleaned_text
language
```

Never unnecessarily overwrite original text.

---

# 45. FEATURE ENGINEERING

## Text

Potential features:

* language
* text length
* token count
* hashtag count
* mention count
* URL presence
* punctuation count
* repeated-character indicator
* negation indicator
* platform

## Reviews

* rating
* review length
* product
* category
* date
* sentiment
* verified-review indicator where legitimately available

## Social

* mention volume
* engagement
* likes
* comments
* shares/reposts where available
* sentiment ratio
* negative sentiment ratio
* positive sentiment ratio

## Time Series

* day
* week
* month
* day-of-week
* lag features
* rolling averages
* rolling sentiment
* rolling negative ratio
* rolling mention volume

Never create features unavailable from actual data.

---

# 46. SENTIMENT MODEL — MAJOR FYP MILESTONE

Primary model:

**XLM-RoBERTa**

Classification:

```text
Positive
Neutral
Negative
```

Pipeline:

```text
Text
↓
Language Detection
↓
Preprocessing
↓
Tokenizer
↓
XLM-RoBERTa
↓
Sentiment
↓
Confidence
```

Do not train XLM-R inside normal Vercel serverless requests.

Training should occur offline.

Possible environments:

* Google Colab
* local GPU
* appropriate training environment

---

# 47. SENTIMENT TRAINING PIPELINE

Implement reproducible:

* dataset loading
* cleaning
* label preparation
* train/validation/test split
* tokenization
* training
* evaluation
* model saving
* model versioning

Avoid data leakage.

Use stratified splitting where appropriate.

If ratings are used as weak labels, document the methodology.

Where possible, create a manually validated subset.

Evaluate:

* accuracy
* precision
* recall
* F1
* confusion matrix
* language-specific performance where possible

Project targets may include:

```text
Approximately ≥80% overall
Approximately ≥75% per language
```

These are targets, not guaranteed results.

Never fabricate metrics.

---

# 48. MODEL VERSIONING

Track:

```text
model_name
model_version
trained_at
dataset_version
training_samples
validation_samples
test_samples
accuracy
precision
recall
f1
```

Store metadata appropriately.

---

# 49. INFERENCE SERVICE

Frontend must not perform heavy ML processing.

Preferred architecture:

```text
React
↓
Backend API
↓
ML Inference
↓
XLM-R
↓
Prediction
```

Reuse existing backend architecture where possible.

---

# 50. FORECASTING — MAJOR FYP MILESTONE

Implement two approaches.

## Model A — Baseline

Historical sales/revenue only.

## Model B — Sentiment-Enhanced

Historical business data plus justified sentiment/social/customer features.

Potential features:

* sales
* revenue
* sentiment score
* positive ratio
* negative ratio
* neutral ratio
* review volume
* mention volume
* engagement
* rating
* product/category
* time features

Potential models:

* Prophet
* XGBoost
* LSTM

Do not implement all models unnecessarily.

Select based on data suitability and FYP feasibility.

---

# 51. FORECAST EVALUATION

Use time-aware evaluation.

Do not randomly split time-series data.

Where appropriate use rolling evaluation.

Calculate:

```text
MAE
RMSE
MAPE
```

Compare:

```text
Baseline
vs
Sentiment-Enhanced
```

under equivalent evaluation periods.

Never hardcode which model performs better.

Display actual calculated results.

---

# 52. CRISIS DETECTION

Detect measurable abnormal changes.

Potential signals:

* negative sentiment ratio
* negative sentiment velocity
* mention volume
* mention velocity
* rating deterioration
* sentiment anomaly
* review-volume anomaly

Possible levels:

```text
Normal
Warning
Critical
```

Thresholds must be configurable and documented.

Return:

```text
risk_level
risk_score
triggered_signals
detected_at
```

---

# 53. CRISIS EXPLANATION

Show measurable evidence.

Example structure:

```text
CRISIS RISK: HIGH

Detected signals:
- Negative sentiment increased by X%
- Review volume increased by Y%
- Average rating decreased by Z
- Product ABC has unusually high complaint volume
```

Do not display unexplained AI-generated crisis labels.

---

# 54. RECOMMENDATION ENGINE

Use:

```text
Analytical Rules
+
Gemini Explanation Layer
```

Layer 1:

Determines recommendations from actual analytical conditions.

Example:

```text
IF negative sentiment rises significantly
AND review volume increases
THEN recommend investigating customer complaints.
```

Layer 2:

Gemini explains:

* recommendation
* priority
* rationale
* context

---

# 55. GEMINI RELIABILITY RULE

Gemini must NOT be the source of truth for:

* sales
* sentiment
* forecast values
* crisis scores
* database facts
* calculated KPIs

Gemini may interpret structured analytical facts.

Use structured JSON where appropriate.

Validate responses.

If Gemini is unavailable:

```text
Rule-Based Recommendation
```

must still work.

---

# 56. BUSINESS-CONTEXT RECOMMENDATIONS

Recommendations may consider:

* business type
* business stage
* product category
* capital if provided
* sales
* sentiment
* forecast
* crisis
* channels
* data readiness
* business goals

If information is missing:

> Insufficient information to evaluate this factor.

Never let Gemini invent missing business information.

---

# 57. DATABASE ARCHITECTURE

Use Supabase/PostgreSQL as the primary source of truth.

Possible logical entities:

```text
raw_data
processed_data
sentiment_predictions
forecast_results
crisis_events
recommendations
model_versions
data_sources
business_profiles
business_assumptions
scenario_results
dataset_uploads
reports
```

Before creating anything:

**Inspect the existing schema.**

Do not duplicate equivalent existing tables.

Use migrations.

Do not manually destroy production data.

---

# 58. ROW LEVEL SECURITY

Preserve Supabase RLS.

Users must only access authorized data.

Never expose the Supabase service-role key to the frontend.

---

# 59. ENVIRONMENT VARIABLES

Never hardcode secrets.

Potential variables include:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
X_API_KEY
X_API_SECRET
THREADS_CLIENT_ID
THREADS_CLIENT_SECRET
GEMINI_API_KEY
```

Only use variables actually required.

Public frontend variables must contain only safe values.

Private secrets must remain server-side.

---

# 60. DATA SOURCE MANAGEMENT

Provide/improve a Data Sources section.

Display:

```text
Source
Status
Last Sync
Records
Processing Status
Errors
```

Values must be dynamic.

Example:

```text
Shopee       Dataset Mode
TikTok       Connected
X            Connected
Threads      Not Configured
Sales Data   Connected
```

These are examples only.

Never hardcode them as production status.

---

# 61. DASHBOARD

The dashboard must be data-driven.

## Sentiment

Display:

* positive %
* neutral %
* negative %
* overall sentiment

## Forecast

Display:

* next-period forecast
* forecast range
* model
* MAE/RMSE/MAPE

## Crisis

Display:

* risk level
* risk score
* triggered signals

## Recommendations

Display:

* priority
* action
* reason

All values must come from actual system outputs.

---

# 62. NO-DATA DASHBOARD

When historical data is insufficient, do not display fake historical KPIs.

Instead show something like:

```text
BUSINESS PLANNING MODE

Data Availability: Limited

Current Inputs:
RM3,000 Starting Capital
RM35 Estimated Selling Price
100 Expected Monthly Units

Scenario Projection:
Conservative
Expected
Growth

Data Needed:
Sales history
Customer reviews
Product data
Marketing data
```

Clearly state:

> These projections are scenario-based estimates using your assumptions, not historical-data forecasts.

---

# 63. TRANSITION FROM PLANNING TO ANALYTICS

The application should transition:

```text
Planning Mode
↓
Data Collection
↓
Analytics Ready
↓
Forecasting Available
↓
Sentiment-Enhanced Forecasting
```

Once sufficient real data exists, observed data should replace assumptions where appropriate.

---

# 64. UX / UI REQUIREMENTS

Preserve the current visual identity.

The application should remain:

* professional
* modern
* minimalist
* business-oriented
* readable
* responsive
* startup-friendly

Improve UX where necessary for:

* onboarding
* navigation
* mode switching
* data availability selection
* data validation
* loading
* error handling
* empty states
* API status
* model status
* explanations
* mobile responsiveness

Do not redesign the entire application unnecessarily.

---

# 65. LOADING / ERROR / EMPTY / UNAVAILABLE STATES

Every data-driven component should support:

```text
Loading
Success
Empty
Error
Unavailable
```

Example:

```text
TikTok data is currently unavailable.
Showing the latest available dataset.
```

API failures must not create blank screens or uncaught runtime errors.

---

# 66. API FAILURE ISOLATION

External sources must operate independently.

Example:

```text
TikTok unavailable
↓
Shopee continues
X continues
Threads continues
Sales continues
```

Use modular adapters/services.

---

# 67. DATA CACHING

Avoid repeatedly calling external APIs every time the dashboard opens.

Prefer:

```text
External API
↓
Scheduled / Manual Ingestion
↓
Database
↓
Dashboard
```

The dashboard should primarily read from Supabase/PostgreSQL.

---

# 68. SCHEDULED INGESTION

Where appropriate:

```text
Scheduled Function
↓
Fetch
↓
Validate
↓
Raw Storage
↓
Preprocessing
↓
Feature Engineering
↓
Inference
↓
Results Storage
```

Do not introduce unnecessary infrastructure.

Use existing Vercel/Supabase capabilities where practical.

---

# 69. REPORT GENERATION

Reports should be generated from structured analytical outputs.

Possible sections:

1. Executive Summary
2. Business Profile
3. Data Availability
4. Current Business Performance
5. Customer Sentiment
6. Sales/Demand Forecast
7. Scenario Analysis
8. Crisis/Risk Indicators
9. Key Findings
10. Recommendations
11. Required Data Improvements
12. Assumptions and Limitations

Always distinguish:

```text
ACTUAL DATA
```

from:

```text
SCENARIO / ESTIMATED DATA
```

Gemini may help generate narrative explanations but must not independently invent numerical metrics.

---

# 70. REPORT TYPES

Where technically feasible:

* Business Health Report
* E-Commerce Analytics Report
* Sentiment Report
* Forecast Report
* Crisis Report
* Business Planning Report

Export priorities:

1. PDF
2. CSV
3. Excel-compatible data

PowerPoint may be implemented later if practical.

---

# 71. FEATURE ENGINEERING VISIBILITY

Where useful for transparency and FYP demonstration:

```text
Raw Data
↓
Cleaned Data
↓
Engineered Features
↓
Model
↓
Prediction
```

The system should make the analytical pipeline understandable.

---

# 72. MODEL PERFORMANCE PAGE

Where the existing architecture allows, provide an internal model-evaluation page.

## Sentiment

```text
Model
Version
Accuracy
Precision
Recall
F1
Confusion Matrix
Language Performance
```

## Forecast

```text
Baseline MAE
Enhanced MAE
Baseline RMSE
Enhanced RMSE
Baseline MAPE
Enhanced MAPE
Improvement
```

## Crisis

```text
Alerts
Validated Alerts
Detection Performance
```

Never fabricate metrics.

---

# 73. FYP EVALUATION SUPPORT

The application should support evaluation of:

## Sentiment

* accuracy
* precision
* recall
* F1
* confusion matrix
* language performance

## Forecasting

* baseline MAE
* enhanced MAE
* baseline RMSE
* enhanced RMSE
* baseline MAPE
* enhanced MAPE

## Crisis

* generated alerts
* triggers
* correctness where labelled data exists

## System

* response time
* successful requests
* source availability

## User Evaluation

Remain compatible with later user satisfaction testing.

Target:

```text
≥4.0/5
```

This is a target, not an existing result.

Never fabricate it.

---

# 74. TESTING REQUIREMENTS

## Frontend

Test:

* navigation
* mode switching
* dashboard
* filters
* charts
* tables
* authentication
* loading states
* error states
* empty states

## Backend

Test:

* API endpoints
* authentication
* database queries
* validation
* API failures

## ML

Test:

* preprocessing
* sentiment inference
* confidence
* forecasting
* evaluation
* crisis calculations

## Integration

Verify:

```text
Ingestion
→ Preprocessing
→ Feature Engineering
→ Sentiment
→ Forecasting
→ Crisis
→ Recommendation
→ Dashboard
```

---

# 75. PLAYWRIGHT / E2E

Where Playwright exists, test:

```text
Open Application
↓
Login
↓
Switch Business Startup → E-Commerce
↓
Open Dashboard
↓
View Sentiment
↓
View Forecast
↓
View Crisis
↓
View Recommendation
```

Also test API failure states.

No-data journey:

```text
Start
↓
Select Business Startup
↓
Choose "I Don't Have Data Yet"
↓
Describe Business
↓
Extract Profile
↓
Answer Missing Information
↓
Generate Scenario
↓
Edit Assumption
↓
Regenerate Scenario
↓
Generate Report
```

---

# 76. NO FAKE SUCCESS

NEVER fabricate:

* API connections
* API status
* record counts
* model accuracy
* forecast accuracy
* crisis performance
* recommendation performance
* user satisfaction
* deployment status

If unavailable, show:

```text
Not Configured
```

or:

```text
Dataset Mode
```

or:

```text
Unavailable
```

---

# 77. VERCEL DEPLOYMENT

Before deployment:

```bash
npm install
npm run lint
npm run build
```

All must succeed.

Configure:

* Vercel
* environment variables
* production build
* routing
* API/serverless functions where appropriate
* Supabase

Never expose secrets.

---

# 78. VERCEL ML LIMITATION

Do not train XLM-R or perform heavy ML training inside standard Vercel serverless requests.

Training should occur offline.

Vercel should primarily handle:

* frontend
* lightweight API endpoints
* orchestration
* dashboard requests
* lightweight inference where feasible

If heavy inference requires another service, document it.

Never pretend Vercel can perform unlimited ML workloads.

---

# 79. IMPLEMENTATION ROADMAP — FYP 2

The following roadmap supersedes the old FYP 1 phase roadmap.

## PHASE 0 — AUDIT

Inspect and document the current system.

Do not make major changes before the audit.

---

## PHASE 1 — ARCHITECTURE REPAIR

Fix:

* broken imports
* routes
* service layer
* Supabase queries
* authentication
* API structure
* environment handling
* runtime errors

---

## PHASE 2 — BUSINESS STARTUP / E-COMMERCE MODE

Implement unified mode switching.

Both modes remain within one application.

---

## PHASE 3 — DATA AVAILABILITY / BUSINESS PLANNING

Implement:

* I HAVE DATA
* I DON'T HAVE DATA YET
* onboarding
* business profile
* missing information
* assumptions
* scenario engine
* scenario comparison
* data readiness
* data collection guide

---

## PHASE 4 — DATA PIPELINE

Implement:

* normalized schema
* source adapters
* ingestion
* raw storage
* preprocessing
* feature engineering
* validation

---

## PHASE 5 — REAL DATA SOURCES

Implement appropriate:

* Shopee dataset/source
* TikTok
* X
* Threads
* sales/business data

Use fallback datasets where appropriate.

---

## PHASE 6 — SENTIMENT MODEL

Train, evaluate and integrate:

**XLM-RoBERTa**

This is a major ML milestone.

---

## PHASE 7 — FORECASTING

Implement:

```text
Baseline
vs
Sentiment-Enhanced
```

Evaluate dynamically.

---

## PHASE 8 — CRISIS DETECTION

Implement measurable crisis detection.

---

## PHASE 9 — RECOMMENDATION ENGINE

Implement:

```text
Rules
+
Gemini Explanation
```

---

## PHASE 10 — PRODUCTION DASHBOARD

Replace production mock values.

Connect dashboard components to actual outputs.

---

## PHASE 11 — REPORTING

Implement structured report generation and exports.

---

## PHASE 12 — TESTING

Run:

```bash
npm run lint
npm run build
```

Then run available:

* unit tests
* integration tests
* E2E tests
* manual workflow testing

Fix issues before continuing.

---

## PHASE 13 — DEPLOYMENT

Prepare and verify Vercel production deployment.

---

# 80. IMPLEMENTATION CONTROL

Do not make one enormous uncontrolled change.

After every meaningful phase:

1. Implement.
2. Test.
3. Inspect errors.
4. Fix errors.
5. Verify affected workflows.
6. Update documentation.
7. Record what changed.
8. Record limitations.
9. Only then proceed.

Do not silently continue through a broken phase.

---

# 81. GIT WORKFLOW

Use logical commits.

Examples:

```text
audit: document existing architecture
fix: repair application data flow
feat: add business startup ecommerce mode
feat: add dataset-free business planning
feat: add scenario engine
feat: add data ingestion layer
feat: add sentiment inference
feat: add forecasting comparison
feat: add crisis detection
feat: add recommendation engine
feat: connect production dashboard
feat: add report generation
test: add integration and e2e coverage
deploy: prepare vercel production
```

Never commit known build or lint errors.

---

# 82. DOCUMENTATION

Create or update:

```text
README.md
docs/ARCHITECTURE.md
docs/DATA_PIPELINE.md
docs/ML_PIPELINE.md
docs/API_INTEGRATION.md
docs/DEPLOYMENT.md
docs/MODEL_EVALUATION.md
docs/INSIGHTAID_AUDIT.md
```

Documentation must describe what actually exists.

Do not document planned functionality as implemented.

---

# 83. API DOCUMENTATION

For each external source document:

```text
Source
Purpose
Authentication
Environment Variables
Data Retrieved
Rate Limit / Access Constraints
Current Status
Fallback
```

---

# 84. DATASET DOCUMENTATION

For every dataset record:

* source
* collection method
* collection date
* category
* market relevance
* record count
* columns
* labeling strategy
* preprocessing
* train/validation/test split

---

# 85. DO NOT OVERENGINEER

This remains a Final Year Project primarily developed by one student.

### HIGH PRIORITY

* working data pipeline
* XLM-R sentiment
* forecasting comparison
* crisis detection
* recommendations
* real data
* Supabase
* usable dashboard
* business planning mode
* reporting
* deployment

### LOWER PRIORITY

* unnecessary microservices
* excessive DevOps
* unnecessary infrastructure
* excessive animation
* unnecessary AI agents
* additional databases without justification

Technical depth should come from:

**Data Analytics + Machine Learning + Intelligent Decision Support**

not infrastructure complexity.

---

# 86. ACCEPTANCE CRITERIA

The implementation is successful only when:

## Application

* runs locally
* builds successfully
* no critical console errors
* navigation works
* authentication works
* Business Startup works
* E-Commerce works

## Data

* actual processed data exists
* mock data is not the production source
* provenance exists
* ingestion failures are handled

## Business Planning

* business description works
* structured profile is generated
* missing information is detected
* assumptions are editable
* scenario projections are calculated
* scenarios are clearly labelled as estimates
* data-readiness state is visible
* data collection guidance works

## Sentiment

* XLM-R is trained/evaluated
* inference works
* predictions are stored
* confidence is stored
* model version is stored

## Forecasting

* baseline works
* enhanced model works
* metrics are calculated
* comparison is dynamic

## Crisis

* signals are calculated
* risk level is generated
* evidence is shown

## Recommendation

* rules work
* Gemini explanation works when configured
* system still works without Gemini

## Reporting

* reports use structured analytical outputs
* actual vs estimated values are distinguished
* exports work where implemented

## Deployment

* production build succeeds
* Vercel deployment succeeds
* environment variables are configured
* secrets are protected
* production dashboard uses real data

---

# 87. FINAL PRODUCT POSITIONING

INSIGHTAID AI supports two fundamental business situations.

## "I HAVE DATA"

> INSIGHTAID AI analyzes my existing business, customer, sales, marketplace and social data to provide insights, forecasts, risk detection and recommendations.

## "I DON'T HAVE DATA YET"

> INSIGHTAID AI helps me structure my business assumptions, explore planning scenarios, understand potential risks, identify the data I need to collect, and prepare for future data-driven analytics.

The product therefore supports a business throughout its data maturity journey:

```text
EARLY-STAGE BUSINESS
        ↓
BUSINESS PLANNING
        ↓
SCENARIO ESTIMATION
        ↓
DATA COLLECTION
        ↓
OPERATIONAL ANALYTICS
        ↓
CUSTOMER INTELLIGENCE
        ↓
HISTORICAL FORECASTING
        ↓
SENTIMENT-ENHANCED FORECASTING
        ↓
ADVANCED DECISION SUPPORT
```

The system must never claim to predict the future from insufficient historical data.

Maintain this distinction:

```text
Historical Data
→ Forecasting

User Assumptions
→ Scenario Planning

Analytics + Rules
→ Recommendation

Structured Analytics
→ Gemini Explanation
```

---

# 88. FINAL DEVELOPMENT REPORT

At the end of a major implementation cycle, provide a report containing:

## A. Changes

What was changed.

## B. Preserved Components

What original functionality was retained.

## C. Final Architecture

Current architecture.

## D. Data Sources

```text
Source
Status
Data Type
Fallback
```

## E. ML

```text
Model
Dataset
Training
Evaluation
Version
```

## F. Forecasting

Baseline vs sentiment-enhanced results.

## G. Crisis Detection

Detection methodology.

## H. Recommendation

Rules + Gemini architecture.

## I. Business Planning

Explain:

* no-data workflow
* business profile
* assumptions
* scenario engine
* data readiness
* transition to real analytics

## J. Reporting

Available report types and export formats.

## K. Testing

```text
Lint
Build
Unit Tests
Integration Tests
E2E Tests
```

## L. Deployment

```text
Local
Production
Vercel
Environment Variables
```

## M. Remaining Limitations

Clearly list limitations caused by:

* API access
* permissions
* datasets
* infrastructure
* ML limitations
* unavailable integrations

Do not hide incomplete functionality.

---

# 89. FINAL NON-NEGOTIABLE RULES

Before making changes:

> **AUDIT FIRST.**

During development:

> **IMPLEMENT INCREMENTALLY.**

When existing functionality works:

> **REUSE IT.**

When existing functionality is broken:

> **REPAIR IT.**

When functionality is mock/demo:

> **CONNECT IT TO REAL DATA.**

When historical data is insufficient:

> **USE SCENARIO PLANNING, NOT FAKE FORECASTING.**

When Gemini is used:

> **GEMINI EXPLAINS STRUCTURED FACTS; IT DOES NOT CREATE THE FACTS.**

When an API is unavailable:

> **SHOW THE REAL STATUS.**

When an ML result is unavailable:

> **DO NOT FABRICATE IT.**

When a major architectural decision is necessary:

```text
INSPECT
↓
JUSTIFY
↓
IMPLEMENT
↓
TEST
↓
DOCUMENT
```

When testing:

> **VERIFY BEFORE CLAIMING SUCCESS.**

The final system must remain an academically defensible and technically working implementation of:

**INSIGHTAID AI: An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups**

The project must evolve from a frontend/prototype into a real data-driven intelligent decision-support system without losing its original identity, research direction, or FYP scope.

# CORE PRINCIPLE

```text
DO NOT BUILD A DIFFERENT PRODUCT.

EVOLVE INSIGHTAID AI.
```
