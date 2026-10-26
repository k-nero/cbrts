package com.equifreight.model.home;

/** A short line and its tone ({@code neutral}, {@code ok}, {@code warn}, {@code bad} or {@code info}). */
public record TonedTextResponse(String text, String tone) {}
