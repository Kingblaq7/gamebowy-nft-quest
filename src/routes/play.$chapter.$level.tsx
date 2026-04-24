import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GameBoard } from "@/components/game/GameBoard";
import { getLevel } from "@/game/chapters";
import { RequirePaidWallet } from "@/web3/RequirePaidWallet";

export const Route = createFileRoute("/play/$chapter/$level")({
  loader: ({ params }) => {
    const c = parseInt(params.chapter, 10);
    const l = parseInt(params.level, 10);
    const found = getLevel(c, l);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.level.name} · Game Bowy` : "Game Bowy" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/play" className="mt-4 inline-block rounded-full bg-gradient-aurora px-5 py-2 text-sm font-bold text-background">
          Back to map
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold">Level not found</h1>
        <Link to="/play" className="mt-4 inline-block rounded-full bg-gradient-aurora px-5 py-2 text-sm font-bold text-background">
          Back to map
        </Link>
      </div>
    </div>
  ),
  component: PlayLevel,
});

function PlayLevel() {
  const { chapter, level } = Route.useLoaderData();
  return (
    <RequirePaidWallet>
      <GameBoard chapter={chapter} level={level} />
    </RequirePaidWallet>
  );
}
