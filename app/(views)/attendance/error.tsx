'use client';

import { PageError } from '@/app/components/ui/page-error';

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} />;
}
