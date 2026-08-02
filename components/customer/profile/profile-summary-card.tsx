import { Mail, Phone, User } from "lucide-react"

type ProfileSummaryCardProps = {
  name: string
  email: string
  phone?: string
  initials?: string
}

export default function ProfileSummaryCard({
  name,
  email,
  phone,
  initials,
}: ProfileSummaryCardProps) {
  const fallbackInitials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="bg-background rounded-xl border p-6">
      <div className="bg-primary/10 text-primary grid size-16 place-items-center rounded-full text-lg font-bold">
        {initials ?? fallbackInitials}
      </div>

      <h2 className="mt-4 text-xl font-semibold">{name}</h2>

      <div className="text-muted-foreground mt-5 space-y-3 text-sm">
        <p className="flex items-center gap-3">
          <Mail className="size-4" />
          {email}
        </p>

        {phone && (
          <p className="flex items-center gap-3">
            <Phone className="size-4" />
            {phone}
          </p>
        )}

        <p className="flex items-center gap-3">
          <User className="size-4" />
          Customer account
        </p>
      </div>
    </article>
  )
}
