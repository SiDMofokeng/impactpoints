// FILE: src/app/(head)/head/layout.tsx
"use client"

import type { ReactNode } from "react"
import { LayoutDashboard, Users, QrCode, Gift } from "lucide-react"
import AppShell from "@/components/layout/app-shell"

const headNavItems = [
    { label: "Overview", href: "/head", icon: LayoutDashboard },
    { label: "Team", href: "/head/team", icon: Users },
    { label: "Activities", href: "/head/activities", icon: QrCode },
    { label: "Rewards", href: "/head/rewards", icon: Gift },
]

export default function HeadLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <AppShell
            title="Department Dashboard"
            roleLabel="Department Head"
            navItems={headNavItems}
        >
            {children}
        </AppShell>
    )
}