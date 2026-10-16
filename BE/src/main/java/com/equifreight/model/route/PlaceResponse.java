package com.equifreight.model.route;

import com.equifreight.entity.enums.PlaceKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** A pickup or delivery point the customer can choose. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceResponse {
    private UUID id;
    private String name;
    private PlaceKind kind;
    private String city;
    private String countryCode;
    private String countryName;
}
