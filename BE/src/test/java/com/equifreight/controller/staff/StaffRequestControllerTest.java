package com.equifreight.controller.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.review.RequestReviewResponse;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

/** The logistics manager's request endpoints (US-F1-03, US-F1-04). */
class StaffRequestControllerTest {

    RequestReviewService service;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(RequestReviewService.class);
        mvc = MockMvcBuilders.standaloneSetup(new StaffRequestController(service))
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver(), new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    @Test
    void everyMethodIsForTheLogisticsManager() {
        List<Method> handlers = Arrays.stream(StaffRequestController.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(GetMapping.class) || m.isAnnotationPresent(PostMapping.class))
                .toList();

        assertThat(handlers).hasSize(3);
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
}
