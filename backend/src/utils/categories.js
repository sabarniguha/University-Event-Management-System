// Default categories created at start-up (only if missing). Admins can add, rename and remove categories later.
const DEFAULT_CATEGORIES = [
  { name: 'Technical', icon: 'Cpu', description: 'Coding contests, tech talks and engineering showcases.' },
  { name: 'Hackathons', icon: 'Code2', description: 'Build something in a day or a weekend with your team.' },
  { name: 'Workshops', icon: 'Wrench', description: 'Hands-on sessions to learn a practical skill.' },
  { name: 'Cultural', icon: 'Palette', description: 'Festivals, dance, drama and traditions.' },
  { name: 'Sports', icon: 'Trophy', description: 'Tournaments, fitness events and inter-department matches.' },
  { name: 'Entrepreneurship', icon: 'Rocket', description: 'Startup pitches, founder talks and incubator events.' },
  { name: 'Seminars', icon: 'Presentation', description: 'Expert talks and subject deep-dives.' },
  { name: 'Conferences', icon: 'Users', description: 'Multi-session conferences and symposia.' },
  { name: 'Music and Arts', icon: 'Music', description: 'Concerts, exhibitions and creative showcases.' },
  { name: 'Career and Placement', icon: 'Briefcase', description: 'Placement drives, resume clinics and industry meets.' },
  { name: 'Academic', icon: 'GraduationCap', description: 'Lectures, paper presentations and academic competitions.' },
  { name: 'Social and Community', icon: 'HeartHandshake', description: 'Volunteering, clubs and community meet-ups.' },
  { name: 'General', icon: 'Calendar', description: 'Everything else happening on campus.' },
];

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category';

module.exports = { DEFAULT_CATEGORIES, slugify };
