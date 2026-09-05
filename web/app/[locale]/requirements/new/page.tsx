'use client';

import { Alert, Button, ButtonLink, Card, FormField, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { api, apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { readBrowserPosition, resolveGeo } from '@/lib/geo';
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
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [geoHint, setGeoHint] = useState('');
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
          latitude: (r as { latitude?: number | null }).latitude ?? undefined,
          longitude: (r as { longitude?: number | null }).longitude ?? undefined,
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
          latitude: next.latitude,
          longitude: next.longitude,
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
    <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={reqId ? t('edit') : t('new')}
          actions={
            <ButtonLink
              href={`/${locale}/requirements`}
              variant="link"
              size="sm"
            >
              {tc('back')}
            </ButtonLink>
          }
        />
        <Alert tone="success" className="mb-4">
          {t('freePosting')}
        </Alert>
        {error && <Alert className="mb-3">{error}</Alert>}
        {message && (
          <Alert tone="info" className="mb-3">
            {message}
            {saving ? '…' : ''}
          </Alert>
        )}
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label={tp('subjects')} id="req-subject">
              {(id) => (
                <Select
                  id={id}
                  value={form.subjectId}
                  onChange={(e) =>
                    scheduleSave({ ...form, subjectId: e.target.value })
                  }
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label={tp('classes')} id="req-class">
              {(id) => (
                <Select
                  id={id}
                  value={form.classId}
                  onChange={(e) =>
                    scheduleSave({ ...form, classId: e.target.value })
                  }
                >
                  {classes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label={tp('boards')} id="req-board">
              {(id) => (
                <Select
                  id={id}
                  value={form.boardId}
                  onChange={(e) =>
                    scheduleSave({ ...form, boardId: e.target.value })
                  }
                >
                  {boards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('budgetMin')} id="req-bmin">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    value={form.budgetMin}
                    onChange={(e) =>
                      scheduleSave({
                        ...form,
                        budgetMin: Number(e.target.value),
                      })
                    }
                  />
                )}
              </FormField>
              <FormField label={t('budgetMax')} id="req-bmax">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    value={form.budgetMax}
                    onChange={(e) =>
                      scheduleSave({
                        ...form,
                        budgetMax: Number(e.target.value),
                      })
                    }
                  />
                )}
              </FormField>
            </div>
            <FormField label={tp('online')} id="req-mode">
              {(id) => (
                <Select
                  id={id}
                  value={form.mode}
                  onChange={(e) =>
                    scheduleSave({ ...form, mode: e.target.value })
                  }
                >
                  <option value="ONLINE">{tp('online')}</option>
                  <option value="OFFLINE">{tp('offline')}</option>
                  <option value="BOTH">{tc('both')}</option>
                </Select>
              )}
            </FormField>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {t('scheduleDays')}
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      form.scheduleDays.includes(d)
                        ? 'bg-brand text-white'
                        : 'bg-cream-dark/60 text-ink hover:bg-cream-dark'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('scheduleTime')} id="req-time">
                {(id) => (
                  <Input
                    id={id}
                    type="time"
                    value={form.scheduleTime}
                    onChange={(e) =>
                      scheduleSave({ ...form, scheduleTime: e.target.value })
                    }
                  />
                )}
              </FormField>
              <FormField label={t('duration')} id="req-duration">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    value={form.durationMins}
                    onChange={(e) =>
                      scheduleSave({
                        ...form,
                        durationMins: Number(e.target.value),
                      })
                    }
                  />
                )}
              </FormField>
            </div>
            <FormField label={tp('pincode')} id="req-pin">
              {(id) => (
                <Input
                  id={id}
                  value={form.pincode}
                  onChange={(e) =>
                    scheduleSave({
                      ...form,
                      pincode: e.target.value,
                      latitude: undefined,
                      longitude: undefined,
                    })
                  }
                  inputMode="numeric"
                  maxLength={6}
                />
              )}
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  setError('');
                  const browser = await readBrowserPosition();
                  if (browser) {
                    scheduleSave({
                      ...form,
                      latitude: browser.latitude,
                      longitude: browser.longitude,
                    });
                    setGeoHint('device');
                    return;
                  }
                  if (/^\d{6}$/.test(form.pincode)) {
                    try {
                      const resolved = await resolveGeo({ pincode: form.pincode });
                      scheduleSave({
                        ...form,
                        latitude: resolved.latitude,
                        longitude: resolved.longitude,
                      });
                      setGeoHint(resolved.source);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Geocode failed');
                    }
                    return;
                  }
                  setError('Allow location access or enter a 6-digit pincode first');
                }}
              >
                Use my location
              </Button>
              {form.latitude != null && form.longitude != null && (
                <p className="text-xs text-ink-muted">
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  {geoHint ? ` (${geoHint})` : ''}
                </p>
              )}
            </div>
            <FormField label={t('address')} id="req-address">
              {(id) => (
                <Input
                  id={id}
                  value={form.address}
                  onChange={(e) =>
                    scheduleSave({ ...form, address: e.target.value })
                  }
                />
              )}
            </FormField>
            <FormField label={t('notes')} id="req-notes">
              {(id) => (
                <Textarea
                  id={id}
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    scheduleSave({ ...form, notes: e.target.value })
                  }
                />
              )}
            </FormField>
            <Button type="submit" disabled={saving}>
              {tc('save')}
            </Button>
          </form>
        </Card>
      </main>
  );
}
