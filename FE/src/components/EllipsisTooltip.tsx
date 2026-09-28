import { useCallback, useEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';

const EllipsisTooltip = ({ text }: { text: string; translate?: boolean }) => {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [isEllipsis, setIsEllipsis] = useState(false);

  const measure = useCallback(() => {
    const el = elRef.current;
    // Skip measurements taken before the element is laid out (or while detached),
    // otherwise scrollWidth/clientWidth are both 0 and we'd wrongly clear the tooltip.
    if (!el || el.clientWidth === 0) return;
    setIsEllipsis(el.scrollWidth > el.clientWidth);
  }, []);

  // Callback ref: the column-resize logic can replace the cell's DOM node, so we
  // (re)bind the ResizeObserver to whichever node is currently mounted instead of
  // holding on to a stale, detached one.
  const setRef = useCallback(
    (node: HTMLSpanElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elRef.current = node;
      if (node) {
        measure();
        const observer = new ResizeObserver(() => measure());
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [measure],
  );

  useEffect(() => {
    measure();
  }, [text, measure]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const content = (
    <span
      ref={setRef}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
      }}
    >
      {text}
    </span>
  );

  return isEllipsis ? <Tooltip title={text}>{content}</Tooltip> : content;
};

export default EllipsisTooltip;
