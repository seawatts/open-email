import { defaultColors } from '@openrouter-monorepo/frontend/components/viz/shared';

// Map categories to colors from the repo's color system
export const CATEGORY_COLORS: Record<string, string> = {
  correctness: defaultColors[0]!, // Blue
  'type-safety': defaultColors[2]!, // YellowOrange
  maintainability: defaultColors[1]!, // Mint
  style: defaultColors[6]!, // Orchid
  naming: defaultColors[4]!, // SteelBlue
  consistency: defaultColors[5]!, // YellowGreen
  'test-quality': defaultColors[2]!, // YellowOrange
  baseline: '#757575',
  combined: '#d1cbcb',
};
