import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  FolderOpen,
  Users,
  Printer,
  Truck,
  CalendarDays,
  History,
  CheckCheck,
  Settings as SettingsIcon,
  ChartNoAxesCombined,
  Search,
  LogOut,
  ClipboardCheck,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react'
import { api, can, setTimezone, API_CONTRACT_VERSION, PRODUCT_VERSION } from './api'
import { ErrorBox, Loading, Field } from './components'
import Inbox from './Inbox'
import Clients from './Clients'
import { Calendar, Indicators } from './Reports'
import Settings from './Settings'
import PartialReleaseApprovals from './PartialReleaseApprovals'
import Brand from './Brand'

const BindingScanner = lazy(() => import('./BindingScanner'))
const CasePage = lazy(() => import('./CasePage'))
const PrintDocument = lazy(() => import('./PrintDocument'))

function Login({ sessionMessage = '' }) {
  const qc = useQueryClient(),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(() => (sessionMessage ? new Error(sessionMessage) : null)),
    [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api('/auth/login', { method: 'POST', body: { username, password } })
      qc.invalidateQueries()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <div className="brand">
          <Brand size="login" />
        </div>
        <div>
          <p className="eyebrow">DEL PRIMER CONTACTO A LA ENTREGA</p>
          <h1>
            Todo tu taller.
            <br />
            Una misma solicitud.
          </h1>
          <p>
            Atención, producción y seguimiento conectados para que el equipo trabaje con claridad.
          </p>
        </div>
        <small>Consola de operaciones · Red local</small>
      </div>
      <div className="login-form">
        <form onSubmit={submit}>
          <div className="eyebrow">BIENVENIDO A COMGRAF</div>
          <h2>Entrar al espacio de trabajo</h2>
          <p>Usa tu cuenta del equipo.</p>
          <Field
            label="Usuario"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Field
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorBox error={error} />
          <button className="primary" disabled={busy}>
            {busy ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
          <small>
            Primera instalación: el administrador se crea desde la consola del servidor siguiendo el
            README.
          </small>
        </form>
      </div>
    </main>
  )
}
function InboxRoute({ user }) {
  const { view } = useParams()
  return <Inbox key={view} view={view} user={user} />
}
function Guard({ user, permission, children }) {
  return can(user, permission) ? (
    children
  ) : (
    <div className="error">Tu rol no tiene permiso para acceder a este módulo.</div>
  )
}
export default function App() {
  const qc = useQueryClient(),
    nav = useNavigate(),
    currentLocation = useLocation(),
    [search, setSearch] = useState(''),
    [logoutError, setLogoutError] = useState(null),
    [sidebarCollapsed, setSidebarCollapsed] = useState(
      () => localStorage.getItem('comgraf.sidebar-collapsed') === 'true',
    ),
    [theme, setTheme] = useState(() => localStorage.getItem('comgraf.theme') || 'light'),
    [profileOpen, setProfileOpen] = useState(false)
  const searchRef = useRef(null)
  const me = useQuery({ queryKey: ['me'], queryFn: () => api('/auth/me'), retry: false })
  const counts = useQuery({
    queryKey: ['counts', me.data?.id],
    queryFn: () => api('/counts'),
    enabled: !!me.data,
    refetchInterval: 30000,
  })
  const serverVersion = useQuery({
    queryKey: ['server-version'],
    queryFn: () => api('/version'),
    staleTime: 60000,
  })
  useEffect(() => {
    if (me.data?.timezone) setTimezone(me.data.timezone)
  }, [me.data?.timezone])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('comgraf.theme', theme)
  }, [theme])
  useEffect(() => {
    localStorage.setItem('comgraf.sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])
  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') setProfileOpen(false)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  if (me.isPending) return <Loading />
  if (me.error) {
    if (me.error.status === 401)
      return (
        <Login
          sessionMessage={me.error.message.includes('servicio se reinició') ? me.error.message : ''}
        />
      )
    return (
      <>
        <ErrorBox error={me.error} />
        <button onClick={() => me.refetch()}>Reintentar conexión</button>
      </>
    )
  }
  const user = me.data
  const links = [
    { path: '/', label: 'Mi día', Icon: LayoutDashboard, section: 'Principal', badge: counts.data?.action },
    { path: '/inbox/pool', label: 'Bandeja general', Icon: InboxIcon, section: 'Atención', badge: counts.data?.pool },
    { path: '/inbox/mine', label: 'Mis solicitudes', Icon: FolderOpen, section: 'Atención', badge: counts.data?.mine },
    { path: '/inbox/production', label: 'Producción', Icon: Printer, section: 'Producción', badge: counts.data?.production_orders },
    { path: '/inbox/ready', label: 'Entregas y cobros', Icon: Truck, section: 'Producción', badge: counts.data?.ready_orders },
    ...(can(user, 'clients')
      ? [{ path: '/clients', label: 'Clientes', Icon: Users, section: 'Gestión' }]
      : []),
    { path: '/calendar', label: 'Calendario', Icon: CalendarDays, section: 'Gestión' },
    { path: '/inbox/finalized', label: 'Completados', Icon: CheckCheck, section: 'Gestión' },
    { path: '/inbox/history', label: 'Historial', Icon: History, section: 'Gestión' },
    ...(can(user, 'partial_release_approve')
      ? [{ path: '/binding-releases', label: 'Liberaciones parciales', Icon: ClipboardCheck, section: 'Gestión' }]
      : []),
    ...(can(user, 'reports')
      ? [{ path: '/indicators', label: 'Indicadores', Icon: ChartNoAxesCombined, section: 'Gestión' }]
      : []),
    { path: '/settings', label: 'Configuración', Icon: SettingsIcon, section: 'Gestión' },
  ]
  const navigationGroups = links.reduce((groups, link) => {
    const group = groups.find((entry) => entry.label === link.section)
    if (group) group.links.push(link)
    else groups.push({ label: link.section, links: [link] })
    return groups
  }, [])
  const detailContext = /^\/cases\/\d+/.test(currentLocation.pathname)
    ? new URLSearchParams(currentLocation.search).get('from')
    : null
  const activePath = links.some(({ path }) => path === detailContext)
    ? detailContext
    : detailContext
      ? null
      : /^\/cases\/\d+/.test(currentLocation.pathname)
        ? '/inbox/mine'
        : null
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const detailMatch = currentLocation.pathname.match(/^\/cases\/(\d+)/)
  const parentPath = detailMatch && links.some((link) => link.path === detailContext) ? detailContext : '/'
  const parentLabel = links.find((link) => link.path === parentPath)?.label || 'Mi día'
  const viewLabels = {
    pool: 'Bandeja general', action: 'Requieren acción', mine: 'Mis solicitudes',
    'mine-action': 'Requieren mi acción', production: 'Producción', late: 'Órdenes atrasadas',
    ready: 'Entregas y cobros', finalized: 'Completados', history: 'Historial',
    'delivered-balances': 'Entregadas con saldo', 'delivered-overdue': 'Cobros vencidos',
    balances: 'Saldos por cobrar', overdue: 'Cobros vencidos', refunds: 'Devoluciones pendientes',
    'cancellation-review': 'Anulaciones por resolver',
  }
  const currentLabel = detailMatch
    ? `Solicitud #${detailMatch[1]}`
    : currentLocation.pathname === '/'
      ? 'Mi día'
      : currentLocation.pathname.startsWith('/inbox/')
        ? viewLabels[currentLocation.pathname.split('/')[2]] || 'Solicitudes'
        : currentLocation.pathname === '/search'
          ? 'Búsqueda global'
          : currentLocation.pathname.startsWith('/clients/')
            ? 'Perfil de cliente'
            : links.find((link) => link.path === currentLocation.pathname)?.label || 'Espacio de trabajo'
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
      qc.clear()
      location.assign('/')
    } catch (e) {
      setLogoutError(e)
    }
  }
  if (user.roles.length === 1 && user.roles[0] === 'Escáner de encuadernación') {
    return (
      <Suspense fallback={<Loading />}>
        <BindingScanner user={user} onLogout={logout} />
      </Suspense>
    )
  }
  if (/^\/cases\/\d+\/print$/.test(window.location.pathname))
    return (
      <Suspense fallback={<Loading />}>
        <PrintDocument />
      </Suspense>
    )
  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className={`sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <div className="sidebar-brand-row"><LinkBrand collapsed={sidebarCollapsed} /></div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.links.map(({ path, label, Icon, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/' || path === '/clients'}
                  title={label}
                  aria-label={label}
                  className={({ isActive }) =>
                    activePath ? (path === activePath ? 'active' : '') : isActive ? 'active' : ''
                  }
                  aria-current={activePath === path ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span className="nav-link-label">{label}</span>
                  {badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="avatar avatar-gradient">{initials}</div>
            <div className="sidebar-profile-copy">
              <strong>{user.name}</strong>
              <small>{user.roles.join(' · ')}</small>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            <span>{sidebarCollapsed ? 'Expandir' : 'Contraer menú'}</span>
          </button>
          <div className="sidebar-bottom">
            <span className="online-dot" /> Entorno local <small>Comunicación Gráfica</small>
            <small className="sidebar-version">v{PRODUCT_VERSION}</small>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault()
              if (search.trim()) nav('/search?q=' + encodeURIComponent(search.trim()))
            }}
          >
            <Search size={18} />
            <input
              ref={searchRef}
              aria-label="Búsqueda global"
              placeholder="Buscar cliente, RTN, teléfono, correo o solicitud…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd aria-hidden="true">⌘ K</kbd>
          </form>
          <div className="topbar-actions">
            <button
              type="button"
              className={`theme-toggle${theme === 'dark' ? ' is-dark' : ''}`}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? 'Tema oscuro' : 'Tema claro'}
            >
              <span className="theme-thumb">{theme === 'dark' ? <Moon size={11} /> : <Sun size={11} />}</span>
            </button>
            <Link
              className="notification-button"
              to="/inbox/action"
              aria-label={`${counts.data?.action || 0} solicitudes requieren atención`}
              title="Solicitudes que requieren atención"
            >
              <Bell size={18} />
              {!!counts.data?.action && <span className="notification-dot" />}
            </Link>
            <div className="account-menu">
              <button
                type="button"
                className="account account-trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <div className="avatar avatar-gradient">{initials}</div>
                <div className="account-copy">
                  <strong>{user.name}</strong>
                  <small>{user.roles.join(' · ')}</small>
                </div>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-identity">
                    <strong>{user.name}</strong>
                    <small>{user.roles.join(' · ')}</small>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      logout()
                    }}
                  >
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <nav className="breadcrumb-bar" aria-label="Ruta de navegación">
          <NavLink to="/" end className="breadcrumb-home">COMGRAF</NavLink>
          <ChevronRight size={14} aria-hidden="true" />
          {detailMatch && parentPath !== '/' ? (
            <>
              <Link to={parentPath}>{parentLabel}</Link>
              <ChevronRight size={14} aria-hidden="true" />
            </>
          ) : null}
          <span aria-current="page">{currentLabel}</span>
        </nav>
        <ErrorBox error={logoutError} />
        {serverVersion.error && (
          <ErrorBox
            error={
              serverVersion.error.status === 404
                ? { ...serverVersion.error, code: 'CLIENT_CONTRACT_MISMATCH' }
                : serverVersion.error
            }
          />
        )}
        {serverVersion.data &&
          String(serverVersion.data.contract_version) !== API_CONTRACT_VERSION && (
            <ErrorBox
              error={{
                code: 'CLIENT_CONTRACT_MISMATCH',
                message: 'El contrato HTTP de interfaz y servidor no coincide.',
              }}
            />
          )}
        <p className="muted version-stamp" aria-label="Versiones del sistema">
          Web {PRODUCT_VERSION} · API {API_CONTRACT_VERSION} · servidor{' '}
          {serverVersion.data?.product_version || 'sin identificar'}
        </p>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Inbox key="home" home user={user} />} />
            <Route path="/inbox/:view" element={<InboxRoute user={user} />} />
            <Route path="/search" element={<Inbox key="search" search user={user} />} />
            <Route
              path="/cases/:id"
              element={
                <Suspense fallback={<Loading />}>
                  <CasePage user={user} />
                </Suspense>
              }
            />
            <Route
              path="/cases/:id/print"
              element={
                <Suspense fallback={<Loading />}>
                  <CasePage user={user} print />
                </Suspense>
              }
            />
            <Route
              path="/clients"
              element={
                <Guard user={user} permission="clients">
                  <Clients user={user} />
                </Guard>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <Guard user={user} permission="clients">
                  <Clients user={user} />
                </Guard>
              }
            />
            <Route path="/calendar" element={<Calendar />} />
            <Route
              path="/binding-releases"
              element={
                <Guard user={user} permission="partial_release_approve">
                  <PartialReleaseApprovals />
                </Guard>
              }
            />
            <Route
              path="/indicators"
              element={
                <Guard user={user} permission="reports">
                  <Indicators />
                </Guard>
              }
            />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
function LinkBrand({ collapsed = false }) {
  return (
    <NavLink className={`brand${collapsed ? ' is-collapsed' : ''}`} to="/" aria-label="Comgraf, ir a Mi día">
      <Brand size={collapsed ? 'compact' : 'navigation'} />
    </NavLink>
  )
}
