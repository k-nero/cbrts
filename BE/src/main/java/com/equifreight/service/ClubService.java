package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.User;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The signed-in customer's club, read with a query: the principal is loaded outside any transaction,
 * so its lazy {@code club} is never touched. Customer services scope every record to this club.
 */
@Service
public class ClubService {

    private final UserRepository userRepository;

    public ClubService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Club requireClub(User user) {
        return findClub(user)
                .orElseThrow(() -> new UnauthorizedException(
                        "Your account isn't linked to a club. Contact EquiFreight to finish setting it up."));
    }

    @Transactional(readOnly = true)
    public Optional<Club> findClub(User user) {
        return userRepository.findClubByUserId(user.getId());
    }
}
