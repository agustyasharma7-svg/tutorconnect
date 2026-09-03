'use client';

import { Alert, Button, Card, FormField, Input, PageHeader, Select, Textarea, PageSkeleton } from '@/components/ui';
import { api, apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { readBrowserPosition, resolveGeo } from '@/lib/geo';
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
  registrationFeeChoice?: 'PAY_NOW' | 'EARN_FIRST' | null;
  registrationFeeStatus?: 'PENDING' | 'PAID' | 'WAIVED' | 'REFUNDED' | null;
  completeness?: { score: number; isComplete?: boolean };
  subjects?: CatalogItem[];
  classes?: CatalogItem[];
  boards?: CatalogItem[];
  otherSubjects?: string | null;
  otherClasses?: string | null;
  otherBoards?: string | null;
  availability?: Slot[];
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-brand text-white'
          : 'bg-cream-dark/60 text-ink hover:bg-cream-dark'
      }`}
    >
      {children}
    </button>
  );
}

export default function TutorOnboardingPage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const ta = useTranslations('auth');
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
  const [otherSubjects, setOtherSubjects] = useState('');
  const [otherClasses, setOtherClasses] = useState('');
  const [otherBoards, setOtherBoards] = useState('');
  const [slots, setSlots] = useState<Slot[]>([
    { day: 'MON', startTime: '16:00', endTime: '17:00', mode: 'ONLINE' },
  ]);
  const [pincode, setPincode] = useState('');
  const [radius, setRadius] = useState(10);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [geoSource, setGeoSource] = useState('');
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
    ])
      .then(([me, s, c, b]) => {
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
        setOtherSubjects(me.otherSubjects ?? '');
        setOtherClasses(me.otherClasses ?? '');
        setOtherBoards(me.otherBoards ?? '');
        if (me.availability?.length) {
          setSlots(
            me.availability.map(({ day, startTime, endTime, mode }) => ({
              day,
              startTime,
              endTime,
              mode,
            })),
          );
        }
        if (me.pincode) setPincode(me.pincode);
        if (me.teachingRadiusKm) setRadius(me.teachingRadiusKm);
        if (me.registrationFeeChoice === 'PAY_NOW' || me.registrationFeeChoice === 'EARN_FIRST') {
          setFeeChoice(me.registrationFeeChoice);
        }
        setSubjects(s);
        setClasses(c);
        setBoards(b);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed');
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

  const isOtherSelected = (list: CatalogItem[], selectedIds: string[]) =>
    list.some((item) => item.nameEn === 'Other' && selectedIds.includes(item.id));

  const saveSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      if (isOtherSelected(subjects, selectedSubjects) && otherSubjects.trim().length < 2) {
        setError(t('otherSubjectsRequired'));
        setLoading(false);
        return;
      }
      if (isOtherSelected(classes, selectedClasses) && otherClasses.trim().length < 2) {
        setError(t('otherClassesRequired'));
        setLoading(false);
        return;
      }
      if (isOtherSelected(boards, selectedBoards) && otherBoards.trim().length < 2) {
        setError(t('otherBoardsRequired'));
        setLoading(false);
        return;
      }
      const me = await apiWithAuth<TutorProfile>('/tutors/me/subjects', token, {
        method: 'PATCH',
        body: JSON.stringify({
          subjectIds: selectedSubjects,
          classIds: selectedClasses,
          boardIds: selectedBoards,
          otherSubjects: isOtherSelected(subjects, selectedSubjects)
            ? otherSubjects.trim()
            : undefined,
          otherClasses: isOtherSelected(classes, selectedClasses)
            ? otherClasses.trim()
            : undefined,
          otherBoards: isOtherSelected(boards, selectedBoards)
            ? otherBoards.trim()
            : undefined,
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
      setMessage(t('photo'));
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
        body: JSON.stringify({
          slots: slots.map(({ day, startTime, endTime, mode }) => ({
            day,
            startTime,
            endTime,
            mode,
          })),
        }),
      });
      setProfile(me);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const captureMyLocation = async () => {
    setError('');
    const browser = await readBrowserPosition();
    if (!browser) {
      setError('Could not read device location. Allow location access or enter a pincode.');
      return;
    }
    setCoords(browser);
    setGeoSource('device');
  };

  const saveLocation = async () => {
    setLoading(true);
    setError('');
    try {
      let latitude = coords?.latitude;
      let longitude = coords?.longitude;
      if ((latitude == null || longitude == null) && /^\d{6}$/.test(pincode)) {
        const resolved = await resolveGeo({ pincode });
        latitude = resolved.latitude;
        longitude = resolved.longitude;
        setCoords({ latitude, longitude });
        setGeoSource(resolved.source);
      }
      const me = await apiWithAuth<TutorProfile>('/tutors/me/location', token, {
        method: 'PATCH',
        body: JSON.stringify({
          pincode: pincode || undefined,
          teachingRadiusKm: radius,
          latitude,
          longitude,
        }),
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
      const feeFinalized =
        profile?.registrationFeeStatus === 'PAID' ||
        profile?.registrationFeeStatus === 'WAIVED';

      if (feeFinalized) {
        setMessage(tc('save'));
        router.push(`/${locale}/dashboard/tutor`);
        return;
      }

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
      setMessage(tc('save'));
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

  if (!profile) {
    return error ? (
      <Alert className="m-8">{error}</Alert>
    ) : (
      <PageSkeleton />
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={t('title')}
          actions={
            <Link
              href={`/${locale}/dashboard/tutor`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {tc('back')}
            </Link>
          }
        />
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>
            {t('completeness', { score: profile.completeness?.score ?? 0 })} —{' '}
            {profile.isDiscoverable ? t('discoverable') : t('notDiscoverable')}
          </span>
          {(profile.completeness?.isComplete || profile.completeness?.score === 100) && (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {t('profileComplete')}
            </span>
          )}
        </p>
        <p className="mb-4 text-sm text-ink">
          {tv('status')}: <strong>{profile.verificationStatus ?? 'NOT_SUBMITTED'}</strong>
          {profile.isVerified ? ` · ${tv('verified')}` : ''}
          {!profile.isVerified && (
            <>
              {' · '}
              <span className="text-ink-muted">{t('verificationRequired')}</span>
            </>
          )}
          {' · '}
          <Link href={`/${locale}/verification`} className="text-brand underline">
            {td('verification')}
          </Link>
        </p>

        <div className="mb-6 flex gap-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-brand' : 'bg-cream-dark'}`}
            />
          ))}
        </div>

        {error && <Alert className="mb-3">{error}</Alert>}
        {message && (
          <Alert tone="success" className="mb-3">
            {message}
          </Alert>
        )}

        {step === 0 && (
          <Card className="space-y-4">
            <FormField label={tc('name')} id="tutor-name">
              {(id) => (
                <Input
                  id={id}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t('bio')} id="tutor-bio">
              {(id) => (
                <Textarea
                  id={id}
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t('experience')} id="tutor-exp">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm({ ...form, experienceYears: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField label={ta('qualification')} id="tutor-qual">
              {(id) => (
                <Input
                  id={id}
                  value={form.qualification}
                  onChange={(e) =>
                    setForm({ ...form, qualification: e.target.value })
                  }
                />
              )}
            </FormField>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">{t('photo')}</p>
              {profile.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(profile.photoUrl)}
                  alt={form.name || t('photo')}
                  className="mb-2 h-20 w-20 rounded-panel object-cover"
                />
              )}
              <Input
                type="file"
                accept="image/png,image/jpeg"
                aria-label={t('photo')}
                onChange={(e) =>
                  e.target.files?.[0] && uploadPhoto(e.target.files[0])
                }
              />
            </div>
            <Button type="button" disabled={loading} onClick={saveBasics}>
              {tc('next')}
            </Button>
          </Card>
        )}

        {step === 1 && (
          <Card className="space-y-4">
            <div>
              <p className="mb-2 font-medium text-ink">{t('subjects')}</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Chip
                    key={s.id}
                    active={selectedSubjects.includes(s.id)}
                    onClick={() =>
                      toggle(selectedSubjects, s.id, setSelectedSubjects)
                    }
                  >
                    {label(s)}
                  </Chip>
                ))}
              </div>
              {isOtherSelected(subjects, selectedSubjects) && (
                <FormField label={t('otherSubjects')} id="tutor-other-subjects" className="mt-3">
                  {(id) => (
                    <Input
                      id={id}
                      value={otherSubjects}
                      onChange={(e) => setOtherSubjects(e.target.value)}
                      placeholder={t('otherSubjectsPlaceholder')}
                      maxLength={120}
                    />
                  )}
                </FormField>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium text-ink">{t('classes')}</p>
              <div className="flex flex-wrap gap-2">
                {classes.map((s) => (
                  <Chip
                    key={s.id}
                    active={selectedClasses.includes(s.id)}
                    onClick={() =>
                      toggle(selectedClasses, s.id, setSelectedClasses)
                    }
                  >
                    {label(s)}
                  </Chip>
                ))}
              </div>
              {isOtherSelected(classes, selectedClasses) && (
                <FormField label={t('otherClasses')} id="tutor-other-classes" className="mt-3">
                  {(id) => (
                    <Input
                      id={id}
                      value={otherClasses}
                      onChange={(e) => setOtherClasses(e.target.value)}
                      placeholder={t('otherClassesPlaceholder')}
                      maxLength={120}
                    />
                  )}
                </FormField>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium text-ink">{t('boards')}</p>
              <div className="flex flex-wrap gap-2">
                {boards.map((s) => (
                  <Chip
                    key={s.id}
                    active={selectedBoards.includes(s.id)}
                    onClick={() =>
                      toggle(selectedBoards, s.id, setSelectedBoards)
                    }
                  >
                    {label(s)}
                  </Chip>
                ))}
              </div>
              {isOtherSelected(boards, selectedBoards) && (
                <FormField label={t('otherBoards')} id="tutor-other-boards" className="mt-3">
                  {(id) => (
                    <Input
                      id={id}
                      value={otherBoards}
                      onChange={(e) => setOtherBoards(e.target.value)}
                      placeholder={t('otherBoardsPlaceholder')}
                      maxLength={120}
                    />
                  )}
                </FormField>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                {tc('previous')}
              </Button>
              <Button type="button" disabled={loading} onClick={saveSubjects}>
                {tc('next')}
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="space-y-4">
            <p className="font-medium text-ink">{t('availability')}</p>
            {slots.map((slot, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Select
                  aria-label="Day"
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
                </Select>
                <Input
                  type="time"
                  aria-label="Start"
                  value={slot.startTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...slot, startTime: e.target.value };
                    setSlots(next);
                  }}
                />
                <Input
                  type="time"
                  aria-label="End"
                  value={slot.endTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...slot, endTime: e.target.value };
                    setSlots(next);
                  }}
                />
                <Select
                  aria-label="Mode"
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
                </Select>
              </div>
            ))}
            <Button
              type="button"
              variant="link"
              onClick={() =>
                setSlots([
                  ...slots,
                  {
                    day: 'WED',
                    startTime: '18:00',
                    endTime: '19:00',
                    mode: 'ONLINE',
                  },
                ])
              }
            >
              {t('addSlot')}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                {tc('previous')}
              </Button>
              <Button type="button" disabled={loading} onClick={saveAvailability}>
                {tc('next')}
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="space-y-4">
            <p className="font-medium text-ink">{t('location')}</p>
            <FormField label={t('pincode')} id="tutor-pin">
              {(id) => (
                <Input
                  id={id}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setCoords(null);
                    setGeoSource('');
                  }}
                  inputMode="numeric"
                  maxLength={6}
                />
              )}
            </FormField>
            <FormField label={t('location')} id="tutor-radius">
              {(id) => (
                <Select
                  id={id}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </Select>
              )}
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={captureMyLocation}>
                Use my location
              </Button>
              {coords && (
                <p className="text-xs text-ink-muted">
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                  {geoSource ? ` (${geoSource})` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                {tc('previous')}
              </Button>
              <Button type="button" disabled={loading} onClick={saveLocation}>
                {tc('next')}
              </Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <form onSubmit={saveFee} className="space-y-4">
              <p className="font-medium text-ink">{t('feeChoice')}</p>
              {(profile.registrationFeeStatus === 'PAID' ||
                profile.registrationFeeStatus === 'WAIVED') && (
                <Alert tone="success">{t('feeFinalized')}</Alert>
              )}
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  checked={feeChoice === 'EARN_FIRST'}
                  disabled={
                    profile.registrationFeeStatus === 'PAID' ||
                    profile.registrationFeeStatus === 'WAIVED'
                  }
                  onChange={() => setFeeChoice('EARN_FIRST')}
                />
                {t('earnFirst')}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  checked={feeChoice === 'PAY_NOW'}
                  disabled={
                    profile.registrationFeeStatus === 'PAID' ||
                    profile.registrationFeeStatus === 'WAIVED'
                  }
                  onChange={() => setFeeChoice('PAY_NOW')}
                />
                {t('payNow')}
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(3)}
                >
                  {tc('previous')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {profile.registrationFeeStatus === 'PAID' ||
                  profile.registrationFeeStatus === 'WAIVED'
                    ? tc('next')
                    : tc('save')}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </main>
  );
}
