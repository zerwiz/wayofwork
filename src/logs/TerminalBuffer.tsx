/**
 * TerminalBuffer - Manages terminal history and display
 * Maintains scrollback and current buffer state
 */

import { useRef, useEffect } from 'react';

/**
 * TerminalBuffer Component Props
 */
type TerminalBufferProps = {
  sessionId: string;
  rows: any[];
  buffer: any[];
  onResize?: (rows: number, cols: number) => void;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
};

/**
 * TerminalBuffer Component
 * Manages buffer state and scrollback
 */
export const TerminalBuffer = ({
  sessionId = 'default',
  rows = [],
  onResize,
  onScroll,
}: TerminalBufferProps) => {
  const bufferRef = useRef({
    current: [] as any[],
    scrollback: [] as any[],
    width: 80,
    height: 24,
    cursor: { x: 0, y: 0 },
    mode: 'primary' as 'primary' | 'alternate',
    element: null as HTMLDivElement | null,
  });

  /**
   * Handle resize
   */
  useEffect(() => {
    if (onResize) {
      const handleResize = () => {
        const element = bufferRef.current?.element;
        if (element) {
          const rect = element.getBoundingClientRect();
          onResize(rect.width, rect.height);
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [sessionId, onResize]);

  /**
   * Handle scroll
   */
  useEffect(() => {
    if (onScroll) {
      const handleScroll = () => {
        const element = bufferRef.current?.element;
        if (element) {
          onScroll(element.scrollTop, element.scrollHeight);
        }
      };
      const element = bufferRef.current?.element;
      if (element) {
        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
      }
    }
  }, [sessionId, onScroll]);

  /**
   * Render terminal buffer
   */
  return (
    <div
      ref={(el) => {
        if (bufferRef.current) {
          bufferRef.current.element = el;
        }
      }}
      className="terminal-buffer"
      style={{ minHeight: '200px' }}
    >
      {rows.map((row: any, index: number) => (
        <div key={row.id || index}>
          {row.content}
        </div>
      ))}
    </div>
  );
};

export default TerminalBuffer;
