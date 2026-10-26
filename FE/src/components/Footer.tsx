import { FC } from 'react';
import { Flex } from 'antd';

import Brand from './Brand';
import { DemoNote } from './DemoNote';
import { Link } from './Link';

import { COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/constant/color';

/** Placeholder until the operations desk has a real number (DESIGN.md, Footer). */
const OPS_PHONE = '+84 28 0000 0000';

const OPS_EMAIL = 'ops@equifreight.vn';

// AntD styles every <a> in the link colour (gold); inline tokens keep the footer free of gold.

/**
 * Owner portal (Full) and access pages (Compact). Staff pages and the cab surface have none.
 * The operations desk leads: while a horse is on the road, the useful answer is a person.
 */
const Footer: FC<{ size?: 'full' | 'compact' }> = ({ size = 'full' }) => {
  if (size === 'compact') {
    return (
      <Flex
        component="footer"
        justify="space-between"
        align="center"
        style={{ padding: '16px 40px', borderTop: `1px solid ${COLOR_BORDER}` }}
      >
        <Flex gap={20} align="center">
          <span className="text-[13px] text-ink-3">© 2026 EquiFreight</span>
          <Link>Terms of service</Link>
          <Link>Privacy</Link>
        </Flex>
        <Flex gap={10} align="center">
          <span className="text-[13px] text-ink-2">Operations desk, 24 hours</span>
          <span className="font-mono text-[14px] text-ink">{OPS_PHONE}</span>
        </Flex>
        <DemoNote />
      </Flex>
    );
  }
  return (
    <footer style={{ borderTop: `1px solid ${COLOR_BORDER}` }}>
      <div className="flex flex-wrap items-start justify-between gap-8 p-5 md:p-10">
        <Flex vertical gap={10}>
          <Brand />
          <span className="text-[13px] text-ink-3">Cross-Border Racehorse Transport System</span>
        </Flex>
        <Flex gap={64}>
          <Flex vertical gap={10}>
            <span className="text-[13px] font-medium text-ink">Help</span>
            <Link>Help</Link>
            <Link>How pricing works</Link>
            <Link>Document rules by country</Link>
          </Flex>
          <Flex vertical gap={10}>
            <span className="text-[13px] font-medium text-ink">Legal</span>
            <Link>Terms of service</Link>
            <Link>Privacy</Link>
          </Flex>
        </Flex>
        <Flex vertical gap={6} className="w-full max-w-[360px] md:w-[360px]">
          <span className="text-[14px] font-medium text-ink">
            Horse on the road? Call the operations desk
          </span>
          <a
            href={`tel:${OPS_PHONE.replace(/\s/g, '')}`}
            className="font-mono text-[28px] leading-8"
            style={{ color: COLOR_TEXT_PRIMARY }}
          >
            {OPS_PHONE}
          </a>
          <a
            href={`mailto:${OPS_EMAIL}`}
            className="font-mono text-[14px]"
            style={{ color: COLOR_TEXT_SECONDARY }}
          >
            {OPS_EMAIL}
          </a>
          <span className="text-[13px] text-ink-3">Staffed 24 hours, every day</span>
        </Flex>
      </div>
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 md:px-10"
        style={{ borderTop: `1px solid ${COLOR_BORDER}` }}
      >
        <span className="text-[13px] text-ink-3">© 2026 EquiFreight</span>
        <DemoNote />
      </div>
    </footer>
  );
};

export default Footer;
