import { Header } from "@/components/header"
import { ReportsDashboard } from "@/components/reports/dashboard"

export const metadata = {
  title: "Reports & Analytics | InventAssist by Nexenovate Ltd",
  description: "View reports and analytics for your inventory with InventAssist",
}

export default function ReportsPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto py-6 px-4 flex-1">
        <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
        <ReportsDashboard />
      </main>
    </>
  )
}

