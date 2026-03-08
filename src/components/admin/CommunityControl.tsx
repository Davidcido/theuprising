import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Globe, Lock } from "lucide-react";

interface CommunityControlProps {
  communityStatus: string;
  onToggle: () => void;
}

const CommunityControl = ({ communityStatus, onToggle }: CommunityControlProps) => {
  const isOpen = communityStatus === "open";

  return (
    <Card className="bg-[#0d4a2e] border-emerald-700 mb-8">
      <CardHeader>
        <CardTitle className="text-emerald-100 text-lg flex items-center gap-2">
          {isOpen ? <Globe className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-red-400" />}
          Community Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 font-medium">
              {isOpen ? "Community is OPEN" : "Community is CLOSED"}
            </p>
            <p className="text-sm text-emerald-400 mt-1">
              {isOpen
                ? "Users can create posts and comments."
                : "Users can only view posts. Posting and commenting are disabled."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
            }`}>
              {isOpen ? "OPEN" : "CLOSED"}
            </span>
            <Switch checked={isOpen} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityControl;
