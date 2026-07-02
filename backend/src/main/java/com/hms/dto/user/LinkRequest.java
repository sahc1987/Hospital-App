package com.hms.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LinkRequest(
        @NotBlank String staffType,
        @NotNull  Long   staffId
) {}
