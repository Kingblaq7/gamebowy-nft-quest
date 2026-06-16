import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Send, Twitter, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact · Game Bowy" },
      {
        name: "description",
        content:
          "Get in touch with the Game Bowy team. Support, partnerships, and security disclosures.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Contact · Game Bowy" },
      {
        property: "og:description",
        content: "Reach the Game Bowy team for support, partnerships, and security disclosures.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <main className="relative min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="font-display text-4xl font-black">
          Contact <span className="text-gradient-cosmic">Game Bowy</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We're a small Web3 game studio. The fastest way to reach us is on our
          community channels below. For privacy, legal, or security matters,
          please use email.
        </p>

        <div className="mt-10 grid gap-4">
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            label="General &amp; Support"
            value="support@gamebowy.xyz"
            href="mailto:support@gamebowy.xyz"
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            label="Security disclosures"
            value="security@gamebowy.xyz"
            href="mailto:security@gamebowy.xyz"
          />
          <ContactCard
            icon={<Send className="h-5 w-5" />}
            label="Telegram community"
            value="t.me/Gamebowycommunity"
            href="https://t.me/Gamebowycommunity"
            external
          />
          <ContactCard
            icon={<Twitter className="h-5 w-5" />}
            label="X (Twitter)"
            value="@gamerboyw"
            href="https://x.com/gamerboyw"
            external
          />
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Game Bowy will never DM you first, ask for your seed phrase, or ask
          you to sign a transaction outside of the app. All on-chain purchases
          happen in your wallet with explicit confirmation.
        </p>
      </div>
      <Footer />
    </main>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 transition-colors hover:bg-card/70"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-aurora text-background">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm font-semibold">{value}</span>
      </span>
    </a>
  );
}
