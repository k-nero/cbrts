package com.equifreight.controller.customer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.exception.ConflictException;
import com.equifreight.service.RequestService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** A malformed request body answers 400 with an ApiError, never a 500. */
class RequestControllerTest {

    RequestService service;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RequestService.class);
        mvc = MockMvcBuilders.standaloneSetup(new RequestController(service))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    @Test
    void anUnknownModeAnswers400() throws Exception {
        mvc.perform(post("/api/v1/customer/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"BOAT\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void aBlockedSubmitListsEveryBlockerInDetails() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.submit(any(), eq(id)))
                .thenThrow(new ConflictException(
                        "SUBMISSION_BLOCKED",
                        "This request can't be submitted yet.",
                        List.of("Add at least one horse.", "Choose road or air.")));

        mvc.perform(post("/api/v1/customer/requests/" + id + "/submit"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("SUBMISSION_BLOCKED"))
                .andExpect(jsonPath("$.details[1]").value("Choose road or air."));
    }

    @Test
    void aNullHorseAnswers400() throws Exception {
        mvc.perform(post("/api/v1/customer/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"horses\":[null]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    void aMalformedDepartureDateAnswers400() throws Exception {
        mvc.perform(post("/api/v1/customer/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"departureDate\":\"30/10/2026\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void theCustomerAsksForAnEstimate() throws Exception {
        when(service.estimate(any(), any()))
                .thenReturn(com.equifreight.model.estimate.EstimateMapper.notReady(
                        com.equifreight.service.pricing.EstimateStatus.NOT_READY,
                        "Choose the route and horses to see an estimate."));

        mvc.perform(post("/api/v1/customer/requests/estimate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_READY"))
                .andExpect(jsonPath("$.message").value("Choose the route and horses to see an estimate."))
                .andExpect(jsonPath("$.options.mode").isArray());
    }
}
