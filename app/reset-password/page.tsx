import type { Metadata } from 'next';
import ResetPassword from './reset-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
};

export default function Page() {
  return <ResetPassword />;
}
