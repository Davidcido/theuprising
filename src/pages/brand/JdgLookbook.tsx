import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { jdgProducts } from "@/data/jdgProducts";

const looks = [
  { word: "REBIRTH", product: jdgProducts[0], color: 1, statement: "Leave behind the shape you have outgrown." },
  { word: "IDENTITY", product: jdgProducts[1], color: 0, statement: "Wear the self you chose deliberately." },
  { word: "TRANSFORMATION", product: jdgProducts[0], color: 3, statement: "Change is not disappearance. It is arrival." },
  { word: "BECOMING", product: jdgProducts[1], color: 3, statement: "The next version is already moving through you." },
  { word: "REBIRTH", product: jdgProducts[3], color: 0, statement: "The same emblem, remade for colder mornings." },
  { word: "IDENTITY", product: jdgProducts[2], color: 1, statement: "A silhouette cut closer to the skin." },
];

const JdgLookbook = () => (
  <main>
    <header className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-24">
      <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-jdg-gold">Lookbook · Chapter I</p>
      <h1 className="font-display text-5xl font-medium uppercase text-jdg-bone sm:text-7xl">Becoming.</h1>
    </header>
    <div className="space-y-1">
      {looks.map((look, index) => (
        <Link key={look.word} to={`/brand/product/${look.product.slug}`} className="group relative block min-h-[72dvh] overflow-hidden bg-jdg-surface">
          <img src={look.product.colorways[look.color].image} alt={look.product.colorways[look.color].imageAlt} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-1000 motion-reduce:transition-none group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-jdg-lookbook" />
          <div className="relative mx-auto flex min-h-[72dvh] max-w-[1400px] flex-col justify-end px-4 py-12 sm:px-8 sm:py-16">
            <p className="text-[10px] uppercase tracking-[0.25em] text-jdg-gold">Look {String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-4 break-words font-display text-4xl font-medium uppercase text-jdg-bone sm:text-7xl">{look.word}</h2>
            <div className="mt-5 flex max-w-xl items-end justify-between gap-6">
              <p className="text-sm leading-relaxed text-jdg-muted sm:text-base">{look.statement}</p>
              <ArrowUpRight className="h-6 w-6 shrink-0 text-jdg-gold" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  </main>
);

export default JdgLookbook;