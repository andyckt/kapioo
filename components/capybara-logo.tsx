function CapybaraLogo({ size = "default", animated = true }) {
  const sizes = {
    small: "h-4 w-4",
    default: "h-6 w-6",
    large: "h-8 w-8",
  }

  const animationClass = animated ? "animate-spin" : ""

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${sizes[size] || sizes.default} ${animationClass}`}
    >
      <path d="M8 6s-2 0-2 2v4c0 2 2 2 2 2" />
      <path d="M16 6s2 0 2 2v4c0 2-2 2-2 2" />
      <path d="M4 14h16" />
      <path d="M6 18h.01" />
      <path d="M18 18h.01" />
      <path d="M6 6h1.5a2.5 2.5 0 0 1 0 5H6" />
      <path d="M18 6h-1.5a2.5 2.5 0 0 0 0 5H18" />
    </svg>
  )
}

export { CapybaraLogo }

