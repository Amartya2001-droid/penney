import { calculateDailyTargetPace } from '../engine/calculations';
import { getMonthSnapshot } from '../engine/snapshot';
import { Category, MoodState, type DateKey, type MonthSnapshot, type Transaction, type UserBudget } from '../types';
import { addDays, dateFromKey, parseDateKey, toDateKey } from '../utils/dates';
import { generateId } from '../utils/id';
import { roundCurrency } from '../utils/money';

export type DemoPresetId = 'saving_streak' | 'on_track' | 'takeouts_deep' | 'car_repair' | 'retail_spiral';

/** A fixed purchase that gives the preset its story (e.g. the four takeouts). */
interface FlavorSlot {
  daysAgo: number;
  category: Category;
  description: string;
  amount: number;
}

/** Older background spending, sized automatically so the preset lands on its target pace. */
interface FillerSlot {
  category: Category;
  description: string;
  weight: number;
}

/** Essential spending; 'first' means the 1st of the current month. */
interface EssentialSlot {
  daysAgo: number | 'first';
  category: Category;
  description: string;
  amount: number;
  /**
   * Resize to a share of the discretionary budget still left this month (rounded to $5),
   * clamped between min and `amount`, so the demo leaves a visible, nonzero daily target.
   */
  scaleToRemaining?: { share: number; min: number };
}

export interface DemoPresetDefinition {
  id: DemoPresetId;
  title: string;
  tagline: string;
  /** The mood this preset is designed to produce. */
  expectedMood: MoodState;
  /** Discretionary spend relative to the allowance to date: 0.15 = 15% over, −0.4 = 40% under. */
  paceOffset: number;
  essentials: EssentialSlot[];
  flavor: FlavorSlot[];
  filler: FillerSlot[];
}

export interface DemoPresetData {
  budget: UserBudget;
  /** Newest first, matching the store's ordering. */
  transactions: Transaction[];
}

/** Purchases older than this many days fall outside the engine's 7-day frequency window. */
const OUTSIDE_FREQUENCY_WINDOW_DAYS = 7;
/** If less than this is left after the fixed purchases, scale them instead of adding filler. */
const MIN_FILLER_TOTAL = 5;

export const DEMO_BUDGET: UserBudget = {
  monthly_income: 4200,
  savings_goal: 800,
  fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 },
};

/** Planned essentials, all within their fixed budgets, so none of them moves the target pace. */
const BASE_ESSENTIALS: EssentialSlot[] = [
  { daysAgo: 'first', category: Category.Rent, description: 'Monthly rent', amount: 1500 },
  { daysAgo: 'first', category: Category.Insurance, description: 'Tenant + auto insurance', amount: 120 },
  { daysAgo: 9, category: Category.Groceries, description: 'Big grocery run', amount: 118.4 },
  { daysAgo: 2, category: Category.Groceries, description: 'Produce and coffee', amount: 64.15 },
];

const STANDARD_FILLER: FillerSlot[] = [
  { category: Category.Entertainment, description: 'Concert tickets', weight: 3 },
  { category: Category.Shopping, description: 'Running shoes', weight: 4 },
  { category: Category.Amazon, description: 'Phone case and cables', weight: 2 },
];

export const DEMO_PRESETS: readonly DemoPresetDefinition[] = [
  {
    id: 'saving_streak',
    title: 'Saving Streak',
    tagline: 'Well under the discretionary allowance. Penney is quietly shiny.',
    expectedMood: MoodState.Thriving,
    paceOffset: -0.4,
    essentials: BASE_ESSENTIALS,
    flavor: [
      { daysAgo: 0, category: Category.Entertainment, description: 'Matinee ticket', amount: 13.5 },
      { daysAgo: 4, category: Category.Takeout, description: 'One coffee, no pastry', amount: 5.25 },
    ],
    filler: STANDARD_FILLER,
  },
  {
    id: 'on_track',
    title: 'On Track',
    tagline: 'Spending exactly at the target pace. Thrilling, says Penney.',
    expectedMood: MoodState.Neutral,
    paceOffset: 0,
    essentials: BASE_ESSENTIALS,
    flavor: [
      { daysAgo: 0, category: Category.Takeout, description: 'Lunch with a coworker', amount: 16.8 },
      { daysAgo: 2, category: Category.Entertainment, description: 'Streaming rental', amount: 6.99 },
      { daysAgo: 5, category: Category.Shopping, description: 'Hoodie on sale', amount: 34 },
    ],
    filler: STANDARD_FILLER,
  },
  {
    id: 'takeouts_deep',
    title: '4 Takeouts Deep',
    tagline: 'Four takeout orders in a row, a little over pace. Cue the raised eyebrow.',
    expectedMood: MoodState.Concerned,
    paceOffset: 0.15,
    essentials: BASE_ESSENTIALS,
    flavor: [
      { daysAgo: 0, category: Category.Takeout, description: 'Sushi, again', amount: 31.4 },
      { daysAgo: 1, category: Category.Takeout, description: 'Late-night pizza', amount: 27.9 },
      { daysAgo: 2, category: Category.Takeout, description: 'Burrito bowl', amount: 18.25 },
      { daysAgo: 3, category: Category.Takeout, description: 'Pad thai', amount: 22.6 },
    ],
    filler: STANDARD_FILLER,
  },
  {
    id: 'car_repair',
    title: 'Unplanned Car Repair',
    tagline: 'A surprise repair yesterday. Penney stays calm and quietly lowers the daily target.',
    expectedMood: MoodState.Neutral,
    paceOffset: 0,
    essentials: [
      ...BASE_ESSENTIALS,
      {
        daysAgo: 1,
        category: Category.EmergencyRepair,
        description: 'Car repair: alternator',
        amount: 780,
        scaleToRemaining: { share: 0.5, min: 120 },
      },
    ],
    flavor: [
      { daysAgo: 0, category: Category.Takeout, description: 'Coffee while the car was in the shop', amount: 4.75 },
      { daysAgo: 3, category: Category.Entertainment, description: 'Bowling night', amount: 22 },
    ],
    filler: STANDARD_FILLER,
  },
  {
    id: 'retail_spiral',
    title: 'Retail Spiral',
    tagline: 'Non-essentials six days running, well over pace. Penney has gone flat.',
    expectedMood: MoodState.DeadpanDisappointed,
    paceOffset: 0.45,
    essentials: BASE_ESSENTIALS,
    flavor: [
      { daysAgo: 0, category: Category.Amazon, description: 'Gadget I will use once', amount: 64.99 },
      { daysAgo: 1, category: Category.Shopping, description: 'Second jacket', amount: 89 },
      { daysAgo: 2, category: Category.Takeout, description: 'Ramen', amount: 24.5 },
      { daysAgo: 3, category: Category.Amazon, description: 'Desk organizer', amount: 32.4 },
      { daysAgo: 4, category: Category.Entertainment, description: 'Escape room', amount: 38 },
      { daysAgo: 5, category: Category.Shopping, description: 'Candles (three)', amount: 46.75 },
      { daysAgo: 5, category: Category.Takeout, description: 'Bubble tea', amount: 7.25 },
    ],
    filler: STANDARD_FILLER,
  },
];

const PRESETS_BY_ID: Record<DemoPresetId, DemoPresetDefinition> = Object.fromEntries(
  DEMO_PRESETS.map((p) => [p.id, p]),
) as Record<DemoPresetId, DemoPresetDefinition>;

export function getDemoPreset(id: DemoPresetId): DemoPresetDefinition {
  return PRESETS_BY_ID[id];
}

/** Splits a total by weights in whole cents; the last share absorbs rounding so the sum is exact. */
function splitTotal(total: number, weights: number[]): number[] {
  const totalCents = Math.round(total * 100);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const cents: number[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    const share =
      i === weights.length - 1 ? totalCents - assigned : Math.round((totalCents * w) / weightSum);
    cents.push(share);
    assigned += share;
  });
  return cents.map((c) => c / 100);
}

function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });
}

/**
 * Builds a preset relative to refDate. Every date is clamped into the current month, and the
 * discretionary amounts are scaled from the engine's own allowance to date, so the preset lands
 * in its intended mood on any day of any month (including the 1st).
 */
export function buildDemoPreset(id: DemoPresetId, refDate: Date = new Date()): DemoPresetData {
  const preset = getDemoPreset(id);
  const todayKey = toDateKey(refDate);
  const { day } = parseDateKey(todayKey);
  const maxDaysAgo = day - 1;

  const dateFor = (daysAgo: number | 'first'): DateKey => {
    const ago = daysAgo === 'first' ? maxDaysAgo : Math.min(Math.max(0, daysAgo), maxDaysAgo);
    return addDays(todayKey, -ago);
  };

  let sequence = 0;
  const make = (
    date: DateKey,
    category: Category,
    description: string,
    amount: number,
    isEssential: boolean,
  ): Transaction => {
    const created = dateFromKey(date);
    created.setHours(9, sequence++, 0, 0);
    return {
      id: generateId('demo'),
      amount: roundCurrency(amount),
      category,
      date,
      is_essential: isEssential,
      description,
      created_at: created.toISOString(),
    };
  };

  const base = calculateDailyTargetPace(DEMO_BUDGET, [], refDate);
  const remainingThisMonth = base.baseDailyTarget * base.daysLeftIncludingToday;
  const essentialAmount = (s: EssentialSlot): number => {
    if (!s.scaleToRemaining) return s.amount;
    const scaled = Math.round((remainingThisMonth * s.scaleToRemaining.share) / 5) * 5;
    return Math.min(s.amount, Math.max(s.scaleToRemaining.min, scaled));
  };

  const essentials = preset.essentials.map((s) =>
    make(dateFor(s.daysAgo), s.category, s.description, essentialAmount(s), true),
  );

  // Essentials (including an emergency) are the only thing that changes the allowance,
  // so it can be read from the engine before any discretionary spending is added.
  const allowanceToDate = calculateDailyTargetPace(DEMO_BUDGET, essentials, refDate).allowanceToDate;
  const discretionaryTarget = roundCurrency(Math.max(0, allowanceToDate * (1 + preset.paceOffset)));

  const discretionary: Transaction[] = [];
  const flavorTotal = preset.flavor.reduce((s, f) => s + f.amount, 0);

  if (flavorTotal >= discretionaryTarget - MIN_FILLER_TOTAL) {
    // Early in the month: shrink the story purchases so they alone hit the target.
    const amounts = splitTotal(discretionaryTarget, preset.flavor.map((f) => f.amount));
    preset.flavor.forEach((f, i) => {
      if (amounts[i] > 0) {
        discretionary.push(make(dateFor(f.daysAgo), f.category, f.description, amounts[i], false));
      }
    });
  } else {
    preset.flavor.forEach((f) => {
      discretionary.push(make(dateFor(f.daysAgo), f.category, f.description, f.amount, false));
    });

    const fillerAmounts = splitTotal(discretionaryTarget - flavorTotal, preset.filler.map((f) => f.weight));
    const oldestFlavorDaysAgo = Math.min(
      maxDaysAgo,
      Math.max(0, ...preset.flavor.map((f) => f.daysAgo)),
    );
    const span = day - 1 - OUTSIDE_FREQUENCY_WINDOW_DAYS;
    const count = preset.filler.length;

    preset.filler.forEach((f, i) => {
      // Place filler outside the frequency window when the month is long enough;
      // otherwise reuse a day that already has a purchase so no new "active day" is added.
      const daysAgo =
        span >= 0
          ? OUTSIDE_FREQUENCY_WINDOW_DAYS + Math.round((span * (count - i)) / count)
          : oldestFlavorDaysAgo;
      discretionary.push(make(dateFor(daysAgo), f.category, f.description, fillerAmounts[i], false));
    });
  }

  return {
    budget: {
      monthly_income: DEMO_BUDGET.monthly_income,
      savings_goal: DEMO_BUDGET.savings_goal,
      fixed_expenses: { ...DEMO_BUDGET.fixed_expenses },
    },
    transactions: sortNewestFirst([...essentials, ...discretionary]),
  };
}

/** Runs a preset through the real engine without loading it, for previews and self-checks. */
export function previewDemoPreset(id: DemoPresetId, refDate: Date = new Date()): MonthSnapshot {
  const data = buildDemoPreset(id, refDate);
  return getMonthSnapshot(data.budget, data.transactions, refDate);
}
