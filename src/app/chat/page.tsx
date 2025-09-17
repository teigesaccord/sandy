'use client';

import { ChatComponent } from '../../components/ChatComponent';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../components/auth/AuthContext';
import Link from 'next/link';

function AuthenticatedChatPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Chat with Sandy</h2>
            <p className="text-muted-foreground">
              Ask questions, seek guidance, or just have a conversation.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="btn btn-ghost btn-sm"
            >
              Back to Home
            </Link>
            <Link
              href="/recommendations"
              className="btn btn-secondary btn-sm"
            >
              Recommendations
            </Link>
          </div>
        </div>
        <ChatComponent userId={user.id} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedChatPage />
    </ProtectedRoute>
  );
}