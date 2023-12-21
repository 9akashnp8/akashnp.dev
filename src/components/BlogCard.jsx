
export default function BlogCard({
    title, slug, publishDate
}) {
    return (
        <div className="pb-8">
            <a href={`blog/${slug}`} className="hover:underline underline-offset-4">
                <h2 className="text-2xl font-bold pb-3" >{title}</h2>                
            </a>
            <p>{publishDate}</p>
        </div>
    )
}