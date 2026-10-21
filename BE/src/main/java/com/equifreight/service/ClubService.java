package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.repository.ClubRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The signed-in customer's club, loaded by id: the principal is loaded outside any transaction, so its lazy
 * {@code club} is only asked for its id, which a proxy answers without loading. Customer services scope
 * every record to this club.
 */
@Service
public class ClubService {

    private final ClubRepository clubRepository;

    public ClubService(ClubRepository clubRepository) {
        this.clubRepository = clubRepository;
    }

    @Transactional(readOnly = true)
    public Club requireClub(User user) {
        return findClub(user)
                .orElseThrow(() -> new UnauthorizedException(
                        "Your account isn't linked to a club. Contact EquiFreight to finish setting it up."));
    }

    /** Empty for staff and for a customer not yet linked to a club. */
    @Transactional(readOnly = true)
    public Optional<Club> findClub(User user) {
        return Optional.ofNullable(user.getClub()).map(Club::getId).flatMap(clubRepository::findById);
    }
}
