package com.equifreight.model.user;

/** The counts on the Users &amp; roles tabs ("Staff · 9", "Customers · 8", "Pending invites · 1"). */
public record UserGroupCounts(long staff, long customers, long invites) {}
