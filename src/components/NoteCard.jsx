
export default function BlogCard({
    title, content, slug, 
}) {
    return (
        <div className="pb-8">
            <a href={`/notes/${slug}`} className="hover:underline underline-offset-4">
                <h1 className="text-3xl font-bold pb-3" >{title}</h1>                
            </a>
            <p className="truncate ...">{content}</p>
        </div>
    )
}