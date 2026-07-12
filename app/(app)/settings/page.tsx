"use client"

import * as React from "react"
import { Rows3, Menu, Image as ImageIcon, Globe } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"
import { useAppStore, type MenuVis } from "@/components/providers/app-store"
import { useTheme, type ThemePref } from "@/components/providers/theme-provider"
import { PageTitle, Panel, SectionTitle } from "@/components/ui/panel"
import { Segmented, SegmentedButton } from "@/components/ui/segmented"
import { Field, FormGrid } from "@/components/ui/field"
import { Input, Textarea } from "@/components/ui/input"
import { Dropzone } from "@/components/ui/dropzone"
import { Button } from "@/components/ui/button"
import { Checkbox, ToggleRow } from "@/components/ui/checkbox"
import { AudioTab } from "./_components/audio-tab"

type StTab = "app" | "audio" | "menu"

export default function SettingsPage() {
  const { t } = useI18n()
  const [stTab, setStTab] = React.useState<StTab>("app")

  const tabs: { key: StTab; label: string }[] = [
    { key: "app", label: t.stTabApp },
    { key: "audio", label: t.stTabAudio },
    { key: "menu", label: t.stTabMenu },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navSettings} sub={t.stSub}>
        <Segmented role="tablist" aria-label="Settings">
          {tabs.map((tab) => (
            <SegmentedButton
              key={tab.key}
              role="tab"
              active={stTab === tab.key}
              aria-selected={stTab === tab.key}
              onClick={() => setStTab(tab.key)}
            >
              {tab.label}
            </SegmentedButton>
          ))}
        </Segmented>
      </PageTitle>

      {stTab === "app" ? <AppTab /> : stTab === "audio" ? <AudioTab /> : <MenuTab />}
    </div>
  )
}

/* --- Setting Aplikasi --- */
function AppTab() {
  const { t } = useI18n()
  const { pushToast } = useToast()
  const { appName, setAppName, appDesc, setAppDesc } = useAppStore()
  const { pref, setTheme } = useTheme()

  const [name, setName] = React.useState(appName)
  const [desc, setDesc] = React.useState(appDesc)
  const [logoName, setLogoName] = React.useState("")
  const [logoDrag, setLogoDrag] = React.useState(false)
  const [favName, setFavName] = React.useState("")
  const [favDrag, setFavDrag] = React.useState(false)
  const logoRef = React.useRef<HTMLInputElement>(null)
  const favRef = React.useRef<HTMLInputElement>(null)

  const themeOpts: { key: ThemePref; label: string }[] = [
    { key: "system", label: t.themeSystem },
    { key: "light", label: t.themeLight },
    { key: "dark", label: t.themeDark },
  ]

  function save() {
    setAppName(name)
    setAppDesc(desc)
    pushToast("success", t.stSavedT, t.stSavedD)
  }

  return (
    <Panel className="max-w-[760px]">
      <SectionTitle>
        <Rows3 />
        {t.stTabApp}
      </SectionTitle>
      <FormGrid>
        <Field label={t.stAppName} htmlFor="st-name" required helper={t.stAppNameHelp}>
          <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t.stTheme} helper={t.stThemeHelp}>
          <Segmented role="group" aria-label={t.stTheme}>
            {themeOpts.map((o) => (
              <SegmentedButton
                key={o.key}
                type="button"
                active={pref === o.key}
                onClick={() => setTheme(o.key)}
              >
                {o.label}
              </SegmentedButton>
            ))}
          </Segmented>
        </Field>
        <Field className="col-span-full" label={t.stAppDesc} htmlFor="st-desc">
          <Textarea id="st-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label={t.stLogo}>
          <Dropzone
            icon={<ImageIcon />}
            title={logoName || t.stLogoPh}
            hint="PNG/SVG · 1:1"
            className="p-4"
            onPick={() => logoRef.current?.click()}
            onDropFile={setLogoName}
            dragging={logoDrag}
            onDragChange={setLogoDrag}
            aria-label={t.stLogo}
          />
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? "")}
          />
        </Field>
        <Field label={t.stFavicon}>
          <Dropzone
            icon={<Globe />}
            title={favName || t.stFavPh}
            hint="ICO/PNG · 32×32"
            className="p-4"
            onPick={() => favRef.current?.click()}
            onDropFile={setFavName}
            dragging={favDrag}
            onDragChange={setFavDrag}
            aria-label={t.stFavicon}
          />
          <input
            ref={favRef}
            type="file"
            accept="image/*,.ico"
            className="hidden"
            onChange={(e) => setFavName(e.target.files?.[0]?.name ?? "")}
          />
        </Field>
      </FormGrid>
      <div className="mt-5 flex justify-end">
        <Button onClick={save}>{t.stSave}</Button>
      </div>
    </Panel>
  )
}

/* --- Setting Menu --- */
function MenuTab() {
  const { t } = useI18n()
  const { menuVis, setMenuVis } = useAppStore()

  const rows: { key: keyof MenuVis; label: string; sub?: string }[] = [
    { key: "display", label: t.navDisplay, sub: `${t.navDispAtt}, ${t.navDispFleet}` },
    { key: "roster", label: t.navRoster, sub: "Upload, revisi, approval, attendance" },
    { key: "employees", label: t.navEmployees },
    { key: "ftw", label: t.navFtw },
    { key: "asset", label: t.navAsset },
    { key: "master", label: t.navMaster },
    { key: "users", label: t.navUsers },
  ]

  const locked = [t.navDashboard, t.navSettings]

  return (
    <Panel className="max-w-[640px]">
      <SectionTitle>
        <Menu />
        {t.stTabMenu}
      </SectionTitle>
      <p className="mb-5 text-sm text-(--text-secondary)">{t.stMenuHelp}</p>
      <div className="flex flex-col gap-2">
        {locked.slice(0, 1).map((label) => (
          <LockedRow key={label} label={label} caption={t.stMenuLocked} />
        ))}
        {rows.map((m) => (
          <ToggleRow key={m.key} className="justify-between">
            <span className="inline-flex items-center gap-3">
              <b className="text-sm font-semibold">{m.label}</b>
              {m.sub ? (
                <span className="text-xs text-(--text-tertiary)">{m.sub}</span>
              ) : null}
            </span>
            <Checkbox
              checked={menuVis[m.key]}
              onChange={(e) =>
                setMenuVis((prev) => ({ ...prev, [m.key]: e.target.checked }))
              }
            />
          </ToggleRow>
        ))}
        {locked.slice(1).map((label) => (
          <LockedRow key={label} label={label} caption={t.stMenuLocked} />
        ))}
      </div>
    </Panel>
  )
}

function LockedRow({ label, caption }: { label: string; caption: string }) {
  return (
    <ToggleRow className="justify-between">
      <span className="inline-flex items-center gap-3">
        <b className="text-sm font-semibold">{label}</b>
        <span className="text-xs text-(--text-tertiary)">{caption}</span>
      </span>
      <Checkbox checked disabled readOnly />
    </ToggleRow>
  )
}
