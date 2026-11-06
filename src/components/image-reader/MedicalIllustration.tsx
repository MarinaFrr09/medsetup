import React from "react";

export type IllustrationType =
  | "heart"
  | "brain"
  | "lungs"
  | "kidney"
  | "digestive"
  | "liver"
  | "bacteria"
  | "stethoscope"
  | "patient_pain"
  | "medication"
  | "general";

interface MedicalIllustrationProps {
  type?: IllustrationType | string;
  className?: string;
  size?: number;
  color?: string;
}

export default function MedicalIllustration({
  type = "general",
  className = "",
  size = 110,
  color = "#7C2D3E",
}: MedicalIllustrationProps) {
  const normType = (type || "").toLowerCase().trim();

  // 1. BRAIN / HEADACHE / NEUROLOGY
  if (normType.includes("brain") || normType.includes("cerebr") || normType.includes("cefale") || normType.includes("neuro")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FDF2F2" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Silhouette profile */}
        <path
          d="M32 98C32 98 34 82 42 76C44 74 42 66 42 60C38 58 36 50 38 42C40 34 46 22 62 20C78 18 90 26 92 40C94 54 88 64 84 68C82 72 84 80 88 98"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Brain hemisphere gyri */}
        <path
          d="M52 28C56 24 68 22 76 26C84 30 86 38 84 46C82 52 74 56 68 54C62 52 60 44 56 42C52 40 48 46 52 52C56 58 66 60 74 62"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M60 34C64 36 70 34 74 38C78 42 76 48 70 48"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Pain / migraine focus flash */}
        <circle cx="78" cy="38" r="8" fill="#EF4444" opacity="0.2" />
        <circle cx="78" cy="38" r="4" fill="#DC2626" opacity="0.6" />
        <line x1="78" y1="24" x2="78" y2="28" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        <line x1="92" y1="38" x2="88" y2="38" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        <line x1="88" y1="28" x2="85" y2="31" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 2. LUNGS / RESPIRATORY / DISPNEIA / PULMONAR
  if (normType.includes("lung") || normType.includes("pulm") || normType.includes("dispne") || normType.includes("respirat")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#F0FDF4" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Trachea */}
        <path d="M57 18V44M63 18V44" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="57" y1="24" x2="63" y2="24" stroke="#065F46" strokeWidth="1.5" />
        <line x1="57" y1="30" x2="63" y2="30" stroke="#065F46" strokeWidth="1.5" />
        <line x1="57" y1="36" x2="63" y2="36" stroke="#065F46" strokeWidth="1.5" />
        {/* Left Bronchus and Lung */}
        <path
          d="M57 44C50 48 42 54 36 64C28 76 30 92 44 98C52 102 58 92 58 82C58 72 56 50 57 44Z"
          fill="#D1FAE5"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Right Bronchus and Lung */}
        <path
          d="M63 44C70 48 78 54 84 64C92 76 90 92 76 98C68 102 62 92 62 82C62 72 64 50 63 44Z"
          fill="#D1FAE5"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Bronchial Tree branches */}
        <path d="M57 44L46 62M46 62L40 76M46 62L52 74" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M63 44L74 62M74 62L80 76M74 62L68 74" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // 3. HEART / CARDIO / VASCULAR / PRESSAO / CHOQUE
  if (normType.includes("heart") || normType.includes("card") || normType.includes("vasc") || normType.includes("arter") || normType.includes("choque")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Aorta Arch */}
        <path
          d="M52 36C52 24 68 20 74 28C78 34 76 42 74 46"
          stroke="#DC2626"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M62 21V15M69 22V15M75 27V18" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
        {/* Vena Cava (blue) */}
        <path d="M42 26V44" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
        {/* Ventricles / Main Body */}
        <path
          d="M44 46C34 50 30 62 36 74C42 86 58 100 64 104C70 100 86 86 92 74C98 62 92 50 82 46C74 44 68 48 64 52C60 48 52 44 44 46Z"
          fill="#FEE2E2"
          stroke="#DC2626"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Coronary artery branches */}
        <path
          d="M62 54C58 64 52 74 48 84M54 70L46 72M58 64C64 72 70 82 72 90M66 76L74 78"
          stroke="#B91C1C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Small ECG pulse accent */}
        <path
          d="M26 62H32L35 56L39 70L43 58L46 62H52"
          stroke="#DC2626"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      </svg>
    );
  }

  // 4. KIDNEYS / RENAL / URINARIO
  if (normType.includes("kidney") || normType.includes("rim") || normType.includes("urin") || normType.includes("nefro")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Left Kidney */}
        <path
          d="M40 34C50 34 54 44 48 56C42 66 52 82 42 84C32 86 24 76 26 60C28 44 32 34 40 34Z"
          fill="#DBEAFE"
          stroke="#1D4ED8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Right Kidney */}
        <path
          d="M80 34C70 34 66 44 72 56C78 66 68 82 78 84C88 86 96 76 94 60C92 44 88 34 80 34Z"
          fill="#DBEAFE"
          stroke="#1D4ED8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Ureters to Bladder */}
        <path d="M48 58C52 68 56 86 58 100" stroke="#EAB308" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M72 58C68 68 64 86 62 100" stroke="#EAB308" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="60" cy="102" rx="8" ry="5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
      </svg>
    );
  }

  // 5. BACTERIA / INFECTION / SEPSE / MICROBIOLOGIA
  if (normType.includes("bacter") || normType.includes("seps") || normType.includes("infec") || normType.includes("microb") || normType.includes("virus")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FDF4FF" stroke="#9333EA" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Bacillus body */}
        <rect
          x="36"
          y="42"
          width="48"
          height="36"
          rx="18"
          fill="#F3E8FF"
          stroke="#7E22CE"
          strokeWidth="2.5"
        />
        {/* Flagella / Cilia around */}
        <path d="M38 42L28 32M48 38L44 26M60 38L60 24M72 38L76 26M82 42L92 32" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        <path d="M38 78L28 88M48 82L44 94M60 82L60 96M72 82L76 94M82 78L92 88" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        <path d="M34 60L20 60M86 60L100 60" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        {/* Internal nucleoid / plasmid */}
        <path
          d="M48 58C52 52 56 66 62 60C68 54 70 64 72 58"
          stroke="#7E22CE"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="50" cy="66" r="2.5" fill="#7E22CE" />
        <circle cx="70" cy="52" r="2.5" fill="#7E22CE" />
      </svg>
    );
  }

  // 6. PATIENT / CLINICAL EXAMINATION / SEMIOLOGIA / DOR
  if (normType.includes("patient") || normType.includes("paciente") || normType.includes("dor") || normType.includes("semiol") || normType.includes("clinico")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Doctor / Patient figure */}
        <circle cx="60" cy="38" r="14" fill="#FEF3C7" stroke="#B45309" strokeWidth="2.5" />
        <path
          d="M36 86C36 72 46 62 60 62C74 62 84 72 84 86V96H36V86Z"
          fill="#FEF3C7"
          stroke="#B45309"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Stethoscope around neck */}
        <path
          d="M50 62V74C50 80 56 84 60 84C64 84 70 80 70 74V62"
          stroke="#1E40AF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="88" r="4.5" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" />
        {/* Pulse / Vital signs spark */}
        <path
          d="M20 98H28L31 92L35 104L38 94L42 98H48"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 7. CELLS LAYER / EPITÉLIO / CÉLULAS BASAIS
  if (normType.includes("cells") || normType.includes("epitel") || normType.includes("basal") || normType.includes("camadas")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FDF2F8" stroke="#F43F5E" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Superficial layer cells */}
        <rect x="24" y="32" width="18" height="12" rx="3" fill="#FCE7F3" stroke="#F43F5E" strokeWidth="1.5" />
        <circle cx="33" cy="38" r="2" fill="#BE123C" />
        <rect x="44" y="32" width="18" height="12" rx="3" fill="#FCE7F3" stroke="#F43F5E" strokeWidth="1.5" />
        <circle cx="53" cy="38" r="2" fill="#BE123C" />
        <rect x="64" y="32" width="18" height="12" rx="3" fill="#FCE7F3" stroke="#F43F5E" strokeWidth="1.5" />
        <circle cx="73" cy="38" r="2" fill="#BE123C" />
        <rect x="84" y="32" width="18" height="12" rx="3" fill="#FCE7F3" stroke="#F43F5E" strokeWidth="1.5" />
        <circle cx="93" cy="38" r="2" fill="#BE123C" />

        {/* Intermediate layer cells */}
        <rect x="20" y="46" width="20" height="14" rx="4" fill="#FDF2F8" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="30" cy="53" r="2.5" fill="#BE123C" />
        <rect x="42" y="46" width="20" height="14" rx="4" fill="#FDF2F8" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="52" cy="53" r="2.5" fill="#BE123C" />
        <rect x="64" y="46" width="20" height="14" rx="4" fill="#FDF2F8" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="74" cy="53" r="2.5" fill="#BE123C" />
        <rect x="86" y="46" width="20" height="14" rx="4" fill="#FDF2F8" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="96" cy="53" r="2.5" fill="#BE123C" />

        {/* Parabasal layer */}
        <rect x="22" y="62" width="22" height="15" rx="4" fill="#FCE7F3" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="33" cy="69.5" r="3" fill="#BE123C" />
        <rect x="46" y="62" width="22" height="15" rx="4" fill="#FCE7F3" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="57" cy="69.5" r="3" fill="#BE123C" />
        <rect x="70" y="62" width="22" height="15" rx="4" fill="#FCE7F3" stroke="#E11D48" strokeWidth="1.5" />
        <circle cx="81" cy="69.5" r="3" fill="#BE123C" />

        {/* Basal layer with infection highlighted */}
        <rect x="24" y="79" width="20" height="18" rx="5" fill="#F3E8FF" stroke="#A855F7" strokeWidth="2" />
        <circle cx="34" cy="88" r="4.5" fill="#9333EA" />
        <rect x="46" y="79" width="22" height="18" rx="5" fill="#C084FC" stroke="#7E22CE" strokeWidth="2.5" />
        <circle cx="57" cy="88" r="5" fill="#581C87" />
        <rect x="70" y="79" width="20" height="18" rx="5" fill="#F3E8FF" stroke="#A855F7" strokeWidth="2" />
        <circle cx="80" cy="88" r="4.5" fill="#9333EA" />

        {/* Virion penetrating into basal cell */}
        <circle cx="98" cy="30" r="5.5" fill="#EC4899" stroke="#BE185D" strokeWidth="1.5" />
        <path d="M98 21V23M98 37V39M89 30H91M105 30H107" stroke="#BE185D" strokeWidth="1.5" strokeLinecap="round" />
        {/* Arrow path into basal layer */}
        <path d="M96 36C90 46 80 58 64 78" stroke="#EC4899" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />
        <path d="M63 73L64 78L69 77" stroke="#EC4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 8. DNA DOUBLE HELIX
  if (normType.includes("dna") || normType.includes("genetic") || normType.includes("genoma")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* DNA Strands */}
        <path
          d="M36 24C46 36 74 44 84 60C94 76 66 84 56 96"
          stroke="#7C3AED"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M84 24C74 36 46 44 36 60C26 76 54 84 64 96"
          stroke="#EC4899"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Base Pairs (rungs) */}
        <line x1="42" y1="30" x2="78" y2="30" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="42" x2="70" y2="42" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="60" r="3" fill="#6D28D9" />
        <line x1="50" y1="78" x2="70" y2="78" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="90" x2="78" y2="90" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 9. VIRUS / HPV PARTICLE
  if (normType.includes("virus") || normType.includes("hpv") || normType.includes("virion")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#FFF1F2" stroke="#F43F5E" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Core Capsid */}
        <circle cx="60" cy="60" r="26" fill="#FFE4E6" stroke="#E11D48" strokeWidth="3" />
        <circle cx="60" cy="60" r="16" fill="#FDA4AF" stroke="#BE123C" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="60" cy="60" r="7" fill="#9F1239" />
        {/* Spikes / Capsomers */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 60 + 26 * Math.cos(rad);
          const y1 = 60 + 26 * Math.sin(rad);
          const x2 = 60 + 36 * Math.cos(rad);
          const y2 = 60 + 36 * Math.sin(rad);
          const x3 = 60 + 40 * Math.cos(rad);
          const y3 = 60 + 40 * Math.sin(rad);
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
              <circle cx={x3} cy={y3} r="3" fill="#BE123C" />
            </g>
          );
        })}
      </svg>
    );
  }

  // 10. MICROSCOPE / CITOLOGIA / PAPANICOLAU
  if (normType.includes("microscop") || normType.includes("citolog") || normType.includes("papanicolau")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-sm ${className}`}
      >
        <circle cx="60" cy="60" r="54" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        {/* Base */}
        <path d="M34 100H86V94C86 90 80 88 60 88C40 88 34 90 34 94V100Z" fill="#BAE6FD" stroke="#0369A1" strokeWidth="2.5" />
        {/* Curved Arm */}
        <path d="M72 88C82 82 88 68 84 50C80 34 68 28 64 28" stroke="#0369A1" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Eyepiece tube */}
        <line x1="46" y1="26" x2="62" y2="42" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" />
        <line x1="40" y1="20" x2="48" y2="28" stroke="#0369A1" strokeWidth="7" strokeLinecap="round" />
        {/* Objective revolving turret */}
        <circle cx="64" cy="46" r="6" fill="#0369A1" />
        <line x1="64" y1="46" x2="60" y2="58" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
        {/* Stage platform */}
        <line x1="42" y1="68" x2="78" y2="68" stroke="#0369A1" strokeWidth="3" strokeLinecap="round" />
        {/* Specimen slide with stain dot */}
        <line x1="48" y1="65" x2="72" y2="65" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="65" r="2.5" fill="#E11D48" />
      </svg>
    );
  }

  // 11. DEFAULT: STETHOSCOPE & CADUCEUS EMBLEM
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none drop-shadow-sm ${className}`}
    >
      <circle cx="60" cy="60" r="54" fill="#F8FAFC" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      {/* Caduceus / Medical staff */}
      <line x1="60" y1="22" x2="60" y2="98" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="20" r="5" fill={color} />
      {/* Twin serpents winding */}
      <path
        d="M48 38C56 34 64 34 72 38C80 44 76 54 68 58C60 62 52 68 60 76C68 84 74 80 76 74"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M72 38C64 34 56 34 48 38C40 44 44 54 52 58C60 62 68 68 60 76C52 84 46 80 44 74"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  );
}
