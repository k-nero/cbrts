package com.equifreight.model.request;

import lombok.Builder;

/** One thing that stops a draft from being submitted: a stable code, the field it is about, and the sentence. */
@Builder
public record Blocker(String code, String field, String message) {}
