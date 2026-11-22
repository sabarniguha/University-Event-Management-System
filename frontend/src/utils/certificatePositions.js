// Results that can be written on a certificate, with a ready-made remark for each (the organiser can edit it).
export const POSITIONS = [
  { value: '', label: 'Participant' },
  { value: 'WINNER', label: 'Winner', phrase: 'the Winner position', remark: 'Secured first place with an outstanding performance' },
  { value: 'FIRST_RUNNER_UP', label: 'First Runner-Up', phrase: 'the First Runner-Up position', remark: 'Secured second place with an excellent performance' },
  { value: 'SECOND_RUNNER_UP', label: 'Second Runner-Up', phrase: 'the Second Runner-Up position', remark: 'Secured third place with a commendable performance' },
];
export const positionOf = (v) => POSITIONS.find((p) => p.value === v) || POSITIONS[0];
export const DEFAULT_TITLE = 'Certificate of Participation';
// Same rule as the server: winners and runners-up get an achievement heading unless a custom heading was typed.
export const headingFor = (title, position) => (position && title === DEFAULT_TITLE ? 'Certificate of Achievement' : title);
