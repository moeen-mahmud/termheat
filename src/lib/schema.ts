import type { ThemeName } from "@/lib/types";

export interface TermheatConfig {
  username?: string;
  theme?: ThemeName;
  refreshMinutes?: number;
  shame?: boolean;
}
