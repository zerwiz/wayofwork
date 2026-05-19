/**
 * SessionManagerClient - Client-side wrapper for the PTY WebSocket server
 * Connects to the server at the specified port and provides session management
 */

export class SessionManagerClient {
  private ws: WebSocket | null = null;
  private port: number;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private sessionId: string | null = null;

  constructor(port: number = 3333) {
    this.port = port;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://localhost:${this.port}/api/session`);

        this.ws.onopen = () => {
          console.log('Connected to PTY server');
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from PTY server');
          this.ws = null;
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from the server
   */
  private handleMessage(data: any) {
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data);
    }
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Send a message to the server
   */
  private send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  /**
   * Create a new terminal session
   */
  createSession(shell: string = 'bash'): string {
    this.sessionId = crypto.randomUUID();
    this.send('createSession', { sessionId: this.sessionId, shell });
    return this.sessionId;
  }

  /**
   * Write input to the PTY
   */
  handleConnection(sessionId: string, input: string) {
    this.send('write', { sessionId, input });
  }

  /**
   * Resize the PTY
   */
  resize(sessionId: string, rows: number, cols: number) {
    this.send('resize', { sessionId, rows, cols });
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string) {
    this.send('closeSession', { sessionId });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default SessionManagerClient;