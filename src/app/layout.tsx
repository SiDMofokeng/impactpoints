import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { UserProfileProvider } from "@/components/providers/user-profile-provider"

export const metadata = {
    title: "Impact Points",
    description: "Employee Rewards System",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <UserProfileProvider>{children}</UserProfileProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
