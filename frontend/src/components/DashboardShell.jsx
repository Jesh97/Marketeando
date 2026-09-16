import Sidebar from './Sidebar'

function DashboardShell({ children }) {
  return (
    <div className="flex min-h-svh bg-[#F6F8FC] text-[#0B1C30]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-6 py-9 sm:px-8 sm:py-11">{children}</main>
    </div>
  )
}

export default DashboardShell
