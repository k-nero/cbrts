package com.equifreight.controller.customer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.quotation.AcceptRequest;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
import com.equifreight.model.quotation.DepositResponse;
import com.equifreight.model.quotation.RequoteRequest;
import com.equifreight.service.CustomerQuotationService;
import com.equifreight.service.MoveProgressService;
import com.equifreight.service.RequestService;
import java.math.BigDecimal;
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
    CustomerQuotationService quotations;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RequestService.class);
        quotations = mock(CustomerQuotationService.class);
        mvc = MockMvcBuilders.standaloneSetup(
                        new RequestController(service, quotations, mock(MoveProgressService.class)))
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

    @Test
    void theCustomerReadsTheIssuedQuotation() throws Exception {
        UUID id = UUID.randomUUID();
        when(quotations.get(any(), eq(id)))
                .thenReturn(CustomerQuotationResponse.builder()
                        .code("Q-2026-0192")
                        .versionNo((short) 2)
                        .estimate(new CustomerQuotationResponse.Estimate(
                                new BigDecimal("7400"), new BigDecimal("10100"), true))
                        .deposit(new DepositResponse(new BigDecimal("30"), new BigDecimal("2627.02")))
                        .cancellation(new CustomerQuotationResponse.Cancellation(
                                37, List.of(new CustomerQuotationResponse.Band(30, null, new BigDecimal("10"), true))))
                        .versions(List.of(new CustomerQuotationResponse.Version((short) 2, null, null, null, null)))
                        .build());

        mvc.perform(get("/api/v1/customer/requests/" + id + "/quotation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("Q-2026-0192"))
                .andExpect(jsonPath("$.estimate.inside").value(true))
                .andExpect(jsonPath("$.cancellation.bands[0].current").value(true))
                .andExpect(jsonPath("$.versions[0].versionNo").value(2));
    }

    @Test
    void acceptWithoutABodyStillAnswers() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(post("/api/v1/customer/requests/" + id + "/quotation/accept"))
                .andExpect(status().isOk());

        verify(quotations).accept(any(), eq(id), isNull());
    }

    @Test
    void acceptAndDeclineBindTheVersionNo() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(post("/api/v1/customer/requests/" + id + "/quotation/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"versionNo\":2}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/customer/requests/" + id + "/quotation/decline")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Too dear\",\"versionNo\":2}"))
                .andExpect(status().isOk());

        verify(quotations).accept(any(), eq(id), eq(new AcceptRequest(2)));
        verify(quotations).decline(any(), eq(id), eq(new DeclineRequest("Too dear", 2)));
    }

    @Test
    void aRequoteAnswers201AndBindsTheBody() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(post("/api/v1/customer/requests/" + id + "/quotation/requote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"versionNo\":2,\"note\":\"Two horses now\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/customer/requests/" + id + "/quotation/requote"))
                .andExpect(status().isCreated());

        verify(quotations).requote(any(), eq(id), eq(new RequoteRequest(2, "Two horses now")));
        verify(quotations).requote(any(), eq(id), isNull());
    }

    @Test
    void aRequoteNoteOver500CharactersAnswers400() throws Exception {
        mvc.perform(post("/api/v1/customer/requests/" + UUID.randomUUID() + "/quotation/requote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }
}
