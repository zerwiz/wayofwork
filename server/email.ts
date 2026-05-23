/**
 * Email — SMTP sending + inbound email parsing for the Way of Work channel system.
 *
 * Uses raw SMTP via Bun.connect (TLS). Supports:
 * - HTML and plain-text email sending
 * - Inbound email parsing from forwarding services (SendGrid, Mailgun, etc.)
 *
 * Environment variables (see .env.example):
 *   WOP_SMTP_HOST       — SMTP server hostname
 *   WOP_SMTP_PORT       — SMTP server port (default 587)
 *   WOP_SMTP_USER       — SMTP username
 *   WOP_SMTP_PASS       — SMTP password
 *   WOP_SMTP_FROM       — From address (default: noreply@wayofwork.local)
 *   WOP_SMTP_FROM_NAME  — From name (default: Way of Work)
 */

import { db } from "./db";

export interface EmailSendOpts {
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export interface EmailSendResult {
	ok: boolean;
	error?: string;
}

/**
 * Send an email via SMTP. Uses raw SMTP over TLS.
 * Falls back to logging if SMTP is not configured.
 */
export async function sendEmail(opts: EmailSendOpts): Promise<EmailSendResult> {
	const host = process.env.WOP_SMTP_HOST;
	if (!host) {
		console.log(`[email] SMTP not configured — logging email to=${opts.to} subject="${opts.subject}"`);
		logEmailSent(opts);
		return { ok: true };
	}

	const port = parseInt(process.env.WOP_SMTP_PORT || "587", 10);
	const user = process.env.WOP_SMTP_USER || "";
	const pass = process.env.WOP_SMTP_PASS || "";
	const fromAddr = process.env.WOP_SMTP_FROM || "noreply@wayofwork.local";
	const fromName = process.env.WOP_SMTP_FROM_NAME || "Way of Work";

	try {
		await sendSmtp(host, port, user, pass, fromAddr, fromName, opts.to, opts.subject, opts.text, opts.html);
		logEmailSent(opts);
		return { ok: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error(`[email] SMTP send failed: ${message}`);
		return { ok: false, error: message };
	}
}

function logEmailSent(opts: EmailSendOpts): void {
	try {
		const id = `eml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.query(`
			INSERT INTO channel_message_logs (id, tenant_id, channel, channel_user_id, direction, message_text, message_type)
			VALUES (?, NULL, 'email', ?, 'outbound', ?, 'email')
		`).run(id, opts.to, `[${opts.subject}] ${opts.text}`);
	} catch { /* best-effort */ }
}

/**
 * Low-level SMTP send via Bun.connect.
 * Supports LOGIN auth, TLS, and multipart (text + html) messages.
 */
async function sendSmtp(
	host: string,
	port: number,
	user: string,
	pass: string,
	fromAddr: string,
	fromName: string,
	to: string,
	subject: string,
	text: string,
	html?: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const socket = Bun.connect({
			hostname: host,
			port,
			socket: {
				data(socket, data) {
					const str = new TextDecoder().decode(data);
					steps.push(str);
					processStep(socket, str);
				},
				error(socket, error) {
					reject(error);
				},
				close() {
					if (!done) reject(new Error("Connection closed unexpectedly"));
				},
			},
		});

		const timeout = setTimeout(() => {
			done = true;
			socket.end();
			reject(new Error("SMTP timeout"));
		}, 30000);

		let done = false;
		let step = 0;
		const steps: string[] = [];
		let buffer = "";

		function send(cmd: string) {
			buffer += cmd + "\r\n";
			if (buffer.length > 1000) {
				socket.write(buffer);
				buffer = "";
			}
		}

		function flush() {
			if (buffer) {
				socket.write(buffer);
				buffer = "";
			}
		}

		function processStep(socket: any, response: string) {
			if (done) return;
			const code = parseInt(response.substring(0, 3), 10);

			if (step === 0) {
				// Server greeting
				if (code !== 220) {
					fail(response);
					return;
				}
				step = 1;
				send(`EHLO wayofwork.local`);
			} else if (step === 1) {
				// EHLO response — check if TLS is supported
				if (code !== 250) {
					fail(response);
					return;
				}
				if (response.includes("STARTTLS")) {
					step = 2;
					send("STARTTLS");
				} else {
					step = 3;
					if (user) {
						send(`AUTH LOGIN`);
					} else {
						sendMail();
					}
				}
			} else if (step === 2) {
				// STARTTLS
				if (code !== 220) {
					fail(response);
					return;
				}
				// Upgrade to TLS
				socket.flush();
				// After TLS, re-send EHLO
				step = 3;
				send(`EHLO wayofwork.local`);
			} else if (step === 3) {
				// EHLO after STARTTLS or no TLS
				if (code !== 250) {
					fail(response);
					return;
				}
				if (user) {
					step = 4;
					send(`AUTH LOGIN`);
				} else {
					sendMail();
				}
			} else if (step === 4) {
				// AUTH LOGIN — server asks for username (base64)
				if (code !== 334) {
					fail(response);
					return;
				}
				step = 5;
				send(Buffer.from(user).toString("base64"));
			} else if (step === 5) {
				// AUTH LOGIN — server asks for password (base64)
				if (code !== 334) {
					fail(response);
					return;
				}
				step = 6;
				send(Buffer.from(pass).toString("base64"));
			} else if (step === 6) {
				// AUTH LOGIN — authenticated
				if (code !== 235) {
					fail(response);
					return;
				}
				sendMail();
			} else if (step === 7) {
				// MAIL FROM response
				if (code !== 250) {
					fail(response);
					return;
				}
				send(`RCPT TO:<${to}>`);
			} else if (step === 8) {
				// RCPT TO response
				if (code !== 250 && code !== 251) {
					fail(response);
					return;
				}
				send("DATA");
			} else if (step === 9) {
				// DATA response — send email content
				if (code !== 354) {
					fail(response);
					return;
				}
				const boundary = `----=_Part_${Date.now()}`;
				const headers = [
					`From: ${fromName} <${fromAddr}>`,
					`To: ${to}`,
					`Subject: ${subject}`,
					"MIME-Version: 1.0",
				];

				if (html) {
					headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
					const body = [
						"",
						`--${boundary}`,
						"Content-Type: text/plain; charset=UTF-8",
						"Content-Transfer-Encoding: quoted-printable",
						"",
						text,
						`--${boundary}`,
						"Content-Type: text/html; charset=UTF-8",
						"Content-Transfer-Encoding: quoted-printable",
						"",
						html,
						`--${boundary}--`,
						".",
					];
					headers.push("", ...body);
				} else {
					headers.push("Content-Type: text/plain; charset=UTF-8");
					headers.push("Content-Transfer-Encoding: quoted-printable");
					headers.push("", text, ".");
				}

				flush();
				socket.write(headers.join("\r\n") + "\r\n");
				step = 10;
			} else if (step === 10) {
				// Email sent
				if (code !== 250) {
					fail(response);
					return;
				}
				send("QUIT");
			} else if (step === 11) {
				// QUIT response
				done = true;
				clearTimeout(timeout);
				flush();
				socket.end();
				resolve();
			}
		}

		function sendMail() {
			step = 7;
			send(`MAIL FROM:<${fromAddr}>`);
		}

		function fail(response: string) {
			done = true;
			clearTimeout(timeout);
			socket.end();
			reject(new Error(`SMTP error at step ${step}: ${response}`));
		}
	});
}

/**
 * Parse an inbound email from a forwarding service (SendGrid, Mailgun, etc.).
 * Returns the parsed email fields.
 */
export function parseInboundEmail(body: Record<string, any>): {
	from: string;
	subject: string;
	text: string;
	html?: string;
	attachments?: { filename: string; content: string; contentType: string }[];
} {
	// Support multiple forwarding service formats
	const from = body.from || body.sender || body.envelope?.from || "";
	const subject = body.subject || "";
	const text = body.text || body["stripped-text"] || body["body-plain"] || "";
	const html = body.html || body["body-html"] || "";

	let attachments: { filename: string; content: string; contentType: string }[] = [];
	if (Array.isArray(body.attachments)) {
		attachments = body.attachments.map((a: any) => ({
			filename: a.name || a.filename || "unknown",
			content: a.content || a.data || "",
			contentType: a.type || a["content-type"] || "application/octet-stream",
		}));
	}

	return { from, subject, text, html, attachments };
}
