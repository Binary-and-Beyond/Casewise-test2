import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casewise",
  description: "AI-powered medical case learning platform",
  generator: "Casewise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
        <meta httpEquiv="Cross-Origin-Embedder-Policy" content="unsafe-none" />
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add proper event listeners for Google OAuth script
              document.addEventListener('DOMContentLoaded', function() {
                const googleScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
                if (googleScript) {
                  googleScript.addEventListener('load', function() {
                    console.log('Google Identity Services loaded successfully');
                  });
                  googleScript.addEventListener('error', function() {
                    console.error('Failed to load Google Identity Services');
                  });
                }
              });
              
              window.addEventListener('load', function() {
                if (typeof google === 'undefined') {
                  console.warn('Google Identity Services not loaded after page load');
                } else {
                  console.log('Google Identity Services available');
                }
              });
            `,
          }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
