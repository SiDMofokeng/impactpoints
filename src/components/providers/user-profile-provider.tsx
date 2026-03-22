"use client"

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"
import { doc, getDoc } from "firebase/firestore"

import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"

type UserRole = "super_admin" | "department_head" | "employee"

type UserProfile = {
    name?: string
    email?: string
    role?: UserRole
    departmentId?: string
    totalPoints?: number
}

type UserProfileContextValue = {
    profile: UserProfile | null
    loading: boolean
}

const UserProfileContext = createContext<UserProfileContextValue>({
    profile: null,
    loading: true,
})

export function UserProfileProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadProfile() {
            if (authLoading) return

            if (!user) {
                setProfile(null)
                setLoading(false)
                return
            }

            try {
                const userRef = doc(db, "users", user.uid)
                const userSnap = await getDoc(userRef)

                if (userSnap.exists()) {
                    setProfile(userSnap.data() as UserProfile)
                } else {
                    setProfile(null)
                }
            } catch (error) {
                console.error("Failed to load user profile:", error)
                setProfile(null)
            } finally {
                setLoading(false)
            }
        }

        setLoading(true)
        loadProfile()
    }, [user, authLoading])

    const value = useMemo(
        () => ({
            profile,
            loading,
        }),
        [profile, loading]
    )

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    )
}

export function useUserProfile() {
    return useContext(UserProfileContext)
}