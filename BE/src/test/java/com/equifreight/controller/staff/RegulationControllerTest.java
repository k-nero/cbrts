package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CountryRequest;
import com.equifreight.model.clearance.RegulationCountryResponse;
import com.equifreight.service.RegulationService;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

/** The regulation catalog endpoints (US-F2-11, US-F2-12 #207). */
class RegulationControllerTest {

    RegulationService service;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RegulationService.class);
        mvc = MockMvcBuilders.standaloneSetup(new RegulationController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    @Test
    void readsAreForBothRolesAndWritesForTheSpecialistOnly() {
        List<Method> handlers = Arrays.stream(RegulationController.class.getDeclaredMethods())
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
    void addingACountryAnswers201AndADuplicate409() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.addCountry(any(), any()))
                .thenReturn(new RegulationCountryResponse(id, "US", "United States", null));

        mvc.perform(post("/api/v1/staff/regulations/countries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"US\",\"name\":\"United States\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("US"))
                .andExpect(jsonPath("$.catalog").doesNotExist());
        verify(service).addCountry(eq(new CountryRequest("US", "United States")), any());

        when(service.addCountry(any(), any()))
                .thenThrow(new ConflictException("COUNTRY_EXISTS", "US is already a country we serve."));
        mvc.perform(post("/api/v1/staff/regulations/countries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"US\",\"name\":\"United States\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("COUNTRY_EXISTS"));
    }
}
