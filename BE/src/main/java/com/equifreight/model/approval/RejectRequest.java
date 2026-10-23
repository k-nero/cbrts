package com.equifreight.model.approval;

import lombok.Builder;

/** The logistics manager rejects a request (BR-F1-04): the reason is required and the customer reads it. */
@Builder
public record RejectRequest(String reason) {}
