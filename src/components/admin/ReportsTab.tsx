import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string | null;
  reporter_session_id: string;
  status: string;
  created_at: string;
}

interface ReportsTabProps {
  reports: Report[];
  onUpdateStatus: (id: string, status: string) => void;
}

const ReportsTab = ({ reports, onUpdateStatus }: ReportsTabProps) => (
  <div className="space-y-3">
    {reports.map(report => (
      <Card key={report.id} className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-400 mb-1">
                {report.content_type.toUpperCase()} · {new Date(report.created_at).toLocaleDateString()}
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  report.status === "pending" ? "bg-yellow-600/30 text-yellow-300" :
                  report.status === "reviewed" ? "bg-emerald-600/30 text-emerald-300" :
                  "bg-gray-600/30 text-gray-300"
                }`}>{report.status}</span>
              </p>
              <p className="text-emerald-100">{report.reason || "No reason provided"}</p>
              <p className="text-xs text-emerald-500 mt-1">Content ID: {report.content_id.slice(0, 8)}...</p>
            </div>
            <div className="flex gap-2">
              {report.status === "pending" && (
                <>
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600" onClick={() => onUpdateStatus(report.id, "reviewed")}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-emerald-600" onClick={() => onUpdateStatus(report.id, "dismissed")}>
                    <EyeOff className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
    {reports.length === 0 && <p className="text-emerald-500 text-center py-8">No reports</p>}
  </div>
);

export default ReportsTab;
