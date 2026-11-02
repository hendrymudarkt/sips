import type { Metadata } from 'next';
import DevicesClient from './devices-client';

export const metadata: Metadata = { title: 'Manajemen Perangkat' };

export default function Page() {
  return <DevicesClient />;
}
