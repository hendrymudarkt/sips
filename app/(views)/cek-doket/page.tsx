import type { Metadata } from 'next';
import CekDoketClient from './cek-doket-client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Cek Doket' };
}

export default function Page() {
  return <CekDoketClient />;
}
