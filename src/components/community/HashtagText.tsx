import { useNavigate } from "react-router-dom";

interface HashtagTextProps {
  content: string;
  className?: string;
}

// Match #hashtags and @mentions (by display name)
const TOKEN_REGEX = /(#\w+|@[\w\s]+?)(?=\s|$|[.,!?;:])/g;

const HashtagText = ({ content, className = "" }: HashtagTextProps) => {
  const navigate = useNavigate();

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match;
  const regex = new RegExp(TOKEN_REGEX.source, "g");

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`t-${i}`}>{content.slice(lastIndex, match.index)}</span>);
    }

    const token = match[0].trim();
    if (token.startsWith("#")) {
      const tag = token.slice(1);
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
    } else if (token.startsWith("@")) {
      const name = token.slice(1).trim();
      elements.push(
        <button
          key={`m-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/explore?q=${encodeURIComponent(name)}`);
          }}
          className="text-sky-400 hover:text-sky-300 hover:underline font-semibold transition-colors"
        >
          @{name}
        </button>
      );
    }

    lastIndex = regex.lastIndex;
    i++;
  }

  if (lastIndex < content.length) {
    elements.push(<span key="t-end">{content.slice(lastIndex)}</span>);
  }

  if (elements.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return <span className={className}>{elements}</span>;
};

export default HashtagText;

export const extractHashtags = (content: string): string[] => {
  const matches = content.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
};

export const extractMentions = (content: string): string[] => {
  const matches = content.match(/@([\w\s]+?)(?=\s|$|[.,!?;:])/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).trim()))];
};
