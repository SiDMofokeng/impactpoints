import { cn } from "@/lib/utils"

type SurfaceCardProps = {
    children: React.ReactNode
    className?: string
}

export default function SurfaceCard({
    children,
    className,
}: SurfaceCardProps) {
    return (
        <div
            className={cn(
                "rounded-[var(--radius-card)] border bg-[var(--card)] text-[var(--card-foreground)] shadow-[var(--shadow-card)]",
                className
            )}
        >
            {children}
        </div>
    )
}