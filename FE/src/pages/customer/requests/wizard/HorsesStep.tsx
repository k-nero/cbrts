import type { FC, MouseEvent } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Col, Flex, Row, Skeleton } from 'antd';

import { horseChips } from '../../horses/components/horseCardProps';

import { StepRefusal } from './StepRefusal';

import type { StepProps } from './WizardForm';

import { Button, Callout, Checkbox, Chip, COAT_SWATCH, cx, OptionCard } from '@/components/ui';
import type { useWizardHorses } from '@/hooks/request';
import type { Horse, RequestHorse } from '@/interfaces';
import {
  ageOf,
  coatOf,
  formatSize,
  formatWeight,
  ict,
  pickableHorses,
  sexLabel,
  type WizardValues,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** "Thoroughbred · Mare · 7 y". */
const subtitle = (horse: Horse, today: string) =>
  [horse.breed?.trim(), sexLabel(horse.sex), ageOf(horse.dateOfBirth, today)]
    .filter(Boolean)
    .join(' · ');

type Props = StepProps & { query: ReturnType<typeof useWizardHorses> };

/** Step 1 (spec §5.2): which horses are travelling, and a foal at foot for a mare. */
const HorsesStep: FC<Props> = ({ saved, live, saving, held, refusal, onContinue, query }) => {
  const router = useCustomRouter();
  const { control, setValue } = useFormContext<WizardValues>();
  const picked = useWatch({ control, name: 'horses' });
  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const rows = pickableHorses(query.data ?? [], saved?.horses ?? []);
  const isPicked = (id: string) => picked.some((h) => h.horseId === id);

  const toggle = (id: string) =>
    setValue(
      'horses',
      isPicked(id)
        ? picked.filter((h) => h.horseId !== id)
        : [...picked, { horseId: id, withFoal: false }],
      { shouldDirty: true },
    );
  const setFoal = (id: string, withFoal: boolean) =>
    setValue(
      'horses',
      picked.map((h) => (h.horseId === id ? { ...h, withFoal } : h)),
      { shouldDirty: true },
    );
  const openProfile = (event: MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(router.paths.get('horse-profile', { pathParams: [id] }));
  };

  const card = (row: { id: string; horse: Horse | null; draft: RequestHorse | null }) => {
    const { id, horse, draft } = row;
    const selected = isPicked(id);
    const sex = horse?.sex ?? draft?.sex;
    const foal = picked.find((h) => h.horseId === id)?.withFoal ?? false;
    return (
      <Col span={12} key={id}>
        <Flex vertical gap={10} className="h-full">
          <OptionCard
            type="checkbox"
            selected={selected}
            onChange={() => toggle(id)}
            className="h-full"
            media={
              <span
                aria-hidden
                className={cx(
                  'size-12 rounded-full border border-line-strong',
                  COAT_SWATCH[coatOf(horse?.coat ?? null)],
                )}
              />
            }
            title={horse?.name ?? draft?.name}
            description={horse ? subtitle(horse, today) : sexLabel(sex)}
            meta={
              horse ? (
                <span className="type-caption">
                  {formatSize(horse.sizeClass)} in · {formatWeight(horse.weightKg)}
                </span>
              ) : undefined
            }
          >
            <Flex component="span" wrap align="center" gap={8}>
              {draft?.archived && <Chip tone="neutral">Archived</Chip>}
              {horse && horseChips(horse)}
              {draft && draft.missing.length > 0 && (
                <>
                  <Chip tone="bad">Profile incomplete</Chip>
                  <Button size="sm" variant="ghost" onClick={(e) => openProfile(e, id)}>
                    Open profile
                  </Button>
                </>
              )}
            </Flex>
          </OptionCard>
          {selected && sex === 'MARE' && (
            <Checkbox
              label="Mare with foal at foot"
              checked={foal}
              onChange={(e) => setFoal(id, e.target.checked)}
              className="pl-1"
            />
          )}
        </Flex>
      </Col>
    );
  };

  const horseBlockers = live.filter((b) => b.field === 'horses').map((b) => b.message);
  const messages = [...(refusal ? [refusal] : []), ...horseBlockers];

  return (
    <>
      <Flex vertical gap={8}>
        <h2 className="type-h3 m-0 text-ink">Which horses are travelling?</h2>
        <p className="type-body-m m-0 text-ink-2">
          All horses in one request share the same route and dates. Size class and temperament
          decide stall allocation.
        </p>
      </Flex>

      {query.isPending ? (
        <Row gutter={[16, 16]} aria-busy>
          <Col span={12}>
            <Skeleton.Node active className="!h-[168px] !w-full" />
          </Col>
          <Col span={12}>
            <Skeleton.Node active className="!h-[168px] !w-full" />
          </Col>
        </Row>
      ) : query.isError ? (
        <Callout
          tone="bad"
          title="Your horses didn't load"
          action={
            <Button size="sm" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing has changed. Check your connection and try again.
        </Callout>
      ) : rows.length === 0 ? (
        <Callout
          tone="info"
          title="You have no active horses yet. Add one on My horses first."
          action={
            <Button size="sm" onClick={() => router.push(router.paths.get('horse-new'))}>
              Add a horse
            </Button>
          }
        />
      ) : (
        <Row gutter={[16, 16]}>{rows.map(card)}</Row>
      )}

      <StepRefusal messages={messages} title="These horses can't travel yet" />

      <div className="border-t border-line pt-5">
        <Flex align="center" justify="space-between">
          <span className="type-label-m text-ink-2">
            {picked.length} {picked.length === 1 ? 'horse' : 'horses'} selected
          </span>
          <Button
            variant="primary"
            trailingIcon="arrow-right"
            disabled={saving || held}
            onClick={onContinue}
          >
            Continue
          </Button>
        </Flex>
      </div>
    </>
  );
};

export default HorsesStep;
