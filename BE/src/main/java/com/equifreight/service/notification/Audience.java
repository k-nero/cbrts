package com.equifreight.service.notification;

import com.equifreight.entity.User;
import java.util.List;
import java.util.UUID;

/**
 * Who a notification goes to. Each audience opens records on one surface: customers on their request pages, staff on
 * the staff pages, escorts on the cab surface.
 */
public sealed interface Audience {

    /** Every account of the club that isn't disabled: the club is the customer. */
    record ClubAccounts(UUID clubId) implements Audience {}

    /** Every active holder of a role. */
    record RoleHolders(String role) implements Audience {}

    /** Named staff, such as a job's transport specialist or the manager who prepared a quotation. */
    record StaffMembers(List<User> users) implements Audience {}

    /** The escorts crewing a job. */
    record Escorts(List<User> users) implements Audience {}

    static Audience club(UUID clubId) {
        return new ClubAccounts(clubId);
    }

    static Audience role(String role) {
        return new RoleHolders(role);
    }

    static Audience staff(User... users) {
        return new StaffMembers(List.of(users));
    }

    static Audience staff(List<User> users) {
        return new StaffMembers(List.copyOf(users));
    }

    static Audience escorts(List<User> users) {
        return new Escorts(List.copyOf(users));
    }
}
