package com.equifreight.model.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One thing that stops a draft from being submitted: a stable code, the field it is about, and the sentence. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Blocker {
    private String code;
    private String field;
    private String message;
}
