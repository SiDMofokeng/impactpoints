"use client"

import Link from "next/link"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useUserProfile } from "@/components/providers/user-profile-provider"

export default function AdminPage() {
    const { profile, loading } = useUserProfile()

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        Company overview
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {loading ? "..." : (profile?.name ?? "Admin")}
                    </h1>
                    <p className="text-muted-foreground">
                        Manage departments, users, rewards, and company-wide engagement from one place.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Departments" value="0" helper="Ready for setup" />
                    <MetricCard label="Employees" value="0" helper="No users added yet" />
                    <MetricCard label="Activities" value="0" helper="No activities yet" />
                    <MetricCard label="Rewards" value="0" helper="Milestones not created" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Quick actions
                                </p>
                                <h2 className="text-xl font-semibold">Get the system ready</h2>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <Link
                                    href="/admin/departments"
                                    className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4 transition hover:border-[var(--primary)]"
                                >
                                    <p className="text-sm font-medium">Create departments</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Set up company structure and assign leaders.
                                    </p>
                                </Link>

                                <div className="rounded-[var(--radius-input)] border bg-[var(--surface)] p-4">
                                    <p className="text-sm font-medium">Create milestones</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Reward progress with meaningful incentives.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SurfaceCard>

                    <SurfaceCard className="p-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Account
                                </p>
                                <h2 className="text-xl font-semibold">Current profile</h2>
                            </div>

                            <div className="space-y-3 text-sm">
                                <InfoRow label="Name" value={profile?.name ?? "Unknown"} />
                                <InfoRow label="Email" value={profile?.email ?? "Unknown"} />
                                <InfoRow label="Role" value={profile?.role ?? "Unknown"} />
                            </div>
                        </div>
                    </SurfaceCard>
                </div>
            </div>
        </RequireRole>
    )
}

function MetricCard({
    label,
    value,
    helper,
}: {
    label: string
    value: string
    helper: string
}) {
    return (
        <SurfaceCard className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
        </SurfaceCard>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-[var(--radius-input)] border bg-[var(--surface)] px-4 py-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}