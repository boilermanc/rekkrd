interface DiscogsIconProps {
  size?: number;
  className?: string;
}

export default function DiscogsIcon({ size = 20, className }: DiscogsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 19.2A7.2 7.2 0 014.8 12 7.2 7.2 0 0112 4.8a7.2 7.2 0 017.2 7.2 7.2 7.2 0 01-7.2 7.2zm0-12A4.8 4.8 0 007.2 12a4.8 4.8 0 004.8 4.8 4.8 4.8 0 004.8-4.8A4.8 4.8 0 0012 7.2zm0 7.2a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8z" />
    </svg>
  );
}
