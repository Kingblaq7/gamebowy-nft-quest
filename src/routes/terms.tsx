import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Game Bowy" },
      {
        name: "description",
        content:
          "Rules for playing Game Bowy: wallet use, GB rewards, on-chain payments, and disclaimers.",
      },
      { property: "og:title", content: "Terms of Service — Game Bowy" },
      {
        property: "og:description",
        content:
          "Rules for playing Game Bowy, including wallet use, GB rewards, and disclaimers.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Last updated: May 6, 2026
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Terms of <span className="text-gradient-cosmic">Service</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            By connecting a wallet and playing Game Bowy, you agree to these
            Terms of Service. If you do not agree, please do not use the game.
          </p>
        </header>

        <section className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              1. Wallet Connection Disclaimer
            </h2>
            <p>
              Game Bowy is a non-custodial Web3 game. We never take custody of
              your funds, private keys, or seed phrases. You are solely
              responsible for the security of your wallet, your device, and any
              transactions you sign. Always verify network and contract details
              before approving any on-chain transaction.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              2. No Financial Guarantee
            </h2>
            <p>
              Game Bowy is entertainment software. GB tokens, in-game items,
              and any rewards are for gameplay purposes and do not represent
              securities, investments, or guarantees of monetary value. The
              value, utility, and availability of GB or any future token may
              change or be discontinued at any time. Nothing in the game is
              financial, investment, tax, or legal advice. You play at your
              own risk.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              3. Gameplay Rewards
            </h2>
            <p>
              Players can earn GB through normal gameplay (completing levels,
              daily streaks, referrals). Rewards are calculated and recorded by
              our backend, which is the source of truth for balances and
              progress. We may adjust reward formulas, anti-cheat rules, or
              event mechanics to keep the game fair. Suspected abuse, botting,
              or multi-accounting may result in reward removal or loss of
              access.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              4. On-chain Payments
            </h2>
            <p>
              Some features require an on-chain payment from your wallet. Once
              a transaction is broadcast it cannot be reversed by us. Network
              fees ("gas") are paid to the underlying blockchain, not to Game
              Bowy.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              5. Acceptable Use
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>No cheating, automation, or exploiting bugs</li>
              <li>No referral self-invites or sybil farming</li>
              <li>No reverse engineering of backend endpoints to inflate rewards</li>
              <li>No use of the game where prohibited by local law</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              6. Data
            </h2>
            <p>
              Information about how we handle wallet addresses and gameplay
              data is described in our{" "}
              <Link to="/privacy" className="text-foreground underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              7. Disclaimer of Warranties
            </h2>
            <p>
              The game is provided "as is" and "as available" without
              warranties of any kind. We do not guarantee uninterrupted access,
              error-free operation, or that the game will meet your
              expectations.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Game Bowy and its team
              are not liable for any indirect, incidental, or consequential
              damages, lost tokens, lost profits, or losses arising from your
              use of the game, your wallet, or any blockchain network.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              9. Changes
            </h2>
            <p>
              We may update these Terms as the game evolves. Continued play
              after an update means you accept the new Terms.
            </p>
          </div>
        </section>
      </article>
      <Footer />
    </main>
  );
}
