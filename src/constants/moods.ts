import { MoodState, PaceStatus } from '../types';
import type { Tone } from './theme';

/** Penney's facial features. Drawn on the gold coin, so the same in light and dark themes. */
export const COIN_INK = '#2B2116';

export type EyeStyle = 'happy' | 'open' | 'skeptical' | 'lidded';
export type MouthStyle = 'smile' | 'flat' | 'smirk' | 'line';

export interface MoodVisual {
  label: string;
  caption: string;
  faceColor: string;
  rimColor: string;
  shineColor: string;
  eyes: EyeStyle;
  mouth: MouthStyle;
  /** Vertical bob distance in px; 0 = motionless. */
  bobAmplitude: number;
  /** Duration of one half of the bob cycle in ms. */
  bobDurationMs: number;
  /** Colour of the mood label, resolved against the active theme. */
  tone: Tone;
}

export const MOOD_VISUALS: Record<MoodState, MoodVisual> = {
  [MoodState.Thriving]: {
    label: 'Thriving',
    caption: 'Ahead of your savings pace',
    faceColor: '#F2C14E',
    rimColor: '#C8912A',
    shineColor: 'rgba(255, 255, 255, 0.5)',
    eyes: 'happy',
    mouth: 'smile',
    bobAmplitude: 10,
    bobDurationMs: 700,
    tone: 'success',
  },
  [MoodState.Neutral]: {
    label: 'Neutral',
    caption: 'Right on pace',
    faceColor: '#E8B84A',
    rimColor: '#B98A2C',
    shineColor: 'rgba(255, 255, 255, 0.4)',
    eyes: 'open',
    mouth: 'flat',
    bobAmplitude: 5,
    bobDurationMs: 1200,
    tone: 'info',
  },
  [MoodState.Concerned]: {
    label: 'Concerned',
    caption: 'A little over your spending allowance',
    faceColor: '#DDB04F',
    rimColor: '#A97E2B',
    shineColor: 'rgba(255, 255, 255, 0.32)',
    eyes: 'skeptical',
    mouth: 'smirk',
    bobAmplitude: 3,
    bobDurationMs: 1600,
    tone: 'warning',
  },
  [MoodState.DeadpanDisappointed]: {
    label: 'Deadpan Disappointed',
    caption: 'Lots of non-essential spending lately',
    faceColor: '#C9A562',
    rimColor: '#8E7340',
    shineColor: 'rgba(255, 255, 255, 0.2)',
    eyes: 'lidded',
    mouth: 'line',
    bobAmplitude: 0,
    bobDurationMs: 0,
    tone: 'danger',
  },
};

export interface PaceVisual {
  label: string;
  tone: Tone;
}

export const PACE_VISUALS: Record<PaceStatus, PaceVisual> = {
  [PaceStatus.Ahead]: { label: 'Ahead of pace', tone: 'success' },
  [PaceStatus.OnTrack]: { label: 'On track', tone: 'info' },
  [PaceStatus.SlightlyOver]: { label: 'Slightly over', tone: 'warning' },
  [PaceStatus.Over]: { label: 'Over pace', tone: 'danger' },
};
