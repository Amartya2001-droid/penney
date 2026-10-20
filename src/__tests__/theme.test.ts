import { darkColors, lightColors, type ThemeColors, type Tone } from '../constants/theme';
import { isAppearancePreference, resolveScheme } from '../theme/resolveScheme';
import { contrastRatio } from '../utils/contrast';

const PALETTES: [string, ThemeColors][] = [
  ['light', lightColors],
  ['dark', darkColors],
];
const TONES: Tone[] = ['success', 'info', 'warning', 'danger'];
const BODY = 4.5;
const LARGE = 3;

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});

describe('palettes', () => {
  it('define the same tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  describe.each(PALETTES)('%s', (_name, c) => {
    const pairs: [string, string, string, number][] = [
      ['text on background', c.text, c.background, BODY],
      ['text on surface', c.text, c.surface, BODY],
      ['text on surfaceMuted', c.text, c.surfaceMuted, BODY],
      ['selected segment label', c.text, c.surfaceRaised, BODY],
      ['unselected segment label', c.textMuted, c.surfaceMuted, BODY],
      ['muted text on background', c.textMuted, c.background, BODY],
      ['muted text on surface', c.textMuted, c.surface, BODY],
      ['muted text on surfaceMuted', c.textMuted, c.surfaceMuted, BODY],
      ['button label on primary', c.onPrimary, c.primary, BODY],
      ['toast text', c.onInverse, c.inverseSurface, BODY],
      ['toast Undo', c.inverseAccent, c.inverseSurface, BODY],
      ['text on essential badge', c.text, c.badgeEssential, BODY],
      ['text on discretionary badge', c.text, c.badgeDiscretionary, BODY],
      ['border is visible on background', c.border, c.background, 1.15],
      // Chart marks are graphics, so WCAG 1.4.11 asks for 3:1 against the chart's surface.
      ['chart accent line on surface', c.chartAccent, c.surface, 3],
      ['chart context line on surface', c.chartContext, c.surface, 3],
      ...TONES.flatMap((t): [string, string, string, number][] => [
        [`${t} text on surface`, c[t], c.surface, BODY],
        [`${t} text on background`, c[t], c.background, BODY],
        [`${t} banner text`, c[t], c[`${t}Soft`], BODY],
        [`label on solid ${t}`, c.onTone, c[t], BODY],
        [`${t} as a large mood label`, c[t], c.background, LARGE],
      ]),
    ];

    it.each(pairs)('%s', (_label, fg, bg, min) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
    });
  });
});

describe('resolveScheme', () => {
  it('uses an explicit choice regardless of the device', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('follows the device for "system", defaulting to light', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  it('recognises valid preferences', () => {
    expect(isAppearancePreference('dark')).toBe(true);
    expect(isAppearancePreference('sepia')).toBe(false);
    expect(isAppearancePreference(undefined)).toBe(false);
  });
});
