package com.equifreight.model.request;

/**
 * Where an approved request's move stands, for the club's requests list: the job's stage and trip in a word and a
 * tone (Ok, Info, Warn, Neutral), and whether its page tracks the trip yet. The request itself stays Approved.
 */
public record MoveProgressResponse(String label, String tone, boolean tracking) {}
