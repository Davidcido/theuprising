const ExploreSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div
        key={i}
        className="p-4 rounded-2xl border border-white/10"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-white/10" />
          <div className="h-3 bg-white/10 rounded-full w-24" />
          <div className="h-2.5 bg-white/8 rounded-full w-16" />
        </div>
        <div className="space-y-2 mb-2">
          <div className="h-3 bg-white/10 rounded-full w-full" />
          <div className="h-3 bg-white/10 rounded-full w-5/6" />
          <div className="h-3 bg-white/8 rounded-full w-2/3" />
        </div>
        <div className="flex gap-4 mt-2">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-3 w-10 bg-white/8 rounded" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default ExploreSkeleton;
