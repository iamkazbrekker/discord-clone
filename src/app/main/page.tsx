import { ModeToggle } from "@/components/mode-toggle"
import { UserButton } from "@clerk/nextjs"

function Page() {
  return (
    <div><UserButton 
    afterSignOutUrl="/sign-in"/>
    <ModeToggle />
    </div>
  )
}
export default Page