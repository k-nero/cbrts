import type { FC } from 'react';

import { Panel, Tabs } from '@/components/ui';
import type { QuotationDraft, ServiceClass } from '@/interfaces';
import { classOptions } from '@/lib/utils';

/** The air class the draft is priced with; a refusal names the classes the horses fit. */
export const StallChoice: FC<{
  quotation: QuotationDraft;
  pending: boolean;
  onChange: (c: ServiceClass) => void;
}> = ({ quotation, pending, onChange }) => {
  const current = quotation.airClass ?? quotation.request.requestedClass ?? 'BUSINESS';
  const options = classOptions(quotation.request.mode, quotation.fit, pending);
  const fit = quotation.fit;
  return (
    <Panel title="Air stall">
      <div className="flex flex-col gap-3">
        <Tabs<ServiceClass>
          label="Service class"
          items={options.map((o) => ({ key: o.value, label: o.label, disabled: o.disabled }))}
          activeKey={current}
          onChange={(key) => !pending && key !== current && onChange(key)}
        />
        {fit?.refusal ? (
          <span className="flex flex-col gap-1">
            <span className="type-body-s text-bad">{fit.refusal}</span>
            <span className="type-body-s text-ink-2">
              {fit.achievableClasses.length
                ? `Fits: ${options
                    .filter((o) => o.fits)
                    .map((o) => o.label)
                    .join(', ')}`
                : 'No class in the catalog fits these horses.'}
            </span>
          </span>
        ) : fit ? (
          <span className="type-body-s text-ink-2">
            {`${fit.widthUsedIn} in across ${fit.positions} ${fit.positions === 1 ? 'position' : 'positions'} of 96 in.`}
          </span>
        ) : (
          <span className="type-body-s text-ink-3">
            This class has no stall rate in the catalog.
          </span>
        )}
        {quotation.request.requestedClass && current !== quotation.request.requestedClass && (
          <span className="type-body-s text-ink-3">
            {`The customer asked for ${quotation.request.requestedClass.toLowerCase()}.`}
          </span>
        )}
      </div>
    </Panel>
  );
};
