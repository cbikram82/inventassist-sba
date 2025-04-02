import Image from "next/image"
import { MainNav } from "./nav"

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/inventassist-logo.png"
                alt="InventAssist Logo"
                width={80}
                height={80}
                className="object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold">InventAssist</h1>
                <p className="text-sm text-muted-foreground">powered by Nexenovate Ltd</p>
              </div>
            </div>
            <div className="h-10 border-l mx-2 hidden md:block"></div>
            <div className="hidden md:flex flex-col items-center">
              <Image
                src="/sba-logo.png"
                alt="Sutton Bengali Association Logo"
                width={60}
                height={60}
                className="object-contain"
              />
              <p className="text-xs text-muted-foreground mt-1">Sutton Bengali Association Inventory</p>
            </div>
          </div>
          <MainNav />
        </div>
      </div>
    </header>
  )
}

