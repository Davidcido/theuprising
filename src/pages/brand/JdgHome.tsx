import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { jdgEmblemUrl } from "@/data/jdgProducts";

const meanings = [
  {
    number: "01",
    title: "Identity",
    body: "The human element represents the individual — the person behind the journey.",
  },
  {
    number: "02",
    title: "Rising",
    body: "The central structure represents a person moving upward and building themselves through the different stages of life.",
  },
  {
    number: "03",
    title: "Vision",
    body: "The circular sun represents light, vision, and a new beginning.",
  },
  {
    number: "04",
    title: "Structure",
    body: "The architectural lines represent structure, ambition, and the different paths we take while building our lives.",
  },
  {
    number: "05",
    title: "Value",
    body: "The gold represents value, achievement, and something earned — not simply something given.",
  },
];

const chapters = [
  {
    title: "JDG",
    body: "JDG represents the initials of Jeremiah David Gabriel — the name behind the movement.",
  },
  {
    title: "Uprising",
    body: "UPRISING represents a movement of people who refuse to remain where circumstances placed them. It is about choosing to rise, challenge limitations, and become more than what the world expected.",
  },
  {
    title: "Rebirth",
    body: "REBIRTH represents starting again. Rebuilding. Growing through what tried to break you. And ultimately becoming something greater than who you were before.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    className={className}
    variants={reveal}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.22 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const ArchitecturalLines = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none absolute ${className}`} aria-hidden="true">
    <motion.span
      className="absolute left-0 top-0 h-px w-full origin-left bg-jdg-gold/45"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.8, ease: "easeInOut" }}
    />
    <motion.span
      className="absolute right-0 top-0 h-full w-px origin-top bg-jdg-gold/25"
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.45, ease: "easeInOut" }}
    />
    <motion.span
      className="absolute bottom-0 right-0 h-px w-2/3 origin-right bg-jdg-gold/20"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.4, delay: 0.75, ease: "easeInOut" }}
    />
  </div>
);

const JdgHome = () => {
  const emblemSection = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: emblemSection, offset: ["start end", "end start"] });
  const emblemY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [42, -42]);
  const emblemRotate = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-1.2, 1.2]);

  return (
    <main className="overflow-hidden bg-jdg-ink">
      <section className="relative min-h-[calc(100dvh-8rem)] border-b border-jdg-gold/20 px-4 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid min-h-[calc(100dvh-16rem)] max-w-[1400px] items-center gap-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 order-2 lg:order-1"
          >
            <p className="mb-6 text-[10px] uppercase tracking-[0.34em] text-jdg-gold">JDG</p>
            <h1 className="max-w-4xl font-display text-5xl font-medium uppercase leading-[0.92] tracking-normal text-jdg-bone sm:text-7xl lg:text-8xl xl:text-[6.6rem]">
              The Rebirth<br />of Self.
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-jdg-muted sm:text-lg">More than clothing. A physical expression of becoming.</p>
            <Button asChild variant="jdg" size="lg" className="mt-10">
              <Link to="/brand/collection">Explore the collection <ArrowRight /></Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-1 flex min-h-[38vh] items-center justify-center lg:order-2 lg:min-h-[68vh]"
          >
            <ArchitecturalLines className="inset-[7%]" />
            <div className="absolute inset-x-[18%] top-[18%] h-px bg-jdg-gold/15" aria-hidden="true" />
            <img
              src={jdgEmblemUrl}
              alt="JDG gold emblem"
              fetchPriority="high"
              className="relative z-10 h-auto w-[76%] max-w-[520px] object-contain mix-blend-screen drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      <section ref={emblemSection} className="relative border-b border-jdg-gold/20 px-4 py-28 sm:px-8 sm:py-36 lg:py-48">
        <div className="mx-auto max-w-[1400px]">
          <Reveal className="text-center">
            <p className="text-[10px] uppercase tracking-[0.34em] text-jdg-gold">The Emblem</p>
            <h2 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-medium uppercase leading-tight text-jdg-bone sm:text-6xl lg:text-7xl">Every line has a meaning.</h2>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-jdg-muted sm:text-lg">The JDG emblem represents identity, rebirth, individuality, and rising beyond limitations.</p>
          </Reveal>

          <div className="relative mx-auto mt-20 flex min-h-[560px] max-w-4xl items-center justify-center sm:mt-28 lg:min-h-[720px]">
            <ArchitecturalLines className="inset-x-[6%] inset-y-[10%]" />
            <motion.div style={{ y: emblemY, rotate: emblemRotate }} className="relative z-10 w-[84%] max-w-[650px]">
              <motion.div
                className="absolute inset-[16%] border border-jdg-gold/20"
                animate={reduceMotion ? undefined : { opacity: [0.18, 0.38, 0.18] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <img src={jdgEmblemUrl} alt="The JDG emblem" loading="lazy" className="relative h-auto w-full object-contain mix-blend-screen drop-shadow-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b border-jdg-gold/20 px-4 py-28 sm:px-8 sm:py-36 lg:py-48">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <Reveal>
              <p className="text-[10px] uppercase tracking-[0.34em] text-jdg-gold">The Meaning</p>
              <h2 className="mt-6 max-w-md font-display text-4xl font-medium uppercase leading-tight text-jdg-bone sm:text-6xl">A symbol of becoming.</h2>
            </Reveal>
            <div className="relative mt-14 hidden aspect-square max-w-md items-center justify-center lg:flex" aria-hidden="true">
              <ArchitecturalLines className="inset-0" />
              <img src={jdgEmblemUrl} alt="" loading="lazy" className="w-3/4 object-contain opacity-20 mix-blend-screen" />
            </div>
          </div>

          <div className="border-t border-jdg-gold/30">
            {meanings.map((meaning, index) => (
              <Reveal key={meaning.title} delay={index * 0.04} className="group grid gap-6 border-b border-jdg-gold/20 py-12 sm:grid-cols-[4rem_1fr] sm:py-16">
                <span className="text-[10px] tracking-[0.28em] text-jdg-gold">{meaning.number}</span>
                <div className="grid gap-5 md:grid-cols-[0.7fr_1.3fr] md:gap-10">
                  <h3 className="font-display text-2xl font-medium uppercase text-jdg-bone sm:text-3xl">{meaning.title}</h3>
                  <p className="max-w-xl leading-relaxed text-jdg-muted">{meaning.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[78vh] items-center overflow-hidden border-b border-jdg-gold/20 px-4 py-28 sm:px-8">
        <img src={jdgEmblemUrl} alt="" loading="lazy" className="pointer-events-none absolute -right-[8%] top-1/2 w-[68vw] max-w-[900px] -translate-y-1/2 object-contain opacity-[0.055] mix-blend-screen" />
        <div className="relative mx-auto w-full max-w-[1400px]">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.34em] text-jdg-gold">The Journey</p>
            <h2 className="mt-7 max-w-5xl font-display text-5xl font-medium uppercase leading-[0.96] text-jdg-bone sm:text-7xl lg:text-8xl">Becoming who you are<br />is never simple.</h2>
            <p className="mt-12 max-w-2xl text-base leading-relaxed text-jdg-muted sm:text-lg">The emblem is deliberately complex because the journey isn’t simple. Every line and element represents a different part of becoming who you are — the struggle, the structure, the choices, the setbacks, the ambition, and the transformation.</p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-28 sm:px-8 sm:py-36 lg:py-48">
        <div className="mx-auto max-w-[1400px]">
          {chapters.map((chapter, index) => (
            <Reveal key={chapter.title} className="grid border-t border-jdg-gold/25 py-16 last:border-b sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
              <div className="flex items-start gap-5">
                <span className="mt-2 text-[10px] tracking-[0.28em] text-jdg-gold">0{index + 1}</span>
                <h2 className="font-display text-5xl font-medium uppercase leading-none text-jdg-bone sm:text-7xl lg:text-8xl">{chapter.title}</h2>
              </div>
              <p className="mt-9 max-w-2xl whitespace-pre-line text-base leading-loose text-jdg-muted sm:text-lg lg:mt-2">{chapter.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative border-t border-jdg-gold/20 px-4 py-32 text-center sm:px-8 sm:py-44 lg:py-56">
        <ArchitecturalLines className="inset-x-[8%] inset-y-[18%]" />
        <Reveal className="relative mx-auto max-w-5xl">
          <p className="text-[10px] uppercase tracking-[0.36em] text-jdg-gold">JDG — Uprising Rebirth</p>
          <h2 className="mt-8 font-display text-5xl font-medium uppercase leading-[0.95] text-jdg-bone sm:text-7xl lg:text-8xl">The Rebirth<br />of Self.</h2>
          <div className="mx-auto mt-12 h-px w-16 bg-jdg-gold/60" />
          <p className="mt-8 text-sm tracking-[0.12em] text-jdg-muted sm:text-base">Wear the journey. Become the person.</p>
        </Reveal>
      </section>
    </main>
  );
};

export default JdgHome;