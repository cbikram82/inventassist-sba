import { Inventory } from "@/components/inventory"

export default function DashboardPage() {
  return (
    <div className="container py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your inventory management dashboard
          </p>
        </div>

        <Inventory />
      </div>
    </div>
  )
} 