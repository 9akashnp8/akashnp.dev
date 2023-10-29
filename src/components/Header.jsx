import { useState } from "react"

export default function Header() {
    return (
        <header className="py-8">
            <nav className="flex items-center gap-3 md:gap-8">
                <a 
                    className={`text-neutral-400 text-md p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    href="/"
                >
                    home
                </a>
                <a 
                    className={`text-neutral-400 text-md p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    href="/blog"
                >
                    blog
                </a>
                <a 
                    className={`text-neutral-400 text-md p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    href="/notes"
                >
                    notes
                </a>
            </nav>
        </header>
    )
}