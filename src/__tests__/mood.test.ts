import { determineMood, getDiscretionaryFrequency } from '../engine/mood';
import { Category, MoodState, PaceStatus, type Transaction } from '../types';

const REF = new Date(2026, 9, 20, 12);

function purchases(days: string[], isEssential = false): Transaction[] {
  return days.map((date, i) => ({
    id: `p${i}-${date}`,
    amount: 10,
    category: isEssential ? Category.Groceries : Category.Takeout,
    date,
    is_essential: isEssential,
    description: '',
    created_at: `${date}T12:00:00.000Z`,
  }));
}

const FIVE_DAYS = ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'];

describe('getDiscretionaryFrequency', () => {
  it('flags 5+ active days in the last 7 as frequent', () => {
    expect(getDiscretionaryFrequency(purchases(FIVE_DAYS), REF).isFrequent).toBe(true);
    expect(getDiscretionaryFrequency(purchases(FIVE_DAYS.slice(1)), REF).isFrequent).toBe(false);
  });

  it('ignores essentials and purchases outside the window', () => {
    expect(getDiscretionaryFrequency(purchases(FIVE_DAYS, true), REF).activeDays).toBe(0);
    expect(getDiscretionaryFrequency(purchases(['2026-10-13']), REF).activeDays).toBe(0);
  });
});

describe('determineMood', () => {
  it('maps pace to mood when spending is not frequent', () => {
    expect(determineMood(PaceStatus.Ahead, [], REF)).toBe(MoodState.Thriving);
    expect(determineMood(PaceStatus.OnTrack, [], REF)).toBe(MoodState.Neutral);
    expect(determineMood(PaceStatus.SlightlyOver, [], REF)).toBe(MoodState.Concerned);
    expect(determineMood(PaceStatus.Over, [], REF)).toBe(MoodState.DeadpanDisappointed);
  });

  it('moves one step worse for frequent spending, capped at the bottom', () => {
    const frequent = purchases(FIVE_DAYS);
    expect(determineMood(PaceStatus.Ahead, frequent, REF)).toBe(MoodState.Neutral);
    expect(determineMood(PaceStatus.Over, frequent, REF)).toBe(MoodState.DeadpanDisappointed);
  });
});
