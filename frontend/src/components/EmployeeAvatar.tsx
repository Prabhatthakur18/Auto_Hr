import React from 'react';
import { resolveAssetUrl } from '../utils/assetUrl';

interface EmployeeAvatarProps {
  name: string;
  avatar?: string | null;
  gender?: string | null;
  /** Tailwind size class for width/height, e.g. "w-12 h-12" */
  size?: string;
  /** Extra class names for the container */
  className?: string;
  /** Shape: 'rounded' (rounded-2xl) or 'circle' (rounded-full) */
  shape?: 'rounded' | 'circle';
}

// ── Gender-based SVG Cliparts ──────────────────────────────────

const MaleClipart: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect width="80" height="80" rx="16" fill="#EFF6FF" />
    {/* Head */}
    <ellipse cx="40" cy="27" rx="14" ry="15" fill="#FDE68A" />
    {/* Hair */}
    <ellipse cx="40" cy="14" rx="14" ry="7" fill="#78350F" />
    <rect x="26" y="12" width="28" height="9" rx="4" fill="#78350F" />
    {/* Ears */}
    <ellipse cx="26" cy="27" rx="3.5" ry="4.5" fill="#FDE68A" />
    <ellipse cx="54" cy="27" rx="3.5" ry="4.5" fill="#FDE68A" />
    {/* Eyes */}
    <ellipse cx="34" cy="26" rx="2.5" ry="2.5" fill="#1E3A5F" />
    <ellipse cx="46" cy="26" rx="2.5" ry="2.5" fill="#1E3A5F" />
    {/* Smile */}
    <path d="M34 34 Q40 39 46 34" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Collar / Shirt */}
    <path d="M26 52 Q27 44 33 42 L40 45 L47 42 Q53 44 54 52 L56 72 H24 Z" fill="#2563EB" />
    {/* Shirt collar */}
    <path d="M33 42 L40 50 L47 42" stroke="#1D4ED8" strokeWidth="1.5" fill="none" />
    {/* Neck */}
    <rect x="36" y="40" width="8" height="6" rx="2" fill="#FDE68A" />
  </svg>
);

const FemaleClipart: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect width="80" height="80" rx="16" fill="#FFF1F2" />
    {/* Hair back */}
    <ellipse cx="40" cy="28" rx="17" ry="19" fill="#92400E" />
    {/* Head */}
    <ellipse cx="40" cy="27" rx="13" ry="14" fill="#FDE68A" />
    {/* Hair top */}
    <ellipse cx="40" cy="14" rx="13" ry="7" fill="#92400E" />
    {/* Ears */}
    <ellipse cx="27" cy="27" rx="3" ry="4" fill="#FDE68A" />
    <ellipse cx="53" cy="27" rx="3" ry="4" fill="#FDE68A" />
    {/* Earrings */}
    <circle cx="27" cy="31" r="1.5" fill="#F59E0B" />
    <circle cx="53" cy="31" r="1.5" fill="#F59E0B" />
    {/* Eyes */}
    <ellipse cx="35" cy="26" rx="2.2" ry="2.2" fill="#1E3A5F" />
    <ellipse cx="45" cy="26" rx="2.2" ry="2.2" fill="#1E3A5F" />
    {/* Lashes */}
    <path d="M33 24 L31 22" stroke="#1E3A5F" strokeWidth="1" strokeLinecap="round" />
    <path d="M35 23 L34 21" stroke="#1E3A5F" strokeWidth="1" strokeLinecap="round" />
    <path d="M43 23 L42 21" stroke="#1E3A5F" strokeWidth="1" strokeLinecap="round" />
    <path d="M45 24 L47 22" stroke="#1E3A5F" strokeWidth="1" strokeLinecap="round" />
    {/* Lips */}
    <path d="M36 34 Q40 38 44 34" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Neck */}
    <rect x="37" y="39" width="6" height="6" rx="2" fill="#FDE68A" />
    {/* Dress */}
    <path d="M22 53 Q24 44 32 42 L40 47 L48 42 Q56 44 58 53 L62 72 H18 Z" fill="#EC4899" />
    {/* Dress neckline */}
    <path d="M32 42 L40 50 L48 42" stroke="#DB2777" strokeWidth="1.5" fill="none" />
  </svg>
);

const NeutralClipart: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="16" fill="#F0FDF4" />
    {/* Head */}
    <ellipse cx="40" cy="27" rx="14" ry="15" fill="#FDE68A" />
    {/* Hair */}
    <path d="M26 21 Q28 10 40 10 Q52 10 54 21" fill="#6B7280" />
    {/* Ears */}
    <ellipse cx="26" cy="27" rx="3.5" ry="4.5" fill="#FDE68A" />
    <ellipse cx="54" cy="27" rx="3.5" ry="4.5" fill="#FDE68A" />
    {/* Eyes */}
    <ellipse cx="34" cy="26" rx="2.5" ry="2.5" fill="#374151" />
    <ellipse cx="46" cy="26" rx="2.5" ry="2.5" fill="#374151" />
    {/* Mouth */}
    <path d="M35 34 H45" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
    {/* Neck */}
    <rect x="36" y="40" width="8" height="6" rx="2" fill="#FDE68A" />
    {/* Shirt */}
    <path d="M25 53 Q27 44 33 42 L40 46 L47 42 Q53 44 55 53 L57 72 H23 Z" fill="#10B981" />
  </svg>
);

// ── Main Component ─────────────────────────────────────────────

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  name,
  avatar,
  gender,
  size = 'w-12 h-12',
  className = '',
  shape = 'rounded',
}) => {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const avatarSrc = resolveAssetUrl(avatar);

  // 1) Real uploaded avatar image
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={name}
        className={`${size} ${shapeClass} object-cover flex-shrink-0 shadow-md ${className}`}
      />
    );
  }

  // 2) Gender-based SVG clipart
  const svgClass = `${size} ${shapeClass} flex-shrink-0 ${className}`;
  if (gender === 'Male') return <MaleClipart className={svgClass} />;
  if (gender === 'Female') return <FemaleClipart className={svgClass} />;
  if (gender === 'Other') return <NeutralClipart className={svgClass} />;

  // 3) Initials fallback
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${size} ${shapeClass} bg-gradient-to-br from-orange-400 to-[#f46617] flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20 flex-shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
};

export default EmployeeAvatar;
