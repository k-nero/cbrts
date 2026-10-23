package com.equifreight.model.notification;

import lombok.Builder;

/** How many notifications "Mark all as read" marked. */
@Builder
public record ReadAllResponse(int updated) {}
