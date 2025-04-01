import { Header } from "@/components/header"
import { DashboardOverview } from "@/components/dashboard-overview"

export default function Home() {
  return (
    <>
      <Header />
      <main className="container mx-auto py-6 px-4 flex-1">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid gap-6">
          <DashboardOverview />
        </div>
      </main>
    </>
  )
}

