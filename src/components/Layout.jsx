import Header from "./Header"
export default function Layout({children}) {
    return (
        <main className="flex px-8 bg-white dark:bg-neutral-900 text-black dark:text-white">
            <div className="mx-auto max-w-5xl">
                <Header/>
                {children}
            </div>
        </main>
    )
}