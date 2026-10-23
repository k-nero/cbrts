package com.equifreight.model.notification;

import lombok.Builder;

/** The bell's count: notifications the signed-in user hasn't read. */
@Builder
public record UnreadCountResponse(long count) {}
