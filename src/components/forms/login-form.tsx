"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import { loginSchema, type LoginSchema } from "@/lib/validators/auth"
import SurfaceCard from "@/components/shared/surface-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type UserRole = "super_admin" | "department_head" | "employee"

export default function LoginForm() {
    const router = useRouter()
    const [submitMessage, setSubmitMessage] = useState("")

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(data: LoginSchema) {
        try {
            setSubmitMessage("")

            const credential = await signInWithEmailAndPassword(
                auth,
                data.email,
                data.password
            )

            const userRef = doc(db, "users", credential.user.uid)
            const userSnap = await getDoc(userRef)

            if (!userSnap.exists()) {
                setSubmitMessage("No user profile found for this account.")
                return
            }

            const userData = userSnap.data() as { role?: UserRole }
            const role = userData.role

            if (role === "super_admin") {
                router.push("/admin")
                return
            }

            if (role === "department_head") {
                router.push("/head")
                return
            }

            if (role === "employee") {
                router.push("/employee")
                return
            }

            setSubmitMessage("This account has no valid role assigned.")
        } catch (error: unknown) {
            const code =
                typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    typeof (error as { code?: unknown }).code === "string"
                    ? (error as { code: string }).code
                    : ""

            if (
                code === "auth/invalid-credential" ||
                code === "auth/user-not-found" ||
                code === "auth/wrong-password"
            ) {
                setSubmitMessage("Incorrect email or password.")
                return
            }

            if (code === "auth/invalid-email") {
                setSubmitMessage("Enter a valid email address.")
                return
            }

            setSubmitMessage("Login failed. Please try again.")
        }
    }

    return (
        <section className="flex min-h-screen flex-col justify-center gap-6 px-4 py-10">
            <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-muted-foreground">Welcome to</p>
                <h1 className="text-3xl font-bold tracking-tight">Impact Points</h1>
                <p className="text-sm text-muted-foreground">
                    Sign in to access your rewards dashboard.
                </p>
            </div>

            <SurfaceCard className="mx-auto w-full max-w-sm p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            {...register("email")}
                        />
                        {errors.email ? (
                            <p className="text-sm text-red-500">{errors.email.message}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password")}
                        />
                        {errors.password ? (
                            <p className="text-sm text-red-500">{errors.password.message}</p>
                        ) : null}
                    </div>

                    <Button
                        type="submit"
                        className="w-full rounded-[var(--radius-button)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>

                    {submitMessage ? (
                        <p className="text-center text-sm text-muted-foreground">
                            {submitMessage}
                        </p>
                    ) : null}
                </form>
            </SurfaceCard>
        </section>
    )
}