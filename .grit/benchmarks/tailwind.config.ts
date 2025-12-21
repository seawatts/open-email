import type { Config } from 'tailwindcss';

import { createConfig } from '@openrouter-monorepo/theme/tailwind.web';

const baseConfig = createConfig(import.meta.url);

export default {
  ...baseConfig,
  content: [
    ...(Array.isArray(baseConfig.content) ? baseConfig.content : []),
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
} satisfies Config;
