import { useState } from "react"

export default function Header() {
    return (
        <header className="py-8">
            <nav className="flex items-center gap-3 md:gap-8">
                <a 
                    className={`text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    href="/"
                >
                    Home
                </a>
                <a 
                    className={`text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    href="/blog"
                >
                    Blog
                </a>
                <abbr title="work in progress :)" className="contact-abbr">
                    <a 
                        className={`text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    >
                        Contact
                    </a>
                </abbr>
            </nav>
        </header>
    )
}