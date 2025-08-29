import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
        <div className="min-h-full flex flex-col">
          <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    🌊 Sandy
                  </h1>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Your Personal Support Assistant
                  </span>
                </div>
                <nav className="hidden md:flex space-x-8">
                  <a 
                    href="#chat" 
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Chat
                  </a>
                  <a 
                    href="#profile" 
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Profile
                  </a>
                  <a 
                    href="#recommendations" 
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Recommendations
                  </a>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  © 2024 Sandy Chatbot. Built with care for personalized support.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Always consult with healthcare professionals for medical advice.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}