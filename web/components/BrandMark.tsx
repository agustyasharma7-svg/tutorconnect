export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="9" fill="#1E4FD7" />
      <path
        d="M8 11.5c0-.8.5-1.2 1.4-1.5L16 8.2l6.6 1.8c.9.3 1.4.7 1.4 1.5v7.2c0 3.2-3.4 5.2-8 6.6-4.6-1.4-8-3.4-8-6.6V11.5Z"
        fill="#EAF0FF"
      />
      <path
        d="M12.2 16.1 14.6 18.4 19.8 13.4"
        stroke="#1E4FD7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
