package com.hms.entity.enums;

import java.util.Set;

/**
 * Strict lifecycle: SCHEDULED → CONFIRMED → CHECKED_IN → IN_CONSULTATION → COMPLETED.
 * Cancel until the consultation starts; no-show only before check-in. COMPLETED / CANCELLED / NO_SHOW are final.
 */
public enum AppointmentStatus {
    SCHEDULED, CONFIRMED, CHECKED_IN, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW;

    public Set<AppointmentStatus> next() {
        return switch (this) {
            case SCHEDULED       -> Set.of(CONFIRMED, CHECKED_IN, CANCELLED, NO_SHOW); // walk-in may skip confirm
            case CONFIRMED       -> Set.of(CHECKED_IN, CANCELLED, NO_SHOW);
            case CHECKED_IN      -> Set.of(IN_CONSULTATION, CANCELLED);
            case IN_CONSULTATION -> Set.of(COMPLETED); // once seen, the visit must be documented, not cancelled
            case COMPLETED, CANCELLED, NO_SHOW -> Set.of();
        };
    }

    /** Doctor-only steps: starting and finishing the consultation. */
    public boolean isClinical() {
        return this == IN_CONSULTATION || this == COMPLETED;
    }

    /** Still holds its slot and can be rescheduled/edited. */
    public boolean isOpen() {
        return this == SCHEDULED || this == CONFIRMED;
    }
}
