import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ChaptersPreview } from "@/components/ChaptersPreview";
import { Roadmap } from "@/components/Roadmap";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Game Bowy — Match the Cosmos · Web3 Puzzle Game" },
      {
        name: "description",
        content:
          "Game Bowy is a cosmic Web3 match-3 puzzle game with 10 chapters, 40 levels, and collectible NFT tiles. Play the live demo.",
      },
      { property: "og:title", content: "Game Bowy — Match the Cosmos" },
      {
        property: "og:description",
        content:
          "Cosmic Web3 match-3 puzzle game with 40 levels and collectible NFT tiles.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <Hero />
      <Features />
      <ChaptersPreview />
      <Roadmap />
      <Footer />
    </main>
  );
}
