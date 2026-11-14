import { Briefcase, Calendar, Code, Cpu, GraduationCap, Heart, Mic, Music, Palette, Rocket, Trophy, Users, Wrench } from 'lucide-react';

const ICONS = { Briefcase, Calendar, Code, Cpu, GraduationCap, Heart, Mic, Music, Palette, Rocket, Trophy, Users, Wrench };

// Falls back to a calendar so an unknown icon name saved by an admin never breaks the page.
export default function CategoryIcon({ name, className = 'h-5 w-5' }) {
  const Icon = ICONS[name] || Calendar;
  return <Icon className={className} />;
}
export const ICON_NAMES = Object.keys(ICONS);
