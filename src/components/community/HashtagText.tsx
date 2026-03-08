import { useNavigate } from "react-router-dom";

interface HashtagTextProps {
  content: string;
  className?: string;
}

const HASHTAG_REGEX = /#(\w+)/g;

const HashtagText = ({ content, className = "" }: HashtagTextProps) => {
  const navigate = useNavigate();

  const parts = content.split(HASHTAG_REGEX);
  
  if (parts.length === 1) {
    return <span className={className}>{content}</span>;
  }

  const elements: React.ReactNode[] = [];
  let i = 0;
  let match;
  let lastIndex = 0;
  const regex = new RegExp(HASHTAG_REGEX.source, "g");

  while ((match = regex.exec(content)) !== null) {
    // Text before the hashtag
    if (match.index > lastIndex) {
      elements.push(<span key={`t-${i}`}>{content.slice(lastIndex, match.index)}</span>);
    }
    // The hashtag itself
    const tag = match[1];
    elements.push(
      <button
        key={`h-${i}`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/explore?tag=${tag}`);
        }}
        className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium transition-colors"
      >
        #{tag}
      </button>
    );
    lastIndex = regex.lastIndex;
    i++;
  }

  // Remaining text after last hashtag
  if (lastIndex < content.length) {
    elements.push(<span key={`t-end`}>{content.slice(lastIndex)}</span>);
  }

  return <span className={className}>{elements}</span>;
};

export default HashtagText;

export const extractHashtags = (content: string): string[] => {
  const matches = content.match(HASHTAG_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
};
