package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.note.CreateCustomerNoteRequest;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.service.NoteService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** US-00-08: the customer's notes on a request, each routed by its topic to the role that answers it. */
@RestController
@RequestMapping("/api/v1/customer/requests/{requestId}/notes")
@PreAuthorize("hasRole('CUSTOMER')")
public class RequestNoteController {

    private final NoteService noteService;

    public RequestNoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    /** Every note on the request with its replies, oldest first. */
    @GetMapping
    public List<NoteResponse> listNotes(@PathVariable UUID requestId, @AuthenticationPrincipal User user) {
        return noteService.listNotesForCustomer(requestId, user);
    }

    /** Sends a note; the topic decides who answers and the reply is due within one business day. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse createNote(
            @PathVariable UUID requestId,
            @Valid @RequestBody CreateCustomerNoteRequest request,
            @AuthenticationPrincipal User user) {
        return noteService.createForCustomer(requestId, request, user);
    }
}
