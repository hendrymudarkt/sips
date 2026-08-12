import type { Metadata } from 'next';
import ForgotPassword from './forgot-password-client';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default function Page() {
  return <ForgotPassword />;
}
