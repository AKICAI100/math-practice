import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Piggy Math — Column Addition Challenge',
  description: 'A playful way for children to practice written column addition.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
