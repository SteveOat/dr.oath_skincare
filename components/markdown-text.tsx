import type { ReactNode } from "react"

type MarkdownTextProps = {
  text: string
  className?: string
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const strongPattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = strongPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(
      <strong key={`strong-${match.index}`} className="font-semibold">
        {match[1]}
      </strong>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const paragraphLines: string[] = []
  let listType: "unordered-list" | "ordered-list" | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: "paragraph", lines: [...paragraphLines] })
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    blocks.push({ type: listType, items: [...listItems] })
    listType = null
    listItems = []
  }

  for (const line of text.replace(/\r\n/g, "\n").trim().split("\n")) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/)
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/)

    if (unordered || ordered) {
      flushParagraph()
      const nextListType = unordered ? "unordered-list" : "ordered-list"
      if (listType && listType !== nextListType) {
        flushList()
      }
      listType = nextListType
      listItems.push((unordered?.[1] || ordered?.[1] || "").trim())
      continue
    }

    flushList()
    paragraphLines.push(line.trimEnd())
  }

  flushParagraph()
  flushList()

  return blocks
}

export function MarkdownText({ text, className = "text-sm leading-relaxed" }: MarkdownTextProps) {
  const blocks = parseBlocks(text)

  return (
    <div className={`${className} break-words`}>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className="mb-2 last:mb-0">
              {block.lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInlineMarkdown(line)}
                </span>
              ))}
            </p>
          )
        }

        const ListTag = block.type === "ordered-list" ? "ol" : "ul"
        const listClass =
          block.type === "ordered-list"
            ? "mb-2 ml-4 list-decimal space-y-1 marker:text-current last:mb-0"
            : "mb-2 ml-4 list-disc space-y-1 marker:text-current last:mb-0"

        return (
          <ListTag key={index} className={listClass}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
            ))}
          </ListTag>
        )
      })}
    </div>
  )
}
