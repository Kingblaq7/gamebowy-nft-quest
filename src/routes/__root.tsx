import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { WalletProvider } from "@/web3/WalletProvider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Game Bowy" },
      { name: "description", content: "Play Game Bowy and earn GB tokens. Invite friends and climb the leaderboard." },
      { name: "author", content: "Game Bowy" },
      { property: "og:title", content: "Game Bowy" },
      { property: "og:description", content: "Play, earn, and invite friends in Game Bowy." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Game Bowy" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Game Bowy" },
      { name: "twitter:description", content: "Play, earn, and invite friends in Game Bowy." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pouYPSvJJfeAsvO1iYnRMLE2CPx1/social-images/social-1776998018866-97995.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pouYPSvJJfeAsvO1iYnRMLE2CPx1/social-images/social-1776998018866-97995.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <WalletProvider>
      <Outlet />
    </WalletProvider>
  );
}
