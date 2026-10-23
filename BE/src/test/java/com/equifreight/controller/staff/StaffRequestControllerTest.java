package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.service.QuotationDraftService;
import com.equifreight.service.QuotationIssueService;
import com.equifreight.service.RequestApprovalService;
import com.equifreight.service.RequestReviewService;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

/** The logistics manager's request endpoints (US-F1-03, US-F1-04). */
class StaffRequestControllerTest {

    RequestReviewService service;
    QuotationDraftService quotations;
    QuotationIssueService issues;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RequestReviewService.class);
        quotations = mock(QuotationDraftService.class);
        issues = mock(QuotationIssueService.class);
        mvc = MockMvcBuilders.standaloneSetup(
                        new StaffRequestController(service, quotations, issues, mock(RequestApprovalService.class)))
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver(), new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    @Test
    void everyMethodIsForTheLogisticsManager() {
        List<Method> handlers = Arrays.stream(StaffRequestController.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(GetMapping.class)
                        || m.isAnnotationPresent(PostMapping.class)
                        || m.isAnnotationPresent(PutMapping.class)
                        || m.isAnnotationPresent(DeleteMapping.class))
                .toList();

        assertThat(handlers).hasSize(18);
        assertThat(handlers)
                .allSatisfy(m -> assertThat(m.getAnnotation(PreAuthorize.class).value())
                        .isEqualTo("hasRole('LOGISTICS_MANAGER')"));
    }

    @Test
    void returnPassesTheNote() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.returnForInformation(any(), eq(id), eq("Which stable?"))).thenReturn(new RequestReviewResponse());

        mvc.perform(post("/api/v1/staff/requests/" + id + "/return")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Which stable?\"}"))
                .andExpect(status().isOk());

        verify(service).returnForInformation(any(), eq(id), eq("Which stable?"));
    }

    @Test
    void aRefusalAnswersItsCode() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.returnForInformation(any(), eq(id), eq("")))
                .thenThrow(
                        new BusinessException("NOTE_REQUIRED", "Write a note to the customer: say what is missing."));
        when(service.returnForInformation(any(), eq(id), eq("late")))
                .thenThrow(new ConflictException("REQUEST_NOT_IN_REVIEW", "This request isn't waiting for review."));

        mvc.perform(post("/api/v1/staff/requests/" + id + "/return")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("NOTE_REQUIRED"));
        mvc.perform(post("/api/v1/staff/requests/" + id + "/return")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"late\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("REQUEST_NOT_IN_REVIEW"));
    }

    @Test
    void theQueueIgnoresASortParameter() throws Exception {
        when(service.queue(any())).thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 20), 0));

        mvc.perform(get("/api/v1/staff/requests").param("sort", "code,desc").param("page", "1"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(service).queue(captor.capture());
        assertThat(captor.getValue().getSort().isUnsorted()).isTrue();
        assertThat(captor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(captor.getValue().getPageSize()).isEqualTo(20);
    }

    // --- the draft quotation (US-Q-01) ---------------------------------------------------------------------

    static QuotationDraftResponse draft() {
        return QuotationDraftResponse.builder()
                .code("Q-2026-0189")
                .versionNo((short) 1)
                .build();
    }

    @Test
    void startAnswers201ThenThe200() throws Exception {
        UUID id = UUID.randomUUID();
        when(quotations.start(any(), eq(id))).thenReturn(new StartResult(draft(), true));
        mvc.perform(post("/api/v1/staff/requests/" + id + "/quotation"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("Q-2026-0189"));

        when(quotations.start(any(), eq(id))).thenReturn(new StartResult(draft(), false));
        mvc.perform(post("/api/v1/staff/requests/" + id + "/quotation")).andExpect(status().isOk());
    }

    @Test
    void getPutAndRepriceMapToTheService() throws Exception {
        UUID id = UUID.randomUUID();
        when(quotations.get(id, null)).thenReturn(draft());
        when(quotations.changeClass(any(), eq(id), eq(ServiceClass.FIRST))).thenReturn(draft());
        when(quotations.reprice(any(), eq(id))).thenReturn(draft());

        mvc.perform(get("/api/v1/staff/requests/" + id + "/quotation")).andExpect(status().isOk());
        mvc.perform(put("/api/v1/staff/requests/" + id + "/quotation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"airClass\":\"FIRST\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/staff/requests/" + id + "/quotation/reprice")).andExpect(status().isOk());

        verify(quotations).get(id, null);
        verify(quotations).changeClass(any(), eq(id), eq(ServiceClass.FIRST));
        verify(quotations).reprice(any(), eq(id));
    }

    @Test
    void aMissingClassIsRefusedBeforeTheService() throws Exception {
        UUID id = UUID.randomUUID();
        mvc.perform(put("/api/v1/staff/requests/" + id + "/quotation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(quotations);
    }

    // --- overrides and manual lines (US-Q-02, US-F1-05) ---------------------------------------------------

    @Test
    void overrideAndManualLineRoutes() throws Exception {
        UUID id = UUID.randomUUID();
        UUID line = UUID.randomUUID();
        when(quotations.override(any(), eq(id), eq(line), any())).thenReturn(draft());
        when(quotations.removeOverride(any(), eq(id), eq(line))).thenReturn(draft());
        when(quotations.addLine(any(), eq(id), any())).thenReturn(draft());
        when(quotations.editLine(any(), eq(id), eq(line), any())).thenReturn(draft());
        when(quotations.removeLine(any(), eq(id), eq(line))).thenReturn(draft());
        String base = "/api/v1/staff/requests/" + id + "/quotation/lines";
        String manual = "{\"group\":\"H\",\"description\":\"Ferry booking fee\",\"quantity\":2,"
                + "\"unitRate\":90,\"certainty\":\"FIXED\",\"reason\":\"Ferry\"}";

        mvc.perform(put(base + "/" + line + "/override")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1200.00,\"reason\":\"Own groom\"}"))
                .andExpect(status().isOk());
        mvc.perform(delete(base + "/" + line + "/override")).andExpect(status().isOk());
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(manual))
                .andExpect(status().isCreated());
        mvc.perform(put(base + "/" + line)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(manual))
                .andExpect(status().isOk());
        mvc.perform(delete(base + "/" + line)).andExpect(status().isOk());
    }

    @Test
    void anOverrideWithThreeDecimalsOrNoReasonIsRefused() throws Exception {
        String url =
                "/api/v1/staff/requests/" + UUID.randomUUID() + "/quotation/lines/" + UUID.randomUUID() + "/override";

        mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1.005,\"reason\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10,\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // --- issuing (US-F1-05) --------------------------------------------------------------------------------

    @Test
    void issuePassesTheNoteAndAnswersTheBlockers() throws Exception {
        UUID id = UUID.randomUUID();
        when(issues.issue(any(), eq(id), any())).thenReturn(draft());
        mvc.perform(post("/api/v1/staff/requests/" + id + "/quotation/issue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"changeNote\":\"Departure moved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("Q-2026-0189"));

        UUID blocked = UUID.randomUUID();
        when(issues.issue(any(), eq(blocked), any()))
                .thenThrow(new ConflictException(
                        "QUOTATION_NOT_READY",
                        "This quotation isn't ready to issue.",
                        List.of("1 rate is missing on Hanoi → Vientiane.")));
        mvc.perform(post("/api/v1/staff/requests/" + blocked + "/quotation/issue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("QUOTATION_NOT_READY"))
                .andExpect(jsonPath("$.details[0]").value("1 rate is missing on Hanoi → Vientiane."));
    }

    // --- versions (US-Q-07) --------------------------------------------------------------------------------

    @Test
    void reviseDiscardAndReadAVersion() throws Exception {
        UUID id = UUID.randomUUID();
        when(issues.revise(any(), eq(id))).thenReturn(new StartResult(draft(), true));
        when(quotations.get(id, (short) 1)).thenReturn(draft());

        mvc.perform(post("/api/v1/staff/requests/" + id + "/quotation/revise")).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/staff/requests/" + id + "/quotation/draft")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/staff/requests/" + id + "/quotation").param("version", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("Q-2026-0189"));

        verify(issues).discardDraft(any(), eq(id));
    }
}
