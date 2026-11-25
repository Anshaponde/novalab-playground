import React from "react";

export function NovaLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="novalab-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="52%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="url(#novalab-grad)"
        fillOpacity="0.14"
        stroke="url(#novalab-grad)"
        strokeWidth="1.75"
      />
      <path
        d="M20 8L28.5 14V26L20 32L11.5 26V14L20 8Z"
        stroke="url(#novalab-grad)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 13.5L22.2 17.8L26.5 20L22.2 22.2L20 26.5L17.8 22.2L13.5 20L17.8 17.8L20 13.5Z"
        fill="url(#novalab-grad)"
      />
    </svg>
  );
}
