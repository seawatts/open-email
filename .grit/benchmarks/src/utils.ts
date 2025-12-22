import { defaultColors } from '@openrouter-monorepo/frontend/components/viz/shared';

// Map categories to colors from the repo's color system
export const CATEGORY_COLORS: Record<string, string> = {
  baseline: '#757575',
  combined: '#d1cbcb',
  consistency: defaultColors[5]!, // YellowGreen
  correctness: defaultColors[0]!, // Blue
  maintainability: defaultColors[1]!, // Mint
  naming: defaultColors[4]!, // SteelBlue
  style: defaultColors[6]!, // Orchid
  'test-quality': defaultColors[2]!, // YellowOrange
  'type-safety': defaultColors[2]!, // YellowOrange
};
