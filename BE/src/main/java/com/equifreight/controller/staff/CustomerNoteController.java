package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.note.CreateNoteReplyRequest;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.service.NoteService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff/customer-notes")
public class CustomerNoteController {

    private final NoteService noteService;

    public CustomerNoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    /** List customer notes routed to the logged-in staff role (Transport Specialist or Logistics Manager). */
    @GetMapping
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<NoteResponse> listNotes(@AuthenticationPrincipal User user) {
        return noteService.listNotesForStaff(user);
    }

    /** Retrieve detailed note with replies. */
    @GetMapping("/{noteId}")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public NoteResponse getNote(@PathVariable UUID noteId) {
        return noteService.getNote(noteId);
    }

    /** Reply to a customer note. */
    @PostMapping("/{noteId}/replies")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public NoteResponse replyToNote(
            @PathVariable UUID noteId,
            @Valid @RequestBody CreateNoteReplyRequest request,
            @AuthenticationPrincipal User user) {
        return noteService.replyToNote(noteId, request, user);
    }
}
