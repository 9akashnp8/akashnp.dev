export default function ProjectCard({projectTitle, projectDescription, projectStack}) {
    return (
        <div className="card flex flex-col flex-grow justify-between p-8">
            <h3 className="text-2xl font-bold">{projectTitle}</h3>
            <p className="">{projectDescription}</p>
            <p className="ml-auto text-sm opacity-50">{projectStack}</p>
        </div>
    )
}