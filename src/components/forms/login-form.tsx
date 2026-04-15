"use client"

import Image from "next/image"
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
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff5f6] px-4 py-10">
            <div className="absolute inset-0">
                <div className="absolute left-0 top-0 h-[420px] w-[420px] rounded-full bg-[#d71920]/12 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#a90f18]/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(215,25,32,0.08),_transparent_45%)]" />
            </div>

            <div className="relative z-10 w-full max-w-md space-y-6">
                <div className="space-y-4 text-center">
                    <div className="mx-auto flex w-full justify-center">
                        <div className="rounded-3xl border border-white/70 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(215,25,32,0.12)]">
                            <Image
                                src="/logo_kingprice.webp"
                                alt="King Price"
                                width={220}
                                height={70}
                                priority
                                className="h-auto w-[180px] sm:w-[220px]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">

                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                            Sign in to your dashboard
                        </h2>
                        <p className="text-sm leading-6 text-slate-600">
                            Access your King Price rewards dashboard securely and continue
                            managing your activity, rewards, and engagement.
                        </p>
                    </div>
                </div>

                <SurfaceCard className="rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                        noValidate
                    >
                        <div className="space-y-2">
                            <label
                                className="text-sm font-semibold text-slate-800"
                                htmlFor="email"
                            >
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                {...register("email")}
                                className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#d71920]"
                            />
                            {errors.email ? (
                                <p className="text-sm text-red-600">
                                    {errors.email.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-sm font-semibold text-slate-800"
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register("password")}
                                className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#d71920]"
                            />
                            {errors.password ? (
                                <p className="text-sm text-red-600">
                                    {errors.password.message}
                                </p>
                            ) : null}
                        </div>

                        <Button
                            type="submit"
                            className="h-12 w-full rounded-2xl bg-[#d71920] text-white shadow-[0_10px_30px_rgba(215,25,32,0.28)] transition hover:bg-[#b8141a]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>

                        {submitMessage ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-center text-sm text-slate-600">
                                    {submitMessage}
                                </p>
                            </div>
                        ) : null}
                    </form>
                </SurfaceCard>
            </div>
        </section>
    )
}