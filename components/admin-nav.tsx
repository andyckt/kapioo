import Link from "next/link"

export function AdminNav() {
  return (
    <div className="flex items-center space-x-4 lg:space-x-6">
      <Link href="/admin" className="flex items-center">
        <span className="font-bold text-xl">Kapioo Admin</span>
      </Link>
    </div>
  )
}

