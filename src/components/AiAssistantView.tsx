import { AlertTriangle, Bot, RefreshCw, Send, Trash2, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  AiGroundedMeta,
  AirQualityReport,
  ChatMessage,
  LocationInfo,
  UserPreferences,
} from '../types/airaware';
import { buildGroundedAiContext } from '../utils/aiContext';
import { formatMeasurementAge } from '../utils/openaqMapper';

interface AiAssistantViewProps {
  report: AirQualityReport | null;
  location: LocationInfo;
  preferences: UserPreferences;
  isLoadingAqi?: boolean;
  onReportUpdate?: (report: AirQualityReport) => void;
  onRefreshAqi?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Is it safe to go outside today?',
  'What does PM2.5 mean?',
  'How can I protect my family from winter smog?',
  'When should I open my windows?',
  'How can I reduce indoor pollution?',
  'Is cycling better than travelling by car?',
  'What precautions should children take?',
  'How can I reduce my carbon footprint?',
];

function statusToneClass(cat: AiGroundedMeta['statusCategory']): string {
  if (cat === 'live-ground') return 'text-[#16A34A] dark:text-emerald-400';
  if (cat === 'supplemented-ground' || cat === 'estimated-model') {
    return 'text-[#F59E0B] dark:text-amber-400';
  }
  return 'text-[#DC2626] dark:text-red-400';
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedMessageText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
              <span>{renderInlineBold(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

export function AiAssistantView({
  report,
  location,
  preferences,
  isLoadingAqi = false,
  onReportUpdate,
  onRefreshAqi,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am AirAware Assistant. Every reply fetches the latest backend measurements for your selected city and tailors practical advice to your lifestyle—including affordable family steps and clear distinctions between personal protection, local air pollution, and CO2 reduction.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const grounded = useMemo(
    () =>
      buildGroundedAiContext({
        report,
        standard: preferences.aqiStandard,
        preferences,
      }),
    [report, preferences]
  );

  const meta = grounded.meta;
  const activeLocation = report?.location ?? location;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages
            .filter((m) => !m.error && m.id !== 'welcome-msg')
            .map((m) => ({ role: m.role, content: m.content })),
          location: activeLocation,
          aqiStandard: preferences.aqiStandard,
          preferences: {
            lifestyle: preferences.lifestyle,
            wakeUpTime: preferences.wakeUpTime,
            outdoorPreference: preferences.outdoorPreference,
            primaryTransport: preferences.primaryTransport,
            householdPreference: preferences.householdPreference,
            sensitiveConsiderations: preferences.sensitiveConsiderations,
          },
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        groundedMeta?: AiGroundedMeta;
        latestReport?: AirQualityReport | null;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from AirAware Assistant.');
      }

      if (data.latestReport && onReportUpdate) {
        onReportUpdate(data.latestReport);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || '',
          timestamp: new Date().toISOString(),
          meta: data.groundedMeta ?? meta,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Unable to connect to Gemini AI right now.',
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8 flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden h-[660px]">
        {/* Context Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
                AirAware Assistant (Gemini AI)
              </h2>
              <p
                data-testid="ai-grounding-summary"
                className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug"
              >
                {activeLocation.name} · {meta.standardLabel}{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {meta.aqi ?? 'N/A'}
                </span>{' '}
                ({meta.categoryLabel}) ·{' '}
                <span className={`font-semibold ${statusToneClass(meta.statusCategory)}`}>
                  {meta.statusCategory === 'live-ground'
                    ? 'Live ground sensor'
                    : meta.statusCategory === 'supplemented-ground'
                    ? 'Ground + model fallback'
                    : meta.statusCategory === 'estimated-model'
                    ? 'Estimated (CAMS model)'
                    : meta.statusCategory === 'demo'
                    ? 'DEMO'
                    : 'Unavailable'}
                </span>
              </p>
              <p
                data-testid="ai-source-timestamp"
                className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5 leading-snug"
              >
                Source: {meta.dataSource} · Measured:{' '}
                {meta.lastUpdated
                  ? `${new Date(meta.lastUpdated).toLocaleString()} (${formatMeasurementAge(
                      meta.lastUpdated
                    )})`
                  : 'Unavailable'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onRefreshAqi && (
                <button
                  type="button"
                  onClick={onRefreshAqi}
                  disabled={isLoadingAqi || sending}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAqi ? 'animate-spin' : ''}`} />
                  <span>Sync AQI</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome-msg',
                      role: 'assistant',
                      content:
                        'Conversation cleared. Ask me anything about your current air quality, affordable family steps, or cleaner daily travel.',
                      timestamp: new Date().toISOString(),
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {meta.statusCategory !== 'live-ground' && (
            <div
              data-testid="ai-provenance-notice"
              className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 leading-snug"
            >
              <span className="font-semibold">Data note: </span>
              <span>{meta.statusLabel}.</span>
              {meta.unavailablePollutants.length > 0 && (
                <span> Unavailable: {meta.unavailablePollutants.join(', ')}.</span>
              )}
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-[#0F172A] text-white dark:bg-slate-700'
                    : msg.error
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#16A34A] text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : msg.error ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div className="max-w-[84%] space-y-1.5">
                <div
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0F172A] text-white dark:bg-emerald-900/50 dark:text-slate-100'
                      : msg.error
                      ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                      : 'bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-100'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.error ? (
                    <FormattedMessageText content={msg.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {msg.role === 'assistant' && !msg.error && msg.meta && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums px-1">
                    Source: {msg.meta.dataSource} · Measured:{' '}
                    {msg.meta.lastUpdated
                      ? new Date(msg.meta.lastUpdated).toLocaleString()
                      : 'Unavailable'}{' '}
                    · {msg.meta.statusLabel}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16A34A] text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl px-4 py-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                Fetching latest backend air quality readings and preparing evidence-based advice...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900"
        >
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask AirAware Assistant
          </label>
          <input
            id="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about outdoor exercise, windows, PM2.5, or family precautions..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#14532D] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Suggested Prompts & Guardrails */}
      <aside className="xl:col-span-4 space-y-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-display text-sm font-bold text-[#0F172A] dark:text-white mb-3">
            Suggested Questions
          </h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => sendMessage(q)}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <h3 className="font-display text-sm font-bold text-[#0F172A] dark:text-white">
            Evidence & Safety Standards
          </h3>
          <p>
            Every message automatically retrieves the latest backend readings for your location,
            notes whether numbers come from ground sensors or CAMS model estimates, and flags stale
            or unavailable pollutants.
          </p>
          <p>
            Guidance clearly separates personal exposure protection, neighborhood emissions, and CO2
            impact—with affordable household options and no unsupported health or road-safety claims.
          </p>
        </section>
      </aside>
    </div>
  );
}
