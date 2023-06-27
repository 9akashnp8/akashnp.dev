import { useState } from "react"

export default function Header() {
    const [homeActive, setHomeActive ] = useState(true);
    const [blogActive, setBlogActive ] = useState(false);
    const [contactActive, setContactActive ] = useState(false);

    function handleClick(event) {
        const eventSource = event.target.innerHTML;
        if ( eventSource == 'Home' )  {
            setHomeActive(true);
            setBlogActive(false);
            setContactActive(false);
        } else if ( eventSource == 'Blog' ) {
            setHomeActive(false);
            setBlogActive(true);
            setContactActive(false);
        } else {
            setHomeActive(false);
            setBlogActive(false);
            setContactActive(true);
        }
    }

    return (
        <header className="py-8">
            <nav className="flex items-center gap-3 md:gap-8">
                <a 
                    className={`${homeActive ? 'font-bold text-white' : ''} text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    onClick={handleClick}
                    href="/"
                >
                    Home
                </a>
                <a 
                    className={`${blogActive ? 'font-bold text-white' : ''} text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                    onClick={handleClick}
                    href="/blog"
                >
                    Blog
                </a>
                <abbr title="work in progress :)" className="contact-abbr">
                    <a 
                        className={`${contactActive ? 'font-bold text-white' : ''} text-neutral-400 text-lg p-2 rounded-lg hover:bg-neutral-800 cursor-pointer`}
                        onClick={handleClick}
                    >
                        Contact
                    </a>
                </abbr>
            </nav>
        </header>
    )
}