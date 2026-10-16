package com.equifreight.service;

import com.equifreight.entity.HorseSizeClass;
import com.equifreight.entity.enums.StallType;
import com.equifreight.exception.BusinessException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Heights in hands and the size class derived from them (spec H-03, H-04). A height is hands.inches:
 * the digit after the point counts inches, 0 to 3, so 16.3 hh is followed by 17.0 hh.
 */
public final class HorseSizing {

    public static final BigDecimal MIN_HEIGHT_HH = new BigDecimal("10.0");
    public static final BigDecimal MAX_HEIGHT_HH = new BigDecimal("19.3");
    /** A horse that needs a box stall takes at least a stall and a half (H-03a). */
    public static final String BOX_STALL_MIN_CLASS = "L";

    private static final String INVALID_HEIGHT = "INVALID_HEIGHT";

    private HorseSizing() {}

    /** The height at scale 1; null stays null so Bean Validation reports a missing height. */
    public static BigDecimal requireValidHeight(BigDecimal heightHh) {
        if (heightHh == null) {
            return null;
        }
        String entered = heightHh.toPlainString();
        if (heightHh.stripTrailingZeros().scale() > 1) {
            throw new BusinessException(INVALID_HEIGHT,
                    entered + " hh isn't a height: write hands and inches, such as 16.2 hh.");
        }
        if (heightHh.compareTo(MIN_HEIGHT_HH) < 0 || heightHh.compareTo(MAX_HEIGHT_HH) > 0) {
            throw new BusinessException(INVALID_HEIGHT,
                    "Height must be between 10.0 and 19.3 hh; " + entered + " hh was entered.");
        }
        BigDecimal height = heightHh.setScale(1, RoundingMode.UNNECESSARY);
        int hands = height.intValue();
        int inches = height.remainder(BigDecimal.ONE).movePointRight(1).intValue();
        if (inches > 3) {
            throw new BusinessException(INVALID_HEIGHT, entered + " hh isn't a height: a hand is 4 inches, so "
                    + hands + ".3 hh is followed by " + (hands + 1) + ".0 hh.");
        }
        return height;
    }

    /**
     * The class whose band holds the height, raised to {@link #BOX_STALL_MIN_CLASS} for a box stall.
     *
     * @param classesByMinHeight every class, ordered by minHeightHh ascending
     */
    public static HorseSizeClass sizeClassFor(BigDecimal heightHh, StallType requiredStall,
                                              List<HorseSizeClass> classesByMinHeight) {
        int chosen = -1;
        int boxMinimum = -1;
        for (int i = 0; i < classesByMinHeight.size(); i++) {
            HorseSizeClass sizeClass = classesByMinHeight.get(i);
            if (sizeClass.getMinHeightHh().compareTo(heightHh) <= 0) {
                chosen = i;
            }
            if (BOX_STALL_MIN_CLASS.equals(sizeClass.getCode())) {
                boxMinimum = i;
            }
        }
        if (chosen < 0) {
            throw new IllegalStateException("No size class covers " + heightHh.toPlainString() + " hh");
        }
        if (requiredStall == StallType.BOX && boxMinimum > chosen) {
            chosen = boxMinimum;
        }
        return classesByMinHeight.get(chosen);
    }
}
