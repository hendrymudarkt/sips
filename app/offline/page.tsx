'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="SiPS" className="w-16 h-16 mx-auto mb-4 object-contain" />
        <h1 className="mb-2 text-2xl font-bold">Anda Sedang Offline</h1>
        <p className="text-base-content/70 mb-6">
          Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary rounded-full px-8"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
