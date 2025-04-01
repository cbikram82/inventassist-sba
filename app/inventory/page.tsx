import { Header } from "@/components/header"
import { Inventory } from "@/components/inventory"

export const metadata = {
  title: "Inventory | InventAssist by Nexenovate Ltd",
  description: "Manage your inventory items with InventAssist",
}

export default function InventoryPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto py-6 px-4 flex-1">
        <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>
        <Inventory />
      </main>
    </>
  )
}

