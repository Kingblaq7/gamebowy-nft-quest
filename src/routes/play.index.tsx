import { createFileRoute } from "@tanstack/react-router";
import { PlayHub } from "@/components/game/PlayHub";
import { RequirePaidWallet } from "@/web3/RequirePaidWallet";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Play · Game Bowy" },
      { name: "description", content: "Choose a chapter and play through the Bowy Galaxy." },
    ],
  }),
  component: () => (
    <RequirePaidWallet>
      <PlayHub />
    </RequirePaidWallet>
  ),
});
