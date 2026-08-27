'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api, apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type CatalogItem = { id: string; nameEn: string; nameHi: string };
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function RequirementFormPage() {
  const t = useTranslations('requirements');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get('id');

  const [token, setToken] = useState('');
  const [subjects, setSubjects] = useState<CatalogItem[]>([]);
  const [classes, setClasses] = useState<CatalogItem[]>([]);
  const [boards, setBoards] = useState<CatalogItem[]>([]);
  const [reqId, setReqId] = useState<string | null>(editId);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subjectId: '',
    classId: '',
    boardId: '',
    budgetMin: 3000,
    budgetMax: 8000,
    mode: 'ONLINE',
    scheduleDays: ['MON', 'WED'] as string[],
    scheduleTime: '17:00',
    durationMins: 60,
    pincode: '',
    address: '',
    notes: '',
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = (item: CatalogItem) => (locale === 'hi' ? item.nameHi : item.nameEn);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'STUDENT') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    Promise.all([
      api<CatalogItem[]>('/catalog/subjects'),
      api<CatalogItem[]>('/catalog/classes'),
      api<CatalogItem[]>('/catalog/boards'),
    ]).then(([s, c, b]) => {
      setSubjects(s);
      setClasses(c);
      setBoards(b);
      setForm((f) => ({
        ...f,
        subjectId: f.subjectId || s[0]?.id || '',
        classId: f.classId || c[0]?.id || '',
        boardId: f.boardId || b[0]?.id || '',
      }));
    });
    if (editId) {
      apiWithAuth<typeof form & { id: string; scheduleDays: string[] }>(
        `/requirements/${editId}`,
        access,
      ).then((r) => {
        setReqId(r.id);
        setForm({
          subjectId: (r as { subjectId: string }).subjectId,
          classId: (r as { classId: string }).classId,
          boardId: (r as { boardId: string }).boardId,
          budgetMin: (r as { budgetMin: number }).budgetMin,
          budgetMax: (r as { budgetMax: number }).budgetMax,
          mode: (r as { mode: string }).mode,
          scheduleDays: r.scheduleDays,
          scheduleTime: (r as { scheduleTime?: string }).scheduleTime ?? '17:00',
          durationMins: (r as { durationMins: number }).durationMins,
          pincode: (r as { pincode?: string }).pincode ?? '',
          address: (r as { address?: string }).address ?? '',
          notes: (r as { notes?: string }).notes ?? '',
        });
      });
    }
  }, [editId, locale, router]);

  const persist = useCallback(
    async (next = form) => {
      if (!token) return;
      setSaving(true);
      setError('');
      try {
        const body = JSON.stringify({
          ...next,
          pincode: next.pincode || undefined,
          address: next.address || undefined,
          notes: next.notes || undefined,
        });
        if (reqId) {
          await apiWithAuth(`/requirements/${reqId}`, token, {
            method: 'PATCH',
            body,
          });
        } else {
          const created = await apiWithAuth<{ id: string }>('/requirements', token, {
            method: 'POST',
            body,
          });
          setReqId(created.id);
          router.replace(`/${locale}/requirements/new?id=${created.id}`);
        }
        setMessage(t('saved'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setSaving(false);
      }
    },
    [form, locale, reqId, router, t, token],
  );

  const scheduleSave = (next: typeof form) => {
    setForm(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(next);
    }, 800);
  };

  const toggleDay = (day: string) => {
    const days = form.scheduleDays.includes(day)
      ? form.scheduleDays.filter((d) => d !== day)
      : [...form.scheduleDays, day];
    scheduleSave({ ...form, scheduleDays: days });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await persist();
    if (reqId) router.push(`/${locale}/requirements/${reqId}`);
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{reqId ? t('edit') : t('new')}</h1>
          <Link href={`/${locale}/requirements`} className="text-sm text-blue-600">
            {tc('back')}
          </Link>
        </div>
        <p className="mb-4 text-sm text-green-700">{t('freePosting')}</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && (
          <p className="mb-3 text-sm text-gray-600">
            {message}
            {saving ? '…' : ''}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
          <select
            className="w-full rounded border px-3 py-2"
            value={form.subjectId}
            onChange={(e) => scheduleSave({ ...form, subjectId: e.target.value })}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.classId}
            onChange={(e) => scheduleSave({ ...form, classId: e.target.value })}
          >
            {classes.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.boardId}
            onChange={(e) => scheduleSave({ ...form, boardId: e.target.value })}
          >
            {boards.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="rounded border px-3 py-2"
              placeholder={t('budgetMin')}
              value={form.budgetMin}
              onChange={(e) =>
                scheduleSave({ ...form, budgetMin: Number(e.target.value) })
              }
            />
            <input
              type="number"
              className="rounded border px-3 py-2"
              placeholder={t('budgetMax')}
              value={form.budgetMax}
              onChange={(e) =>
                scheduleSave({ ...form, budgetMax: Number(e.target.value) })
              }
            />
          </div>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.mode}
            onChange={(e) => scheduleSave({ ...form, mode: e.target.value })}
          >
            <option value="ONLINE">{tp('online')}</option>
            <option value="OFFLINE">{tp('offline')}</option>
            <option value="BOTH">{tc('both')}</option>
          </select>
          <div>
            <p className="mb-2 text-sm font-medium">{t('scheduleDays')}</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded px-3 py-1 text-sm ${
                    form.scheduleDays.includes(d)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              className="rounded border px-3 py-2"
              value={form.scheduleTime}
              onChange={(e) => scheduleSave({ ...form, scheduleTime: e.target.value })}
            />
            <input
              type="number"
              className="rounded border px-3 py-2"
              placeholder={t('duration')}
              value={form.durationMins}
              onChange={(e) =>
                scheduleSave({ ...form, durationMins: Number(e.target.value) })
              }
            />
          </div>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder={tp('pincode')}
            value={form.pincode}
            onChange={(e) => scheduleSave({ ...form, pincode: e.target.value })}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder={t('address')}
            value={form.address}
            onChange={(e) => scheduleSave({ ...form, address: e.target.value })}
          />
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={3}
            placeholder={t('notes')}
            value={form.notes}
            onChange={(e) => scheduleSave({ ...form, notes: e.target.value })}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            {tc('save')}
          </button>
        </form>
      </main>
    </>
  );
}
