import Link from "next/link"
import Image from "next/image"

export function MainNav() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <Image 
          src="/未命名設計.png" 
          alt="Kapioo Logo" 
          width={32} 
          height={32} 
          className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" 
        />
        <span className="font-bold text-[#C2884E] text-xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
      </Link>
    </div>
  )
}

