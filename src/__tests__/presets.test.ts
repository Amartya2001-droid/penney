import { DEMO_PRESETS, buildDemoPreset, previewDemoPreset } from '../demo/presets';
import { buildCommentaryContext } from '../services/penney/buildCommentaryContext';
import { getDaysInMonth, monthKeyOf, toDateKey } from '../utils/dates';
import { validateBudget, validateTransactionInput } from '../utils/validation';

// Short month, leap February, 30- and 31-day months.
const MONTHS: [number, number][] = [
  [2026, 2],
  [2028, 2],
  [2026, 4],
  [2026, 10],
];

describe('demo presets', () => {
  for (const [year, month] of MONTHS) {
    it(`land in their intended mood on every day of ${year}-${String(month).padStart(2, '0')}`, () => {
      for (let day = 1; day <= getDaysInMonth(year, month); day++) {
        const ref = new Date(year, month - 1, day, 14);
        const refKey = toDateKey(ref);

        for (const preset of DEMO_PRESETS) {
          const data = buildDemoPreset(preset.id, ref);
          const snapshot = previewDemoPreset(preset.id, ref);

          expect({ day, preset: preset.id, mood: snapshot.mood }).toEqual({
            day,
            preset: preset.id,
            mood: preset.expectedMood,
          });
          expect(validateBudget(data.budget)).toEqual([]);
          for (const t of data.transactions) {
            expect(validateTransactionInput(t)).toEqual([]);
            expect(monthKeyOf(t.date)).toBe(monthKeyOf(refKey));
            expect(t.date <= refKey).toBe(true);
          }

          const context = buildCommentaryContext(snapshot, data.transactions);
          expect(context.hadUnplannedEssentialRecently).toBe(preset.id === 'car_repair');
        }
      }
    });
  }

  it('always includes four takeouts in "4 Takeouts Deep"', () => {
    const data = buildDemoPreset('takeouts_deep', new Date(2026, 9, 2, 12));
    expect(data.transactions.filter((t) => t.category === 'takeout')).toHaveLength(4);
  });
});
