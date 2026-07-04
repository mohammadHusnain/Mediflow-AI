/* src/shared/components/Sidebar.jsx - Renders the blue portal navigation. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@shared/context/AuthContext'
import { usePermission } from '@shared/lib/usePermission'
import { stagger } from '@shared/lib/motion'
import { getNavItems } from '@shared/lib/navItems'
import { getCriticalAlerts } from '@shared/services/postTreatmentApi'
import Avatar from './Avatar'
import UnreadBadge from './chat/UnreadBadge'

function LogoMark() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 18V6L9.8 12L12 9.7L14.2 12L20 6V18H16.8V13.7L12 18.3L7.2 13.7V18H4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function matchesItemPath(item, pathname) {
  const candidatePaths = Array.isArray(item.matchPaths) && item.matchPaths.length > 0
    ? item.matchPaths
    : [item.to]

  return candidatePaths.some((candidatePath) =>
    item.end ? pathname === candidatePath : pathname.startsWith(candidatePath),
  )
}

export function Sidebar({ mobile = false, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const financialRouteActive = location.pathname.startsWith('/financial-reports')
  const { logout, role, user } = useAuth()
  const permissions = usePermission()
  const itemRefs = useRef({})
  const [activeStyle, setActiveStyle] = useState({ opacity: 0, transform: '' })
  const [isFinancialOpen, setIsFinancialOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      return financialRouteActive || sessionStorage.getItem('sidebar_financial_open') === 'true'
    } catch {
      return financialRouteActive
    }
  })
  const [pendingAlertCount, setPendingAlertCount] = useState(0)
  const alertBadgeCount = ['admin', 'doctor', 'receptionist'].includes(role?.slug)
    ? pendingAlertCount
    : 0
  const financialOpen = financialRouteActive || isFinancialOpen
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    'MediFlow User'
  const roleLabel = role?.name || 'User'
  const visibleNavItems = useMemo(
    () => getNavItems({ ...permissions, user }),
    [permissions, user],
  )

  useEffect(() => {
    const activeItem = visibleNavItems.find((item) =>
      matchesItemPath(item, location.pathname),
    )
    const activeElement = activeItem ? itemRefs.current[activeItem.to] : null

    if (!activeElement) {
      setActiveStyle((currentStyle) =>
        currentStyle.opacity === 0 && currentStyle.transform === ''
          ? currentStyle
          : { opacity: 0, transform: '' },
      )
      return
    }

    const nextStyle = {
      height: `${activeElement.offsetHeight}px`,
      opacity: 1,
      transform: `translateY(${activeElement.offsetTop}px)`,
    }

    setActiveStyle((currentStyle) =>
      currentStyle.height === nextStyle.height &&
      currentStyle.opacity === nextStyle.opacity &&
      currentStyle.transform === nextStyle.transform
        ? currentStyle
        : nextStyle,
    )
  }, [location.pathname, visibleNavItems])

  useEffect(() => {
    try {
      sessionStorage.setItem('sidebar_financial_open', String(isFinancialOpen))
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  }, [isFinancialOpen])

  useEffect(() => {
    const canViewCriticalAlerts = ['admin', 'doctor', 'receptionist'].includes(role?.slug)

    if (!canViewCriticalAlerts) {
      return undefined
    }

    let cancelled = false

    async function loadPendingAlertCount() {
      try {
        const response = await getCriticalAlerts({
          page: 1,
          page_size: 1,
          status: 'pending',
        })
        const count = Number.isFinite(Number(response?.count))
          ? Number(response.count)
          : Array.isArray(response)
            ? response.length
            : Array.isArray(response?.results)
              ? response.results.length
              : 0

        if (!cancelled) {
          setPendingAlertCount(count)
        }
      } catch {
        if (!cancelled) {
          setPendingAlertCount(0)
        }
      }
    }

    loadPendingAlertCount()
    const intervalId = window.setInterval(loadPendingAlertCount, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [role?.slug])

  function handleLogout() {
    logout()
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={[
        'flex flex-col border-r border-hairline bg-brand-light text-ink shadow-[inset_-1px_0_0_rgba(20,24,31,0.05)]',
        mobile
          ? 'h-full w-full'
          : 'fixed left-0 top-0 z-30 hidden h-screen w-[64px] animate-slide-right md:flex lg:w-[240px]',
      ].join(' ')}
    >
      <div className="flex h-[72px] items-center gap-3 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
          <LogoMark />
        </div>
        <div className={mobile ? 'min-w-0' : 'hidden min-w-0 lg:block'}>
          <p className="truncate text-[18px] font-bold leading-6 text-ink">
            MediFlow
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">
            {user?.organization_name || 'Clinic workspace'}
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-brand/10" />

      <nav className="relative flex-1 overflow-y-auto px-3 py-3">
        <div
          aria-hidden="true"
          className="absolute left-3 right-3 rounded-xl bg-canvas shadow-card transition-all duration-200"
          style={activeStyle}
        />
        <div className="relative space-y-1">
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon
            const itemActive = matchesItemPath(item, location.pathname)
            const isCriticalAlertsItem = item.to === '/post-treatment/alerts'

            if (Array.isArray(item.children) && item.children.length > 0) {
              return (
                <div key={item.to} style={stagger(index, 0.04)}>
                  <button
                    aria-expanded={financialOpen}
                    className={[
                      'flex h-[42px] w-full items-center justify-between rounded-xl px-3 text-[14px] transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light',
                      itemActive
                        ? 'font-semibold text-ink'
                        : 'font-semibold text-slate hover:bg-canvas/70 hover:text-ink',
                    ].join(' ')}
                    onClick={() => setIsFinancialOpen((open) => !open)}
                    ref={(element) => {
                      itemRefs.current[item.to] = element
                    }}
                    title={item.label}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                      <span className={mobile ? 'truncate' : 'hidden truncate lg:block'}>
                        {item.label}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={[
                        'h-3.5 w-3.5 shrink-0 text-slate/60 transition-transform',
                        financialOpen ? 'rotate-180' : '',
                        mobile ? '' : 'hidden lg:block',
                      ].join(' ')}
                    />
                  </button>

                  {financialOpen ? (
                    <div className={mobile ? 'mt-0.5 space-y-0.5 pl-9' : 'mt-0.5 hidden space-y-0.5 pl-9 lg:block'}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const childActive = matchesItemPath(child, location.pathname)

                        return (
                          <NavLink
                            className={() =>
                              [
                                'flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] transition-all duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light',
                                childActive
                                  ? 'bg-brand/10 font-semibold text-brand'
                                  : 'font-medium text-slate hover:bg-mist/60 hover:text-ink',
                              ].join(' ')
                            }
                            key={child.to}
                            onClick={onNavigate}
                            title={child.label}
                            to={child.to}
                          >
                            <ChildIcon aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            }

            return (
              <NavLink
                className={() =>
                  [
                    'flex h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light',
                    itemActive
                      ? 'font-semibold text-ink'
                      : 'font-semibold text-slate hover:bg-canvas/70 hover:text-ink',
                  ].join(' ')
                }
                end={item.end}
                key={item.to}
                onClick={onNavigate}
                ref={(element) => {
                  itemRefs.current[item.to] = element
                }}
                style={stagger(index, 0.04)}
                title={item.label}
                to={item.to}
              >
                <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                <span className={mobile ? 'truncate' : 'hidden truncate lg:block'}>
                  {item.label}
                </span>
                {isCriticalAlertsItem ? (
                  <UnreadBadge count={alertBadgeCount} />
                ) : null}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="px-3 pb-4">
        <div className="mb-3 h-px bg-brand/10" />
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={fullName} online size="sm" />
          <div className={mobile ? 'min-w-0' : 'hidden min-w-0 lg:block'}>
            <p className="truncate text-[13px] font-semibold text-ink">
              {fullName}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium tracking-[0.08em] text-slate">
              {roleLabel}
            </p>
          </div>
        </div>
        <button
          className="mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-xl bg-transparent text-[13px] font-semibold text-slate transition-all duration-150 hover:bg-canvas/70 hover:text-status-cancelled-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light lg:justify-start lg:px-3"
          onClick={handleLogout}
          title="Sign Out"
          type="button"
        >
          <LogOut aria-hidden="true" className="h-[15px] w-[15px]" />
          <span className={mobile ? 'inline' : 'hidden lg:inline'}>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
