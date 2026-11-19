/**
 * "Kedai Makmur" — the illustrative demo shop.
 *
 * ILLUSTRATIVE DATA. Every figure here is invented for demonstration and
 * is flagged `illustrative: true` so the UI can ribbon it as such. It is
 * never presented as a real shop's records, and is never written to a
 * real account's tables without that flag travelling with it.
 *
 * Shaped to the spec's own example: 28 registered products, RM2,500
 * monthly fixed costs, ~35% average contribution margin, which yields a
 * break-even of roughly RM7,143/month.
 */

// The four named products from the spec's margin table, at its exact figures.
const NAMED_PRODUCTS = [
  { id: 'p-water', name: 'Mineral Water', unit: 'bottle', cost: 1.0, price: 1.5 }, // 33.33%
  { id: 'p-bread', name: 'Bread', unit: 'loaf', cost: 2.0, price: 3.0 }, // 33.33%
  { id: 'p-coffee', name: 'Coffee', unit: 'cup', cost: 5.0, price: 8.0 }, // 37.5%
  { id: 'p-biscuits', name: 'Biscuits', unit: 'pack', cost: 2.5, price: 4.0 }, // 37.5%
]

// 24 further staples at a 35% margin each, keeping the shop-wide unweighted
// average at ~35% as the spec's example states.
const STAPLES = [
  ['Rice 5kg', 'bag', 20.8],
  ['Cooking Oil 1L', 'bottle', 7.15],
  ['Sugar 1kg', 'pack', 3.25],
  ['Salt 1kg', 'pack', 1.95],
  ['Flour 1kg', 'pack', 2.6],
  ['Eggs (10)', 'tray', 5.2],
  ['Milk 1L', 'carton', 6.5],
  ['Instant Noodles', 'pack', 1.3],
  ['Soy Sauce', 'bottle', 4.55],
  ['Chilli Sauce', 'bottle', 3.9],
  ['Tea Bags (25)', 'box', 5.85],
  ['Milo 400g', 'tin', 11.7],
  ['Condensed Milk', 'tin', 3.25],
  ['Canned Sardines', 'tin', 4.55],
  ['Biscuit Tin', 'tin', 9.1],
  ['Detergent 1kg', 'pack', 7.8],
  ['Dish Soap', 'bottle', 4.55],
  ['Toothpaste', 'tube', 5.2],
  ['Soap Bar', 'bar', 2.6],
  ['Shampoo Sachet', 'sachet', 0.65],
  ['Tissue Roll', 'roll', 1.95],
  ['Batteries (2)', 'pack', 5.2],
  ['Ice Cream', 'cup', 2.6],
  ['Bottled Soft Drink', 'bottle', 2.08],
].map(([name, unit, cost], index) => ({
  id: `p-staple-${index + 1}`,
  name,
  unit,
  cost,
  price: Math.round((cost / 0.65) * 100) / 100, // 35% margin
}))

export const DEMO_SHOP = {
  id: 'demo-kedai-makmur',
  illustrative: true,
  name: 'Kedai Makmur',
  category: 'Grocery shop',
  location: 'Malaysia',
  model: 'Walk-in retail, cash and e-wallet',
  currency: 'MYR',
  language: 'ms',

  // Profile fields mirroring the onboarding step's three questions, so the
  // demo shop carries the same profile a hand-entered shop would. All three
  // are DISPLAY-ONLY: no engine function reads them, so none of this shop's
  // computed figures (35.06% average margin, RM2,500 fixed, RM7,131
  // break-even) can move because of them.
  //
  // The revenue target is the owner's own goal, not a forecast: RM2,750 of
  // total recorded expenses divided by the 35.06% average margin is
  // RM7,844, so RM9,000 covers every recorded cost with headroom and sits
  // above the RM7,131 break-even.
  sector: 'Retail / E-commerce',
  revenueTarget: 9000,
  description:
    'I run a small grocery shop in Malaysia, open to walk-in customers and ' +
    'taking cash or e-wallet. I stock about 28 everyday items — rice, ' +
    'cooking oil, sugar, flour, eggs, milk, instant noodles, drinks, ' +
    'biscuits and household goods like detergent and soap — plus bread, ' +
    'coffee and mineral water that sell every day. My customers are ' +
    'households and workers from the surrounding neighbourhood. I do not ' +
    'keep daily sales records yet, so I want to know what I need to sell ' +
    'each month to cover my rent, wages and utilities.',

  products: [...NAMED_PRODUCTS, ...STAPLES],

  // The FIXED rows sum to exactly RM2,500 — the spec's "Monthly fixed
  // costs RM2,500", which is what break-even is computed against. The two
  // variable rows sit on top of that (RM2,750 total recorded expenses).
  expenses: [
    { id: 'e-rent', category: 'Rental', amount: 1200, kind: 'fixed', controllable: false },
    { id: 'e-salary', category: 'Employee salaries', amount: 800, kind: 'fixed', controllable: false },
    { id: 'e-utilities', category: 'Utilities', amount: 300, kind: 'fixed', controllable: true },
    { id: 'e-internet', category: 'Internet', amount: 200, kind: 'fixed', controllable: true },
    { id: 'e-transport', category: 'Transportation', amount: 150, kind: 'variable', controllable: true },
    { id: 'e-marketing', category: 'Marketing', amount: 100, kind: 'variable', controllable: true },
  ],

  startupItems: {
    rental_deposit: 4500,
    renovation: 8000,
    equipment: 6000,
    initial_stock: 5000,
    licences: 800,
    utilities_deposit: 600,
    marketing: 1500,
    emergency_reserve: 3000,
  },
  availableCapital: 25000,

  cash: null,
  monthlyOutflow: null,

  // Deliberately empty: this pathway exists precisely because the shop has
  // no sales history. Locked capabilities must stay locked.
  dailyRecords: [],
  feedback: [],
}

/** Total recorded fixed expenses for the demo shop (RM2,500). */
export const DEMO_FIXED_COSTS = DEMO_SHOP.expenses
  .filter((e) => e.kind !== 'variable')
  .reduce((sum, e) => sum + e.amount, 0)
