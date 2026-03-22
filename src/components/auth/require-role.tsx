"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/providers/auth-provider"
import { useUserProfile } from "@/components/providers/user-profile-provider"

type UserRole = "super_admin" | "department_head" | "employee"

export default function RequireRole({
    allowedRoles,
    children,
}: {
    allowedRoles: UserRole[]
    children: React.ReactNode
}) {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { profile, loading: profileLoading } = useUserProfile()

    useEffect(() => {
        if (authLoading || profileLoading) return

        if (!user) {
            router.replace("/login")
            return
        }

        if (!profile?.role || !allowedRoles.includes(profile.role)) {
            router.replace("/login")
        }
    }, [user, profile, authLoading, profileLoading, allowedRoles, router])

    if (authLoading || profileLoading) {
        return (
            <div className="px-6 py-10 text-sm text-muted-foreground">
                Checking access...
            </div>
        )
    }

    if (!user || !profile?.role || !allowedRoles.includes(profile.role)) {
        return null
    }

    return <>{children}</>
}