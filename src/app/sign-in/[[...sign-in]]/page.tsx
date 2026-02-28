import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return(
    <div className='h-screen items-center flex justify-center'>
      <SignIn/>
    </div>
  )
  
}