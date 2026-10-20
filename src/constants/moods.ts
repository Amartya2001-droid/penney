import { MoodState, PaceStatus } from '../types';
import { colors } from './theme';

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
  accent: string;
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
    accent: colors.success,
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
    accent: colors.info,
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
    accent: colors.warning,
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
    accent: colors.danger,
  },
};

export interface PaceVisual {
  label: string;
  color: string;
}

export const PACE_VISUALS: Record<PaceStatus, PaceVisual> = {
  [PaceStatus.Ahead]: { label: 'Ahead of pace', color: colors.success },
  [PaceStatus.OnTrack]: { label: 'On track', color: colors.info },
  [PaceStatus.SlightlyOver]: { label: 'Slightly over', color: colors.warning },
  [PaceStatus.Over]: { label: 'Over pace', color: colors.danger },
};
