const PostSkeleton = () => (
  <div
    className="p-5 rounded-2xl border border-white/10 animate-pulse"
    style={{ background: "rgba(255,255,255,0.04)" }}
  >
    <div className="flex items-center gap-3 mb-4">
      {/* Avatar placeholder */}
      <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-white/10 rounded-full w-28" />
        <div className="h-2.5 bg-white/8 rounded-full w-16" />
      </div>
    </div>
    {/* Content placeholders */}
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-white/10 rounded-full w-full" />
      <div className="h-3 bg-white/10 rounded-full w-5/6" />
      <div className="h-3 bg-white/8 rounded-full w-2/3" />
    </div>
    {/* Reactions placeholder */}
    <div className="flex gap-2 mb-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-7 w-14 bg-white/8 rounded-full" />
      ))}
    </div>
    {/* Actions placeholder */}
    <div className="flex gap-6 pt-3 border-t border-white/5">
      <div className="h-4 w-12 bg-white/8 rounded" />
      <div className="h-4 w-12 bg-white/8 rounded" />
      <div className="h-4 w-8 bg-white/8 rounded" />
    </div>
  </div>
);

export default PostSkeleton;
