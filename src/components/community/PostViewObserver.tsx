import { useEffect, useRef } from "react";

interface PostViewObserverProps {
  postId: string;
  onView: (postId: string) => void;
  children: React.ReactNode;
}

const PostViewObserver = ({ postId, onView, children }: PostViewObserverProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    tracked.current = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          onView(postId);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [postId, onView]);

  return <div ref={ref}>{children}</div>;
};

export default PostViewObserver;
