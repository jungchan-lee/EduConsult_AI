'use client';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  // Simple markdown parsing for common patterns
  const parseMarkdown = (text: string) => {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert \n to <br>
    text = text.replace(/\n/g, '<br>');
    // Convert bullet points
    text = text.replace(/^\* /gm, '• ');
    return text;
  };

  return (
    <div
      className="text-sm prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{
        __html: parseMarkdown(content),
      }}
    />
  );
};
