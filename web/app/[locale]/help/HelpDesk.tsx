'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import { SiteFooter } from '@/components/SiteFooter';
import {
  Button,
  FormField,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { getSupportEmail } from '@/lib/support';
import { getStoredUser } from '@/lib/auth';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Faq = { q: string; a: string };

export function HelpDesk() {
  const t = useTranslations('help');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const support = getSupportEmail();
  const faqs = t.raw('faqs') as Faq[];
  const reduce = useReducedMotion();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTutor, setIsTutor] = useState(false);

  useEffect(() => {
    setIsTutor(getStoredUser()?.role === 'TUTOR');
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(
      `${t('formName')}: ${name}\n${t('formEmail')}: ${email}\n${t('formRole')}: ${role}\n\n${message}`,
    );
    const subject = encodeURIComponent(t('mailSubject'));
    window.location.href = `mailto:${support}?subject=${subject}&body=${body}`;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(support);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <AppFrame>
        <main className="bg-cream text-ink">
          <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 lg:pt-16">
            <motion.div
              initial={reduce ? false : { y: 10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                {t('kicker')}
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {t('lead')}
              </p>
            </motion.div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-xl font-semibold">{t('faqTitle')}</h2>
              <div className="mt-6 space-y-3">
                {faqs.map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-2xl border border-cream-dark bg-surface px-5 py-4 open:shadow-sm"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-4">
                        {faq.q}
                        <span className="mt-0.5 text-brand transition group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <aside
              id="contact"
              className="scroll-mt-24 h-fit rounded-3xl border border-cream-dark bg-surface p-6 shadow-panel lg:sticky lg:top-24"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {t('contactKicker')}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink">
                {t('contactTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {t('contactLead')}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${support}`}
                  className="text-base font-medium text-brand"
                >
                  {support}
                </a>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyEmail}
                >
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-muted">{t('hours')}</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <FormField label={t('formName')} id="help-name">
                  {(id) => (
                    <Input
                      id={id}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label={t('formEmail')} id="help-email">
                  {(id) => (
                    <Input
                      id={id}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label={t('formRole')} id="help-role">
                  {(id) => (
                    <Select
                      id={id}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="student">{t('roleStudent')}</option>
                      <option value="tutor">{t('roleTutor')}</option>
                      <option value="other">{t('roleOther')}</option>
                    </Select>
                  )}
                </FormField>
                <FormField label={t('formMessage')} id="help-message">
                  {(id) => (
                    <Textarea
                      id={id}
                      required
                      minLength={10}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  )}
                </FormField>
                <Button type="submit" fullWidth>
                  {t('formSubmit')}
                </Button>
                <p className="text-xs leading-relaxed text-ink-muted">
                  {t('formHint')}
                </p>
              </form>

              <Link
                href={isTutor ? `/${locale}/dashboard/tutor` : `/${locale}`}
                className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
              >
                {tc('back')}
              </Link>
            </aside>
          </section>
        </main>
      </AppFrame>
      {!isTutor && <SiteFooter />}
    </>
  );
}
