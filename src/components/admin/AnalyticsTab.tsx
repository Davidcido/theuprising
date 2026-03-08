import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Visitor {
  id: string;
  session_id: string;
  visit_time: string;
  device_type: string | null;
  country: string | null;
}

interface Signup {
  id: string;
  user_id: string | null;
  signup_time: string;
}

interface LoginSession {
  id: string;
  user_id: string | null;
  session_id: string;
  login_time: string;
  country: string | null;
  device_type: string | null;
}

interface AnalyticsTabProps {
  visitors: Visitor[];
  signups: Signup[];
  logins: LoginSession[];
  visitorsToday: number;
  signupsToday: number;
}

const AnalyticsTab = ({ visitors, signups, logins, visitorsToday, signupsToday }: AnalyticsTabProps) => {
  const fmt = (ts: string) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-100">{visitorsToday}</p>
            <p className="text-sm text-emerald-400">Visitors Today</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-100">{visitors.length}</p>
            <p className="text-sm text-emerald-400">Total Visitors</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-100">{signupsToday}</p>
            <p className="text-sm text-emerald-400">New Signups Today</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-100">{signups.length}</p>
            <p className="text-sm text-emerald-400">Total Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visitors */}
      <div>
        <h3 className="text-lg font-semibold text-emerald-100 mb-3">Recent Visitors</h3>
        <div className="overflow-x-auto rounded-xl border border-emerald-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d4a2e] border-b border-emerald-700">
                <th className="text-left p-3 text-emerald-400 font-medium">Session ID</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Visit Time</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Device</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Country</th>
              </tr>
            </thead>
            <tbody>
              {visitors.slice(0, 50).map(v => (
                <tr key={v.id} className="border-b border-emerald-700/50 hover:bg-emerald-900/20">
                  <td className="p-3 text-emerald-100 font-mono text-xs">{v.session_id}</td>
                  <td className="p-3 text-emerald-200 text-xs">{fmt(v.visit_time)}</td>
                  <td className="p-3 text-emerald-300 text-xs">{v.device_type || "—"}</td>
                  <td className="p-3 text-emerald-300 text-xs">{v.country || "—"}</td>
                </tr>
              ))}
              {visitors.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-emerald-500">No visitors recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Signups */}
      <div>
        <h3 className="text-lg font-semibold text-emerald-100 mb-3">Recent Signups</h3>
        <div className="overflow-x-auto rounded-xl border border-emerald-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d4a2e] border-b border-emerald-700">
                <th className="text-left p-3 text-emerald-400 font-medium">User ID</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Signup Time</th>
              </tr>
            </thead>
            <tbody>
              {signups.slice(0, 50).map(s => (
                <tr key={s.id} className="border-b border-emerald-700/50 hover:bg-emerald-900/20">
                  <td className="p-3 text-emerald-100 font-mono text-xs">
                    {s.user_id ? s.user_id.slice(0, 12) + "..." : "—"}
                  </td>
                  <td className="p-3 text-emerald-200 text-xs">{fmt(s.signup_time)}</td>
                </tr>
              ))}
              {signups.length === 0 && (
                <tr><td colSpan={2} className="p-8 text-center text-emerald-500">No signups recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Logins */}
      <div>
        <h3 className="text-lg font-semibold text-emerald-100 mb-3">Recent Logins</h3>
        <div className="overflow-x-auto rounded-xl border border-emerald-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d4a2e] border-b border-emerald-700">
                <th className="text-left p-3 text-emerald-400 font-medium">Session ID</th>
                <th className="text-left p-3 text-emerald-400 font-medium">User ID</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Login Time</th>
                <th className="text-left p-3 text-emerald-400 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {logins.slice(0, 50).map(l => (
                <tr key={l.id} className="border-b border-emerald-700/50 hover:bg-emerald-900/20">
                  <td className="p-3 text-emerald-100 font-mono text-xs">{l.session_id}</td>
                  <td className="p-3 text-emerald-300 font-mono text-xs">
                    {l.user_id ? l.user_id.slice(0, 8) + "..." : "—"}
                  </td>
                  <td className="p-3 text-emerald-200 text-xs">{fmt(l.login_time)}</td>
                  <td className="p-3 text-emerald-300 text-xs">{l.device_type || "—"}</td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-emerald-500">No logins recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
