
export default function BlogCard({
    title,
    slug,
    publishDate
}) {
    return (
        <div className="mb-8 p-3 rounded-lg hover:bg-neutral-800">
            <a href={`blog/${slug}`}>
                <h2 className="text-xl font-bold pb-3" >{title}</h2>
                <p>{publishDate}</p>
            </a>
        </div>
    )
}