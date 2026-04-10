export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1d1c17] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e6ab35] rounded-2xl mb-4">
            <svg className="w-8 h-8 text-[#1d1c17]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#e6ab35]">SkyGlobal CRM</h1>
          <p className="text-[#9a9585] text-sm mt-1">SkyGlobal Renovations</p>
        </div>
        <div className="bg-[#252419] border border-[#2e2d26] rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
