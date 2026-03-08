import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Post {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface PostsTabProps {
  posts: Post[];
  onDelete: (id: string) => void;
}

const PostsTab = ({ posts, onDelete }: PostsTabProps) => (
  <div className="space-y-3">
    {posts.map(post => (
      <Card key={post.id} className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-400 mb-1">
                {post.anonymous_name} · {new Date(post.created_at).toLocaleDateString()}
              </p>
              <p className="text-emerald-100 break-words">{post.content}</p>
              <p className="text-xs text-emerald-500 mt-2">❤️ {post.likes_count} · 💬 {post.comments_count}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => onDelete(post.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
    {posts.length === 0 && <p className="text-emerald-500 text-center py-8">No posts yet</p>}
  </div>
);

export default PostsTab;
