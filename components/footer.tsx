import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
          <p className="flex items-center gap-1">
            <span className="font-medium text-inventassist-orange">InventAssist</span> by Nexenovate Ltd
          </p>
          <div className="hidden md:block h-4 border-l"></div>
          <p className="flex items-center gap-1">Customized for Sutton Bengali Association</p>
        </div>
        <div className="mt-2 flex flex-col items-center md:hidden">
          <Image
            src="/sba-logo.png"
            alt="Sutton Bengali Association Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <p className="text-xs mt-1">Sutton Bengali Association Inventory</p>
        </div>
        <p className="mt-3 text-xs">© 2025 Nexenovate Ltd. All rights reserved.</p>
      </div>
    </footer>
  )
}

