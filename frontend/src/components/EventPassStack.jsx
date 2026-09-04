export default function EventPassStack() {
  return (
    <svg
      viewBox="0 0 420 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md"
      role="img"
      aria-label="Stack of university event passes"
    >
      {/* back pass */}
      <g transform="rotate(-8 180 220)">
        <rect x="60" y="140" width="260" height="150" rx="4" fill="#E4E1D3" stroke="#D7D3C6" />
        <rect x="60" y="140" width="260" height="150" rx="4" fill="#141F38" fillOpacity="0.04" />
      </g>
      {/* middle pass */}
      <g transform="rotate(4 180 220)">
        <rect x="55" y="150" width="270" height="150" rx="4" fill="#F7F6F1" stroke="#D7D3C6" />
        <rect x="80" y="175" width="120" height="10" rx="2" fill="#B3872E" />
        <rect x="80" y="198" width="180" height="8" rx="2" fill="#141F38" fillOpacity="0.15" />
        <rect x="80" y="216" width="150" height="8" rx="2" fill="#141F38" fillOpacity="0.15" />
        <circle cx="285" cy="260" r="22" fill="none" stroke="#141F38" strokeOpacity="0.15" strokeDasharray="3 3" />
      </g>
      {/* front pass, most detail */}
      <g>
        <rect x="45" y="120" width="290" height="170" rx="6" fill="#141F38" />
        <rect x="45" y="120" width="290" height="170" rx="6" stroke="#B3872E" strokeOpacity="0.4" />
        <text x="72" y="158" fontFamily="Fraunces, serif" fontSize="20" fill="#EFF1EC">
          Spring Tech Fest
        </text>
        <text x="72" y="182" fontFamily="Libre Franklin, sans-serif" fontSize="12" fill="#EFF1EC" fillOpacity="0.6">
          Main Auditorium · 18 Apr
        </text>
        <line x1="72" y1="200" x2="308" y2="200" stroke="#EFF1EC" strokeOpacity="0.15" />
        <text x="72" y="226" fontFamily="Libre Franklin, sans-serif" fontSize="11" fill="#EFF1EC" fillOpacity="0.5">
          ATTENDEE
        </text>
        <text x="72" y="246" fontFamily="Libre Franklin, sans-serif" fontSize="15" fill="#EFF1EC">
          Asha Rao
        </text>
        <g transform="translate(255,205)">
          <rect width="56" height="56" rx="4" fill="#EFF1EC" />
          <g fill="#141F38">
            <rect x="8" y="8" width="8" height="8" />
            <rect x="20" y="8" width="4" height="8" />
            <rect x="32" y="8" width="12" height="8" />
            <rect x="8" y="20" width="4" height="4" />
            <rect x="16" y="20" width="8" height="4" />
            <rect x="32" y="20" width="4" height="12" />
            <rect x="8" y="32" width="12" height="4" />
            <rect x="24" y="32" width="4" height="12" />
            <rect x="36" y="36" width="8" height="8" />
            <rect x="8" y="40" width="8" height="8" />
          </g>
        </g>
        <circle cx="45" cy="240" r="9" fill="#EFF1EC" />
        <circle cx="335" cy="240" r="9" fill="#EFF1EC" />
      </g>
    </svg>
  );
}
