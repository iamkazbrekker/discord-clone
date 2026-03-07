"use client";
import { ModeToggle } from "@/components/mode-toggle";
import { client } from "@/lib/client";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";


export default function Home() {

  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [username, setUsername] = useState("Anonymous");
  const [joinRoomId, setJoinRoomId] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)


  useEffect(() => {
    if (!isLoaded) {
      setUsername("Loading...");
    } else if (isSignedIn) {
      setUsername(user?.username ?? "Anonymous");
    }
  }, [isLoaded, isSignedIn, user]);

  const { mutate: createRoom, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      try {
        const res = await client.room.post({
          username: username
        })

        console.log("API Response:", res);

        if (res.status === 200 && res.data) {
          const roomId = (res.data as any).roomId;
          if (roomId) {
            router.push(`/room/${roomId}`)
          } else {
            console.error("roomId missing in response data", res.data);
          }
        } else {
          const errorMsg = (res.error as any)?.value?.error || "Unknown server error";
          console.error("Failed to create room:", errorMsg);
          alert(`Error: ${errorMsg}`);
        }
      } catch (err) {
        console.error("Create room exception: ", err)
      }
    }
  })

  const handleJoinRoom = async () => {
    setJoinError("")

    if (!joinRoomId.trim()) {
      setJoinError("Please enter a room ID")
      return
    }

    setJoinLoading(true)

    try {
      const res = await client.room.join.post({
        username: username,
        roomId: joinRoomId.trim()
      })
      console.log("Join response: ", res)

      if (res.data && (res.data as any).error) {
        setJoinError((res.data as any).error)
      } else if (res.data && (res.data as any).roomId) {
        router.push(`/room/${(res.data as any).roomId}`)
      } else {
        setJoinError("Unexpected error: Please try again later")
      }
    } catch (err: any) {
      console.log("Join error: ", err)
      setJoinError("Failed to join room. Check the Room ID and try again later")
    } finally {
      setJoinLoading(false)
    }
  }
  return (
    <div>
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <ModeToggle />
      </div>
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-green-500">
              {">"}irc
            </h1>
            <p className="text-zinc-500 text-sm">A private, open server</p>
          </div>

          <div className="border border-zinc-800/50 p-6 backdrop-blur-md">
            <div className="space-y-5">
              {/* Identity Display */}
              <div className="space-y-2">
                <label className="flex items-center text-zinc-500">
                  Your identity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                    {username}
                  </div>
                </div>
              </div>

              {/* Create Room Button */}
              <button
                onClick={() => createRoom()}
                disabled={isCreating}
                className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-white hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "CREATING..." : "CREATE SECURE ROOM"}
              </button>

              {/* ── Divider ─────────────────────── */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 border-t border-zinc-800"></div>
                <span className="text-zinc-600 text-xs font-mono">OR</span>
                <div className="flex-1 border-t border-zinc-800"></div>
              </div>

              {/* ── Join Room Section ───────────── */}
              <div className="space-y-3">
                <label className="flex items-center text-zinc-500">
                  Join existing room
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
                      {">"}
                    </span>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => {
                        setJoinRoomId(e.target.value);
                        setJoinError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleJoinRoom();
                      }}
                      placeholder="Enter Room ID"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-green-500/50 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-7 pr-4 text-sm font-mono"
                    />
                  </div>
                  <button
                    onClick={handleJoinRoom}
                    disabled={joinLoading || !joinRoomId.trim()}
                    className="bg-green-500/10 border border-green-500/30 text-green-500 px-5 text-sm font-bold hover:bg-green-500/20 hover:border-green-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joinLoading ? "..." : "JOIN"}
                  </button>
                </div>

                {/* Error Message */}
                {joinError && (
                  <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 p-2">
                    {"> "}
                    {joinError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
