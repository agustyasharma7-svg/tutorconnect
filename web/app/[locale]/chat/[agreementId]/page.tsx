'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Input,
  PageHeader,
} from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
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
    <AppFrame>
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-6">
        <PageHeader
          title={t('conversation')}
          description={
            meta
              ? `${meta.studentName} ↔ ${meta.tutorName} · ${meta.agreementStatus}`
              : undefined
          }
          actions={
            <ButtonLink href={`/${locale}/chat`} variant="link" size="sm">
              {tc('back')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-2">{error}</Alert>}

        <div className="flex-1 space-y-2 overflow-y-auto rounded-panel border border-cream-dark bg-surface p-4 shadow-panel">
          {!messages.length && (
            <p className="text-sm text-ink-muted">{t('noMessages')}</p>
          )}
          {messages.map((m) => {
            const mine = m.senderUserId === userId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-panel px-3 py-2 text-sm ${
                    mine
                      ? 'bg-brand text-white'
                      : 'bg-cream-dark/50 text-ink'
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-xs opacity-70">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? 'text-brand-soft' : 'text-ink-muted'
                    }`}
                  >
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
            <Input
              className="flex-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={2000}
              required
              aria-label={t('placeholder')}
            />
            <Button type="submit">{t('send')}</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">{t('readOnly')}</p>
        )}
      </main>
    </AppFrame>
  );
}
