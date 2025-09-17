import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../components/auth/AuthContext'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Sandy - Personalized Support Chatbot',
  description: 'A compassionate AI assistant providing personalized support for daily challenges',
  keywords: 'chatbot, AI assistant, personal support, health, wellness, accessibility',
  authors: [{ name: 'Sandy Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Sandy - Personalized Support Chatbot',
    description: 'A compassionate AI assistant providing personalized support for daily challenges',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sandy - Personalized Support Chatbot',
    description: 'A compassionate AI assistant providing personalized support for daily challenges',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${inter.className} h-full antialiased bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800`}>
        <AuthProvider>
          <div className="min-h-full flex flex-col">
            {/* Skip link for keyboard users */}
            <a href="#main-content" className="skip-link sr-only">Skip to main content</a>

            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center">
                    <Link href="/" className="flex items-center">
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        <span aria-hidden>🌊</span> <span className="align-middle">Sandy</span>
                      </h1>
                    </Link>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Your Personal Support Assistant
                    </span>
                  </div>
                  <nav className="hidden md:flex space-x-8" aria-label="Main navigation">
                    <Link
                      href="/chat"
                      className="text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Chat
                    </Link>
                    <Link
                      href="/profile"
                      className="text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/recommendations"
                      className="text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Recommendations
                    </Link>
                  </nav>
                  {/* Mobile menu button */}
                  <div className="md:hidden">
                    <button aria-expanded="false" aria-controls="mobile-menu" className="mobile-menu-button" id="mobile-menu-button">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path>
                      </svg>
                      <span className="sr-only">Open main menu</span>
                    </button>
                  </div>
                </div>
              </div>
              {/* Mobile menu (hidden by default). JavaScript toggle to be added later for full interactivity */}
              <div id="mobile-menu" className="hidden md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  <Link href="/chat" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200">Chat</Link>
                  <Link href="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200">Profile</Link>
                  <Link href="/recommendations" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200">Recommendations</Link>
                </div>
              </div>
            </header>

            <main id="main-content" role="main" tabIndex={-1} className="flex-1">
              {children}
            </main>

            <footer className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    © 2025 Sandy Chatbot. Built with care for personalized support.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Always consult with healthcare professionals for medical advice.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}