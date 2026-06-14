import { Database, Cpu, Clock3, Lightbulb } from "lucide-react";
import ActivityChart, { type ActivityBucket } from "./ActivityChart";

export interface SideRailProps {
  activity: ActivityBucket[];
  topRepos: string[];
  activeModel: string | null;
  bestTime: string;
}

export default function SideRail({ activity, topRepos, activeModel, bestTime }: SideRailProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <ActivityChart data={activity} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brand-light" />
          <h3 className="text-sm font-semibold text-white">Insights</h3>
        </div>

        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-2.5">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
            <div className="min-w-0">
              <p className="text-xs text-white/40">Repos mais usados</p>
              <p className="truncate text-white/80">
                {topRepos.length > 0 ? topRepos.join(" · ") : "—"}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
            <div className="min-w-0">
              <p className="text-xs text-white/40">Modelo ativo</p>
              <p className="truncate text-white/80">{activeModel ?? "—"}</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
            <div className="min-w-0">
              <p className="text-xs text-white/40">Melhor horário pra postar</p>
              <p className="text-white/80">{bestTime}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
