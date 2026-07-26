import {
  BookOpen,
  CalendarCheck,
  Compass,
  Eye,
  Flame,
  Gauge,
  LayoutGrid,
  Mountain,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Telescope,
  Trophy,
  TrendingUp,
  Waves,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icon names authored in `achievements.icon`, resolved to components.
 *
 * The icon is content, so it arrives as a string and cannot be trusted to match
 * anything: a new seeded achievement with an icon nobody has mapped yet must
 * render a medallion, not crash a reward moment. Hence the fallback.
 *
 * Lucide only, one icon system (DesignSystem §8).
 */
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'calendar-check': CalendarCheck,
  compass: Compass,
  eye: Eye,
  flame: Flame,
  gauge: Gauge,
  'layout-grid': LayoutGrid,
  mountain: Mountain,
  'scan-eye': ScanEye,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  telescope: Telescope,
  'trending-up': TrendingUp,
  waves: Waves,
}

export function resolveAchievementIcon(icon: string): LucideIcon {
  return ACHIEVEMENT_ICONS[icon] ?? Trophy
}
