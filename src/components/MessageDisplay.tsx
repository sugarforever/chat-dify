import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

interface MessageDisplayProps {
  content: string
}

export function MessageDisplay({ content }: MessageDisplayProps) {
  return (
    <div className="max-w-[80%] mr-auto">
      <ReactMarkdown 
        remarkPlugins={[remarkBreaks]}
        className="prose dark:prose-invert max-w-none"
        components={{
          a: ({ ...props }) => (
            <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ ...props }) => (
            <code
              {...props}
              className={`${
                !props.className
                  ? 'bg-muted px-1.5 py-0.5 rounded-sm font-mono text-sm'
                  : 'block bg-muted p-4 rounded-lg font-mono text-sm'
              }`}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 