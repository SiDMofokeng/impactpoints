"use client"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"
import { useUserProfile } from "@/components/providers/user-profile-provider"

export default function AdminSettingsPage() {
    const { profile } = useUserProfile()

    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Settings</p>
                    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                </div>

                <SurfaceCard className="p-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="mt-1 text-base font-semibold">
                                {profile?.name ?? "Unknown"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="mt-1 text-base font-semibold">
                                {profile?.email ?? "Unknown"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Role</p>
                            <p className="mt-1 text-base font-semibold">
                                {profile?.role ?? "Unknown"}
                            </p>
                        </div>
                    </div>
                </SurfaceCard>
            </div>
        </RequireRole>
    )
}