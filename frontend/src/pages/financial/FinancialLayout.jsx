import { Outlet, useOutletContext } from 'react-router-dom'

export default function FinancialLayout() {
  const outletContext = useOutletContext()

  return (
    <div className="animate-fade-up">
      <div className="mx-auto max-w-[1200px]">
        <Outlet context={outletContext} />
      </div>
    </div>
  )
}
