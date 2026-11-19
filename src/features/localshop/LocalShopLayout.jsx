import { NavLink, Outlet } from 'react-router-dom'
import { Store } from 'lucide-react'
import LanguageProvider from './i18n/LanguageProvider'
import ShopProvider from './store/ShopProvider'
import ActionsProvider from './store/ActionsProvider'
import { useLang } from './i18n/useLang'
import { LANGUAGES } from './i18n/strings'
import { LOCAL_SHOP_NAV } from './nav'

function LanguageSwitch() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-1 rounded-full border border-glow-border p-0.5">
      {LANGUAGES.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setLang(option.id)}
          aria-pressed={lang === option.id}
          aria-label={option.label}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
            lang === option.id ? 'bg-glow-brand text-glow-bg' : 'text-glow-text/60 hover:text-glow-text'
          }`}
        >
          {option.short}
        </button>
      ))}
    </div>
  )
}

function Nav() {
  const { t } = useLang()
  return (
    <nav aria-label={t('nav.section')} className="flex gap-1 overflow-x-auto pb-1">
      {LOCAL_SHOP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'bg-glow-brand text-glow-bg' : 'text-glow-text/60 hover:bg-white/5 hover:text-glow-text'
            }`
          }
        >
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  )
}

function Shell() {
  const { t } = useLang()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-glow-brand/15">
            <Store className="size-4 text-glow-brand" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-glow-text">{t('nav.section')}</span>
        </div>
        <LanguageSwitch />
      </div>
      <Nav />
      <Outlet />
    </div>
  )
}

/** Local Shop lives under its own route prefix and never alters the Business Startup / SME pathway. */
export default function LocalShopLayout() {
  return (
    <LanguageProvider>
      <ShopProvider>
        <ActionsProvider>
          <Shell />
        </ActionsProvider>
      </ShopProvider>
    </LanguageProvider>
  )
}
