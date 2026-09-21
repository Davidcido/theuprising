import JdgProductCard from "@/components/brand/JdgProductCard";
import { jdgProducts } from "@/data/jdgProducts";

const JdgShop = () => (
  <main className="mx-auto max-w-[1400px] px-4 py-14 sm:px-8 sm:py-20">
    <header className="mb-14 max-w-2xl">
      <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-jdg-gold">Shop JDG</p>
      <h1 className="font-display text-4xl font-medium uppercase text-jdg-bone sm:text-6xl">Choose your expression.</h1>
      <p className="mt-5 leading-relaxed text-jdg-muted">Official purchase links will appear here as each piece becomes available.</p>
    </header>
    <div className="grid gap-x-7 gap-y-14 md:grid-cols-2">
      {jdgProducts.map((product, index) => <JdgProductCard key={product.slug} product={product} priority={index === 0} />)}
    </div>
  </main>
);

export default JdgShop;