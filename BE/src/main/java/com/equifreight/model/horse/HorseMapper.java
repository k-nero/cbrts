package com.equifreight.model.horse;

import com.equifreight.entity.Horse;
import com.equifreight.entity.HorseSizeClass;
import java.util.UUID;

public final class HorseMapper {
    private HorseMapper() {}

    public static HorseResponse toResponse(Horse horse, boolean identityLocked) {
        return HorseResponse.builder()
                .id(horse.getId())
                .name(horse.getName())
                .coat(horse.getCoat())
                .breed(horse.getBreed())
                .sex(horse.getSex())
                .dateOfBirth(horse.getDateOfBirth())
                .heightHh(horse.getHeightHh())
                .weightKg(horse.getWeightKg())
                .sizeClass(toResponse(horse.getSizeClass()))
                .microchip(horse.getMicrochip())
                .passportNo(horse.getPassportNo())
                .declaredValue(horse.getDeclaredValue())
                .valueCurrency(horse.getValueCurrency())
                .temperament(horse.getTemperament())
                .requiredStall(horse.getRequiredStall())
                .handlingNotes(horse.getHandlingNotes())
                .archivedAt(horse.getArchivedAt())
                .identityLocked(identityLocked)
                .photoFileId(photoFileIdOf(horse))
                .createdAt(horse.getCreatedAt())
                .updatedAt(horse.getUpdatedAt())
                .build();
    }

    /**
     * The photo's id without loading the file row.
     */
    public static UUID photoFileIdOf(Horse horse) {
        return horse.getPhoto() == null ? null : horse.getPhoto().getId();
    }

    public static SizeClassResponse toResponse(HorseSizeClass sizeClass) {
        return SizeClassResponse.builder()
                .code(sizeClass.getCode())
                .widthIn(sizeClass.getWidthIn())
                .minHeightHh(sizeClass.getMinHeightHh())
                .build();
    }
}
