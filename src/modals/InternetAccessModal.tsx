/**
 * Internet Access Modal
 * Modal component for internet access information and toggle
 * Following WHN Chat modal design specifications
 */

import { Globe, CheckCircle2, XCircle, Info, ExternalLink, AlertTriangle, Shield } from 'lucide-react';
import Modal from './Modal';

interface InternetAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  internetAccessEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function InternetAccessModal({
  isOpen,
  onClose,
  internetAccessEnabled,
  onToggle,
}: InternetAccessModalProps) {
  const handleToggle = () => {
    onToggle(!internetAccessEnabled);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Internet Access" maxWidth="lg">
      <div className="space-y-6">
        {/* Status Section */}
        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                internetAccessEnabled
                  ? 'bg-green-600/20 border-2 border-green-600'
                  : 'bg-gray-700/20 border-2 border-gray-600'
              }`}
            >
              <Globe
                className={`w-6 h-6 ${internetAccessEnabled ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Internet Access {internetAccessEnabled ? 'Enabled' : 'Disabled'}
              </h3>
              <p className="text-sm text-gray-400">
                {internetAccessEnabled
                  ? 'AI can search the web for real-time information'
                  : 'AI uses only its training data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {internetAccessEnabled ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-gray-500" />
            )}
          </div>
        </div>

        {/* Warning Section - Only show when enabling */}
        {!internetAccessEnabled && (
          <div className="flex items-start gap-3 p-4 bg-orange-900/20 rounded-lg border border-orange-700/50">
            <div className="flex-shrink-0 mt-0.5">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 rounded-full blur-md opacity-30 animate-pulse" />
                <div className="relative bg-orange-600/80 rounded-full p-2">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                <p className="font-semibold text-white text-base">Privacy Warning</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-orange-500/30">
                <p className="text-orange-100 text-sm leading-relaxed">
                  <strong className="text-orange-300">⚠️ Data Leak Risk:</strong> When using online searches, your
                  prompts and conversations may be transmitted to external services and third-party search engines.
                </p>
              </div>
              <ul className="text-orange-100 text-sm space-y-1.5 list-disc list-inside">
                <li>Your queries may be logged by search providers</li>
                <li>Conversation context may be shared externally</li>
                <li>Privacy cannot be guaranteed with internet searches</li>
              </ul>
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-gray-300">
              <p className="font-medium text-white">What is Internet Access?</p>
              <p>
                When enabled, the AI can search the web in real-time to provide current information, news, weather,
                prices, and up-to-date facts. It can cite sources and provide links for verification.
              </p>
            </div>
          </div>

          {/* GDPR & Data Leakage Warning - Always visible */}
          <div className="flex items-start gap-3 p-4 bg-red-900/20 rounded-lg border border-red-700/50">
            <div className="flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div className="space-y-3 flex-1">
              <p className="font-semibold text-white text-base">GDPR & Data Leakage Risk</p>
              <div className="bg-black/30 rounded-lg p-3 border border-red-500/30">
                <p className="text-red-100 text-sm leading-relaxed mb-2">
                  <strong className="text-red-300">⚠️ Important:</strong> When using online AI models (OpenAI, Anthropic, Gemini) for company research or private documents:
                </p>
                <ul className="text-red-100 text-sm space-y-1.5 list-disc list-inside ml-2">
                  <li>These services may not fully comply with GDPR regulations</li>
                  <li>Your sensitive data and company secrets may be used to train future models</li>
                  <li>Confidential information could leak into the model's training data</li>
                  <li>Company documents and private files are at risk of exposure</li>
                </ul>
              </div>
              <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-700/30">
                <p className="text-green-100 text-sm leading-relaxed">
                  <strong className="text-green-300">🔒 Privacy Solution:</strong> For maximum privacy and GDPR compliance, use local AI models like <strong>Ollama</strong> or <strong>LM Studio</strong>. These run entirely on your device, ensuring your data never leaves your computer, cannot be leaked to external services, and will never be used to train models.
                </p>
              </div>
            </div>
          </div>

          {internetAccessEnabled && (
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-sm">Capabilities when enabled:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Real-time web searches (DuckDuckGo, Wikipedia)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Current news and events</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Up-to-date data (weather, stocks, sports scores)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Source citations with links</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Fact-checking current information</span>
                </li>
              </ul>
            </div>
          )}

          {!internetAccessEnabled && (
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-sm">Best use cases for internet access:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Current events and news</span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Real-time data (weather, stocks, sports)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Recent developments and statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Fact-checking current information</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleToggle}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
              internetAccessEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
            }`}
          >
            {internetAccessEnabled ? 'Disable Internet Access' : 'Enable Internet Access'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
