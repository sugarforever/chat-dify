"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-background border-b h-16">
      <div className="container mx-auto h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-semibold hover:text-primary">
              ChatDify
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}