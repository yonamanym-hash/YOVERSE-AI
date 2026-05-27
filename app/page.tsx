"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Send,
  Sparkles,
  Code2,
  Eye,
  Terminal,
  Loader2,
  Copy,
  Check,
  Zap,
} from "lucide-react";

export default function YoverseCoreStudio() {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();

  const copyToClipboard = async () => {
    if (lastAssistantMessage?.content) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(180,100%,35%)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[hsl(var(--background))]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[hsl(120,100%,50%)] border-2 border-[hsl(var(--background))]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Yoverse Core Studio
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Multi-Model AI Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            <span>Claude 3.5 + GPT-4o + Gemini</span>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Prompt Input & Chat */}
        <div className="w-1/2 flex flex-col border-r border-[hsl(var(--border))]">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-[hsl(var(--primary))]" />
                </div>
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                  Welcome to Core Studio
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md">
                  Powered by a fusion of Claude 3.5 Sonnet, GPT-4o, and
                  Gemini-Flash. Enter your prompt to generate code, analyze
                  data, or build applications.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--background))]"
                      : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-[hsl(var(--primary))]">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Response</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-[hsl(var(--primary))]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[hsl(var(--border))]">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Enter your prompt... (e.g., Build a dashboard component)"
                  className="w-full min-h-[100px] max-h-[200px] resize-none rounded-xl bg-[hsl(var(--input))] border border-[hsl(var(--border))] px-4 py-3 pr-14 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 bottom-3 p-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--background))] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                Press Enter to send, Shift + Enter for new line
              </p>
            </form>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="w-1/2 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "preview"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--background))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "code"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--background))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>

            {lastAssistantMessage && (
              <button
                onClick={copyToClipboard}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[hsl(120,100%,50%)]" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {/* Preview/Code Content */}
          <div className="flex-1 overflow-auto bg-[hsl(var(--muted))]">
            {activeTab === "preview" ? (
              <div className="h-full p-6">
                {lastAssistantMessage ? (
                  <div className="h-full rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 overflow-auto">
                    <div className="prose prose-invert max-w-none">
                      <pre className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap font-mono leading-relaxed">
                        {lastAssistantMessage.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center mb-4">
                      <Terminal className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
                      Live Preview
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
                      Your generated content will appear here. Start by entering
                      a prompt on the left.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full p-6">
                <div className="h-full rounded-xl bg-[hsl(240,6%,6%)] border border-[hsl(var(--border))] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,51%)]" />
                      <div className="w-3 h-3 rounded-full bg-[hsl(45,100%,50%)]" />
                      <div className="w-3 h-3 rounded-full bg-[hsl(120,100%,40%)]" />
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono ml-2">
                      output.tsx
                    </span>
                  </div>
                  <div className="p-4 overflow-auto h-[calc(100%-40px)]">
                    {lastAssistantMessage ? (
                      <pre className="text-sm font-mono leading-relaxed">
                        <code className="text-[hsl(var(--foreground))]">
                          {lastAssistantMessage.content}
                        </code>
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))]">
                        <p className="text-sm">
                          No code generated yet. Enter a prompt to begin.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
