const Home = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-24 sm:py-32">
    <section className="grid gap-24">
      <header>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground sm:text-5xl">
          git-bench
        </h1>
        <p className="mt-1 text-muted-foreground">A Verno Studio starter.</p>
      </header>
      <div className="grid gap-5 text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
        <p>
          A Verno Studio starter, shaped for taste, systems, and the first
          commit—so the surface is considered before the feature list runs long.
        </p>
        <p>
          Edit{" "}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            app/page.tsx
          </code>{" "}
          to get started.
        </p>
      </div>
    </section>
  </main>
);

export default Home;
