import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { jdgEmblemUrl, jdgProducts } from "@/data/jdgProducts";

const JdgHome = () => (
  <main>
    <section className="relative flex min-h-[calc(100dvh-8rem)] items-end overflow-hidden border-b border-jdg-gold/20 px-4 pb-14 pt-16 sm:px-8 sm:pb-20">
      <div className="absolute inset-0 flex items-center justify-center opacity-35" aria-hidden="true">
        <img src={jdgEmblemUrl} alt="" fetchPriority="high" className="h-[76%] max-h-[720px] w-auto object-contain mix-blend-screen" />
      </div>
      <div className="absolute inset-0 bg-jdg-vignette" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative mx-auto w-full max-w-[1400px]">
        <p className="mb-5 text-[11px] uppercase tracking-[0.34em] text-jdg-gold">JDG</p>
        <h1 className="max-w-5xl font-display text-5xl font-medium uppercase leading-[0.94] tracking-normal text-jdg-bone sm:text-7xl lg:text-8xl">The Rebirth<br />of Self.</h1>
        <p className="mt-7 max-w-lg text-base leading-relaxed text-jdg-muted sm:text-lg">More than clothing. A physical expression of becoming.</p>
        <Button asChild variant="jdg" size="lg" className="mt-8">
          <Link to="/brand/collection">Explore the collection <ArrowRight /></Link>
        </Button>
      </motion.div>
    </section>

    <section className="mx-auto grid max-w-[1400px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-28">
      <div className="max-w-md self-center">
        <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-jdg-gold">Chapter I</p>
        <h2 className="font-display text-3xl font-medium uppercase leading-tight text-jdg-bone sm:text-4xl">Transformation, made visible.</h2>
        <p className="mt-6 leading-relaxed text-jdg-muted">JDG represents transformation, individuality and the continuous rebirth of self.</p>
        <Link to="/brand/story" className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-jdg-bone hover:text-jdg-gold">Read our story <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <Link to={`/brand/product/${jdgProducts[0].slug}`} className="group overflow-hidden bg-jdg-surface">
        <img src={jdgProducts[0].colorways[1].image} alt={jdgProducts[0].colorways[1].imageAlt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-[1.02]" />
      </Link>
    </section>
  </main>
);

export default JdgHome;