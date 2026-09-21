import { jdgEmblemUrl } from "@/data/jdgProducts";

const JdgStory = () => (
  <main>
    <section className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-[1400px] items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-jdg-gold">Our Story</p>
        <h1 className="font-display text-4xl font-medium uppercase leading-tight text-jdg-bone sm:text-6xl">The movement, carried into the world.</h1>
      </div>
      <div className="space-y-6 text-base leading-relaxed text-jdg-muted sm:text-lg">
        <p className="text-jdg-bone">Uprising is the movement. JDG is what you wear when you carry that movement into the world.</p>
        <p>THE REBIRTH OF SELF is the decision to leave behind the versions of yourself that no longer fit — not with shame, but with gratitude for how far they carried you.</p>
        <p>It is evolution made deliberate. Individuality without apology. Resilience without spectacle. Clothing becomes a symbol: evidence that becoming is not a destination, but a practice.</p>
      </div>
    </section>
    <section className="border-y border-jdg-gold/20 px-4 py-20 text-center sm:px-8 sm:py-28">
      <img src={jdgEmblemUrl} alt="JDG gold emblem" loading="lazy" className="mx-auto h-72 w-auto object-contain mix-blend-screen sm:h-96" />
      <p className="mt-10 font-display text-xl uppercase tracking-[0.16em] text-jdg-bone">Become who you choose to be.</p>
    </section>
  </main>
);

export default JdgStory;