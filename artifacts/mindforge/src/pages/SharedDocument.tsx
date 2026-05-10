import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Brain, FileText, File, Github, Globe, Tag, Hash, Clock, Layers, ExternalLink, Loader2, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SharedDoc {
  id: number;
  title: string;
  type: string;
  content: string;
  tags: string[];
  chunkCount: number;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  pdf: <File className="h-5 w-5 text-orange-400" />,
  markdown: <FileText className="h-5 w-5 text-blue-400" />,
  text: <FileText className="h-5 w-5 text-green-400" />,
  github: <Github className="h-5 w-5 text-purple-400" />,
  url: <Globe className="h-5 w-5 text-cyan-400" />,
};

function renderContent(type: string, content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (type === "markdown" || type === "github" || type === "url") {
      if (/^## /.test(line)) return <h2 key={i} className="text-lg font-semibold text-foreground mt-6 mb-2">{line.slice(3)}</h2>;
      if (/^### /.test(line)) return <h3 key={i} className="text-base font-semibold text-foreground/90 mt-4 mb-1">{line.slice(4)}</h3>;
      if (/^# /.test(line)) return <h1 key={i} className="text-xl font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h1>;
      if (/^- /.test(line) || /^\* /.test(line)) {
        return (
          <div key={i} className="flex items-start gap-2 my-1">
            <span className="text-primary mt-1.5 shrink-0">·</span>
            <p className="text-foreground/85 leading-relaxed">{line.slice(2)}</p>
          </div>
        );
      }
    }
    if (!line.trim()) return <div key={i} className="h-3" />;
    return <p key={i} className="text-foreground/85 leading-relaxed my-1">{line}</p>;
  });
}

function readingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.round(words / 200)) };
}

export default function SharedDocument() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid share link"); setLoading(false); return; }
    fetch(`${BASE}/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Document not found or no longer shared");
        return r.json();
      })
      .then((data: SharedDoc) => { setDoc(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [token]);

  const { words, mins } = doc ? readingTime(doc.content) : { words: 0, mins: 0 };

  return (
    <div className="min-h-screen bg-background" style={{ colorScheme: "dark" }}>
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">yukara</span>
          </div>
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1">
            Shared document
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading shared document...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground mb-1">Document unavailable</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {doc && (
          <div className="space-y-8">
            {/* Doc header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                {typeIcon[doc.type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{doc.type}</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">{doc.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border py-3">
                <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" />{words.toLocaleString()} words</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{mins} min read</span>
                <span className="flex items-center gap-1.5"><Hash className="h-4 w-4" />{doc.chunkCount} chunks</span>
                <span>{new Date(doc.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>

              {doc.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {doc.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{tag}</span>
                  ))}
                </div>
              )}

              {doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View original source
                </a>
              )}
            </div>

            {/* Content */}
            <div className="prose-sm max-w-none space-y-0.5">
              {renderContent(doc.type, doc.content)}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Shared via <span className="text-foreground font-medium">yukara</span></span>
              </div>
              <span className="text-xs text-muted-foreground">Last updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
