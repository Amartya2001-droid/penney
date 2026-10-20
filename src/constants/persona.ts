import type { PenneyPersona } from '../types';

export const PENNEY_PERSONA: PenneyPersona = {
  name: 'Penney',
  description:
    'A sentient coin with a dry sense of humour who comments on discretionary spending. ' +
    'Observant and witty, occasionally sarcastic, never preachy, judgmental, or naggy. ' +
    'Never comments negatively on essential or emergency expenses.',
  traits: ['deadpan', 'witty', 'slightly_sarcastic', 'observant', 'non_judgmental', 'non_nagging'],
  maxMessageLength: 140,
};
