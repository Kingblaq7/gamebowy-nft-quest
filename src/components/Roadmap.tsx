const PHASES = [
  {
    quarter: "Phase I",
    title: "Genesis Launch",
    items: ["Core match-3 engine", "First 4 chapters playable", "Cosmetic NFT tile set", "Daily missions"],
    status: "live",
  },
  {
    quarter: "Phase II",
    title: "Wallet Awakening",
    items: ["Multi-chain wallet connect", "GB token contracts", "On-chain NFT inventory", "Cloud save sync"],
    status: "next",
  },
  {
    quarter: "Phase III",
    title: "Social Constellations",
    items: ["Leaderboards & friend graph", "Limited seasonal events", "Guild battles", "Shareable replays"],
    status: "soon",
  },
  {
    quarter: "Phase IV",
    title: "Bowy Universe",
    items: ["All 10 chapters / 40 levels", "Marketplace for NFT tiles", "Mobile native build", "Creator tools"],
    status: "soon",
  },
];

const STATUS_STYLES = {
  live: { dot: "bg-aurora", label: "Now playing", color: "text-aurora" },
  next: { dot: "bg-primary", label: "In build", color: "text-primary" },
  soon: { dot: "bg-muted-foreground", label: "On the horizon", color: "text-muted-foreground" },
};

export function Roadmap() {
  return (
    <section id="roadmap" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Trajectory
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">
            The <span className="text-gradient-cosmic">orbital plan</span>
          </h2>
        </div>

        <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => {
            const s = STATUS_STYLES[p.status as keyof typeof STATUS_STYLES];
            return (
              <div
                key={p.quarter}
                className="relative overflow-hidden rounded-3xl glass-card p-6"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} style={{ boxShadow: "0 0 12px currentColor" }} />
                  <span className={`text-xs font-semibold uppercase tracking-widest ${s.color}`}>
                    {s.label}
                  </span>
                </div>
                <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                  {p.quarter}
                </span>
                <h3 className="mt-1 font-display text-xl font-bold">{p.title}</h3>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {p.items.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
