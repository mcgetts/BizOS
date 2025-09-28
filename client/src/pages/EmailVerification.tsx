import { useEffect, useState } from "react";
import { useLocation, useRouter } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function EmailVerification() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Extract token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Verification token is missing from the URL.');
          return;
        }

        // Call the verification API
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been successfully verified! You can now log in to your account.');

          // Redirect to login page after a short delay
          setTimeout(() => {
            navigate('/?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Email verification failed. The link may have expired or is invalid.');
        }

      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again.');
      }
    };

    verifyEmail();
  }, [navigate]);

  const handleReturnToLogin = () => {
    navigate(status === 'success' ? '/?verified=true' : '/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-blue-100">
            {status === 'verifying' && <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-green-600" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-red-600" />}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              {message}
            </p>
          </div>

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Mail className="w-4 h-4" />
                <span>Redirecting to login page in 3 seconds...</span>
              </div>
              <Button
                onClick={handleReturnToLogin}
                className="w-full"
              >
                Continue to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Button
                onClick={handleReturnToLogin}
                variant="outline"
                className="w-full"
              >
                Return to Login Page
              </Button>
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Need help? Contact support or try registering again.
                </p>
              </div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}