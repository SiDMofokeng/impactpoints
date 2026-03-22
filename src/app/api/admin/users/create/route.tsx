import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

type UserRole = "super_admin" | "department_head" | "employee"
type UserStatus = "active" | "inactive" | "suspended"

type CreateUserBody = {
    name?: string
    email?: string
    password?: string
    role?: UserRole
    departmentId?: string
    status?: UserStatus
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CreateUserBody

        const name = (body.name ?? "").trim()
        const email = (body.email ?? "").trim().toLowerCase()
        const password = (body.password ?? "").trim()
        const role = body.role
        const departmentId = (body.departmentId ?? "").trim()
        const status = body.status

        if (!name) {
            return NextResponse.json(
                { error: "Full name is required." },
                { status: 400 }
            )
        }

        if (!email) {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            )
        }

        if (!email.includes("@")) {
            return NextResponse.json(
                { error: "Enter a valid email address." },
                { status: 400 }
            )
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            )
        }

        if (
            role !== "super_admin" &&
            role !== "department_head" &&
            role !== "employee"
        ) {
            return NextResponse.json(
                { error: "A valid role is required." },
                { status: 400 }
            )
        }

        if (
            status !== "active" &&
            status !== "inactive" &&
            status !== "suspended"
        ) {
            return NextResponse.json(
                { error: "A valid status is required." },
                { status: 400 }
            )
        }

        if ((role === "department_head" || role === "employee") && !departmentId) {
            return NextResponse.json(
                { error: "Department is required for this role." },
                { status: 400 }
            )
        }

        let departmentName = ""

        if (departmentId) {
            const departmentRef = adminDb.collection("departments").doc(departmentId)
            const departmentSnap = await departmentRef.get()

            if (!departmentSnap.exists) {
                return NextResponse.json(
                    { error: "Selected department was not found." },
                    { status: 400 }
                )
            }

            const departmentData = departmentSnap.data() as
                | { name?: string; isDeleted?: boolean; isActive?: boolean }
                | undefined

            if (departmentData?.isDeleted) {
                return NextResponse.json(
                    { error: "Selected department is not available." },
                    { status: 400 }
                )
            }

            if (departmentData?.isActive === false) {
                return NextResponse.json(
                    { error: "Selected department is inactive." },
                    { status: 400 }
                )
            }

            departmentName = departmentData?.name ?? ""
        }

        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
            disabled: status !== "active",
        })

        await adminDb.collection("users").doc(userRecord.uid).set({
            name,
            email,
            role,
            departmentId: departmentId || "",
            departmentName,
            status,
            totalPoints: 0,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
        })
    } catch (error: unknown) {
        console.error("Failed to create user:", error)

        const errorCode =
            typeof error === "object" &&
                error !== null &&
                "code" in error &&
                typeof (error as { code?: unknown }).code === "string"
                ? (error as { code: string }).code
                : ""

        if (errorCode === "auth/email-already-exists") {
            return NextResponse.json(
                { error: "A user with that email already exists." },
                { status: 400 }
            )
        }

        if (errorCode === "auth/invalid-password") {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Failed to create user. Please try again." },
            { status: 500 }
        )
    }
}