// Original flat illustration for the dashboard greeting banner (decorative only).
// Floating props bob gently via `motion-safe:animate-float`; static under reduced motion.

const float = 'motion-safe:animate-float'

export function ClinicianIllustration({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 340 200" className={className} aria-hidden="true" focusable="false">
      {/* ── Floating props ─────────────────────────────────────────── */}
      {/* Capsule */}
      <g className={float} style={{ animationDelay: '0s' }}>
        <g transform="translate(40 120) rotate(-35)">
          <rect width="34" height="14" rx="7" fill="#FFFFFF" />
          <rect width="17" height="14" rx="7" fill="#C3D0F6" />
          <rect x="10" width="7" height="14" fill="#C3D0F6" />
        </g>
      </g>
      {/* Medicine bottle */}
      <g className={float} style={{ animationDelay: '1.2s' }}>
        <g transform="translate(268 70) rotate(12)">
          <rect x="4" y="0" width="22" height="8" rx="2" fill="#263566" />
          <rect x="0" y="7" width="30" height="40" rx="6" fill="#FFFFFF" />
          <rect x="0" y="18" width="30" height="16" fill="#E4EAFB" />
          <path d="M15 21v10M10 26h10" stroke="#1FA98F" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      {/* Lab flask */}
      <g className={float} style={{ animationDelay: '2.1s' }}>
        <g transform="translate(64 34) rotate(-10)">
          <path d="M8 0h12M11 0v14L2 32a4 4 0 0 0 3.5 6h17a4 4 0 0 0 3.5-6L17 14V0" fill="#FFFFFF" />
          <path d="M5 28h18l2.5 4a3 3 0 0 1-2.6 4.5H5.1A3 3 0 0 1 2.5 32Z" fill="#F26D6D" />
        </g>
      </g>
      {/* Cross badge */}
      <g className={float} style={{ animationDelay: '0.6s' }}>
        <circle cx="300" cy="28" r="13" fill="#1FA98F" />
        <path d="M300 21v14M293 28h14" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      {/* Mug */}
      <g className={float} style={{ animationDelay: '1.7s' }}>
        <g transform="translate(276 140)">
          <rect width="26" height="28" rx="5" fill="#FFFFFF" />
          <path d="M26 7h4a6 6 0 0 1 0 12h-4" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M8 -4c0-4 4-4 4-8M15 -4c0-4 4-4 4-8" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </g>
      {/* Sparkle dots */}
      <circle cx="110" cy="22" r="4" fill="#FFFFFF" fillOpacity=".55" />
      <circle cx="236" cy="18" r="3" fill="#FFFFFF" fillOpacity=".45" />
      <circle cx="226" cy="176" r="4" fill="#FFFFFF" fillOpacity=".35" />

      {/* ── Clinician (cropped at the banner's bottom edge) ─────────── */}
      <g transform="translate(170 0)">
        {/* Coat */}
        <path d="M-62 200c2-44 18-66 62-72 44 6 60 28 62 72Z" fill="#FFFFFF" />
        {/* Scrubs V-neck */}
        <path d="M-17 129 0 158l17-29c-6-2-11-3-17-3s-11 1-17 3Z" fill="#1FA98F" />
        {/* Lapels */}
        <path d="M-20 128-4 170-30 150Z M20 128 4 170 30 150Z" fill="#E4EAFB" />
        {/* Neck */}
        <rect x="-9" y="104" width="18" height="24" rx="6" fill="#E9AE8A" />
        {/* Head */}
        <circle cx="0" cy="82" r="28" fill="#F2C2A0" />
        <circle cx="-28" cy="86" r="6" fill="#F2C2A0" />
        <circle cx="28" cy="86" r="6" fill="#F2C2A0" />
        {/* Hair */}
        <path d="M-29 80c-4-30 18-42 36-38 18 3 28 16 22 38-3-12-12-18-24-19-12 8-24 9-34 19Z" fill="#263566" />
        {/* Face */}
        <circle cx="-10" cy="86" r="2.6" fill="#263566" />
        <circle cx="10" cy="86" r="2.6" fill="#263566" />
        <path d="M-8 97q8 6 16 0" stroke="#B5643F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="-17" cy="94" r="4" fill="#F26D6D" fillOpacity=".25" />
        <circle cx="17" cy="94" r="4" fill="#F26D6D" fillOpacity=".25" />
        {/* Stethoscope */}
        <path d="M-15 126c-6 18-4 34 8 40M15 126c6 18 4 34-8 40" stroke="#263566" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-7 166c4 4 10 4 14 0" stroke="#263566" strokeWidth="3" fill="none" />
        <circle cx="0" cy="176" r="6" fill="#9DB1EF" stroke="#263566" strokeWidth="3" />
        {/* Crossed arms */}
        <path d="M-48 168c18-8 58-10 92-2 6 2 6 14 0 16-34 8-74 6-92-2-6-3-6-10 0-12Z" fill="#F5F7FD" />
        <path d="M-40 172c26 6 50 6 76 0" stroke="#C3D0F6" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="-46" cy="176" r="7" fill="#F2C2A0" />
        <circle cx="46" cy="174" r="7" fill="#F2C2A0" />
      </g>
    </svg>
  )
}
