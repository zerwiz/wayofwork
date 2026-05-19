import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useRef,
  useEffect,
} from "react";
interface TerminalCommand {
  command: string;
  name: string;
  description?: string;
}

interface HermesTerminalViewProps {
  commands: Array<{ cmd: string; output: string; timestamp: Date }>;
  onCommandSubmit: (command: string) => Promise<string>;
  initialCommands: TerminalCommand[];
  hermesPath: string;
}

interface HermesTerminalViewRef {
  focus: () => void;
  clear: () => void;
  scrollToBottom: () => void;
}

/**
 * HermesTerminalView
 *
 * Interactive terminal interface for Hermes CLI commands.
 * Provides real-time command execution with syntax highlighting
 * and command history management.
 *
 * @param commands - Array of command history entries
 * @param onCommandSubmit - Async function to execute commands
 * @param initialCommands - Quick-access command suggestions
 * @param hermesPath - Path to Hermes installation directory
 */
export const HermesTerminalView = forwardRef<
  HermesTerminalViewRef,
  HermesTerminalViewProps
>(function HermesTerminalView(
  { commands, onCommandSubmit, initialCommands, hermesPath },
  ref,
) {
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setInput("");
      setCommandHistory([]);
    },
    scrollToBottom: () =>
      scrollRef.current?.scrollTo({ top: Infinity, behavior: "smooth" }),
  }));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Infinity, behavior: "smooth" });
  }, [commands]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [commandHistory, setCommandHistory] = useState(
    Array.isArray(commands) ? commands : [],
  );

  useEffect(() => {
    // Merge command history from props
    setCommandHistory(commands);
  }, [commands]);

  /**
   * Handle Enter key press in terminal input
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isExecuting) return;

    setIsExecuting(true);

    try {
      const output = await onCommandSubmit(input);
      setCommandHistory((prev) => [
        ...prev,
        {
          cmd: input,
          output,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setCommandHistory((prev) => [
        ...prev,
        {
          cmd: input,
          output: `Error: ${(error as Error).message}\n[!] Command failed`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsExecuting(false);
      setInput("");
    }
  };

  /**
   * Process command suggestions from initialCommands
   */
  const handleQuickCommand = async (command: TerminalCommand) => {
    await handleSubmit({
      preventDefault: () => {},
      target: { value: command.command } as unknown as HTMLFormElement,
    } as unknown as React.FormEvent);
  };

  /**
   * Highlight commands and output in terminal
   */
  const HighlightedOutput = React.useMemo(() => {
    if (!commandHistory.length) return null;

    return (
      <div className="terminal-outputs">
        {commandHistory.map((entry, index) => (
          <div key={index} className="terminal-entry">
            <div className="terminal-entry-header">
              <span className="command-indicator">➜</span>
              <span className="command-text">{entry.cmd}</span>
              <span className="timestamp">
                ({entry.timestamp.toLocaleTimeString()})
              </span>
            </div>
            <pre className="command-output">{entry.output}</pre>
          </div>
        ))}
      </div>
    );
  }, [commandHistory]);

  return (
    <div className="hermes-terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">🔥</span>
          Hermes Terminal
        </div>
        <div className="terminal-path">
          {hermesPath.split("/").filter(Boolean).join("/")}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="terminal-body"
        style={{
          height: "calc(100% - 50px)",
          overflow: "auto",
          fontFamily: '"Fira Code", "Menlo", "Monaco", "Consolas", monospace',
        }}
      >
        {HighlightedOutput || (
          <div className="terminal-placeholder">
            <div className="placeholder-icon">🚀</div>
            <div className="placeholder-text">
              Enter a command to interact with Hermes
            </div>
            <div className="placeholder-hints">
              Try:{" "}
              {initialCommands.map((cmd, i) => (
                <span
                  key={i}
                  className="hint"
                  onClick={() => handleQuickCommand(cmd)}
                  style={{ cursor: "pointer" }}
                >
                  {cmd.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <form className="terminal-input-form" onSubmit={handleSubmit}>
          <span className="prompt">➜</span>
          <span className="path">
            {hermesPath.split("/").filter(Boolean).pop() || ""}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isExecuting}
            className="terminal-input"
            placeholder="Type a command..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </form>
      </div>

      <div className="terminal-footer">
        <div className="footer-info">
          <span>Hermes CLI v{getCurrentVersion()}</span>
          <span>Connected to Honcho</span>
        </div>
        <div className="footer-keys">
          <span className="key">↑</span>
          <span className="key">↓</span>
          <span className="key-desc">Navigate history</span>
          <span className="key">Ctrl+C</span>
          <span className="key-desc">Cancel command</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Get current Hermes version (simulated)
 */
const getCurrentVersion = (): string => "1.0.0";

export default HermesTerminalView;
