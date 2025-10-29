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
          data-auto_select="false"
          data-cancel_on_tap_outside="true"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Completely disable Google auto-detection
              window.addEventListener('load', function() {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                  // Override the initialize function to force disable auto-detection
                  const originalInitialize = window.google.accounts.id.initialize;
                  window.google.accounts.id.initialize = function(config) {
                    const newConfig = {
                      ...config,
                      auto_select: false,
                      cancel_on_tap_outside: true,
                      use_fedcm_for_prompt: false,
                      itp_support: false,
                    };
                    return originalInitialize.call(this, newConfig);
                  };
                  
                  // Override renderButton to force generic text and proper styling
                  const originalRenderButton = window.google.accounts.id.renderButton;
                  window.google.accounts.id.renderButton = function(element, options) {
                    const newOptions = {
                      ...options,
                      text: 'signup_with',
                      theme: 'outline',
                      size: 'large',
                      width: '100%',
                      shape: 'rectangular',
                      logo_alignment: 'left',
                    };
                    
                    const result = originalRenderButton.call(this, element, newOptions);
                    
                    // Force styling after render
                    setTimeout(() => {
                      const button = element.querySelector('div[role="button"]');
                      if (button) {
                        button.style.width = '100%';
                        button.style.margin = '0 auto';
                        button.style.display = 'flex';
                        button.style.justifyContent = 'center';
                        button.style.alignItems = 'center';
                        button.style.textAlign = 'center';
                        
                        // Force generic text
                        const spans = button.querySelectorAll('span');
                        spans.forEach(span => {
                          if (span.textContent && !span.textContent.includes('Sign up with Google') && !span.textContent.includes('Sign in with Google')) {
                            span.textContent = span.textContent.includes('signup') ? 'Sign up with Google' : 'Sign in with Google';
                          }
                        });
                      }
                    }, 50);
                    
                    return result;
                  };
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
