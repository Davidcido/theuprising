import { jdgCategories, jdgProducts } from "@/data/jdgProducts";
import JdgProductCard from "@/components/brand/JdgProductCard";

const JdgCollection = () => (
  <main className="mx-auto max-w-[1400px] px-4 py-14 sm:px-8 sm:py-20">
    <header className="mb-14 max-w-3xl">
      <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-jdg-gold">The Collection</p>
      <h1 className="font-display text-4xl font-medium uppercase text-jdg-bone sm:text-6xl">Forms of becoming.</h1>
      <p className="mt-5 max-w-xl leading-relaxed text-jdg-muted">Four silhouettes. Fifteen expressions. Each piece holds the mark of rebirth.</p>
    </header>
    <div className="mb-10 flex flex-wrap gap-x-6 gap-y-3 border-y border-jdg-gold/20 py-4 text-[10px] uppercase tracking-[0.18em] text-jdg-muted">
      {jdgCategories.map((category) => <span key={category}>{category}</span>)}
    </div>
    <div className="grid gap-x-7 gap-y-14 md:grid-cols-2">
      {jdgProducts.map((product, index) => <JdgProductCard key={product.slug} product={product} priority={index === 0} />)}
    </div>
  </main>
);

export default JdgCollection;