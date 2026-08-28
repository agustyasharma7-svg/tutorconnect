'use client';

import { getSupportEmail } from '@/lib/support';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;
const inviteOnly = process.env.NEXT_PUBLIC_SOFT_LAUNCH_INVITE_ONLY === 'true';

type Card = { title: string; body: string };
type Step = { step: string; title: string; body: string };

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 1, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
      {children}
    </p>
  );
}

export function HomeLanding() {
  const t = useTranslations('home');
  const ta = useTranslations('auth');
  const { locale } = useParams<{ locale: string }>();
  const reduce = useReducedMotion();
  const support = getSupportEmail();
  const [audience, setAudience] = useState<'student' | 'tutor'>('student');

  const why = t.raw('why') as Card[];
  const studentSteps = t.raw('howStudent') as Step[];
  const tutorSteps = t.raw('howTutor') as Step[];
  const available = t.raw('available') as Card[];
  const calm = t.raw('calm') as Card[];
  const steps = audience === 'student' ? studentSteps : tutorSteps;

  return (
    <div className="overflow-x-hidden bg-cream text-ink">
      <section className="relative isolate">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#c9d8ff] blur-3xl"
          animate={reduce ? undefined : { x: [0, 24, 0], y: [0, 18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-32 h-72 w-72 rounded-full bg-[#f0d9c4] blur-3xl"
          animate={reduce ? undefined : { x: [0, -18, 0], y: [0, -22, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-16">
          <motion.div
            initial={reduce ? false : { y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('heroEyebrow')}
            </p>

            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              {t('hero')}
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
              {t('heroLead')}
            </p>

            {inviteOnly && (
              <p className="mt-4 max-w-lg rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                {t('inviteNote')}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/auth/register/student`}
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-12px_rgba(30,79,215,0.7)] transition hover:bg-brand-hover"
              >
                {t('ctaStudent')}
              </Link>
              <Link
                href={`/${locale}/auth/register/tutor`}
                className="rounded-full border border-[#c5bdae] bg-white/70 px-6 py-3 text-sm font-medium text-ink backdrop-blur transition hover:border-brand hover:text-brand"
              >
                {t('ctaTutor')}
              </Link>
              <Link
                href={`/${locale}#how-it-works`}
                className="px-2 text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                {t('ctaHow')}
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2">
              {[t('chipVerified'), t('chipPrivate'), t('chipFree')].map((chip) => (
                <li
                  key={chip}
                  className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm ring-1 ring-[#e6ddd0]"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </motion.div>

          <HeroCanvas locale={locale} reduce={!!reduce} />
        </div>
      </section>

      <section
        id="why"
        className="scroll-mt-24 border-t border-cream-dark bg-[#fffcf7]"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <FadeIn>
            <SectionKicker>{t('whyKicker')}</SectionKicker>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('whyTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
              {t('whyLead')}
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {why.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.06}>
                <article className="h-full rounded-3xl border border-cream-dark bg-white p-6 shadow-[0_1px_0_rgba(12,31,51,0.04)]">
                  <span className="text-xs font-semibold tabular-nums text-[#b8956a]">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <FadeIn>
            <SectionKicker>{t('howKicker')}</SectionKicker>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('howTitle')}
            </h2>
            <div className="mt-8 inline-flex rounded-full border border-line bg-white/70 p-1">
              {(
                [
                  ['student', t('howStudentTab')],
                  ['tutor', t('howTutorTab')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAudience(id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    audience === id
                      ? 'bg-ink text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </FadeIn>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {steps.map((item, i) => (
              <FadeIn key={`${audience}-${item.step}`} delay={i * 0.08}>
                <article className="relative h-full rounded-3xl border border-cream-dark bg-white p-6">
                  <span className="text-2xl font-semibold tabular-nums text-brand/80">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="available" className="scroll-mt-24 bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9db7ff]">
              {t('availableKicker')}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('availableTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#c5c0b6]">
              {t('availableLead')}
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {available.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.08}>
                <article className="h-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c5c0b6]">
                    {item.body}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="calm" className="scroll-mt-24 border-t border-cream-dark bg-[#fffcf7]">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <FadeIn>
            <SectionKicker>{t('calmKicker')}</SectionKicker>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('calmTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
              {t('calmLead')}
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-cream-dark bg-[#ece4d8] sm:grid-cols-2">
            {calm.map((item) => (
              <article key={item.title} className="bg-[#fffcf7] p-7">
                <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="help" className="scroll-mt-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <FadeIn>
            <SectionKicker>{t('helpKicker')}</SectionKicker>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('helpTitle')}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
              {t('helpLead')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/help`}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-[#163049]"
              >
                {t('helpCta')}
              </Link>
              <Link
                href={`/${locale}/help#contact`}
                className="rounded-full border border-[#c5bdae] px-5 py-2.5 text-sm font-medium hover:border-brand hover:text-brand"
              >
                {t('contactCta')}
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <aside
              id="contact"
              className="rounded-3xl border border-cream-dark bg-white p-7 shadow-[0_20px_50px_-32px_rgba(12,31,51,0.25)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8956a]">
                {t('contactKicker')}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{t('contactTitle')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {t('contactLead')}
              </p>
              <a
                href={`mailto:${support}`}
                className="mt-5 inline-block text-lg font-medium text-brand"
              >
                {support}
              </a>
              <p className="mt-3 text-xs leading-relaxed text-[#6b7c8d]">
                {t('contactHours')}
              </p>
              <p className="mt-6 text-sm text-ink-muted">
                {ta('hasAccount')}{' '}
                <Link href={`/${locale}/auth/login`} className="text-brand underline">
                  {ta('login')}
                </Link>
              </p>
            </aside>
          </FadeIn>
        </div>
      </section>

      <section className="border-t border-cream-dark bg-[#fffcf7]">
        <FadeIn className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('finalTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
            {t('finalLead')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${locale}/auth/register/student`}
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover"
            >
              {t('ctaStudent')}
            </Link>
            <Link
              href={`/${locale}/auth/register/tutor`}
              className="rounded-full border border-[#c5bdae] bg-white px-6 py-3 text-sm font-medium hover:border-brand hover:text-brand"
            >
              {t('ctaTutor')}
            </Link>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

function HeroCanvas({ locale, reduce }: { locale: string; reduce: boolean }) {
  const t = useTranslations('home');
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md lg:h-[460px]">
      <motion.div
        className="absolute left-4 top-8 w-[78%] rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_-28px_rgba(12,31,51,0.35)] backdrop-blur"
        initial={reduce ? false : { opacity: 1, y: 24 }}
        animate={{ opacity: 1, y: reduce ? 0 : [0, -8, 0] }}
        transition={
          reduce
            ? { duration: 0.6 }
            : { y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.7 } }
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          {t('cardTutorKicker')}
        </p>
        <p className="mt-2 text-lg font-semibold">{t('cardTutorName')}</p>
        <p className="mt-1 text-sm text-ink-muted">{t('cardTutorMeta')}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {t('cardVerified')}
          </span>
          <span className="text-xs text-[#6b7c8d]">{t('cardNearYou')}</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-0 top-36 w-[72%] rounded-3xl border border-white/80 bg-ink p-5 text-cream shadow-[0_24px_60px_-28px_rgba(12,31,51,0.45)]"
        initial={reduce ? false : { opacity: 1, y: 28 }}
        animate={{ opacity: 1, y: reduce ? 0 : [0, 10, 0] }}
        transition={
          reduce
            ? { duration: 0.6, delay: 0.1 }
            : {
                y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
                opacity: { duration: 0.7, delay: 0.15 },
              }
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9db7ff]">
          {t('cardDemoKicker')}
        </p>
        <p className="mt-2 font-semibold">{t('cardDemoTitle')}</p>
        <p className="mt-1 text-sm text-[#c5c0b6]">{t('cardDemoMeta')}</p>
      </motion.div>

      <motion.div
        className="absolute bottom-4 left-10 w-[80%] rounded-3xl border border-cream-dark bg-white p-5 shadow-[0_16px_40px_-24px_rgba(12,31,51,0.3)]"
        initial={reduce ? false : { opacity: 1, y: 20 }}
        animate={{ opacity: 1, y: reduce ? 0 : [0, -6, 0] }}
        transition={
          reduce
            ? { duration: 0.6, delay: 0.2 }
            : {
                y: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
                opacity: { duration: 0.7, delay: 0.25 },
              }
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b8956a]">
          {t('cardAgreeKicker')}
        </p>
        <p className="mt-2 font-semibold">{t('cardAgreeTitle')}</p>
        <p className="mt-1 text-sm text-ink-muted">{t('cardAgreeMeta')}</p>
        <Link
          href={`/${locale}/help`}
          className="mt-3 inline-block text-xs font-medium text-brand"
        >
          {t('cardHelpLink')}
        </Link>
      </motion.div>
    </div>
  );
}
