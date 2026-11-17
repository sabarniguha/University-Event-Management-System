// Points and badges are calculated from real records (attendance, feedback, teams); nothing is stored or faked.
const POINTS = { attended: 10, feedback: 5, team: 3 };

const BADGES = [
  { key: 'first-step', name: 'First Step', description: 'Attend your first event', test: (s) => s.attended >= 1 },
  { key: 'regular', name: 'Regular', description: 'Attend 5 events', test: (s) => s.attended >= 5 },
  { key: 'champion', name: 'Campus Champion', description: 'Attend 10 events', test: (s) => s.attended >= 10 },
  { key: 'explorer', name: 'Explorer', description: 'Attend events in 3 different categories', test: (s) => s.categories >= 3 },
  { key: 'voice', name: 'Voice of the Campus', description: 'Give feedback on 3 events', test: (s) => s.feedback >= 3 },
  { key: 'team-player', name: 'Team Player', description: 'Join a team for an event', test: (s) => s.teams >= 1 },
];

const empty = () => ({ attended: 0, categories: 0, feedback: 0, teams: 0 });

const pointsOf = (s) => s.attended * POINTS.attended + s.feedback * POINTS.feedback + s.teams * POINTS.team;
const badgesOf = (s) => BADGES.map((b) => ({ key: b.key, name: b.name, description: b.description, earned: b.test(s) }));
const levelOf = (points) => (points >= 150 ? 'Gold' : points >= 60 ? 'Silver' : points >= 10 ? 'Bronze' : 'Starter');

// "Asha Rao" -> "Asha R." so the public leaderboard never shows full names.
const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0] || 'Student';
};

module.exports = { POINTS, BADGES, empty, pointsOf, badgesOf, levelOf, shortName };
