package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.rate.DraftResult;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.model.rate.RateVersionResponse;
import com.equifreight.model.rate.VolumeBreakRequest;
import com.equifreight.service.RateCatalogService;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

/** The rate catalog endpoints (US-Q-10, #31). */
class RateCatalogControllerTest {

    RateCatalogService service;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RateCatalogService.class);
        mvc = MockMvcBuilders.standaloneSetup(new RateCatalogController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    static RateVersionResponse v3() {
        return RateVersionResponse.builder()
                .id(UUID.randomUUID())
                .versionNo(3)
                .status(CatalogStatus.DRAFT)
                .build();
    }

    @Test
    void readsAreForBothRolesAndWritesForTheSpecialistOnly() {
        List<Method> handlers = Arrays.stream(RateCatalogController.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(GetMapping.class)
                        || m.isAnnotationPresent(PostMapping.class)
                        || m.isAnnotationPresent(PutMapping.class)
                        || m.isAnnotationPresent(DeleteMapping.class))
                .toList();
        assertThat(handlers).hasSize(12);
        assertThat(handlers).allSatisfy(m -> {
            String rule = m.getAnnotation(PreAuthorize.class).value();
            if (m.isAnnotationPresent(GetMapping.class)) {
                assertThat(rule).isEqualTo("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')");
            } else {
                assertThat(rule).as(m.getName()).isEqualTo("hasRole('TRANSPORT_SPECIALIST')");
            }
        });
    }

    @Test
    void createDraftAnswers201ThenThe200() throws Exception {
        when(service.createDraft(any())).thenReturn(new DraftResult(v3(), true));
        mvc.perform(post("/api/v1/staff/rates/draft"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNo").value(3));

        when(service.createDraft(any())).thenReturn(new DraftResult(v3(), false));
        mvc.perform(post("/api/v1/staff/rates/draft")).andExpect(status().isOk());
    }

    @Test
    void discardAnswers204AndNoDraftIs409() throws Exception {
        mvc.perform(delete("/api/v1/staff/rates/draft")).andExpect(status().isNoContent());

        org.mockito.Mockito.doThrow(new ConflictException("NO_DRAFT", "There is no draft to change."))
                .when(service)
                .discardDraft(any());
        mvc.perform(delete("/api/v1/staff/rates/draft"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("NO_DRAFT"));
    }

    @Test
    void publishPassesTheNote() throws Exception {
        when(service.publish(any(), any())).thenReturn(v3());

        mvc.perform(post("/api/v1/staff/rates/draft/publish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"changeNote\":\"Business rate for PNH → HKG\"}"))
                .andExpect(status().isOk());

        verify(service).publish(any(), eq(new PublishRequest("Business rate for PNH → HKG")));
    }

    @Test
    void volumeBreaksTakeAnOptionalCorridorAndTheViewedOne() throws Exception {
        UUID view = UUID.randomUUID();
        mvc.perform(put("/api/v1/staff/rates/draft/volume-breaks")
                        .param("view", view.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"minHorses\":1,\"maxHorses\":null,\"discountPct\":0}]"))
                .andExpect(status().isOk());

        verify(service)
                .putVolumeBreaks(
                        any(),
                        isNull(),
                        eq(List.of(new VolumeBreakRequest((short) 1, null, new BigDecimal("0")))),
                        eq(view));
    }

    @Test
    void serviceClassesArePutByCorridorAndClass() throws Exception {
        UUID corridor = UUID.randomUUID();
        mvc.perform(put("/api/v1/staff/rates/draft/corridors/" + corridor + "/service-classes/BUSINESS")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"widthPerHorseIn\":48,\"positionRate\":16800}"))
                .andExpect(status().isOk());

        verify(service).putServiceClass(any(), eq(corridor), eq(ServiceClass.BUSINESS), any());
    }

    @Test
    void anInvalidLineIsRefusedBeforeTheService() throws Exception {
        mvc.perform(post("/api/v1/staff/rates/draft/lines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"bad code\",\"group\":\"Z\",\"description\":\"x\",\"basis\":\"PER_HORSE\","
                                + "\"rate\":-1}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(service);
    }

    @Test
    void policiesAreAMapOfKeyToValue() throws Exception {
        UUID view = UUID.randomUUID();
        mvc.perform(put("/api/v1/staff/rates/draft/policies")
                        .param("view", view.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"FUEL_PCT\":20}"))
                .andExpect(status().isOk());

        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<Map<RatePolicyKey, BigDecimal>> values = (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
        verify(service).putPolicies(any(), values.capture(), eq(view));
        assertThat(values.getValue()).containsEntry(RatePolicyKey.FUEL_PCT, new BigDecimal("20"));
    }

    @Test
    void theCorridorViewTakesTheVersionAndCorridor() throws Exception {
        UUID version = UUID.randomUUID();
        UUID corridor = UUID.randomUUID();
        mvc.perform(get("/api/v1/staff/rates/versions/" + version).param("corridorId", corridor.toString()))
                .andExpect(status().isOk());
        verify(service).corridorView(version, corridor);
    }
}
