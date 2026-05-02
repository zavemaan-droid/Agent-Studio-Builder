import { useState, useRef, useEffect } from "react";
import { useStudio, parseFilesFromText } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { Send, Trash2, Zap, Bot, User, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const SUGGESTIONS = [
  "Build me a todo app with categories and due dates",
  "Create an Android calculator app",
  "I want to make a simple note-taking app",
  "Build a countdown timer with multiple timers",
  "Make a budget tracker that works offline",
];

function CodeBlock({ text, projectFiles }: {
  text: string;
  projectFiles?: { path: string; content: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const files = parseFilesFromText(text);
  if (files.length === 0) return null;

  const copy = () => {
    navigator.clipboard.writeText(files.map(f => `// ${f.path}\n${f.content}`).join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Generated Files</span>
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">{files.length} file{files.length > 1 ? "s" : ""}</span>
        </div>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="divide-y divide-border">
        {files.slice(0, 3).map((f, i) => (
          <div key={i} className="px-3 py-2">
            <p className="text-[11px] font-mono text-muted-foreground mb-1">{f.path}</p>
            <pre className="text-xs text-foreground/80 font-mono overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
              {f.content.slice(0, 300)}{f.content.length > 300 ? "..." : ""}
            </pre>
          </div>
        ))}
        {files.length > 3 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">+{files.length - 3} more files</div>
        )}
      </div>
    </div>
  );
}

function formatMessage(text: string): string {
  // Remove the files block from display text
  return text.replace(/```files[\s\S]*?```/g, "").trim();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

export default function AssistantPage() {
  const { chatHistory, sendChat, clearChat, startBuild, settings } = useStudio();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [, setLocation] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendChat(msg);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Detect "start build" intent in assistant messages
  const detectBuildAction = (content: string) => {
    const files = parseFilesFromText(content);
    return files.length > 0;
  };

  const handleStartBuildFromMessage = async (description: string) => {
    const id = await startBuild(description, settings.selectedPlatform);
    setLocation(`/studio?build=${id}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Agent Studio AI</h1>
            <p className="text-[11px] text-muted-foreground">Free · Powered by Pollinations{settings.groqKey ? " + Groq" : ""}</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
          data-testid="clear-chat"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Describe your app</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tell me what you want to build. I'll ask a couple questions, then write the code for you — for free.
              </p>
            </div>
            <div className="grid gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-4 py-2.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                  data-testid={`suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => {
          const isUser = msg.role === "user";
          const displayText = formatMessage(msg.content);
          const hasFiles = detectBuildAction(msg.content);

          return (
            <div key={msg.id} className={cn("flex gap-3 slide-up", isUser && "flex-row-reverse")}>
              {/* Avatar */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                isUser ? "bg-secondary" : "bg-primary/20"
              )}>
                {isUser
                  ? <User className="w-3.5 h-3.5 text-muted-foreground" />
                  : <Bot className="w-3.5 h-3.5 text-primary" />
                }
              </div>

              {/* Bubble */}
              <div className={cn("max-w-[80%] space-y-1", isUser && "items-end flex flex-col")}>
                <div className={cn(
                  "px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm"
                )}>
                  {msg.content === "" ? <TypingDots /> : (
                    <div className="whitespace-pre-wrap break-words">
                      {displayText}
                      {!isUser && !sending && msg === chatHistory[chatHistory.length - 1] ? "" : ""}
                    </div>
                  )}
                </div>

                {/* File output card */}
                {!isUser && hasFiles && (
                  <div className="w-full">
                    <CodeBlock text={msg.content} />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleStartBuildFromMessage(
                          chatHistory.findLast(m => m.role === "user")?.content ?? ""
                        )}
                        data-testid="start-build-from-chat"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Run Full Build Pipeline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setLocation("/projects")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Projects
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sending && chatHistory[chatHistory.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-card border border-border rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the app you want to build..."
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground max-h-32 leading-relaxed py-0.5"
            style={{ scrollbarWidth: "none" }}
            data-testid="chat-input"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
              input.trim() && !sending
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            data-testid="send-button"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Free via Pollinations AI · Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
