"use client";
import { connect } from "@/dbConfig/dbConfig";
import { client } from "@/lib/client";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";


export default function Home() {

  const { isLoaded, isSignedIn, user } = useUser();
  const [username, setUsername] = useState("Anonymous");
  useEffect(() => {
    if (!isLoaded) {
      setUsername("Loading...");
    } else if (isSignedIn) {
      setUsername(user?.username ?? "Anonymous");
    }
  }, [isLoaded, isSignedIn, user]);

  const {mutate: createRoom} = useMutation({
    mutationFn: async () => {
      const res = await client.room.post()
    }
  })
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {">"}irc
          </h1>
          <p className="text-zinc-500 text-sm">A private, open server</p>
        </div>


        <div className="border border-zinc-980/50 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500">Your identity</label>

              <div className="flex items-centergap-3">
                <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                  {username}
                </div>
              </div>
            </div>
            <button onClick={() => createRoom()} className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-white hover:text-black transition-colors mt-2 cursor-pointer ">CREATE SECURE ROOM</button>
          </div>
        </div>
      </div>
    </main>
  );
}
