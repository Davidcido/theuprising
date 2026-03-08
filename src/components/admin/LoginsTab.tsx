import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface LoginSession {
  id: string;
  user_id: string | null;
  session_id: string;
  login_time: string;
  country: string | null;
  device_type: string | null;
}

interface LoginsTabProps {
  logins: LoginSession[];
  loginsToday: number;
}

const LoginsTab = ({ logins, loginsToday }: LoginsTabProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-emerald-100">{logins.length}</p>
          <p className="text-sm text-emerald-400">Total Logins (All-Time)</p>
        </CardContent>
      </Card>
      <Card className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-emerald-100">{loginsToday}</p>
          <p className="text-sm text-emerald-400">Logins Today</p>
        </CardContent>
      </Card>
    </div>

    <div className="overflow-x-auto rounded-xl border border-emerald-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0d4a2e] border-b border-emerald-700">
            <th className="text-left p-3 text-emerald-400 font-medium">Session ID</th>
            <th className="text-left p-3 text-emerald-400 font-medium">User ID</th>
            <th className="text-left p-3 text-emerald-400 font-medium">Login Time</th>
            <th className="text-left p-3 text-emerald-400 font-medium">Country</th>
            <th className="text-left p-3 text-emerald-400 font-medium">Device</th>
          </tr>
        </thead>
        <tbody>
          {logins.map(login => (
            <tr key={login.id} className="border-b border-emerald-700/50 hover:bg-emerald-900/20">
              <td className="p-3 text-emerald-100 font-mono text-xs">{login.session_id}</td>
              <td className="p-3 text-emerald-300 font-mono text-xs">
                {login.user_id ? login.user_id.slice(0, 8) + "..." : "—"}
              </td>
              <td className="p-3 text-emerald-200 text-xs">
                {formatDistanceToNow(new Date(login.login_time), { addSuffix: true })}
              </td>
              <td className="p-3 text-emerald-300 text-xs">{login.country || "—"}</td>
              <td className="p-3 text-emerald-300 text-xs">{login.device_type || "—"}</td>
            </tr>
          ))}
          {logins.length === 0 && (
            <tr>
              <td colSpan={5} className="p-8 text-center text-emerald-500">No login sessions recorded</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default LoginsTab;
