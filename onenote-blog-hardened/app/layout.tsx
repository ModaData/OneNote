import './globals.css'

export const metadata = {
  title: 'OneNote Blog',
  description: 'Admin-only blog with OneNote-like layout',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
