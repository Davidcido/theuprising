import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  post_id: string;
}

interface CommentsTabProps {
  comments: Comment[];
  onDelete: (id: string) => void;
}

const CommentsTab = ({ comments, onDelete }: CommentsTabProps) => (
  <div className="space-y-3">
    {comments.map(comment => (
      <Card key={comment.id} className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-400 mb-1">
                {comment.anonymous_name} · {new Date(comment.created_at).toLocaleDateString()}
              </p>
              <p className="text-emerald-100 break-words">{comment.content}</p>
              <p className="text-xs text-emerald-500 mt-1">Post: {comment.post_id.slice(0, 8)}...</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => onDelete(comment.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
    {comments.length === 0 && <p className="text-emerald-500 text-center py-8">No comments yet</p>}
  </div>
);

export default CommentsTab;
