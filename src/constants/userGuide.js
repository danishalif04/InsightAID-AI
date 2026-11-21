/**
 * Step-by-step user guide for both pathways, shown on the public Welcome page
 * ("Learn more about InsightAid AI" on the login page). Every step names the
 * real menu path and uses a real screenshot of the app (public/guide/).
 */
export const USER_GUIDE = [
  {
    id: 'local-shop',
    label: 'Malaysian Local Shop',
    tagline: 'No sales records yet: plan your shop before you open.',
    who: 'For a kedai, kopitiam, bakery or home business that is planning or has just opened.',
    steps: [
      {
        title: 'Sign in and choose your pathway',
        where: 'Setup screen',
        body: 'Sign in (or use a demo account on the login page). On "What kind of business is this?", choose Malaysian Local Shop.',
        image: '/guide/ls-1-choose.jpg',
      },
      {
        title: 'Tell the app you have no data yet',
        where: 'Setup screen',
        body: 'Choose "I don\'t have data yet". You will plan from a description of your business instead of sales records.',
        image: '/guide/ls-2-nodata.jpg',
      },
      {
        title: 'Generate your shop, or open the example',
        where: 'Local Shop → Business Overview',
        body: 'Pick your business sector, enter a monthly revenue target and describe what you sell, where and to whom, then click "Generate my shop". The AI drafts products, prices and costs only. To explore first, click "or load the demo shop instead" to open the example shop, Kedai Makmur.',
        image: '/guide/ls-3-generate.jpg',
      },
      {
        title: 'Read your numbers',
        where: 'Local Shop → Business Overview',
        body: 'See registered products, monthly fixed costs, average margin, monthly break-even sales and your daily sales target. Every figure tagged "Calculated" comes from the app\'s own formulas, not from the AI. The readiness bar and "InsightAid AI suggests" box show your next step.',
        image: '/guide/ls-4-overview.jpg',
      },
      {
        title: 'Check products, costs and capital',
        where: 'Local Shop → Products & Pricing · Financial Planning · Startup Capital',
        body: 'Products & Pricing ranks your products by margin and lets you edit a cost or price. Financial Planning breaks down monthly expenses and break-even. Startup Capital totals what you need before opening and shows any funding gap.',
        image: '/guide/ls-5-capital.jpg',
      },
      {
        title: 'Test a change before you make it',
        where: 'Local Shop → What-If Simulator',
        body: 'Choose a product and move the sliders for selling price, unit cost, fixed costs or units sold. Margin, break-even units and the monthly result update instantly, with conservative and optimistic scenarios beside your plan.',
        image: '/guide/ls-6-whatif.jpg',
      },
      {
        title: 'Ask the AI Business Assistant',
        where: 'Local Shop → AI Business Assistant',
        body: 'Type a question in Malay or English, for example "Cukup ke modal saya untuk buka kedai ni?", or tap a suggested question. The Investigation Trace shows each step; the answer uses only figures the app calculated. Accept the answer to send it to the Action Centre, or reject it.',
        image: '/guide/ls-7-assistant.jpg',
      },
      {
        title: 'Track your actions',
        where: 'Local Shop → Action Centre',
        body: 'Every accepted answer and suggested action appears here. Approve or reject each one; the app never changes a price or contacts a supplier for you.',
        image: '/guide/ls-8-actions.jpg',
      },
    ],
    tips: [
      'Switch the Local Shop pages between English and Bahasa Melayu with the EN / BM toggle at the top right.',
      'Badges tell you where a number comes from: Calculated (app formulas), Your input, AI-generated, or Illustrative (example data).',
      'Economic Intelligence stays empty until real DOSM figures are added; it never shows made-up numbers.',
    ],
  },
  {
    id: 'business-startup',
    label: 'Business Startup',
    tagline: 'Already selling? Turn your sales and customer comments into decisions.',
    who: 'For a business selling on Shopee, TikTok, X or Threads, with sales and review data to upload.',
    steps: [
      {
        title: 'Sign in and tell the app you have data',
        where: 'Setup screen',
        body: 'On the setup screen choose Business Startup, then "I have data". You can switch pathway later with the mode button at the top right.',
        image: '/guide/bs-1-hasdata.jpg',
      },
      {
        title: 'Bring your data in',
        where: 'Data → Dataset Management',
        body: 'Drag and drop a CSV, JSON or Excel file (sales, reviews, social posts or products), or click "Load Sample Dataset" to try it. Data Source Status shows each source, when it last synced and how many records it holds.',
        image: '/guide/bs-2-datasets.jpg',
      },
      {
        title: 'Read the dashboard',
        where: 'Overview',
        body: 'Business Health, at a Glance shows your store, a plain-language summary, the share of positive sentiment, your crisis risk and a revenue forecast, followed by the sentiment trend, platform split, product performance, alerts and the latest recommendations.',
        image: '/guide/bs-3-dashboard.jpg',
      },
      {
        title: 'See how customers feel',
        where: 'Insights → Sentiment Analysis · Social Intelligence',
        body: 'Filter comments by day, language and platform, and see positive, neutral and negative shares, classifier confidence and the language breakdown. Social Intelligence adds reach by sentiment, top posts and trending hashtags.',
        image: '/guide/bs-4-sentiment.jpg',
      },
      {
        title: 'Catch problems early',
        where: 'Insights → Crisis Detection',
        body: 'A 0–100 risk score built from seven signals compared with your own recent history. Each signal shows its evidence, for example "Negative sentiment ratio is 50% of today\'s mentions". Use the timeline, signal matrix and replay to see how an episode developed.',
        image: '/guide/bs-5-crisis.jpg',
      },
      {
        title: 'See where revenue is heading',
        where: 'Intelligence → Forecasting',
        body: 'The forecast chart shows actual revenue, the prediction and its uncertainty band, with the model comparison and error measures underneath. Click "Run Forecasting" after uploading new sales data.',
        image: '/guide/bs-6-forecast.jpg',
      },
      {
        title: 'Act on the evidence',
        where: 'Intelligence → AI Recommendations → Data → Action Centre',
        body: 'Each recommendation shows its priority, the evidence that triggered it and the exact rule ID. Open "Why this recommendation?" for a plain-language reason, rate it, and track your decisions in the Action Centre. Export a summary from Data → Reports.',
        image: '/guide/bs-7-recommendation.jpg',
      },
    ],
    tips: [
      'Ask questions about your business in Intelligence → Agent Orchestrator; it only uses approved tools and shows every step.',
      'Model Performance (Intelligence menu) shows how the models were evaluated, including what has not been evaluated yet.',
      'Turn on Low-Sensory or Senior mode from the accessibility buttons at the top right for calmer or larger visuals.',
    ],
  },
]
