import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';

import { settle } from '@/lib/motion';

/**
 * The customer portal's page entrance (lib/motion): each page rises into place once when it opens.
 * The layout keys it by path, so moving to another page plays it again.
 */
const PageMotion: FC<{ children: ReactNode }> = ({ children }) => (
  <motion.div variants={settle} initial="hidden" animate="shown">
    {children}
  </motion.div>
);

export default PageMotion;
