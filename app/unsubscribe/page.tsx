'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No unsubscribe token provided');
      return;
    }

    // Process unsubscribe
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setEmail(data.email || '');
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to unsubscribe');
        }
      })
      .catch((error) => {
        console.error('Error unsubscribing:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
            <p className="text-gray-600">Please wait while we unsubscribe you.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Successfully Unsubscribed
            </h1>
            {email && (
              <p className="text-gray-600 mb-4">
                <span className="font-medium">{email}</span> has been removed from our mailing list.
              </p>
            )}
            <p className="text-gray-600 mb-6">
              You will no longer receive emails from us. We're sorry to see you go!
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                If you unsubscribed by mistake, please contact our support team.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Unsubscribe Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'We encountered an error processing your request.'}
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                The unsubscribe link may have expired or is invalid. Please contact our support team for assistance.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
