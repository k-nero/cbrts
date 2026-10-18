package com.equifreight.service;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.user.CreateUserRequest;
import com.equifreight.model.user.UpdateUserRequest;
import com.equifreight.repository.RefreshTokenRepository;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Users & roles changes are decisions, so each writes one audit row (US-00-06, BR-F1-08).
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuditService auditService;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private UserService service;
    private User yen;

    private static CreateUserRequest createRequest(String email, String roleName) {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail(email);
        request.setPassword("changeme123!");
        request.setFirstName("Anh Thư");
        request.setLastName("Bùi");
        request.setRoles(Set.of(roleName));
        return request;
    }

    private static UpdateUserRequest updateRequest(String firstName, String lastName, String roleName) {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName(firstName);
        request.setLastName(lastName);
        request.setRoles(roleName == null ? null : Set.of(roleName));
        return request;
    }

    private static User user(String firstName, String lastName, String roleName) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(firstName.toLowerCase().replace(" ", ".") + "@equifreight.vn");
        user.setRoles(new HashSet<>(Set.of(role(roleName))));
        return user;
    }

    private static Role role(String name) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setName(name);
        return role;
    }

    private static User withId(User user) {
        user.setId(UUID.randomUUID());
        return user;
    }

    @BeforeEach
    void setUp() {
        service = new UserService(userRepository, roleRepository, passwordEncoder, auditService,
                JsonMapper.builder().build(), refreshTokenRepository);
        yen = user("Hải Yến", "Vũ", RoleName.LOGISTICS_MANAGER);
    }

    @Test
    @DisplayName("Inviting staff writes USER_INVITED with the new person and role, without the password")
    void inviteIsAudited() {
        when(userRepository.getByEmail("thu.bui@equifreight.vn")).thenReturn(null);
        when(roleRepository.findByName(RoleName.TRANSPORT_SPECIALIST)).thenReturn(Optional.of(role(RoleName.TRANSPORT_SPECIALIST)));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> withId(i.getArgument(0)));

        service.create(createRequest("thu.bui@equifreight.vn", RoleName.TRANSPORT_SPECIALIST), yen);

        ArgumentCaptor<String> after = ArgumentCaptor.forClass(String.class);
        verify(auditService).recordDecision(eq(yen), eq("USER_INVITED"),
                eq("Invited Bùi Anh Thư as transport specialist"), eq("USER"), any(UUID.class),
                isNull(), isNull(), isNull(), after.capture());
        assertTrue(after.getValue().contains("\"roles\":[\"TRANSPORT_SPECIALIST\"]"), after.getValue());
        assertFalse(after.getValue().contains("hash"), "The password hash must never reach the audit log");
    }

    @Test
    @DisplayName("An email already in use is refused before anything is saved or audited")
    void duplicateEmailIsRefusedWithoutAudit() {
        when(userRepository.getByEmail("lan.nguyen@equifreight.vn")).thenReturn(new User());

        assertThrows(BusinessException.class,
                () -> service.create(createRequest("lan.nguyen@equifreight.vn", RoleName.TRANSPORT_SPECIALIST), yen));

        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    @DisplayName("An unknown role is refused before anything is saved or audited")
    void unknownRoleIsRefusedWithoutAudit() {
        when(userRepository.getByEmail(anyString())).thenReturn(null);
        when(roleRepository.findByName("PILOT")).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.create(createRequest("x@equifreight.vn", "PILOT"), yen));

        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    @DisplayName("Changing someone's role writes USER_UPDATED with the roles before and after")
    void roleChangeIsAudited() {
        User khoi = user("Minh Khôi", "Đỗ", RoleName.ESCORT);
        when(userRepository.findById(khoi.getId())).thenReturn(Optional.of(khoi));
        when(roleRepository.findByName(RoleName.FLEET_COORDINATOR)).thenReturn(Optional.of(role(RoleName.FLEET_COORDINATOR)));
        when(userRepository.save(khoi)).thenReturn(khoi);

        service.update(khoi.getId(), updateRequest("Minh Khôi", "Đỗ", RoleName.FLEET_COORDINATOR), yen);

        ArgumentCaptor<String> before = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> after = ArgumentCaptor.forClass(String.class);
        verify(auditService).recordDecision(eq(yen), eq("USER_UPDATED"),
                eq("Changed Đỗ Minh Khôi's role to fleet & route coordinator"), eq("USER"), eq(khoi.getId()),
                isNull(), isNull(), before.capture(), after.capture());
        assertTrue(before.getValue().contains("\"roles\":[\"ESCORT\"]"), before.getValue());
        assertTrue(after.getValue().contains("\"roles\":[\"FLEET_COORDINATOR\"]"), after.getValue());
    }

    @Test
    @DisplayName("A rename says what the person was called before")
    void renameNamesTheOldName() {
        User lan = user("Thị Lan", "Nguyễn", RoleName.TRANSPORT_SPECIALIST);
        when(userRepository.findById(lan.getId())).thenReturn(Optional.of(lan));
        when(userRepository.save(lan)).thenReturn(lan);

        service.update(lan.getId(), updateRequest("Thị Lan Anh", "Nguyễn", null), yen);

        verify(auditService).recordDecision(eq(yen), eq("USER_UPDATED"),
                eq("Updated Nguyễn Thị Lan Anh's account (was Nguyễn Thị Lan)"), eq("USER"), eq(lan.getId()),
                isNull(), isNull(), anyString(), anyString());
    }

    @Test
    @DisplayName("Saving an account without changes writes no audit row")
    void unchangedSaveIsNotAudited() {
        User lan = user("Thị Lan", "Nguyễn", RoleName.TRANSPORT_SPECIALIST);
        when(userRepository.findById(lan.getId())).thenReturn(Optional.of(lan));
        when(userRepository.save(lan)).thenReturn(lan);

        service.update(lan.getId(), updateRequest("Thị Lan", "Nguyễn", null), yen);

        verifyNoInteractions(auditService);
    }

    @Test
    @DisplayName("Removing staff disables the account, ends their sessions and writes USER_REMOVED")
    void removalDisablesAndIsAudited() {
        User minh = user("Văn Minh", "Trần", RoleName.ESCORT);
        minh.setStaffCode("EF-011");
        when(userRepository.findById(minh.getId())).thenReturn(Optional.of(minh));

        service.delete(minh.getId(), yen);

        assertEquals(UserStatus.DISABLED, minh.getStatus());
        verify(userRepository).save(minh);
        verify(userRepository, never()).delete(any(User.class));
        verify(refreshTokenRepository).deleteByUser(minh);
        ArgumentCaptor<String> before = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> after = ArgumentCaptor.forClass(String.class);
        verify(auditService).recordDecision(eq(yen), eq("USER_REMOVED"), eq("Removed Trần Văn Minh (escort)"),
                eq("USER"), eq(minh.getId()), eq("EF-011"), isNull(), before.capture(), after.capture());
        assertTrue(before.getValue().contains("\"status\":\"ACTIVE\""), before.getValue());
        assertTrue(after.getValue().contains("\"status\":\"DISABLED\""), after.getValue());
    }

    @Test
    @DisplayName("A removed account can't be removed again or changed")
    void removedAccountIsRefused() {
        User minh = user("Văn Minh", "Trần", RoleName.ESCORT);
        minh.setStatus(UserStatus.DISABLED);
        when(userRepository.findById(minh.getId())).thenReturn(Optional.of(minh));

        var e = assertThrows(BusinessException.class, () -> service.delete(minh.getId(), yen));
        assertThrows(BusinessException.class,
                () -> service.update(minh.getId(), updateRequest("Văn Minh", "Trần", null), yen));

        assertTrue(e.getMessage().contains("Trần Văn Minh"), e.getMessage());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auditService, refreshTokenRepository);
    }

    @Test
    @DisplayName("Role labels read as the UI writes them")
    void roleLabels() {
        assertEquals("Fleet & route coordinator", RoleName.label(RoleName.FLEET_COORDINATOR));
        assertEquals("Logistics manager", RoleName.label(RoleName.LOGISTICS_MANAGER));
    }
}
