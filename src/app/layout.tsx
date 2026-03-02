import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Acasting Media Studio',
  description: 'AI Media Generator per Acasting — immagini e video per i social',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-[#07070f] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
