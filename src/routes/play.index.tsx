import { createFileRoute } from "@tanstack/react-router";
import { PlayHub } from "@/components/game/PlayHub";
import { RequirePaidWallet } from "@/web3/RequirePaidWallet";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Play · Game Bowy" },
      { name: "description", content: "Choose a chapter and play through the Bowy Galaxy." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <>
      <RequirePaidWallet>
        <PlayHub />
      </RequirePaidWallet>
      <Footer />
    </>
  );
}
