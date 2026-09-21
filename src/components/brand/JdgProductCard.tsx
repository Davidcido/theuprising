import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { JdgProduct } from "@/data/jdgProducts";

const JdgProductCard = ({ product, priority = false }: { product: JdgProduct; priority?: boolean }) => (
  <article className="group">
    <Link to={`/brand/product/${product.slug}`} className="block overflow-hidden bg-jdg-surface">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={product.colorways[0].image}
          alt={product.colorways[0].imageAlt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-[1.025]"
        />
      </div>
    </Link>
    <div className="flex items-start justify-between gap-5 py-5">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-jdg-gold">{product.category}</p>
        <h2 className="font-display text-lg font-medium text-jdg-bone">{product.name}</h2>
        <p className="mt-1 text-sm text-jdg-muted">{product.price ?? "Price to be announced"}</p>
      </div>
      <Link to={`/brand/product/${product.slug}`} aria-label={`View ${product.name}`} className="mt-6 text-jdg-gold transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
        <ArrowUpRight className="h-5 w-5" />
      </Link>
    </div>
  </article>
);

export default JdgProductCard;