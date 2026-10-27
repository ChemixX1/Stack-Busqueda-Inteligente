import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diagnóstico web',
  robots: { index: false, follow: false },
};

// Records are restored from the browser cache in the persistent workspace.
export default function DetailPage() { return null; }
