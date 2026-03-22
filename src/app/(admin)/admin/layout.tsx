import AppShell, { adminShellNav } from "@/components/layout/app-shell"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AppShell
            title="Super Admin Dashboard"
            roleLabel="Super Admin"
            navItems={adminShellNav}
        >
            {children}
        </AppShell>
    )
}