import Link from "next/link"
import Image from "next/image"

export function MainNav() {
  return (
    <div className="flex items-center">
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <Image 
          src="/capybara-svgrepo-com.svg" 
          alt="Kapioo Logo" 
          width={32} 
          height={32} 
          className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" 
        />
        <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]/80 text-xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
      </Link>
    </div>
  )
}

