
function Heading({ heading }) {
  return <a href={`#${heading.slug}`}>{heading.text}</a>
}

export default function TableOfContents({ headings }) {
  return (
    <aside id="table-of-contents" className="sticky top-10 self-start">
      <h2 className="font-bold text-xl pb-3">Contents</h2>
      <ul className="text-slate-400">
        {headings.map((heading) => {
          if (heading.depth === 2) {
            return (
              <li
                key={heading.slug}
                className="pb-3 hover:text-slate-100"
              >
                <Heading heading={heading} />
              </li>
            )
          } else if (heading.depth === 3) {
            return (
              <ul key={heading.slug} className="ml-5">
                <li className="pb-3 hover:text-slate-100">
                  <Heading heading={heading} />
                </li>
              </ul>
            )
          }
        })}
      </ul>
    </aside>
  )
}
