// components/modals/HowToUseModal.tsx
import React, { useState, useCallback, useMemo } from "react";

export interface HowToUseModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: HowToUseSectionId;
}

export interface HowToUseSectionHandlers {
  onNgrokSetup: () => void;
  onHostDoctor: () => void;
  onPlayground: () => void;
  onAccessibility: () => void;
  onGiveFeedback: () => void;
  onSupportUs: () => void;
  onViewLicense: () => void;
}

export interface HowToUseSectionHandlersWithRefs extends HowToUseSectionHandlers {
  onToggleDeveloperTools: () => void;
  canDownloadUpdate: boolean;
  onDownloadUpdate: () => void;
}

export type HowToUseSectionId =
  | "welcome"
  | "ngrok"
  | "host-doctor"
  | "playground"
  | "accessibility"
  | "feedback"
  | "support"
  | "license"
  | null;

const WOP_PUBLIC_REPO_URL = "https://github.com/badlogic/pi-mono";
const WOP_FEEDBACK_CONTACT_URL = "https://github.com/badlogic/pi-mono/issues";
const WOP_SUPPORT_HOME_URL = "https://github.com/badlogic/pi-mono";

const HowToUseModal: React.FC<HowToUseModalProps & HowToUseSectionHandlersWithRefs> = ({
  open,
  onClose,
  initialSection = "welcome",
  onNgrokSetup,
  onHostDoctor,
  onPlayground,
  onAccessibility,
  onGiveFeedback,
  onSupportUs,
  onViewLicense,
  onToggleDeveloperTools,
  canDownloadUpdate,
  onDownloadUpdate,
}) => {
  const [currentSection, setCurrentSection] = useState<HowToUseSectionId>(initialSection);

  const sections: { id: HowToUseSectionId; title: string; render: () => React.JSX.Element }[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome",
        render: () => (
          <div className="howto-section welcome">
            <h2>Welcome to Way of Pi</h2>
            <p>
              Way of Pi is an AI-powered development environment that helps you
              build and debug applications with the help of intelligent agents.
            </p>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "ngrok",
        title: "Ngrok Tunnel Setup",
        render: () => (
          <div className="howto-section ngrok">
            <h2>Setting Up Ngrok Tunnels</h2>
            <div className="setup-steps">
              <h3>Step 1: Install Ngrok</h3>
              <p>
                Ngrok creates secure tunnels from your local development server
                to the public internet.
              </p>
              <div className="code-block">
                npm install -g ngrok
              </div>
              <h3>Step 2: Authenticate</h3>
              <p>
                Run <code>ngrok config add-authtoken</code> and enter your token
                from the Ngrok dashboard.
              </p>
              <h3>Step 3: Start Tunnel</h3>
              <p>
                Run <code>ngrok http 3000</code> to tunnel your local server.
              </p>
              <button onClick={onNgrokSetup} className="action-button">
                Configure Ngrok
              </button>
            </div>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "host-doctor",
        title: "Host Doctor",
        render: () => (
          <div className="howto-section host-doctor">
            <h2>Host Doctor Panel</h2>
            <p>
              The Host Doctor panel shows your server health, running processes,
              and system resources.
            </p>
            <div className="diagnostics-grid">
              <div className="diagnostic-item">
                <strong>Uptime</strong>
                <span className="value">--</span>
              </div>
              <div className="diagnostic-item">
                <strong>Memory</strong>
                <span className="value">--</span>
              </div>
              <div className="diagnostic-item">
                <strong>CPU Usage</strong>
                <span className="value">--</span>
              </div>
            </div>
            <button onClick={onHostDoctor} className="action-button">
              Open Host Doctor
            </button>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "playground",
        title: "Editor Playground",
        render: () => (
          <div className="howto-section playground">
            <h2>Editor Playground</h2>
            <p>
              The Editor Playground lets you experiment with different editor
              configurations, keybindings, and extensions.
            </p>
            <div className="playground-options">
              <h3>Quick Setup</h3>
              <ol>
                <li>Click <strong>Open Playground</strong> from Help menu</li>
                <li>Choose your preferred editor theme</li>
                <li>Test keybindings in the sandbox</li>
              </ol>
            </div>
            <button
              onClick={() =>
                window.open(
                  `${WOP_PUBLIC_REPO_URL}/blob/main/docs/PLAYGROUND.md`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="action-button"
            >
              View Playground Docs
            </button>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "accessibility",
        title: "Accessibility Features",
        render: () => (
          <div className="howto-section accessibility">
            <h2>Accessibility Features</h2>
            <p>
              Way of Pi supports various accessibility features to help users
              with different needs.
            </p>
            <div className="accessibility-list">
              <h3>Screen Reader Support</h3>
              <ul>
                <li>Full ARIA labels on all interactive elements</li>
                <li>Keyboard-only navigation</li>
                <li>Screen reader announcements for actions</li>
              </ul>
              <h3>High Contrast Mode</h3>
              <button onClick={onAccessibility} className="action-button">
                Configure High Contrast
              </button>
            </div>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "feedback",
        title: "Give Feedback",
        render: () => (
          <div className="howto-section feedback">
            <h2>Give Feedback</h2>
            <p>
              Your feedback helps improve Way of Pi. Please share your thoughts!
            </p>
            <div className="feedback-cta">
              <a
                href={WOP_FEEDBACK_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Submit an Issue
              </a>
            </div>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "support",
        title: "Support Us",
        render: () => (
          <div className="howto-section support">
            <h2>Support Us</h2>
            <p>
              Way of Pi is an open-source project. Consider supporting its
              development!
            </p>
            <div className="support-links">
              <a
                href={WOP_SUPPORT_HOME_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Project Home
              </a>
            </div>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
      {
        id: "license",
        title: "MIT License",
        render: () => (
          <div className="howto-section license">
            <h2>MIT License</h2>
            <p>
              Way of Pi is released under the MIT License. You are free to use,
              modify, and distribute this software.
            </p>
            <div className="license-text">
              <p>
                Permission is hereby granted, free of charge, to any person
                obtaining a copy of this software and associated documentation
                files (the "Software"), to deal in the Software without
                restriction, including without limitation the rights to use,
                copy, modify, merge, publish, distribute, sublicense, and/or
                sell copies of the Software, and to permit persons to whom the
                Software is furnished to do so, subject to the following
                conditions:
              </p>
              <p>
                The above copyright notice and this permission notice shall be
                included in all copies or substantial portions of the Software.
              </p>
            </div>
            <button onClick={onViewLicense} className="action-button">
              View Full License
            </button>
            <button onClick={onClose} className="modal-close-button">
              Close
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const navigateToSection = useCallback(
    (sectionId: HowToUseSectionId) => {
      if (sectionId && sectionId !== currentSection) {
        setCurrentSection(sectionId);
      }
    },
    [currentSection],
  );

  if (!open) return null;

  const activeSection = sections.find((s) => s.id === currentSection);

  if (!activeSection) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content howto-modal">
        <header className="modal-header">
          <h1>{activeSection.title}</h1>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        <main className="modal-body">
          {activeSection.render()}
        </main>

        <footer className="modal-footer">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => navigateToSection(section.id)}
              className={`section-tab ${
                currentSection === section.id ? "active" : ""
              }`}
            >
              {section.title}
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
};

export default HowToUseModal;
