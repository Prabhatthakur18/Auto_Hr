import { Award, Trophy, Star, Medal, Crown, Flame, Target, Gem, type LucideIcon } from 'lucide-react';

/** Curated icon set for badges — explicit map (not a wildcard import) so the bundler can
 * tree-shake the rest of lucide-react's icon set out of the build. */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  Award,
  Trophy,
  Star,
  Medal,
  Crown,
  Flame,
  Target,
  Gem,
};

export const BADGE_ICON_KEYS = Object.keys(BADGE_ICONS);

export function resolveBadgeIcon(iconKey: string): LucideIcon {
  return BADGE_ICONS[iconKey] || Award;
}
