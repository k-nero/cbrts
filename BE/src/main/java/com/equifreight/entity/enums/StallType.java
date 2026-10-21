package com.equifreight.entity.enums;

/**
 * {@code horses.required_stall}, {@code request_horses.required_stall}, {@code vehicle_stalls.stall_type}.
 */
public enum StallType {
    STANDARD(32),
    CLIMATE(48),
    BOX(96);

    private final int widthIn;

    StallType(int widthIn) {
        this.widthIn = widthIn;
    }

    public int getWidthIn() {
        return widthIn;
    }
}
