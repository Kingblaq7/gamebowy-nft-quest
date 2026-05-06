import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Game Bowy" },
      {
        name: "description",
        content:
          "How Game Bowy handles your wallet address, gameplay data, and storage on our backend.",
      },
      { property: "og:title", content: "Privacy Policy — Game Bowy" },
      {
        property: "og:description",
        content:
          "How Game Bowy handles your wallet address, gameplay data, and backend storage.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Last updated: May 6, 2026
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Privacy <span className="text-gradient-cosmic">Policy</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            This Privacy Policy explains what data Game Bowy collects when you
            play, how it is used, and where it is stored.
          </p>
        </header>

        <section className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p>
              Game Bowy is a Web3 puzzle game. We do not collect names, emails,
              phone numbers, or government identifiers. The only identifier we
              associate with a player is the public wallet address used to
              connect to the game.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Public wallet address (when you connect a wallet)</li>
              <li>On-chain transaction hashes related to game access</li>
              <li>
                Gameplay data: GB token balance, level progress, daily streak,
                referral activity, moves purchased
              </li>
              <li>
                Basic technical data such as device type and approximate region,
                used only to keep the game stable
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              2. How Data Is Stored
            </h2>
            <p>
              Player data is stored in our managed backend (Supabase). Your
              wallet address acts as your account identifier. We do not store
              private keys, seed phrases, or any data that would let us move
              funds from your wallet — and we will never ask for them.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              3. How We Use Data
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To verify game access and on-chain payments</li>
              <li>To track GB rewards, level progress, and daily streaks</li>
              <li>To credit referral rewards to the inviting wallet</li>
              <li>To prevent abuse, cheating, and duplicate accounts</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              4. Sharing
            </h2>
            <p>
              We do not sell or rent player data. Public wallet addresses and
              on-chain transactions are, by their nature, publicly visible on
              the blockchain.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              5. Local Caching
            </h2>
            <p>
              The game may cache non-sensitive data (such as your last known GB
              balance and progress) in your browser's local storage to make the
              UI feel fast. The backend remains the source of truth.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              6. Your Choices
            </h2>
            <p>
              You can stop using Game Bowy at any time by disconnecting your
              wallet. To request deletion of gameplay data linked to your
              wallet, contact us through our community channels listed in the
              footer.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              7. Changes
            </h2>
            <p>
              We may update this policy as the game evolves. Material changes
              will be reflected on this page with a new "Last updated" date.
            </p>
          </div>

          <p className="pt-4">
            See also our{" "}
            <Link to="/terms" className="text-foreground underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
