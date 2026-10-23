import { Flex } from 'antd';

/** The stall colours of the trailer diagram: standard, box and climate. */
export function StallLegend() {
  return (
    <Flex gap={16} align="center" className="whitespace-nowrap">
      <Flex gap={6} align="center">
        <span className="size-2.5 rounded-xs bg-stall-standard" />
        <span className="type-caption text-ink-3">Standard</span>
      </Flex>
      <Flex gap={6} align="center">
        <span className="size-2.5 rounded-xs bg-stall-box" />
        <span className="type-caption text-ink-3">Box</span>
      </Flex>
      <Flex gap={6} align="center">
        <span className="size-2.5 rounded-xs bg-stall-climate" />
        <span className="type-caption text-ink-3">Climate</span>
      </Flex>
    </Flex>
  );
}
