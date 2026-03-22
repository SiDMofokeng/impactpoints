"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import {
    BarChart3,
    Building2,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    PanelLeft,
    QrCode,
    Settings,
    Trophy,
    X,
} from "lucide-react"
import { useMemo, useState } from "react"

import { auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { useUserProfile } from "@/components/providers/user-profile-provider"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NavItem = {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

type AppShellProps = {
    title: string
    roleLabel: string
    navItems: NavItem[]
    children: React.ReactNode
}

export default function AppShell({
    title,
    roleLabel,
    navItems,
    children,
}: AppShellProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { profile } = useUserProfile()
    const [mobileOpen, setMobileOpen] = useState(false)

    const initials = useMemo(() => {
        const source = profile?.name || profile?.email || "IP"
        return source
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
    }, [profile?.name, profile?.email])

    async function handleSignOut() {
        await signOut(auth)
        router.replace("/login")
    }

    function isDashboardRootRoute(href: string) {
        return href === "/admin" || href === "/head" || href === "/employee"
    }

    function isNavItemActive(href: string) {
        if (!pathname) return false

        if (isDashboardRootRoute(href)) {
            return pathname === href
        }

        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
            <div className="flex h-full">
                <aside className="hidden h-screen w-[280px] shrink-0 border-r bg-white lg:flex lg:flex-col">
                    <div className="border-b px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white shadow-[var(--shadow-card)]">
                                {initials}
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    Impact Points
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-5">
                        <p className="px-3 pb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Navigation
                        </p>

                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const active = isNavItemActive(item.href)
                                const Icon = item.icon

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                                            active
                                                ? "bg-[var(--primary)] text-white shadow-[var(--shadow-card)]"
                                                : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    <div className="border-t p-4">
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border bg-white px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-slate-100"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    </div>
                </aside>

                <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
                        <div className="flex items-center justify-between px-4 py-4 md:px-6 xl:px-8">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(true)}
                                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border bg-white transition-colors duration-200 hover:bg-slate-100 lg:hidden"
                                    aria-label="Open sidebar"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                        {roleLabel}
                                    </p>
                                    <h2 className="text-xl font-semibold">{title}</h2>
                                </div>
                            </div>

                            <div className="hidden md:flex">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-[var(--surface)] px-3 py-2 text-left transition-colors duration-200 hover:bg-slate-100"
                                        >
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white">
                                                {initials}
                                            </div>

                                            <div className="min-w-[160px]">
                                                <p className="text-sm font-semibold leading-tight">
                                                    {profile?.name ?? "User"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {profile?.email ?? "No email"}
                                                </p>
                                            </div>

                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/admin/settings"
                                                className="flex cursor-pointer items-center gap-2"
                                            >
                                                <Settings className="h-4 w-4" />
                                                <span>Settings</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            onClick={handleSignOut}
                                            className="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <span>Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 xl:px-8">
                        {children}
                    </main>
                </div>
            </div>

            {mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={() => setMobileOpen(false)}
                    />

                    <div className="absolute left-0 top-0 h-full w-[300px] border-r bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b px-5 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white">
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                        Impact Points
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border transition-colors duration-200 hover:bg-slate-100"
                                aria-label="Close sidebar"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-4 py-5">
                            <nav className="space-y-2">
                                {navItems.map((item) => {
                                    const active = isNavItemActive(item.href)
                                    const Icon = item.icon

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                                                active
                                                    ? "bg-[var(--primary)] text-white"
                                                    : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </nav>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
                            <div className="space-y-3">
                                <Link
                                    href="/admin/settings"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border bg-white px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-slate-100"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border bg-white px-4 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-slate-100"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export const adminShellNav = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Activities", href: "/admin/activities", icon: QrCode },
    { label: "Rewards", href: "/admin/rewards", icon: Trophy },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Workspace", href: "/admin/workspace", icon: PanelLeft },
]