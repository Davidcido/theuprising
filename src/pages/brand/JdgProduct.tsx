import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getJdgProduct } from "@/data/jdgProducts";

const JdgProduct = () => {
  const { slug } = useParams();
  const product = useMemo(() => getJdgProduct(slug), [slug]);
  const [selectedColor, setSelectedColor] = useState(0);

  if (!product) return <Navigate to="/brand/collection" replace />;
  const active = product.colorways[selectedColor] ?? product.colorways[0];

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 sm:py-14">
      <Link to="/brand/collection" className="mb-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-jdg-muted hover:text-jdg-gold"><ArrowLeft className="h-4 w-4" /> Collection</Link>
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <div className="aspect-[4/3] overflow-hidden bg-jdg-surface">
            <img key={active.image} src={active.image} alt={active.imageAlt} fetchPriority="high" className="h-full w-full object-cover" />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {product.colorways.map((colorway, index) => (
              <button key={colorway.name} type="button" onClick={() => setSelectedColor(index)} aria-label={`View ${colorway.name}`} aria-pressed={selectedColor === index} className={cn("aspect-square overflow-hidden border bg-jdg-surface transition-colors", selectedColor === index ? "border-jdg-gold" : "border-jdg-gold/15 hover:border-jdg-gold/50")}>
                <img src={colorway.image} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-40 lg:self-start">
          <p className="text-[10px] uppercase tracking-[0.25em] text-jdg-gold">{product.category}</p>
          <h1 className="mt-4 font-display text-4xl font-medium uppercase leading-tight text-jdg-bone sm:text-5xl">{product.name}</h1>
          <p className="mt-5 text-lg text-jdg-muted">{product.price ?? "Price to be announced"}</p>
          <p className="mt-8 leading-relaxed text-jdg-muted">{product.description ?? product.tagline}</p>

          <div className="mt-10 border-t border-jdg-gold/20 pt-7">
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-jdg-bone">Colour — {active.name}</p>
            <div className="flex flex-wrap gap-3">
              {product.colorways.map((colorway, index) => (
                <button key={colorway.name} type="button" onClick={() => setSelectedColor(index)} aria-label={colorway.name} aria-pressed={selectedColor === index} className={cn("h-9 w-9 border p-1 transition-colors", selectedColor === index ? "border-jdg-gold" : "border-jdg-gold/20 hover:border-jdg-muted")} title={colorway.name}>
                  <span className={cn("block h-full w-full border border-jdg-bone/20", colorway.swatch)} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-jdg-gold/20 pt-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-jdg-bone">Sizes</p>
            <p className="mt-3 text-sm text-jdg-muted">{product.sizes?.join(" · ") ?? "Sizing to be announced"}</p>
          </div>

          <Button asChild={Boolean(product.purchaseUrl)} variant="jdg" size="lg" className="mt-10 w-full" disabled={!product.purchaseUrl}>
            {product.purchaseUrl ? <a href={product.purchaseUrl} target="_blank" rel="noreferrer">Shop now <ExternalLink /></a> : <span>Shop link coming soon</span>}
          </Button>
          <p className="mt-4 text-center text-xs text-jdg-muted">{product.availability ?? "Availability to be announced"}</p>

          <div className="mt-12 border-t border-jdg-gold/20 pt-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-jdg-gold">The design</p>
            <p className="mt-4 leading-relaxed text-jdg-muted">{product.story ?? "The story behind this design will be shared by JDG."}</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default JdgProduct;