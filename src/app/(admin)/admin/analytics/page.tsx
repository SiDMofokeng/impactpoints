"use client"

import RequireRole from "@/components/auth/require-role"
import SurfaceCard from "@/components/shared/surface-card"

export default function AdminAnalyticsPage() {
    return (
        <RequireRole allowedRoles={["super_admin"]}>
            <div className="space-y-6">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Analytics</p>
                    <h1 className="text-3xl font-bold tracking-tight">Company Analytics</h1>
                </div>

                <SurfaceCard className="p-6">
                    <p className="text-sm text-muted-foreground">
                        This area will show engagement, points, participation, and reward analytics.
                    </p>
                </SurfaceCard>
            </div>
        </RequireRole>
    )
}