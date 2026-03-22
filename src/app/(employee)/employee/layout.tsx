// FILE: src/app/(employee)/employee/layout.tsx

"use client"

import type { ReactNode } from "react"
import { Gift, LayoutDashboard, QrCode, ScanLine } from "lucide-react"
import AppShell from "@/components/layout/app-shell"

const employeeNavItems = [
    { label: "Overview", href: "/employee", icon: LayoutDashboard },
    { label: "My Rewards", href: "/employee/rewards", icon: Gift },
    { label: "Scan", href: "/employee/scan", icon: QrCode },
    { label: "My Activity", href: "/employee/activity", icon: ScanLine },
]

export default function EmployeeLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <AppShell
            title="My Rewards Dashboard"
            roleLabel="Employee"
            navItems={employeeNavItems}
        >
            {children}
        </AppShell>
    )
}
