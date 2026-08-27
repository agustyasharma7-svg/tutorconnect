'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api, apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type CatalogItem = { id: string; nameEn: string; nameHi: string };
type Slot = { day: string; startTime: string; endTime: string; mode: 'ONLINE' | 'OFFLINE' };
type TutorProfile = {
  name?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  qualification?: string | null;
  photoUrl?: string | null;
  pincode?: string | null;
  teachingRadiusKm?: number | null;
  isDiscoverable?: boolean;
  isVerified?: boolean;
  verificationStatus?: string;
  completeness?: { score: number };
  subjects?: CatalogItem[];
  classes?: CatalogItem[];
  boards?: CatalogItem[];
  availability?: Slot[];
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function TutorOnboardingPage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const tv = useTranslations('verification');
  const td = useTranslations('dashboard');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [token, setToken] = useState('');
  const [subjects, setSubjects] = useState<CatalogItem[]>([]);
  const [classes, setClasses] = useState<CatalogItem[]>([]);
  const [boards, setBoards] = useState<CatalogItem[]>([]);
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    experienceYears: 1,
    qualification: '',
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [slots, setSlots] = useState<Slot[]>([
    { day: 'MON', startTime: '16:00', endTime: '17:00', mode: 'ONLINE' },
  ]);
  const [pincode, setPincode] = useState('');
  const [radius, setRadius] = useState(10);
  const [feeChoice, setFeeChoice] = useState<'PAY_NOW' | 'EARN_FIRST'>('EARN_FIRST');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const label = (item: CatalogItem) => (locale === 'hi' ? item.nameHi : item.nameEn);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    Promise.all([
      apiWithAuth<TutorProfile>('/tutors/me', access),
      api<CatalogItem[]>('/catalog/subjects'),
      api<CatalogItem[]>('/catalog/classes'),
      api<CatalogItem[]>('/catalog/boards'),
    ]).then(([me, s, c, b]) => {
      setProfile(me);
      setForm({
        name: me.name ?? '',
        bio: me.bio ?? '',
        experienceYears: me.experienceYears ?? 1,
        qualification: me.qualification ?? '',
      });
      setSelectedSubjects(me.subjects?.map((x) => x.id) ?? []);
      setSelectedClasses(me.classes?.map((x) => x.id) ?? []);
      setSelectedBoards(me.boards?.map((x) => x.id) ?? []);
      if (me.availability?.length) setSlots(me.availability);
      if (me.pincode) setPincode(me.pincode);
      if (me.teachingRadiusKm) setRadius(me.teachingRadiusKm);
      setSubjects(s);
      setClasses(c);
      setBoards(b);
    });
  }, [locale, router]);

  const toggle = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const saveBasics = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await apiWithAuth<TutorProfile>('/tutors/me', token, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setProfile(me);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const saveSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await apiWithAuth<TutorProfile>('/tutors/me/subjects', token, {
        method: 'PATCH',
        body: JSON.stringify({
          subjectIds: selectedSubjects,
          classIds: selectedClasses,
          boardIds: selectedBoards,
        }),
      });
      setProfile(me);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const me = await apiWithAuth<TutorProfile>('/tutors/me/photo', token, {
        method: 'POST',
        body,
      });
      setProfile(me);
      setMessage('Photo uploaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await apiWithAuth<TutorProfile>('/tutors/me/availability', token, {
        method: 'PATCH',
        body: JSON.stringify({ slots }),
      });
      setProfile(me);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const me = await apiWithAuth<TutorProfile>('/tutors/me/location', token, {
        method: 'PATCH',
        body: JSON.stringify({ pincode, teachingRadiusKm: radius }),
      });
      setProfile(me);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const saveFee = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiWithAuth<{ checkoutRequired?: boolean }>(
        '/tutors/me/registration-fee-choice',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ choice: feeChoice }),
        },
      );
      const me = await apiWithAuth<TutorProfile>('/tutors/me', token);
      setProfile(me);
      setMessage('Profile saved');
      if (res.checkoutRequired) {
        router.push(`/${locale}/payments/registration`);
      } else {
        router.push(`/${locale}/dashboard/tutor`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/dashboard/tutor`} className="text-sm text-blue-600">
            {tc('back')}
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          {t('completeness', { score: profile.completeness?.score ?? 0 })} —{' '}
          {profile.isDiscoverable ? t('discoverable') : t('notDiscoverable')}
        </p>
        <p className="mb-4 text-sm">
          {tv('status')}: <strong>{profile.verificationStatus ?? 'NOT_SUBMITTED'}</strong>
          {profile.isVerified ? ` · ${tv('verified')}` : ''}
          {' · '}
          <Link href={`/${locale}/verification`} className="text-blue-600 underline">
            {td('verification')}
          </Link>
        </p>
        <div className="mb-6 flex gap-2 text-xs">
          {[0, 1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

        {step === 0 && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <input
              className="w-full rounded border px-3 py-2"
              placeholder={tc('name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <textarea
              className="w-full rounded border px-3 py-2"
              rows={4}
              placeholder={t('bio')}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className="w-full rounded border px-3 py-2"
              placeholder={t('experience')}
              value={form.experienceYears}
              onChange={(e) =>
                setForm({ ...form, experienceYears: Number(e.target.value) })
              }
            />
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Qualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm">{t('photo')}</label>
              {profile.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(profile.photoUrl)}
                  alt="photo"
                  className="mb-2 h-20 w-20 rounded object-cover"
                />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={saveBasics}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              {tc('next')}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <div>
              <p className="mb-2 font-medium">{t('subjects')}</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(selectedSubjects, s.id, setSelectedSubjects)}
                    className={`rounded px-3 py-1 text-sm ${
                      selectedSubjects.includes(s.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {label(s)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">{t('classes')}</p>
              <div className="flex flex-wrap gap-2">
                {classes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(selectedClasses, s.id, setSelectedClasses)}
                    className={`rounded px-3 py-1 text-sm ${
                      selectedClasses.includes(s.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {label(s)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">{t('boards')}</p>
              <div className="flex flex-wrap gap-2">
                {boards.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(selectedBoards, s.id, setSelectedBoards)}
                    className={`rounded px-3 py-1 text-sm ${
                      selectedBoards.includes(s.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {label(s)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="rounded border px-4 py-2">
                {tc('previous')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={saveSubjects}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                {tc('next')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <p className="font-medium">{t('availability')}</p>
            {slots.map((slot, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <select
                  className="rounded border px-2 py-2"
                  value={slot.day}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...slot, day: e.target.value };
                    setSlots(next);
                  }}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className="rounded border px-2 py-2"
                  value={slot.startTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...slot, startTime: e.target.value };
                    setSlots(next);
                  }}
                />
                <input
                  type="time"
                  className="rounded border px-2 py-2"
                  value={slot.endTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...slot, endTime: e.target.value };
                    setSlots(next);
                  }}
                />
                <select
                  className="rounded border px-2 py-2"
                  value={slot.mode}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = {
                      ...slot,
                      mode: e.target.value as 'ONLINE' | 'OFFLINE',
                    };
                    setSlots(next);
                  }}
                >
                  <option value="ONLINE">{t('online')}</option>
                  <option value="OFFLINE">{t('offline')}</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-blue-600"
              onClick={() =>
                setSlots([
                  ...slots,
                  { day: 'WED', startTime: '18:00', endTime: '19:00', mode: 'ONLINE' },
                ])
              }
            >
              {t('addSlot')}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="rounded border px-4 py-2">
                {tc('previous')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={saveAvailability}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                {tc('next')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <p className="font-medium">{t('location')}</p>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder={t('pincode')}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            />
            <select
              className="w-full rounded border px-3 py-2"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="rounded border px-4 py-2">
                {tc('previous')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={saveLocation}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                {tc('next')}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <form onSubmit={saveFee} className="space-y-4 rounded-lg bg-white p-6 shadow">
            <p className="font-medium">{t('feeChoice')}</p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={feeChoice === 'EARN_FIRST'}
                onChange={() => setFeeChoice('EARN_FIRST')}
              />
              {t('earnFirst')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={feeChoice === 'PAY_NOW'}
                onChange={() => setFeeChoice('PAY_NOW')}
              />
              {t('payNow')}
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="rounded border px-4 py-2">
                {tc('previous')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                {tc('save')}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
