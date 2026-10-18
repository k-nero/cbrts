package com.equifreight.controller.customer;

import com.equifreight.configuration.ControllerAdvise;
import com.equifreight.service.HorseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A malformed field answers 400 with an ApiError (spec H-01), never a 500.
 */
class HorseControllerTest {

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        // The security resolver, as in the app: without it the User parameter is bound like a form object.
        mvc = MockMvcBuilders.standaloneSetup(new HorseController(mock(HorseService.class)))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ControllerAdvise())
                .build();
    }

    @Test
    void aBodyThatIsNotValidJsonAnswers400() throws Exception {
        mvc.perform(post("/api/v1/customer/horses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message")
                        .value("The request body isn't valid: check each field's type and allowed values."));
    }

    @Test
    void aPathIdThatIsNotAUuidAnswers400() throws Exception {
        mvc.perform(get("/api/v1/customer/horses/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("id must be a valid UUID; not-a-uuid was given."));
    }
}
