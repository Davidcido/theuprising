const ProfileSkeleton = () => (
  <div className="min-h-screen py-12 pb-24">
    <div className="container mx-auto px-4 max-w-2xl">
      <div
        className="rounded-3xl backdrop-blur-xl border border-white/15 overflow-hidden animate-pulse"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
      >
        {/* Cover photo placeholder */}
        <div className="h-36 bg-white/5" />

        {/* Avatar & actions */}
        <div className="px-6 -mt-14 relative">
          <div className="flex items-end justify-between">
            <div className="w-20 h-20 rounded-full bg-white/10 border-4 border-background" />
            <div className="h-8 w-24 bg-white/10 rounded-xl mb-2" />
          </div>
        </div>

        {/* Profile info */}
        <div className="px-6 py-4 space-y-3">
          <div className="h-5 bg-white/10 rounded-full w-40" />
          <div className="h-3 bg-white/8 rounded-full w-28" />
          <div className="h-3 bg-white/8 rounded-full w-64" />

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 w-16 bg-white/8 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="mt-6 space-y-3">
        <div className="h-5 bg-white/10 rounded w-16" />
        {[1, 2].map(i => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-white/10"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded-full w-full" />
              <div className="h-3 bg-white/10 rounded-full w-4/5" />
            </div>
            <div className="h-3 bg-white/8 rounded w-20 mt-3" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ProfileSkeleton;
