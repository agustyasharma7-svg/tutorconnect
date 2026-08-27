'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type ThreadMeta = {
  threadId: string;
  agreementId: string;
  agreementStatus: string;
  canSend: boolean;
  studentName: string;
  tutorName: string;
};

type Msg = {
  id: string;
  body: string;
  senderUserId: string;
  senderName: string;
  createdAt: string;
};

export default function AgreementChatPage() {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const { locale, agreementId } = useParams<{
    locale: string;
    agreementId: string;
  }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (access: string, threadId: string, after?: string) => {
      const q = after
        ? `?after=${encodeURIComponent(after)}`
        : '?limit=100';
      const res = await apiWithAuth<{
        canSend: boolean;
        agreementStatus: string;
        messages: Msg[];
      }>(`/chat/threads/${threadId}/messages${q}`, access);
      if (after) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const next = res.messages.filter((m) => !ids.has(m.id));
          return next.length ? [...prev, ...next] : prev;
        });
      } else {
        setMessages(res.messages);
      }
      setMeta((m) =>
        m
          ? {
              ...m,
              canSend: res.canSend,
              agreementStatus: res.agreementStatus,
            }
          : m,
      );
    },
    [],
  );

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || (user.role !== 'STUDENT' && user.role !== 'TUTOR')) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    setUserId(user.id);
    apiWithAuth<ThreadMeta>(`/chat/threads/by-agreement/${agreementId}`, access)
      .then(async (m) => {
        setMeta(m);
        await loadMessages(access, m.threadId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [agreementId, locale, router, loadMessages]);

  useEffect(() => {
    if (!token || !meta?.threadId) return;
    const id = setInterval(() => {
      const last = messages[messages.length - 1]?.createdAt;
      loadMessages(token, meta.threadId, last).catch(() => undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [token, meta?.threadId, messages, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!meta || !text.trim()) return;
    try {
      const msg = await apiWithAuth<Msg>(
        `/chat/threads/${meta.threadId}/messages`,
        token,
        { method: 'POST', body: JSON.stringify({ text: text.trim() }) },
      );
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ minHeight: '70vh' }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{t('conversation')}</h1>
            {meta && (
              <p className="text-sm text-gray-600">
                {meta.studentName} ↔ {meta.tutorName} · {meta.agreementStatus}
              </p>
            )}
          </div>
          <Link href={`/${locale}/chat`} className="text-sm text-blue-600">
            {tc('back')}
          </Link>
        </div>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border bg-white p-4">
          {!messages.length && (
            <p className="text-sm text-gray-500">{t('noMessages')}</p>
          )}
          {messages.map((m) => {
            const mine = m.senderUserId === userId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-xs opacity-70">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {meta?.canSend ? (
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={2000}
              required
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              {t('send')}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-gray-600">{t('readOnly')}</p>
        )}
      </main>
    </>
  );
}
