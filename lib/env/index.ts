import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BACKEND_URL: z.string().url().optional().default(''),
    TRUSTED_IMAGE_DOMAINS: z.string().optional().default(''),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().optional().default(''),
    NEXT_PUBLIC_APP_URL: z.string().url().optional().default(''),
    NEXT_PUBLIC_GIS_URL: z.string().url().optional().default(''),
  },
  runtimeEnv: {
    BACKEND_URL: process.env.BACKEND_URL,
    TRUSTED_IMAGE_DOMAINS: process.env.TRUSTED_IMAGE_DOMAINS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GIS_URL: process.env.NEXT_PUBLIC_GIS_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
